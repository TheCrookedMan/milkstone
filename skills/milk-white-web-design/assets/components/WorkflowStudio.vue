<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { BaseEdge, getSmoothStepPath, Handle, Position, VueFlow, useVueFlow, type Connection, type EdgeProps } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { connectGraph, createDefaultWorkflow, exportWorkflow, importWorkflow, validateGraph, type WorkflowGraph, type WorkflowNode } from '../workflow-model.mjs'
import { executionSnapshot, executionTimeline, type ExecutionTimeline } from '../graph-motion.mjs'

const flowId = `milk-workflow-${useId()}`
const { fitView, zoomIn, zoomOut } = useVueFlow(flowId)
const graph = ref<WorkflowGraph>(createDefaultWorkflow())
const selectedId = ref('5')
graph.value.nodes.find((node) => node.id === selectedId.value)!.selected = true
const selected = computed(() => graph.value.nodes.find((node) => node.id === selectedId.value))
const running = ref(false)
const studioElement = ref<HTMLElement>()
const reducedMotion = ref(false)
const inView = ref(true)
const pageVisible = ref(true)
const clockAvailable = computed(() => inView.value && pageVisible.value)
const motionState = computed(() => !running.value ? 'idle' : !pageVisible.value ? 'background' : !inView.value ? 'offscreen' : reducedMotion.value ? 'reduced-motion' : 'running')
const notice = ref('拖动节点安排步骤，连接同类端口，选中后编辑参数。')
const progress = ref(0)
const edgeStates = ref<Record<string, 'idle' | 'running' | 'done'>>({})
let simulation: ExecutionTimeline | undefined
let elapsed = 0
let previousTime: number | undefined
let animationFrame = 0
let eventTimer = 0
let motionQuery: MediaQueryList | undefined
let intersection: IntersectionObserver | undefined
let mounted = false
let fitFrame = 0
type SignalTrack = { id: string; path: SVGPathElement; packet: SVGGElement; length: number }
let signalTracks: SignalTrack[] = []
const mobile = ref(typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches)
let media: MediaQueryList | undefined
const onMediaChange = () => { mobile.value = media?.matches ?? false }
const showImport = ref(false)
const importText = ref('')
const fileInput = ref<HTMLInputElement>()
const widgetJson = ref('[]')
const sourceId = ref('1')
const sourceSlot = ref('0')
const targetId = ref('5')
const targetSlot = ref('0')
const sourcePorts = computed(() => graph.value.nodes.find((node) => node.id === sourceId.value)?.data.raw.outputs ?? [])
const targetPorts = computed(() => graph.value.nodes.find((node) => node.id === targetId.value)?.data.raw.inputs ?? [])
const widgetLabels: Record<string, string[]> = {
  CheckpointLoaderSimple: ['模型文件'], CLIPTextEncode: ['提示词'], EmptyLatentImage: ['宽度', '高度', '批量'],
  KSampler: ['种子', '运行后种子策略', '步数', 'CFG', '采样器', '调度器', '降噪'], SaveImage: ['文件名前缀'],
}
const widgets = computed(() => {
  const values = selected.value?.data.raw.widgets_values ?? []
  return Object.entries(values).map(([key, value]) => ({ key, value, label: Array.isArray(values) ? widgetLabels[selected.value?.data.classType ?? '']?.[Number(key)] ?? `参数 ${Number(key) + 1}` : key }))
})
const edgeOptions = { type: 'smoothstep', style: { stroke: 'var(--milk-color-a0a0a0)', strokeWidth: 2 }, animated: false }
watch(() => selected.value, (node) => { widgetJson.value = JSON.stringify(node?.data.raw.widgets_values ?? [], null, 2) }, { immediate: true })
watch(() => graph.value.nodes.filter((node) => node.selected).map((node) => encodeURIComponent(node.id)).join('|'), (signature) => {
  if (signature) selectedId.value = decodeURIComponent(signature.split('|').at(-1)!)
})
watch(sourceId, () => { sourceSlot.value = '0' })
watch(targetId, () => { targetSlot.value = '0' })
watch(mobile, async (isMobile) => {
  if (isMobile) return
  await nextTick()
  // Let Vue Flow's ResizeObserver refresh its viewport dimensions before fitting.
  if (!mounted) return
  cancelAnimationFrame(fitFrame)
  fitFrame = window.requestAnimationFrame(() => { fitFrame = window.requestAnimationFrame(() => { if (mounted) void fitView({ padding: 0.13 }) }) })
})
const updateMotion = () => { reducedMotion.value = motionQuery?.matches ?? false }
const updateVisibility = () => { pageVisible.value = document.visibilityState !== 'hidden' }
watch([clockAvailable, reducedMotion], syncSimulationClock, { flush: 'post' })
watch(() => JSON.stringify([graph.value.nodes.map(({ id }) => id), graph.value.edges.map(({ id, source, target }) => [id, source, target])]), () => {
  if (running.value) cancelRun('工作流结构已改变，本地模拟已停止，请重新运行。')
  edgeStates.value = {}
  progress.value = 0
  for (const node of graph.value.nodes) node.data.status = 'idle'
}, { flush: 'sync' })
onMounted(() => {
  mounted = true
  media = window.matchMedia('(max-width: 760px)')
  onMediaChange()
  media.addEventListener('change', onMediaChange)
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotion(); updateVisibility()
  motionQuery.addEventListener('change', updateMotion)
  document.addEventListener('visibilitychange', updateVisibility)
  if (studioElement.value) {
    intersection = new IntersectionObserver((entries) => { inView.value = entries.some(({ isIntersecting }) => isIntersecting) }, { threshold: 0 })
    intersection.observe(studioElement.value)
  }
})
onBeforeUnmount(() => {
  mounted = false
  stopSimulationClock()
  cancelAnimationFrame(fitFrame)
  simulation = undefined; signalTracks = []
  intersection?.disconnect()
  media?.removeEventListener('change', onMediaChange)
  motionQuery?.removeEventListener('change', updateMotion)
  document.removeEventListener('visibilitychange', updateVisibility)
})

