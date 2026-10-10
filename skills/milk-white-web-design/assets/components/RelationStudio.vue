<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import StellarGraph from './StellarGraph.vue'

type GraphNode = { id: string; title: string; subtitle: string; x: number; y: number; detail: string; kind?: 'core' }
type GraphEdge = { from: string; to: string }
const componentId = useId().replace(/:/g, '')
const mode = ref<'neural' | 'octopus' | 'stellar'>('neural')
const selectedId = ref('compose')
const studioElement = ref<HTMLElement>()
const svgElement = ref<SVGSVGElement>()
const userPaused = ref(false)
const reducedMotion = ref(false)
const inView = ref(true)
const pageVisible = ref(true)
const flowRunning = computed(() => mode.value !== 'stellar' && !userPaused.value && !reducedMotion.value && inView.value && pageVisible.value)
const flowState = computed(() => mode.value === 'stellar' ? 'stellar' : reducedMotion.value ? 'reduced-motion' : userPaused.value ? 'paused' : !pageVisible.value ? 'background' : !inView.value ? 'offscreen' : 'running')
const flowStateLabel = computed(() => ({ stellar: '', 'reduced-motion': '减少动态效果 · 电流静止', paused: '电流已暂停', background: '后台暂停', offscreen: '离屏暂停', running: '电流流动中' })[flowState.value])

