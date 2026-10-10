/** Original, data-only adapter for the documented ComfyUI UI Workflow JSON 0.4 subset. */
// JSON is the interchange domain; this also accepts Vue's reactive proxy wrappers.
const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const isId = (value) => (typeof value === 'string' && value.length > 0) || (Number.isSafeInteger(value) && value >= 0)
const isSlot = (value) => Number.isSafeInteger(value) && value >= 0
const isPortType = (value) => (typeof value === 'string' && value.length > 0) || (typeof value === 'number' && Number.isFinite(value)) || (Array.isArray(value) && value.length > 0 && value.every((type) => typeof type === 'string' && type.length > 0))
const portTypes = (type) => (Array.isArray(type) ? type : [type]).map(String)
const compatible = (a, b) => portTypes(a).some((type) => type === '*' || portTypes(b).includes('*') || portTypes(b).includes(type))
const fail = (message) => { throw new Error(message) }

export function importWorkflow(value) {
  const source = typeof value === 'string' ? JSON.parse(value) : clone(value)
  if (!isObject(source) || source.version !== 0.4) fail('请选择 ComfyUI 前端 Workflow JSON 0.4；API prompt 与其他版本暂不支持。')
  if (!isId(source.last_node_id) || !Number.isSafeInteger(source.last_link_id) || source.last_link_id < 0) fail('工作流缺少有效的 last_node_id / last_link_id 计数器。')
  if (!Array.isArray(source.nodes) || !Array.isArray(source.links)) fail('工作流必须包含 nodes 与 links 数组。')
  if (!source.nodes.length || source.nodes.length > 100 || source.links.length > 400) fail('示例支持 1–100 个节点与最多 400 条连接。')
  const ids = new Set()
  const nodes = source.nodes.map((raw) => {
    if (!isObject(raw) || !isId(raw.id) || typeof raw.type !== 'string' || !raw.type) fail('节点 id / type 格式不正确。')
    const id = String(raw.id)
    if (ids.has(id)) fail(`节点 id ${id} 重复。`)
    ids.add(id)
    if (!Array.isArray(raw.pos) || raw.pos.length !== 2 || !raw.pos.every(Number.isFinite)) fail(`节点 ${id} 的 pos 必须是两个有限数字。`)
    if (!Array.isArray(raw.size) || raw.size.length !== 2 || !raw.size.every((n) => Number.isFinite(n) && n > 0)) fail(`节点 ${id} 的 size 格式不正确。`)
    if (!isObject(raw.flags) || !isObject(raw.properties) || !Number.isInteger(raw.order) || !Number.isInteger(raw.mode)) fail(`节点 ${id} 缺少 flags / properties / order / mode。`)
    for (const direction of ['inputs', 'outputs']) {
      if (raw[direction] !== undefined && !Array.isArray(raw[direction])) fail(`节点 ${id} 的 ${direction} 必须是数组。`)
      for (const port of raw[direction] ?? []) {
        if (!isObject(port) || typeof port.name !== 'string' || !isPortType(port.type)) fail(`节点 ${id} 的端口格式不正确。`)
      }
    }
    if (raw.widgets_values !== undefined && !Array.isArray(raw.widgets_values) && !isObject(raw.widgets_values)) fail(`节点 ${id} 的 widgets_values 必须是数组或对象。`)
    return { id, type: 'milk', position: { x: raw.pos[0], y: raw.pos[1] }, data: {
      label: raw.title || raw.type, classType: raw.type, raw: clone(raw), status: 'idle',
    } }
  })
  const edges = source.links.map((link) => {
    if (!Array.isArray(link) || link.length !== 6 || !Number.isSafeInteger(link[0]) || link[0] < 0 || !isId(link[1]) || !isSlot(link[2]) || !isId(link[3]) || !isSlot(link[4]) || !isPortType(link[5])) fail('links 必须是 [id, 源节点, 源端口, 目标节点, 目标端口, 类型] 六元数组。')
    return { id: String(link[0]), source: String(link[1]), sourceHandle: `out-${link[2]}`, target: String(link[3]), targetHandle: `in-${link[4]}`, type: 'smoothstep', data: { linkId: link[0], portType: clone(link[5]) } }
  })
  const metadata = clone(source)
  delete metadata.nodes
  delete metadata.links
  const graph = { nodes, edges, metadata }
  validateGraph(graph)
  return graph
}