function signalPath(edge: Pick<EdgeProps, 'sourceX' | 'sourceY' | 'sourcePosition' | 'targetX' | 'targetY' | 'targetPosition'>) {
  return getSmoothStepPath({ ...edge, borderRadius: 16 })[0]
}
function collectSignals() {
  const element = studioElement.value
  signalTracks = element ? Array.from(element.querySelectorAll<SVGPathElement>('.workflow-signal-route')).flatMap((path) => {
    const packet = path.parentElement?.querySelector<SVGGElement>('.workflow-signal-packet')
    return packet ? [{ id: path.dataset.edgeId!, path, packet, length: path.getTotalLength() }] : []
  }) : []
}
function paintSimulation() {
  if (!simulation) return
  const snapshot = executionSnapshot(simulation, elapsed)
  for (const node of graph.value.nodes) {
    const status = snapshot.nodes.get(node.id) ?? 'idle'
    if (node.data.status !== status) node.data.status = status
  }
  progress.value = snapshot.completed
  const nextEdgeStates: typeof edgeStates.value = {}
  for (const [id, signal] of snapshot.edges) nextEdgeStates[id] = signal.state
  if (Object.keys(nextEdgeStates).some((id) => edgeStates.value[id] !== nextEdgeStates[id])) edgeStates.value = nextEdgeStates
  for (const track of signalTracks) {
    const signal = snapshot.edges.get(track.id)
    const visible = !reducedMotion.value && signal?.state === 'running'
    track.packet.style.opacity = visible ? String(Math.min(1, signal.progress * 7, (1 - signal.progress) * 7)) : '0'
    if (visible) {
      const head = track.path.getPointAtLength(track.length * signal.progress)
      track.packet.setAttribute('transform', `translate(${head.x.toFixed(2)} ${head.y.toFixed(2)})`)
    }
  }
  const activeLabels = graph.value.nodes.filter(({ data }) => data.status === 'running').map(({ data }) => data.label)
  notice.value = activeLabels.length ? `本地模拟：检查 ${activeLabels.join('、')}…` : '本地模拟：沿连接传递节点结果…'
  if (snapshot.done) {
    running.value = false
    stopSimulationClock()
    notice.value = '本地模拟完成：已按依赖检查节点与参数。未连接生成后端，未生成图像。'
  }
}
function stopSimulationClock() {
  cancelAnimationFrame(animationFrame); window.clearTimeout(eventTimer)
  animationFrame = 0; eventTimer = 0; previousTime = undefined
}
function tickSimulation(time: number) {
  animationFrame = 0; eventTimer = 0
  if (!running.value || !clockAvailable.value || !simulation) { previousTime = undefined; return }
  if (previousTime !== undefined) elapsed += Math.max(0, time - previousTime)
  previousTime = time
  paintSimulation()
  if (!running.value) return
  if (reducedMotion.value) {
    const boundary = simulation.boundaries.find((at) => at > elapsed) ?? simulation.duration
    eventTimer = window.setTimeout(() => tickSimulation(performance.now()), Math.max(1, boundary - elapsed))
  } else animationFrame = requestAnimationFrame(tickSimulation)
}
function syncSimulationClock() {
  stopSimulationClock()
  if (!running.value || !clockAvailable.value) return
  previousTime = performance.now()
  paintSimulation()
  if (!running.value) return
  if (reducedMotion.value && simulation) {
    const boundary = simulation.boundaries.find((at) => at > elapsed) ?? simulation.duration
    eventTimer = window.setTimeout(() => tickSimulation(performance.now()), Math.max(1, boundary - elapsed))
  } else animationFrame = requestAnimationFrame(tickSimulation)
}