type FlowPacket = { element: SVGGElement; tail: SVGPathElement; tailCore: SVGPathElement; offset: number }
type FlowTrack = { path: SVGPathElement; length: number; duration: number; packets: FlowPacket[] }
let tracks: FlowTrack[] = []
let frame = 0
let previousTime: number | undefined
let elapsed = 0
let intersection: IntersectionObserver | undefined
let motionQuery: MediaQueryList | undefined
const neuralNodes: GraphNode[] = [
  { id: 'prompt', title: '文本', subtitle: 'INPUT 01', x: 75, y: 105, detail: '提示词是创作的起点，沿连线传递方向与约束。此图展示示例数据流。' },
  { id: 'image', title: '图像', subtitle: 'INPUT 02', x: 75, y: 245, detail: '参考图像进入流程，与文本一同构成视觉线索。' },
  { id: 'encode', title: '编码', subtitle: 'LAYER 01', x: 260, y: 85, detail: '文本与图像在此转为后续处理所需的表示。选中节点，可沿高亮连线查看直接关联。' },
  { id: 'compose', title: '融合', subtitle: 'LAYER 02', x: 450, y: 175, kind: 'core', detail: '两路输入在这里汇合，形成共同表示。分层与连线呈现示例依赖，未接入真实模型。' },
  { id: 'condition', title: '条件', subtitle: 'LAYER 01', x: 260, y: 265, detail: '尺寸、风格与条件在此汇入，让后续步骤沿明确的方向展开。' },
  { id: 'output', title: '结果', subtitle: 'OUTPUT', x: 655, y: 175, detail: '依赖关系在此收束，标记示例流程的结果端。' },
]
const neuralEdges: GraphEdge[] = [
  { from: 'prompt', to: 'encode' }, { from: 'prompt', to: 'condition' },
  { from: 'image', to: 'encode' }, { from: 'image', to: 'condition' },
  { from: 'encode', to: 'compose' }, { from: 'condition', to: 'compose' },
  { from: 'compose', to: 'output' },
]
const octopusNodes: GraphNode[] = [
  { id: 'compose', title: '创作中枢', subtitle: 'CENTRAL HUB', x: 365, y: 175, kind: 'core', detail: '以创作中枢为中心，将文本、图像与工作流展开成分支。这是一张放射式关系图，每条连线对应一项关联。' },
  { id: 'prompt', title: '文本', subtitle: 'BRANCH 01', x: 155, y: 65, detail: '提示词、标题与说明，共同勾勒创作的方向。' },
  { id: 'image', title: '图像', subtitle: 'BRANCH 02', x: 365, y: 45, detail: '参考图与生成图，为想法补上视觉线索。' },
  { id: 'motion', title: '动态', subtitle: 'BRANCH 03', x: 575, y: 65, detail: '视频、转场与时间线，为内容安排节奏。' },
  { id: 'workflow', title: '工作流', subtitle: 'BRANCH 04', x: 655, y: 200, detail: '节点与端口将创作步骤排成有序的流程。' },
  { id: 'assets', title: '素材', subtitle: 'BRANCH 05', x: 545, y: 300, detail: '图片、组件与模板，组成可复用素材的示例分支。' },
  { id: 'review', title: '验收', subtitle: 'BRANCH 06', x: 185, y: 300, detail: '从可读性到操作反馈，为每一个细节留出检查的尺度。' },
  { id: 'data', title: '数据', subtitle: 'BRANCH 07', x: 75, y: 200, detail: '图表、指标与表格，让数值和尺度彼此对应。' },
]
const nodes = computed(() => mode.value === 'neural' ? neuralNodes : octopusNodes)
const edges = computed(() => mode.value === 'neural' ? neuralEdges : octopusNodes.filter(node => node.id !== 'compose').map(node => ({ from: 'compose', to: node.id })))
const selected = computed(() => nodes.value.find(node => node.id === selectedId.value) ?? nodes.value[0]!)
const connections = computed(() => edges.value.filter(edge => edge.from === selectedId.value || edge.to === selectedId.value).length)
const connectedIds = computed(() => new Set(edges.value.filter(edge => edge.from === selectedId.value || edge.to === selectedId.value).flatMap(edge => [edge.from, edge.to])))
function changeMode(next: 'neural' | 'octopus' | 'stellar') { mode.value = next; selectedId.value = 'compose' }
function edgePath(edge: GraphEdge) {
  const from = nodes.value.find(node => node.id === edge.from)!
  const to = nodes.value.find(node => node.id === edge.to)!
  if (mode.value === 'neural') return `M ${from.x + 34} ${from.y} C ${from.x + 110} ${from.y}, ${to.x - 110} ${to.y}, ${to.x - 41} ${to.y}`
  const dx = to.x - from.x, dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  const x1 = from.x + dx / length * 43, y1 = from.y + dy / length * 43
  const x2 = to.x - dx / length * 40, y2 = to.y - dy / length * 40
  return `M ${x1} ${y1} Q ${(x1 + x2) / 2 + (dy > 0 ? 18 : -18)} ${(y1 + y2) / 2} ${x2} ${y2}`
}
function isActiveEdge(edge: GraphEdge) { return edge.from === selectedId.value || edge.to === selectedId.value }