function slotIndex(handle, prefix) {
  const match = new RegExp(`^${prefix}-(\\d+)$`).exec(handle ?? '')
  if (!match) fail('连接缺少有效端口。')
  return Number(match[1])
}

export function validateGraph({ nodes, edges }) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  if (nodeMap.size !== nodes.length) fail('节点 id 重复。')
  const linkIds = new Set()
  const occupiedInputs = new Set()
  for (const edge of edges) {
    if (linkIds.has(edge.id)) fail(`连接 id ${edge.id} 重复。`)
    linkIds.add(edge.id)
    const source = nodeMap.get(edge.source)
    const target = nodeMap.get(edge.target)
    if (!source || !target) fail(`连接 ${edge.id} 指向不存在的节点。`)
    const output = source.data.raw.outputs?.[slotIndex(edge.sourceHandle, 'out')]
    const input = target.data.raw.inputs?.[slotIndex(edge.targetHandle, 'in')]
    if (!input || !output) fail(`连接 ${edge.id} 指向不存在的端口。`)
    if (!compatible(output.type, input.type)) fail(`连接 ${edge.id} 的端口类型不兼容。`)
    if (edge.data?.portType !== undefined && (!compatible(output.type, edge.data.portType) || !compatible(input.type, edge.data.portType))) fail(`连接 ${edge.id} 的声明类型不匹配。`)
    const inputKey = `${edge.target}:${edge.targetHandle}`
    if (occupiedInputs.has(inputKey)) fail('每个输入端口只能连接一个输出。')
    occupiedInputs.add(inputKey)
  }
  return executionOrder({ nodes, edges })
}

export function executionOrder({ nodes, edges }) {
  const pending = new Map(nodes.map((node) => [node.id, 0]))
  const next = new Map(nodes.map((node) => [node.id, []]))
  for (const edge of edges) {
    if (!pending.has(edge.target) || !next.has(edge.source)) fail('工作流包含悬空连接。')
    pending.set(edge.target, pending.get(edge.target) + 1)
    next.get(edge.source).push(edge.target)
  }
  const queue = nodes.filter((node) => pending.get(node.id) === 0).map((node) => node.id)
  const order = []
  while (queue.length) {
    const id = queue.shift()
    order.push(id)
    for (const target of next.get(id)) {
      pending.set(target, pending.get(target) - 1)
      if (pending.get(target) === 0) queue.push(target)
    }
  }
  if (order.length !== nodes.length) fail('该编辑器支持无环工作流；请先移除环路。')
  return order
}

export function connectGraph(graph, connection) {
  if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) fail('请选择源端口与目标端口。')
  const id = Math.max(0, Number(graph.metadata.last_link_id) || 0, ...graph.edges.map((edge) => Number(edge.id) || 0)) + 1
  const source = graph.nodes.find((node) => node.id === connection.source)
  const port = source?.data.raw.outputs?.[slotIndex(connection.sourceHandle, 'out')]
  if (!port) fail('源端口不存在。')
  const edge = { id: String(id), source: connection.source, sourceHandle: connection.sourceHandle, target: connection.target, targetHandle: connection.targetHandle, type: 'smoothstep', data: { linkId: id, portType: clone(port.type) } }
  const updated = { ...graph, edges: [...graph.edges, edge] }
  validateGraph(updated)
  return updated.edges
}

