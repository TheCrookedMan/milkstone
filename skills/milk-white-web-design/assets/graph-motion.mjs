/** Original graph choreography helpers. No DOM, timers or framework state. */
export const graphEdgeKey = (from, to) => JSON.stringify([from, to])

/** All real ancestors of a target, with longest root-to-node hop counts. */
export function dependencyPath(nodeIds, edges, target) {
  const known = new Set(nodeIds)
  const parents = new Map(nodeIds.map((id) => [id, []]))
  for (const edge of edges) {
    if (!known.has(edge.from) || !known.has(edge.to)) throw new Error('关系包含不存在的节点。')
    parents.get(edge.to).push(edge.from)
  }
  const depths = new Map()
  const visiting = new Set()
  const visit = (id) => {
    if (depths.has(id)) return depths.get(id)
    if (visiting.has(id)) throw new Error('关系路径包含环路。')
    visiting.add(id)
    const incoming = parents.get(id)
    const depth = incoming.length ? 1 + Math.max(...incoming.map(visit)) : 0
    visiting.delete(id)
    depths.set(id, depth)
    return depth
  }
  if (known.has(target)) visit(target)
  const edgeDepths = new Map(edges.filter(({ from, to }) => depths.has(from) && depths.has(to)).map(({ from, to }) => [graphEdgeKey(from, to), depths.get(from)]))
  return { nodes: depths, edges: edgeDepths }
}

export function motionValue(tween, now) {
  const u = Math.max(0, Math.min(1, (now - tween.start) / tween.duration))
  const eased = 1 - (1 - u) ** 3
  return tween.from + (tween.to - tween.from) * eased
}

/** Retarget from the visible pose, including during a previous delayed transition. */
export function retargetMotion(tween, to, now, delay = 0, duration = 580) {
  return { from: motionValue(tween, now), to, start: now + delay, duration: Math.max(1, duration) }
}

/** Parallel DAG simulation: outputs travel only after their source has finished. */
export function executionTimeline(nodeIds, edges, nodeDuration = 620, signalDuration = 360) {
  if (!(nodeDuration > 0) || !(signalDuration > 0)) throw new Error('执行与传播时长必须大于零。')
  const known = new Set(nodeIds)
  if (known.size !== nodeIds.length) throw new Error('节点 id 重复。')
  const incoming = new Map(nodeIds.map((id) => [id, []]))
  const outgoing = new Map(nodeIds.map((id) => [id, []]))
  const edgeIds = new Set()
  for (const edge of edges) {
    if (!known.has(edge.source) || !known.has(edge.target)) throw new Error('工作流包含悬空连接。')
    if (edgeIds.has(edge.id)) throw new Error('连接 id 重复。')
    edgeIds.add(edge.id)
    incoming.get(edge.target).push(edge)
    outgoing.get(edge.source).push(edge)
  }
  const pending = new Map(nodeIds.map((id) => [id, incoming.get(id).length]))
  const queue = nodeIds.filter((id) => !pending.get(id))
  const byId = new Map()
  const nodes = [], signals = []
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index]
    const start = Math.max(0, ...incoming.get(id).map((edge) => byId.get(edge.source).end + signalDuration))
    const node = { id, start, end: start + nodeDuration }
    nodes.push(node); byId.set(id, node)
    for (const edge of outgoing.get(id)) {
      signals.push({ id: edge.id, source: id, target: edge.target, start: node.end, end: node.end + signalDuration })
      pending.set(edge.target, pending.get(edge.target) - 1)
      if (!pending.get(edge.target)) queue.push(edge.target)
    }
  }
  if (nodes.length !== nodeIds.length) throw new Error('该编辑器支持无环工作流；请先移除环路。')
  const boundaries = [...new Set([...nodes, ...signals].flatMap(({ start, end }) => [start, end]))].sort((a, b) => a - b)
  return { nodes, edges: signals, duration: Math.max(0, ...nodes.map(({ end }) => end)), boundaries }
}

export function executionSnapshot(plan, elapsed) {
  const time = Math.max(0, elapsed)
  const nodes = new Map(plan.nodes.map(({ id, start, end }) => [id, time >= end ? 'done' : time >= start ? 'running' : 'idle']))
  const edges = new Map(plan.edges.map(({ id, start, end }) => [id, time >= end ? { state: 'done', progress: 1 } : time >= start ? { state: 'running', progress: (time - start) / (end - start) } : { state: 'idle', progress: 0 }]))
  return { nodes, edges, completed: [...nodes.values()].filter((status) => status === 'done').length, done: time >= plan.duration }
}