// Only SVG attributes change per frame; Vue's state tree is not updated at frame rate.
// Pausing stops the clock, so resuming continues from the same point on each path.
function collectTracks() {
  const svg = svgElement.value
  tracks = svg ? Array.from(svg.querySelectorAll<SVGPathElement>('.current-route')).map((path, index) => {
    const length = path.getTotalLength()
    const packets = Array.from(svg.querySelectorAll<SVGGElement>(`.current-packet[data-edge-index="${index}"]`)).map((element, packetIndex) => ({
      element, tail: element.querySelector<SVGPathElement>('.current-tail')!,
      tailCore: element.querySelector<SVGPathElement>('.current-tail-core')!,
      offset: (index * 0.137 + packetIndex * 0.5) % 1,
    }))
    return { path, length, duration: Math.max(4400, length / 38 * 1000) + index * 170, packets }
  }) : []
}
function paintCurrent() {
  for (const track of tracks) for (const packet of track.packets) {
    const distance = ((elapsed / track.duration + packet.offset) % 1) * track.length
    const head = track.path.getPointAtLength(distance)
    packet.element.setAttribute('transform', `translate(${head.x.toFixed(2)} ${head.y.toFixed(2)})`)
    packet.element.style.opacity = String(Math.min(1, distance / 12, (track.length - distance) / 12) * 0.94 + 0.06)
    const tailPath = (size: number) => Array.from({ length: 6 }, (_, index) => {
      const point = track.path.getPointAtLength(Math.max(0, distance - size * (1 - index / 5)))
      return `${index ? 'L' : 'M'} ${(point.x - head.x).toFixed(2)} ${(point.y - head.y).toFixed(2)}`
    }).join(' ')
    packet.tail.setAttribute('d', tailPath(23))
    packet.tailCore.setAttribute('d', tailPath(13))
  }
}
function stopCurrent() {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
  previousTime = undefined
}
function animateCurrent(time: number) {
  frame = 0
  if (!flowRunning.value) { previousTime = undefined; return }
  if (previousTime !== undefined) elapsed += Math.min(time - previousTime, 80)
  previousTime = time
  paintCurrent()
  frame = requestAnimationFrame(animateCurrent)
}
function syncCurrent() {
  stopCurrent()
  if (flowRunning.value && tracks.length) frame = requestAnimationFrame(animateCurrent)
}
function updateMotion() { reducedMotion.value = motionQuery?.matches ?? false }
function updateVisibility() { pageVisible.value = document.visibilityState !== 'hidden' }
watch([userPaused, reducedMotion, inView, pageVisible], syncCurrent, { flush: 'post' })
watch(mode, async () => {
  stopCurrent()
  await nextTick()
  collectTracks()
  paintCurrent()
  syncCurrent()
}, { flush: 'post' })
onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotion()
  updateVisibility()
  motionQuery.addEventListener('change', updateMotion)
  document.addEventListener('visibilitychange', updateVisibility)
  if (studioElement.value) {
    intersection = new IntersectionObserver(entries => {
      inView.value = entries.some(entry => entry.isIntersecting)
    }, { threshold: 0 })
    intersection.observe(studioElement.value)
  }
  collectTracks()
  paintCurrent()
  syncCurrent()
})
onBeforeUnmount(() => {
  stopCurrent()
  intersection?.disconnect()
  motionQuery?.removeEventListener('change', updateMotion)
  document.removeEventListener('visibilitychange', updateVisibility)
  tracks = []
})
</script>