export function exportWorkflow(graph) {
  const order = validateGraph(graph)
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]))
  const nodes = graph.nodes.map((node) => {
    const raw = clone(node.data.raw)
    raw.pos = [Math.round(node.position.x), Math.round(node.position.y)]
    raw.title = node.data.label
    raw.order = order.indexOf(node.id)
    for (const input of raw.inputs ?? []) input.link = null
    for (const output of raw.outputs ?? []) output.links = []
    return raw
  })
  const rawMap = new Map(nodes.map((node) => [String(node.id), node]))
  const links = graph.edges.map((edge) => {
    const sourceIndex = slotIndex(edge.sourceHandle, 'out')
    const targetIndex = slotIndex(edge.targetHandle, 'in')
    const linkId = edge.data?.linkId ?? Number(edge.id)
    if (!Number.isSafeInteger(linkId) || linkId < 0) fail('连接 id 必须是非负整数。')
    rawMap.get(edge.source).outputs[sourceIndex].links.push(linkId)
    rawMap.get(edge.target).inputs[targetIndex].link = linkId
    return [linkId, nodeMap.get(edge.source).data.raw.id, sourceIndex, nodeMap.get(edge.target).data.raw.id, targetIndex, clone(edge.data?.portType ?? rawMap.get(edge.source).outputs[sourceIndex].type)]
  })
  return { ...clone(graph.metadata), version: 0.4, nodes, links,
    last_node_id: Math.max(0, Number(graph.metadata.last_node_id) || 0, ...nodes.map((node) => Number(node.id) || 0)),
    last_link_id: Math.max(0, Number(graph.metadata.last_link_id) || 0, ...links.map((link) => link[0])),
  }
}

export function createDefaultWorkflow() {
  const node = (id, type, title, pos, inputs, outputs, widgets_values) => ({ id, type, title, pos, size: [210, 180], flags: {}, order: id - 1, mode: 0, properties: { 'Node name for S&R': type }, inputs: inputs.map(([name, type]) => ({ name, type, link: null })), outputs: outputs.map(([name, type]) => ({ name, type, links: [] })), widgets_values })
  const workflow = {
    version: 0.4, last_node_id: 7, last_link_id: 9, groups: [], config: {}, extra: {},
    nodes: [
      node(1, 'CheckpointLoaderSimple', '模型载入', [25, 25], [], [['MODEL', 'MODEL'], ['CLIP', 'CLIP'], ['VAE', 'VAE']], ['model.safetensors']),
      node(2, 'CLIPTextEncode', '正向提示', [25, 225], [['clip', 'CLIP']], [['CONDITIONING', 'CONDITIONING']], ['milk-white material, tactile controls, soft studio light']),
      node(3, 'CLIPTextEncode', '负向提示', [25, 425], [['clip', 'CLIP']], [['CONDITIONING', 'CONDITIONING']], ['low quality, blurred']),
      node(4, 'EmptyLatentImage', '画布尺寸', [285, 425], [], [['LATENT', 'LATENT']], [1024, 1024, 1]),
      node(5, 'KSampler', '采样参数', [305, 25], [['model', 'MODEL'], ['positive', 'CONDITIONING'], ['negative', 'CONDITIONING'], ['latent_image', 'LATENT']], [['LATENT', 'LATENT']], [42, 'fixed', 20, 7, 'euler', 'normal', 1]),
      node(6, 'VAEDecode', '解码', [585, 25], [['samples', 'LATENT'], ['vae', 'VAE']], [['IMAGE', 'IMAGE']], []),
      node(7, 'SaveImage', '输出配置', [865, 25], [['images', 'IMAGE']], [], ['MilkWhite']),
    ],
    links: [[1, 1, 0, 5, 0, 'MODEL'], [2, 1, 1, 2, 0, 'CLIP'], [3, 1, 1, 3, 0, 'CLIP'], [4, 2, 0, 5, 1, 'CONDITIONING'], [5, 3, 0, 5, 2, 'CONDITIONING'], [6, 4, 0, 5, 3, 'LATENT'], [7, 5, 0, 6, 0, 'LATENT'], [8, 1, 2, 6, 1, 'VAE'], [9, 6, 0, 7, 0, 'IMAGE']],
  }
  return importWorkflow(workflow)
}