function nodePreview(node: WorkflowNode['data']) {
  const values = node.raw.widgets_values
  return Array.isArray(values) && values.length ? String(values[0]) : '参数就绪'
}
function selectNode(id: string) {
  selectedId.value = id
  graph.value.nodes.forEach((node) => { node.selected = node.id === id })
}
function connectionValid(connection: Connection) {
  // Apply this to Handles only: Vue Flow's global callback also revalidates existing
  // edges during setEdges(), where adding the edge again would falsely occupy its input.
  try { connectGraph(graph.value, connection); return true } catch { return false }
}
function connect(connection: Connection) {
  if (running.value) return
  try { graph.value.edges = connectGraph(graph.value, connection); notice.value = '端口已连接。输入端口只接受一个同类型输出。' }
  catch (error) { notice.value = (error as Error).message }
}
function connectFromPanel() {
  connect({ source: sourceId.value, sourceHandle: `out-${sourceSlot.value}`, target: targetId.value, targetHandle: `in-${targetSlot.value}` })
}
function updateWidget(key: string, event: Event) {
  if (!selected.value || running.value) return
  const values = selected.value.data.raw.widgets_values ?? []
  const element = event.target as HTMLInputElement
  const original = (values as Record<string, unknown>)[key]
  const value = typeof original === 'number' ? Number(element.value) : typeof original === 'boolean' ? element.value === 'true' : element.value
  if (typeof value === 'number' && !Number.isFinite(value)) return
  ;(values as Record<string, unknown>)[key] = value
  selected.value.data.raw.widgets_values = values
  widgetJson.value = JSON.stringify(values, null, 2)
  notice.value = '参数已保存在当前工作流。'
}
function applyWidgetJson() {
  if (!selected.value || running.value) return
  try {
    const value = JSON.parse(widgetJson.value)
    if (!value || typeof value !== 'object') throw new Error('widgets_values 必须是 JSON 数组或对象。')
    selected.value.data.raw.widgets_values = value
    notice.value = 'JSON 参数已应用。'
  } catch (error) { notice.value = (error as Error).message }
}
function cancelRun(message = '本地模拟已停止。') {
  stopSimulationClock()
  simulation = undefined
  running.value = false
  edgeStates.value = {}
  for (const track of signalTracks) track.packet.style.opacity = '0'
  for (const node of graph.value.nodes) if (node.data.status === 'running') node.data.status = 'idle'
  notice.value = message
}
async function run() {
  if (running.value) return
  try {
    if (!graph.value.nodes.length) throw new Error('请先添加节点或重置工作流。')
    validateGraph(graph.value)
    simulation = executionTimeline(graph.value.nodes.map(({ id }) => id), graph.value.edges)
    elapsed = 0
    running.value = true
    progress.value = 0
    edgeStates.value = {}
    graph.value.nodes.forEach((node) => { node.data.status = 'idle' })
    const plan = simulation
    await nextTick()
    if (!mounted || !running.value || simulation !== plan) return
    collectSignals()
    syncSimulationClock()
  } catch (error) { cancelRun((error as Error).message) }
}
async function reset() {
  cancelRun()
  graph.value = createDefaultWorkflow()
  selectNode('5')
  sourceId.value = '1'; targetId.value = '5'; sourceSlot.value = '0'; targetSlot.value = '0'
  progress.value = 0
  notice.value = '示例工作流已重置。'
  await nextTick()
  if (mounted && !mobile.value) void fitView({ padding: 0.13 })
}
function addPrompt() {
  if (running.value || graph.value.nodes.length >= 100) return
  const template = createDefaultWorkflow().nodes.find((node) => node.id === '2')!
  const id = Math.max(0, ...graph.value.nodes.map((node) => Number(node.id) || 0)) + 1
  template.id = String(id); template.data.raw.id = id
  template.data.label = `提示词 ${id}`; template.position = { x: 565, y: 300 }
  graph.value.nodes.push(template)
  selectNode(template.id)
  notice.value = '已添加提示词节点；可连接 CLIP 输入与 CONDITIONING 输出。'
}
function removeSelected() {
  if (running.value) return
  const id = selectedId.value
  graph.value.edges = graph.value.edges.filter((edge) => edge.source !== id && edge.target !== id)
  graph.value.nodes = graph.value.nodes.filter((node) => node.id !== id)
  selectNode(graph.value.nodes[0]?.id ?? '')
  notice.value = '节点及其连接已移除。'
}
async function loadJson() {
  if (running.value) return
  try {
    const imported = importWorkflow(importText.value)
    cancelRun()
    graph.value = imported
    selectNode(imported.nodes[0]!.id)
    sourceId.value = imported.nodes.find((node) => node.data.raw.outputs?.length)?.id ?? ''
    targetId.value = imported.nodes.find((node) => node.data.raw.inputs?.length)?.id ?? ''
    progress.value = 0
    showImport.value = false
    notice.value = `已导入 ${imported.nodes.length} 个节点、${imported.edges.length} 条连接。未知节点以通用参数卡呈现。`
    await nextTick()
    if (mounted && !mobile.value) void fitView({ padding: 0.13 })
  } catch (error) { notice.value = `导入失败：${(error as Error).message}` }
}
async function loadFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 2_000_000) { notice.value = '请选择 2 MB 以内的 Workflow JSON。'; input.value = ''; return }
  importText.value = await file.text()
  await loadJson()
  input.value = ''
}
function download() {
  try {
    const workflow = exportWorkflow(graph.value)
    const url = URL.createObjectURL(new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url; link.download = 'milk-white-workflow.json'; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    notice.value = '已导出 ComfyUI 前端 Workflow JSON 0.4；真实运行需要对应模型与后端。'
  } catch (error) { notice.value = `导出失败：${(error as Error).message}` }
}
</script>

<template>
  <section ref="studioElement" class="workflow-studio milk-relief milk-relief-card" aria-label="MILK 工作流编辑器" :data-motion-state="motionState">
    <div class="workflow-topline"><span class="engraved-label">WORKFLOW / 04</span><span class="workflow-mode"><i />{{ running ? '依赖路径传播中 · 本地模拟' : '本地工作流演示' }}</span></div>
    <div class="workflow-toolbar" role="toolbar" aria-label="工作流操作">
      <button class="wf-button wf-primary" type="button" @click="running ? cancelRun() : run()"><span aria-hidden="true">{{ running ? '■' : '▶' }}</span>{{ running ? '停止模拟' : '运行模拟' }}</button>
      <button class="wf-button" type="button" :disabled="running || graph.nodes.length >= 100" @click="addPrompt">＋ 添加提示词</button>
      <button class="wf-button" type="button" :disabled="running" @click="showImport = !showImport" :aria-expanded="showImport">导入 JSON</button>
      <button class="wf-button" type="button" :disabled="running" @click="download">导出 JSON ↓</button>
      <button class="wf-button wf-reset" type="button" @click="reset">重置</button>
    </div>
    <div v-if="showImport" class="workflow-import">
      <label :for="`${flowId}-json`">粘贴 ComfyUI 前端 Workflow JSON 0.4</label>
      <textarea :id="`${flowId}-json`" v-model="importText" :disabled="running" rows="5" spellcheck="false" placeholder='{"version":0.4,"nodes":[…],"links":[…]}' />
      <div><button class="wf-button wf-primary" type="button" :disabled="running" @click="loadJson">导入并验证</button><button class="wf-button" type="button" :disabled="running" @click="fileInput?.click()">选择 JSON 文件</button></div>
      <input ref="fileInput" type="file" accept=".json,application/json" class="file-input" aria-label="导入工作流 JSON 文件" @change="loadFile" />
    </div>
    <div class="workflow-body">
      <div v-show="!mobile" class="workflow-canvas">
        <div class="canvas-ruler" aria-hidden="true"><span>00</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
        <VueFlow :id="flowId" v-model:nodes="graph.nodes" v-model:edges="graph.edges" :default-edge-options="edgeOptions" :min-zoom="0.3" :max-zoom="1.6" :fit-view-on-init="true" :zoom-on-scroll="false" :pan-on-scroll="false" :nodes-draggable="!running" :nodes-connectable="!running" :edges-updatable="false" :is-valid-connection="null" :delete-key-code="running ? null : ['Backspace', 'Delete']" @connect="connect" @node-click="({ node }) => selectNode(node.id)">
          <template #edge-smoothstep="edge">
            <BaseEdge :id="edge.id" class="workflow-signal-route" :class="`signal-${edgeStates[edge.id] ?? 'idle'}`" :data-edge-id="edge.id" :path="signalPath(edge)" :marker-start="edge.markerStart" :marker-end="edge.markerEnd" :interaction-width="edge.interactionWidth" />
            <g class="workflow-signal-packet" aria-hidden="true"><circle class="signal-halo" r="6"/><circle class="signal-shell" r="3.2"/><circle class="signal-core" r="1.4"/></g>
          </template>
          <template #node-milk="{ id, data, selected: isSelected }">
            <div class="workflow-node milk-relief milk-relief-card" :class="[{ 'is-selected': isSelected || selectedId === id }, `is-${data.status}`]" :data-node-id="id" :data-node-status="data.status">
              <div class="node-header"><span class="node-index">{{ id.padStart(2, '0') }}</span><strong>{{ data.label }}</strong><span class="node-led" :aria-label="data.status" /></div>
              <div class="node-type">{{ data.classType }}</div>
              <div class="node-ports" :style="{ minHeight: `${Math.max(data.raw.inputs?.length ?? 0, data.raw.outputs?.length ?? 0, 1) * 24}px` }">
                <div class="input-ports"><div v-for="(port, index) in data.raw.inputs" :key="index" class="port-label"><Handle :id="`in-${index}`" type="target" :position="Position.Left" :is-valid-connection="connectionValid" :style="{ top: `${70 + index * 24}px` }" :aria-label="`${data.label} 输入 ${port.name}`" /><span>{{ port.name }}</span></div></div>
                <div class="output-ports"><div v-for="(port, index) in data.raw.outputs" :key="index" class="port-label"><span>{{ port.name }}</span><Handle :id="`out-${index}`" type="source" :position="Position.Right" :is-valid-connection="connectionValid" :style="{ top: `${70 + index * 24}px` }" :aria-label="`${data.label} 输出 ${port.name}`" /></div></div>
              </div>
              <div class="node-preview">{{ nodePreview(data) }}</div>
            </div>
          </template>
        </VueFlow>
        <div class="canvas-controls" role="group" aria-label="画布缩放"><button class="wf-button" type="button" aria-label="缩小画布" @click="zoomOut()">−</button><button class="wf-button" type="button" @click="fitView({ padding: 0.13 })">适合画布</button><button class="wf-button" type="button" aria-label="放大画布" @click="zoomIn()">＋</button></div>
        <span class="canvas-hint">拖动平移 · 端口连线 · 选中后方向键移动</span>
      </div>
      <div v-if="mobile" class="workflow-mobile-list" aria-label="工作流节点列表">
        <button v-for="node in graph.nodes" :key="node.id" type="button" class="mobile-node" :class="[{ active: selectedId === node.id }, `is-${node.data.status}`]" :aria-pressed="selectedId === node.id" :data-node-id="node.id" :data-node-status="node.data.status" @click="selectNode(node.id)"><span class="node-index">{{ node.id.padStart(2, '0') }}</span><span><strong>{{ node.data.label }}</strong><small>{{ node.data.classType }}</small></span><span class="mobile-state">{{ node.data.status === 'done' ? '✓' : node.data.status === 'running' ? '…' : '›' }}</span></button>
      </div>
      <aside class="workflow-inspector milk-relief milk-relief-card" aria-label="节点参数面板"><div class="inspector-content">
        <div class="inspector-heading"><span class="engraved-label">NODE / INSPECTOR</span><span>{{ selectedId ? `#${selectedId.padStart(2, '0')}` : '—' }}</span></div>
        <template v-if="selected">
          <label class="wf-field">节点名称<input v-model="selected.data.label" :disabled="running" maxlength="60" /></label>
          <p class="inspector-type">{{ selected.data.classType }}</p>
          <div v-for="widget in widgets" :key="`${selected.id}-${widget.key}-${typeof widget.value}`" class="wf-field">
            <label :for="`${flowId}-widget-${widget.key}`">{{ widget.label }}</label>
            <textarea v-if="typeof widget.value === 'string' && (widget.value.length > 60 || selected.data.classType === 'CLIPTextEncode')" :id="`${flowId}-widget-${widget.key}`" :value="widget.value" :disabled="running" rows="3" @input="updateWidget(widget.key, $event)" />
            <select v-else-if="typeof widget.value === 'boolean'" :id="`${flowId}-widget-${widget.key}`" :value="String(widget.value)" :disabled="running" @change="updateWidget(widget.key, $event)"><option value="true">true</option><option value="false">false</option></select>
            <input v-else-if="widget.value === null || typeof widget.value !== 'object'" :id="`${flowId}-widget-${widget.key}`" :type="typeof widget.value === 'number' ? 'number' : 'text'" :value="String(widget.value ?? '')" :step="typeof widget.value === 'number' ? 'any' : undefined" :disabled="running" @input="updateWidget(widget.key, $event)" />
            <code v-else>{{ JSON.stringify(widget.value) }}</code>
          </div>
          <p v-if="!widgets.length" class="inspector-note">此节点使用输入端口传递数据。</p>
          <details class="wf-details"><summary class="milk-relief milk-relief-control">原始 widgets_values</summary><label class="wf-field"><span class="sr-only">节点 widgets_values JSON</span><textarea v-model="widgetJson" :disabled="running" rows="5" spellcheck="false" /></label><button class="wf-button" type="button" :disabled="running" @click="applyWidgetJson">应用 JSON 参数</button></details>
          <button class="wf-button wf-remove" type="button" :disabled="running" @click="removeSelected">移除当前节点</button>
        </template>
        <p v-else class="inspector-note">选中一个节点，查看并调整它的参数。</p>
        <details class="wf-details connection-details"><summary class="milk-relief milk-relief-control">连接端口（支持键盘）</summary>
          <label class="wf-field">源节点<select v-model="sourceId" :disabled="running"><option v-for="node in graph.nodes.filter(item => item.data.raw.outputs?.length)" :key="node.id" :value="node.id">{{ node.data.label }}</option></select></label>
          <label class="wf-field">输出端口<select v-model="sourceSlot" :disabled="running"><option v-for="(port, index) in sourcePorts" :key="index" :value="String(index)">{{ port.name }} · {{ port.type }}</option></select></label>
          <label class="wf-field">目标节点<select v-model="targetId" :disabled="running"><option v-for="node in graph.nodes.filter(item => item.data.raw.inputs?.length)" :key="node.id" :value="node.id">{{ node.data.label }}</option></select></label>
          <label class="wf-field">输入端口<select v-model="targetSlot" :disabled="running"><option v-for="(port, index) in targetPorts" :key="index" :value="String(index)">{{ port.name }} · {{ port.type }}</option></select></label>
          <button class="wf-button" type="button" :disabled="running || !sourcePorts.length || !targetPorts.length" @click="connectFromPanel">连接所选端口</button>
        </details>
        <details class="wf-details"><summary class="milk-relief milk-relief-control">连接列表 · {{ graph.edges.length }}</summary><div v-for="edge in graph.edges" :key="edge.id" class="edge-row"><span>#{{ edge.source }} → #{{ edge.target }}<small>{{ edge.data?.portType }}</small></span><button class="wf-button" type="button" :disabled="running" :aria-label="`移除连接 ${edge.id}`" @click="graph.edges = graph.edges.filter(item => item.id !== edge.id)">×</button></div></details>
      </div></aside>
    </div>
    <div class="workflow-status"><span class="status-count">{{ String(progress).padStart(2, '0') }} / {{ String(graph.nodes.length).padStart(2, '0') }}</span><p role="status" aria-live="polite">{{ notice }}<span v-if="running && !clockAvailable" class="simulation-pause">{{ !pageVisible ? '后台暂停，返回后继续。' : '离屏暂停，进入视图后继续。' }}</span><span v-else-if="running && reducedMotion" class="simulation-pause">减少动态效果：仅显示执行状态。</span></p><span class="backend-label">未连接生成后端</span></div>
  </section>
</template>

<style scoped>
.workflow-studio { border:var(--milk-border-width,1px) solid transparent; color:var(--milk-ink,var(--milk-color-2e3540)); border-radius:24px; background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box; box-shadow:var(--milk-card-shadow); overflow:visible; text-align:left;
}
.workflow-topline { padding:22px 24px 14px; display:flex; align-items:center; justify-content:space-between; gap:12px;
}
.engraved-label { color:var(--milk-muted,var(--milk-color-5b6573)); font:600 10px/1.5 ui-monospace,monospace; letter-spacing:.15em; text-shadow:none;
}
.workflow-mode { display:flex; align-items:center; gap:7px; font-size:11px; color:var(--milk-color-5b6573);
}
.workflow-mode i { width:6px; height:6px; border-radius:50%; background:var(--milk-color-8a8a8a); box-shadow:none;
}
.workflow-toolbar { display:flex; gap:9px; flex-wrap:wrap; padding:0 24px 20px;
}
.wf-button { border:var(--milk-border-width,1px) solid transparent; appearance:none; display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:37px; padding:8px 13px; border-radius:999px; background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box; color:var(--milk-color-3f3f3f); font:inherit; font-size:11px; font-weight:600; line-height:1.4; cursor:pointer; box-shadow:var(--milk-button-shadow); text-shadow:none; ;
}
.wf-button:hover:not(:disabled) { border:var(--milk-border-width,1px) solid transparent; background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box; transform:none; box-shadow:var(--milk-hover-shadow);
}
.wf-button:active:not(:disabled) { transform:none; box-shadow:var(--milk-pressed); background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;}
.wf-button:focus-visible, .workflow-studio :is(summary,.mobile-node):focus-visible { outline:3px solid var(--milk-focus,var(--milk-color-6b7c93)); outline-offset:3px;
}
.wf-button:disabled { opacity:.5; cursor:not-allowed;
}
.wf-primary { border:var(--milk-border-width,1px) solid transparent; background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box; color:var(--milk-color-2e3540); text-shadow:none; box-shadow:var(--milk-button-shadow);
}
.wf-primary:hover:not(:disabled):not(:active) { border:var(--milk-border-width,1px) solid transparent; background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box; color:var(--milk-color-2e3540); box-shadow:var(--milk-hover-shadow);
}
.wf-reset { margin-left:auto;
}
.workflow-body { display:grid; grid-template-columns:minmax(0,1fr) 255px; border-top:var(--milk-border-width,1px) solid transparent; border-image:var(--milk-border-gradient) 1;
}
.workflow-canvas { position:relative; min-width:0; min-height:570px; box-shadow:var(--milk-control-shadow); border:var(--milk-border-width,1px) solid transparent; background:radial-gradient(var(--milk-edge) 1px,transparent 1px) 0 0/20px 20px padding-box,var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;
}
.workflow-canvas :deep(.vue-flow) { height:calc(570px - 2 * var(--milk-border-width,1px));
}
.workflow-canvas :deep(.vue-flow__selection), .workflow-canvas :deep(.vue-flow__nodesselection-rect) { background:var(--milk-color-8585850c); border:1px solid var(--milk-color-a0a0a0);
}
.workflow-canvas :deep(.vue-flow__connection-path) { stroke:var(--milk-color-454545);
}
.workflow-canvas :deep(.vue-flow__edge-path) { stroke:var(--milk-color-a8a8a8);
}
.workflow-canvas :deep(.vue-flow__node) { border:0; border-radius:13px; background:transparent;
}
.workflow-canvas :deep(.vue-flow__node:focus-visible) { outline:3px solid var(--milk-color-6b7c93); outline-offset:4px;
}
.workflow-canvas :deep(.vue-flow__handle) { border:var(--milk-border-width,1px) solid transparent; width:10px; height:10px; min-width:10px; min-height:10px; background:linear-gradient(var(--milk-color-b0b0b0),var(--milk-color-b0b0b0)) padding-box,var(--milk-border-gradient) border-box; box-shadow:none;
}
.workflow-canvas :deep(.vue-flow__edge.selected .vue-flow__edge-path) { stroke:var(--milk-color-2e3540); stroke-width:3;
}
.workflow-canvas :deep(.vue-flow__edge:focus-visible .vue-flow__edge-path) { stroke:var(--milk-color-2e3540); stroke-width:4;
}
.workflow-node { border:var(--milk-border-width,1px) solid transparent; position:relative; width:210px; padding:0 12px 10px; border-radius:18px; background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box; box-shadow:var(--milk-card-shadow);
}
.workflow-node.is-selected { outline:2px solid var(--milk-color-6b7c93); outline-offset:3px; box-shadow:var(--milk-card-hover-shadow);
}
.node-header { display:flex; gap:7px; align-items:center; padding:12px 0 7px;
}
.node-header strong { font-size:12px; line-height:1.4; text-shadow:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.node-index { border:var(--milk-border-width,1px) solid transparent; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; min-width:23px; height:23px; padding:2px 4px; background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box; border-radius:5px; box-shadow:var(--milk-control-shadow); color:var(--milk-color-5b6573); font:500 9px/1 ui-monospace,monospace;
}
.node-led { width:6px; height:6px; margin-left:auto; background:var(--milk-color-b0b0b0); border-radius:50%; box-shadow:none;
}
.is-running .node-led { background:var(--milk-color-6b7c93); box-shadow:none;
}
.is-done .node-led { background:var(--milk-color-8a8a8a);
}
.node-type { color:var(--milk-color-5b6573); font:9px/1.3 ui-monospace,monospace; padding-bottom:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.node-ports { display:grid; grid-template-columns:1fr 1fr; gap:7px;
}
.port-label { display:flex; align-items:center; height:24px; font:9px/1.3 ui-monospace,monospace; color:var(--milk-color-5b6573); white-space:nowrap;
}
.output-ports .port-label { justify-content:flex-end;
}
.port-label span { overflow:hidden; text-overflow:ellipsis;
}
.node-preview { border:var(--milk-border-width,1px) solid transparent; margin-top:7px; padding:6px 7px; border-radius:5px; background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box; color:var(--milk-color-5b6573); font:9px/1.5 ui-monospace,monospace; box-shadow:var(--milk-pressed); text-overflow:ellipsis; white-space:nowrap; overflow:hidden;
}
.canvas-ruler { display:flex; justify-content:space-between; position:absolute; z-index:2; left:0; right:0; top:0; height:22px; padding:3px 15px; border-bottom:var(--milk-border-width,1px) solid transparent; background:repeating-linear-gradient(90deg,transparent 0 19px,var(--milk-color-bcbcbc) 19px 20px) bottom/100% 4px no-repeat,var(--milk-warm,var(--milk-color-e9edf3)); color:var(--milk-color-5b6573); font:8px/1.4 ui-monospace,monospace; pointer-events:none; border-image:var(--milk-border-gradient) 1;
}
.canvas-controls { display:flex; gap:5px; position:absolute; left:16px; bottom:16px;
}
.canvas-controls .wf-button { min-height:32px; padding:6px 10px; font-size:10px;
}
.canvas-hint { position:absolute; right:15px; bottom:24px; font-size:9px; color:var(--milk-color-5b6573); pointer-events:none;
}
.workflow-inspector { border:var(--milk-border-width,1px) solid transparent; min-width:0; overflow:visible; background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box; box-shadow:var(--milk-card-shadow); padding:0;
}
.inspector-heading { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;
}
.inspector-heading>span:last-child { color:var(--milk-color-5b6573); font:10px ui-monospace,monospace;
}
.wf-field { display:flex; flex-direction:column; gap:6px; margin:0 0 13px; color:var(--milk-color-5b6573); font-size:10px; line-height:1.5;
}
.wf-field :is(input,textarea,select), .workflow-import textarea { border:var(--milk-border-width,1px) solid transparent; box-sizing:border-box; width:100%; min-width:0; border-radius:7px; padding:8px 9px; background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box; color:var(--milk-color-3f3f3f); font:inherit; font-size:11px; line-height:1.5; box-shadow:var(--milk-control-shadow);
}
.wf-field textarea { resize:vertical; min-height:65px;
}
.wf-field code { white-space:pre-wrap; overflow-wrap:anywhere; font-size:10px;
}
.wf-field :is(input,textarea,select):disabled { opacity:.6;
}
.inspector-type { margin:-6px 0 17px; color:var(--milk-color-5b6573); font:9px/1.5 ui-monospace,monospace; overflow-wrap:anywhere;
}
.inspector-note { font-size:11px; line-height:1.6; color:var(--milk-color-5b6573);
}
.wf-details { margin:15px 0 0; padding-top:12px; border-top:var(--milk-border-width,1px) solid transparent; border-image:var(--milk-border-gradient) 1;
}
.wf-details summary { border:var(--milk-border-width,1px) solid transparent; cursor:pointer; font-size:10px; color:var(--milk-color-575757); margin-bottom:12px; background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box; padding:6px 10px; border-radius:999px; width:fit-content; box-shadow:var(--milk-button-shadow);
}
.wf-details .wf-button { font-size:10px; min-height:33px;
}
.wf-remove { margin-top:12px; font-size:10px; width:100%;
}
.workflow-status { display:flex; align-items:center; gap:14px; padding:14px 24px; background:var(--milk-panel,var(--milk-color-eef1f5)); border-top:var(--milk-border-width,1px) solid transparent; border-image:var(--milk-border-gradient) 1;border-radius:0 0 21px 21px;}
.workflow-status p { flex:1; margin:0; color:var(--milk-color-5b6573); font-size:10px; line-height:1.7;
}
.status-count { color:var(--milk-color-3f3f3f); white-space:nowrap; font:10px/1.5 ui-monospace,monospace;
}
.backend-label { border:var(--milk-border-width,1px) solid transparent; padding:4px 7px; border-radius:999px; font-size:9px; color:var(--milk-color-5b6573); white-space:nowrap; background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box; box-shadow:var(--milk-button-shadow);
}
.workflow-import { padding:0 24px 20px;
}
.workflow-import>label { display:block; margin-bottom:8px; font-size:11px; color:var(--milk-color-575757);
}
.workflow-import textarea { min-height:120px; resize:vertical; font-family:ui-monospace,monospace;
}
.workflow-import>div { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;
}
.file-input { display:none;
}
.edge-row { display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:8px; font:10px ui-monospace,monospace; color:var(--milk-color-575757);
}
.edge-row small { display:block; color:var(--milk-color-5b6573); font-size:8px; margin-top:4px;
}
.edge-row .wf-button { min-width:32px; padding:4px 7px;
}
.workflow-mobile-list { display:none;
}
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;
}
@media (max-width: 1100px) {
.workflow-body { grid-template-columns:minmax(0,1fr) 225px;
}
.canvas-hint { display:none;
}
}
@media (max-width: 760px) {
.workflow-studio { border-radius:18px; box-shadow:var(--milk-card-shadow);
}
.workflow-topline { padding:18px 16px 13px; align-items:flex-start;
}
.workflow-mode { font-size:9px;
}
.workflow-toolbar { padding:0 16px 16px; gap:8px;
}
.wf-button { min-height:40px; padding:9px 11px; box-shadow:var(--milk-button-shadow); border-radius:999px;
}
.wf-reset { margin-left:0;
}
.workflow-body { display:block;
}
.workflow-mobile-list { display:grid; gap:20px; padding:20px; background:var(--milk-inset,var(--milk-color-e2e7ef)); border-bottom:var(--milk-border-width,1px) solid transparent; border-image:var(--milk-border-gradient) 1;
}
.mobile-node { border:var(--milk-border-width,1px) solid transparent; display:flex; align-items:center; gap:12px; width:100%; min-height:58px; padding:12px; text-align:left; color:var(--milk-color-3f3f3f); background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box; border-radius:18px; box-shadow:var(--milk-card-shadow);
}
.mobile-node:hover:not(:disabled):not(:active) { transform:none; box-shadow:var(--milk-card-hover-shadow);
}
.mobile-node:active { transform:none; box-shadow:var(--milk-pressed); background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;}
.mobile-node.active { outline:2px solid var(--milk-color-6b7c93); outline-offset:1px; box-shadow:var(--milk-card-hover-shadow);
}
.mobile-node strong { display:block; font-size:12px;
}
.mobile-node small { display:block; margin-top:4px; font:9px ui-monospace,monospace; color:var(--milk-color-5b6573);
}
.mobile-state { margin-left:auto; color:var(--milk-color-575757);
}
.workflow-inspector {  padding:0;  box-shadow:var(--milk-card-shadow);
}
.wf-field { font-size:11px;
}
.wf-field :is(input,select) { min-height:41px; font-size:12px;
}
.wf-details summary { font-size:11px; padding:5px 0; box-shadow:var(--milk-button-shadow); border-radius:999px;
}
.workflow-status { padding:14px 16px; gap:9px; align-items:flex-start; flex-wrap:wrap;border-radius:0 0 21px 21px;}
.workflow-status p { min-width:180px;
}
.workflow-import { padding:0 16px 16px;
}
}
@media (prefers-reduced-motion: reduce) {
.wf-button { transition:none; box-shadow:var(--milk-button-shadow); border-radius:999px;
}
.wf-button:hover:not(:disabled),.wf-button:active:not(:disabled) { transform:none;
}
}
.workflow-node.is-selected { background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box; box-shadow:var(--milk-card-hover-shadow);
}
.mobile-node.active { background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box; box-shadow:var(--milk-card-hover-shadow);
}
.mobile-node.active:active { background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box; box-shadow:var(--milk-pressed);
}
.inspector-content{max-height:calc(570px - 2 * var(--milk-border-width,1px));overflow-y:auto;padding:20px 18px;border-radius:inherit}
.wf-details summary:active{transform:none;background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-pressed)}
@media(max-width:760px){.inspector-content{max-height:none;padding:22px 18px}.workflow-status{border-radius:0 0 15px 15px}}
.workflow-studio :is(input:not([type=range]):not([type=checkbox]):not([type=radio]),textarea,select,[role=combobox]):is(:focus,:focus-visible){outline:none;outline-offset:0;border-color:transparent;box-shadow:var(--milk-pressed)}
.wf-field:focus-within,.workflow-import:focus-within{outline:none;outline-offset:0;box-shadow:none}

/* Signals belong to actual directed edges; resting geometry remains editable. */
.workflow-signal-route{transition:stroke .24s ease,stroke-width .24s ease}.workflow-canvas :deep(.workflow-signal-route.signal-running){stroke:var(--milk-color-6b7c93);stroke-width:2.8}.workflow-canvas :deep(.workflow-signal-route.signal-done){stroke:var(--milk-color-606060)}.workflow-signal-packet{opacity:0;pointer-events:none}.signal-halo{fill:var(--milk-color-6b7c93);opacity:.15}.signal-shell{fill:var(--milk-color-6b7c93);stroke:var(--milk-emission,#fbfcff);stroke-width:.7}.signal-core{fill:var(--milk-emission,#fbfcff)}.workflow-node{transition:transform .58s cubic-bezier(.22,.7,.25,1),box-shadow .58s ease}.workflow-node.is-running{transform:translateY(-4px);box-shadow:var(--milk-card-hover-shadow)}.workflow-node.is-running .node-header strong{color:var(--milk-ink,var(--milk-color-2e3540))}.is-running .node-led{background:var(--milk-color-6b7c93);box-shadow:0 0 0 3px color-mix(in srgb,var(--milk-color-6b7c93) 12%,transparent)}.is-done .node-led{background:var(--milk-color-606060)}.mobile-node.is-running{background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-card-hover-shadow)}.simulation-pause{display:block;margin-top:3px;color:var(--milk-color-6b7c93)}
@media(prefers-reduced-motion:reduce){.workflow-node,.workflow-signal-route{transition:none}.workflow-node.is-running{transform:none}}

/* Hold the pressed material through the shared damped return lifecycle. */
.workflow-studio :is(.wf-button,.mobile-node,summary)[data-milk-press="down"]:not(:disabled):not([aria-disabled="true"]){background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-pressed)}
</style>