<template>
  <article ref="studioElement" class="panel relation-studio" :aria-labelledby="`${componentId}-title`" :data-flow-state="flowState">
    <header class="relation-header"><div><span class="instrument-label">02 / RELATION INSTRUMENT</span><h3 :id="`${componentId}-title`">让关联，在光中成形。</h3></div><div class="graph-switch milk-relief milk-relief-tabbar" role="group" aria-label="关系图类型"><button type="button" :aria-pressed="mode === 'neural'" @click="changeMode('neural')">神经网络</button><button type="button" :aria-pressed="mode === 'octopus'" @click="changeMode('octopus')">章鱼图</button><button type="button" :aria-pressed="mode === 'stellar'" @click="changeMode('stellar')">星空图</button></div></header>
    <StellarGraph v-show="mode === 'stellar'"/>
    <template v-if="mode !== 'stellar'">
    <div class="relation-caption"><span class="engraved-tag">{{ mode === 'neural' ? 'LAYERED / 分层依赖' : 'RADIAL / 中心与分支' }}</span><div class="relation-actions"><button type="button" class="flow-toggle" :aria-pressed="userPaused" :disabled="reducedMotion" @click="userPaused = !userPaused">{{ reducedMotion ? '电流已静止' : userPaused ? '继续电流 ▶' : '暂停电流 Ⅱ' }}</button><button type="button" class="reset-button" @click="selectedId = 'compose'">重置选择 ↺</button></div></div>
    <div class="graph-surface">
      <div class="ruler" aria-hidden="true"><span>00</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
      <div class="graph-scroll"><svg ref="svgElement" class="relation-svg" viewBox="0 0 730 350" role="img" :aria-labelledby="`${componentId}-graph-title ${componentId}-graph-desc`">
        <title :id="`${componentId}-graph-title`">{{ mode === 'neural' ? '分层神经关系图示例' : '章鱼放射关系图示例' }}</title><desc :id="`${componentId}-graph-desc`">点击节点可查看详情；键盘用户可使用图下方的节点选择按钮完成同样操作。当前选择：{{ selected.title }}。</desc>
        <defs><filter :id="`${componentId}-current-glow`" filterUnits="userSpaceOnUse" x="-36" y="-36" width="72" height="72"><feGaussianBlur stdDeviation="1.5"/></filter><linearGradient :id="`${componentId}-node`" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--milk-raised,var(--milk-color-fbfcff))"/><stop offset="1" stop-color="var(--milk-warm,var(--milk-color-e9edf3))"/></linearGradient><marker :id="`${componentId}-arrow`" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5 Z" fill="var(--milk-color-8c8c8c)"/></marker></defs>
        <g class="graph-edges" fill="none"><path v-for="edge in edges" :key="`${edge.from}-${edge.to}`" class="current-route" :d="edgePath(edge)" :class="{ active: isActiveEdge(edge) }" :marker-end="`url(#${componentId}-arrow)`"/></g>
        <g class="graph-currents" aria-hidden="true"><template v-for="(edge, edgeIndex) in edges" :key="`${edge.from}-${edge.to}`"><g v-for="packet in 2" :key="packet" class="current-packet" :class="{ active: isActiveEdge(edge) }" :data-edge-index="edgeIndex"><path class="current-tail" :filter="`url(#${componentId}-current-glow)`"/><path class="current-tail-core"/><circle class="current-halo" r="4.5" :filter="`url(#${componentId}-current-glow)`"/><circle class="current-shell" r="2.8"/><circle class="current-core" r="1.4"/></g></template></g>
        <g v-for="node in nodes" :key="node.id" class="graph-node" :class="{ selected: selectedId === node.id, connected: connectedIds.has(node.id), core: node.kind === 'core' }" :transform="`translate(${node.x},${node.y})`" @click="selectedId = node.id">
          <circle class="selection-ring" :r="node.kind === 'core' ? 46 : 39"/><circle class="node-face" stroke="var(--milk-border-color)" :r="node.kind === 'core' ? 38 : 32" :fill="`url(#${componentId}-node)`"/><circle class="node-ring" :r="node.kind === 'core' ? 31 : 25"/><text class="node-title" dy="5">{{ node.title }}</text><text class="node-label" :y="node.kind === 'core' ? 60 : 55">{{ node.subtitle }}</text>
        </g>
      </svg></div>
      <div class="graph-status"><span><i aria-hidden="true"/>{{ nodes.length }} 个节点 · {{ edges.length }} 条连线</span><span class="current-status">{{ flowStateLabel }}</span><span>点击节点查看关联</span></div>
    </div>
    <div class="node-selector" role="group" aria-label="选择关系节点"><button v-for="node in nodes" :key="node.id" type="button" :aria-pressed="selectedId === node.id" @click="selectedId = node.id">{{ node.title }}</button></div>
    <div class="node-detail milk-relief milk-relief-card" role="status" aria-live="polite"><span class="detail-number">{{ String(nodes.findIndex(node => node.id === selectedId) + 1).padStart(2, '0') }}</span><div><strong>{{ selected.title }}<small>{{ connections }} 个直接关联</small></strong><p>{{ selected.detail }}</p></div></div>
    </template>
  </article>
</template>

<style scoped>
.relation-studio{padding:30px;min-width:0;color:var(--milk-color-2e3540);box-shadow:var(--milk-card-shadow)}.relation-header{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}.instrument-label{font-size:10px;letter-spacing:.13em;font-weight:700;color:var(--milk-color-5b6573);text-shadow:none}.relation-header h3{font-size:22px;margin:5px 0 0;letter-spacing:-.035em}.graph-switch{border:var(--milk-border-width,1px) solid transparent;display:flex;flex-wrap:wrap;flex:none;max-width:100%;gap:5px;padding:5px;border-radius:999px;background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-control-shadow)}.graph-switch button{border:var(--milk-border-width,1px) solid transparent;padding:8px 12px;border-radius:999px;font-size:11px;background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box;box-shadow:none;color:var(--milk-color-5b6573);min-height:38px}.graph-switch button[aria-pressed=true]{border:var(--milk-border-width,1px) solid transparent;background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;color:var(--milk-color-2e3540);box-shadow:var(--milk-button-shadow)}.graph-switch button:hover{transform:none}.graph-switch button:active{transform:none;box-shadow:var(--milk-pressed);background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;}.relation-caption{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;margin:22px 0 12px;gap:8px}.relation-actions{display:flex;flex-wrap:wrap;align-items:center;gap:13px}.flow-toggle{border:var(--milk-border-width,1px) solid transparent;border-radius:999px;padding:5px 10px;min-height:32px;font-size:10px;background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box;color:var(--milk-color-3f3f3f);box-shadow:var(--milk-button-shadow)}.flow-toggle[aria-pressed=true]{border:var(--milk-border-width,1px) solid transparent;background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-button-shadow)}.flow-toggle:hover{transform:none}.flow-toggle:active{transform:none;box-shadow:var(--milk-pressed);background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;}.current-status{color:var(--milk-color-575757)}.engraved-tag{font-size:10px;letter-spacing:.08em;color:var(--milk-color-5b6573);text-shadow:none}.reset-button{font-size:11px;border:var(--milk-border-width,1px) solid transparent;box-shadow:var(--milk-button-shadow);background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box;border-radius:999px;padding:6px 10px;color:var(--milk-color-4d4d4d);min-height:34px}.reset-button:hover{transform:none;box-shadow:var(--milk-hover-shadow)}.graph-surface{border:var(--milk-border-width,1px) solid transparent;border-radius:18px;padding:14px 15px 12px;background:radial-gradient(var(--milk-edge,var(--milk-color-d1d8e3)) 0.7px,transparent 0.7px) 0 0/17px 17px padding-box,var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-control-shadow);overflow:hidden}.ruler{height:20px;display:flex;justify-content:space-between;align-items:flex-end;padding:0 0 0;font-size:8px;color:var(--milk-color-707070);background:repeating-linear-gradient(90deg,var(--milk-color-c4c4c4) 0 1px,transparent 1px 10px) left top/100% 5px no-repeat;box-shadow:none}.ruler span{padding-top:8px}.graph-scroll{overflow:auto;scrollbar-width:thin;scrollbar-color:var(--milk-color-606060) transparent}.relation-svg{display:block;width:100%;height:auto;overflow:visible}.graph-edges path{stroke:var(--milk-color-b6b6b6);stroke-width:1.5;transition:stroke .18s,stroke-width .18s}.graph-edges path.active{stroke:var(--milk-color-606060);stroke-width:2.5}.graph-currents{pointer-events:none}.current-tail,.current-tail-core{fill:none;stroke-linecap:round;stroke-linejoin:round}.current-tail{stroke:var(--milk-color-858585);stroke-width:6;opacity:.15}.current-tail-core{stroke:var(--milk-color-8d8d8d);stroke-width:2.4;opacity:.72}.current-halo{fill:#b5b5b5;opacity:.65}.current-shell{fill:#808080;stroke:var(--milk-emission,#fbfcff);stroke-width:.6}.current-core{fill:var(--milk-emission,#fbfcff)}.current-packet.active .current-tail{stroke:var(--milk-color-737373);opacity:.22}.current-packet.active .current-tail-core{stroke:var(--milk-color-737373);opacity:.95}.current-packet.active .current-halo{fill:#b5b5b5;opacity:.9}.current-packet.active .current-shell{fill:var(--milk-color-737373)}.graph-node{cursor:pointer}.selection-ring{fill:none;stroke:transparent;stroke-width:1.5}.selected .selection-ring{stroke:var(--milk-color-2e3540);stroke-dasharray:3 4}.node-face{stroke-width:var(--milk-border-width,1px);vector-effect:non-scaling-stroke}.node-ring{fill:none;stroke:var(--milk-highlight);stroke-width:1}.core .node-face{fill:var(--milk-warm,var(--milk-color-e9edf3))}.node-title{text-anchor:middle;font-size:13px;fill:var(--milk-color-2e3540);font-weight:600;paint-order:stroke;stroke:var(--milk-raised,var(--milk-color-fbfcff));stroke-width:1px}.node-label{text-anchor:middle;font-size:8px;letter-spacing:.8px;fill:var(--milk-color-707070)}.graph-status{display:flex;justify-content:space-between;gap:10px;color:var(--milk-color-5b6573);font-size:10px;padding-top:7px}.graph-status>span:first-child{display:flex;align-items:center;gap:6px}.graph-status i{width:5px;height:5px;background:var(--milk-color-bdbdbd);border-radius:50%}.node-selector{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.node-selector button{border:var(--milk-border-width,1px) solid transparent;padding:6px 12px;font-size:11px;min-height:36px;border-radius:999px;box-shadow:var(--milk-button-shadow);background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box}.node-selector button[aria-pressed=true]{border:var(--milk-border-width,1px) solid transparent;background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-button-shadow);color:var(--milk-color-2e3540)}.node-selector button:hover{transform:none}.node-selector button:active{transform:none;box-shadow:var(--milk-pressed);background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;}.node-detail{display:flex;align-items:flex-start;gap:13px;border:var(--milk-border-width,1px) solid transparent;margin-top:20px;padding:17px;min-height:94px;border-radius:14px;background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-card-shadow)}.detail-number{border:var(--milk-border-width,1px) solid transparent;display:flex;align-items:center;justify-content:center;width:31px;height:31px;flex:none;border-radius:8px;font-size:11px;color:var(--milk-color-606060);background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-control-shadow);text-shadow:none}.node-detail strong{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:13px;font-weight:600}.node-detail small{font-size:10px;font-weight:400;color:var(--milk-color-5b6573)}.node-detail p{margin:5px 0 0;font-size:12px;color:var(--milk-color-5b6573);line-height:1.75}:focus-visible{outline:3px solid var(--milk-color-6b7c93);outline-offset:4px}@media(max-width:600px){.relation-studio{padding:20px;box-shadow:var(--milk-card-shadow)}.relation-header{align-items:flex-start;gap:12px;flex-wrap:wrap}.relation-header h3{font-size:19px}.instrument-label{font-size:9px}.graph-switch{padding:4px;gap:2px;width:100%;box-shadow:var(--milk-control-shadow);background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;border-radius:999px}.graph-switch button{flex:1;box-shadow:none;border-radius:999px}.graph-switch button{padding:7px 11px;box-shadow:none;border-radius:999px}.relation-caption{margin-top:16px;gap:10px}.relation-actions{gap:12px;justify-content:space-between;width:100%}.graph-surface{padding:12px 8px 10px;box-shadow:var(--milk-control-shadow)}.relation-svg{min-width:600px;min-height:288px}.graph-status{font-size:9px;flex-wrap:wrap;gap:4px}.node-selector{gap:8px;margin-top:16px}.node-selector button{padding:7px 11px;box-shadow:var(--milk-button-shadow);border-radius:999px}.node-detail{min-height:126px;box-shadow:var(--milk-card-shadow)}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important}}.reset-button:active{background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;transform:none;box-shadow:var(--milk-pressed);}

.graph-switch button[aria-pressed=false]:not(:active){background:transparent;border-color:transparent;box-shadow:none}

/* Hold the pressed material through the shared damped return lifecycle. */
.relation-studio button[data-milk-press="down"]:not(:disabled):not([aria-disabled="true"]){background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-pressed)}
</style>
