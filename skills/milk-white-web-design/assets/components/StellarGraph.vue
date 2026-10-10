<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import StellarSurface from './StellarSurface.vue'

type SkinId = 'star' | 'rock' | 'gas' | 'ringed' | 'ice'
type StellarNode = { id: string; name: string; relation: string; orbit: number; radius: number; phase: number; orbitRate: number; spinRate: number; skin: SkinId }
const uid = `stellar-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const root = ref<HTMLElement>()
const surface = ref<HTMLElement>()
const compact = ref(false)
const nodes: StellarNode[] = [
  { id: 'core', name: '创作恒星', relation: '主体 · 五条轨道共同环绕的中心', orbit: 0, radius: 43, phase: 0, orbitRate: 0, spinRate: 11, skin: 'star' },
  { id: 'thought', name: '灵感', relation: '想法与文字在此汇聚，为创作定下方向。', orbit: 1, radius: 16, phase: 212, orbitRate: 18, spinRate: 30, skin: 'rock' },
  { id: 'visual', name: '视觉', relation: '图像与颜色围绕主体，展开视觉的层次。', orbit: 2, radius: 23, phase: 32, orbitRate: 13, spinRate: 22, skin: 'gas' },
  { id: 'motion', name: '动态', relation: '让动画与节奏，在时间中有序展开。', orbit: 3, radius: 21, phase: 138, orbitRate: 10, spinRate: 17, skin: 'ringed' },
  { id: 'workflow', name: '工作流', relation: '用步骤与依赖，串起想法成形的过程。', orbit: 4, radius: 19, phase: 305, orbitRate: 7, spinRate: 26, skin: 'ice' },
  { id: 'archive', name: '素材库', relation: '为可复用的素材留一条轨道，与主体持续相连。', orbit: 5, radius: 25, phase: 193, orbitRate: 5, spinRate: 14, skin: 'rock' },
]
const skinPresets: { id: SkinId; label: string; note: string; tint: string }[] = [
  { id: 'star', label: '恒星', note: '太阳光球 · 翻涌等离子体、日冕与日珥', tint: '#7c7c7c' },
  { id: 'rock', label: '岩石行星', note: '岩石地貌 · 陨坑、起伏与明暗交界', tint: '#999999' },
  { id: 'gas', label: '气态行星', note: '木星云带 · 纬向气流、湍流与风暴', tint: '#b0b0b0' },
  { id: 'ringed', label: '星环行星', note: '土星云层 · 倾斜环面与前后遮挡', tint: '#c0c0c0' },
  { id: 'ice', label: '冰晶行星', note: '冰质表面 · 冰层、裂隙与银灰反光', tint: '#cccccc' },
]
// Swatches describe real body materials; the page theme does not invert their light.
const skinOptions = computed(() => skinPresets)
const skins = ref<Record<string, SkinId>>(Object.fromEntries(nodes.map(node => [node.id, node.skin])))
const selectedId = ref('core')
const selected = computed(() => nodes.find(node => node.id === selectedId.value) ?? nodes[0]!)
const selectedSkin = computed({ get: () => skins.value[selected.value.id]!, set: (skin: SkinId) => { skins.value[selected.value.id] = skin } })
const selectedSkinInfo = computed(() => skinOptions.value.find(skin => skin.id === selectedSkin.value)!)
const orbitSpeed = ref(1)
const spinSpeed = ref(1)
const wantsMotion = ref(true)
const reducedMotion = ref(false)
const documentVisible = ref(true)
const inViewport = ref(false)
const elapsed = ref(0)
const orbitElapsed = ref(0)
const spinElapsed = ref(0)
const moving = computed(() => wantsMotion.value && !reducedMotion.value && documentVisible.value && inViewport.value)
const status = computed(() => reducedMotion.value ? '静态呈现 · 系统已减少动态效果' : !wantsMotion.value ? '已暂停 · 星体保持当前位置' : !documentVisible.value || !inViewport.value ? '等待画布进入视区' : '星体运行中 · 公转 / 自转')
const viewBox = computed(() => compact.value ? '-230 -230 460 460' : '-400 -230 800 460')
const orbitScale = computed(() => compact.value ? 0.53 : 1)
const orbitRx = (orbit: number) => (55 + orbit * 57) * orbitScale.value
// Reserve 58 viewBox units below the outer orbit for the largest body,
// the ring system and its upright label, including a skin changed by the user.
const orbitRy = (orbit: number) => 54 + orbit * 23.6
const angle = (node: StellarNode) => (node.phase + orbitElapsed.value * node.orbitRate / 1000) % 360
const spin = (node: StellarNode) => spinElapsed.value * node.spinRate / 1000 % 360
function position(node: StellarNode) {
  if (!node.orbit) return { x: 0, y: 0 }
  const radians = angle(node) * Math.PI / 180
  return { x: Math.cos(radians) * orbitRx(node.orbit), y: Math.sin(radians) * orbitRy(node.orbit) }
}
// A 12° axis cone faces the subject. Its phase comes only from the orbit,
// never from axial spin: exactly one complete lean cycle per revolution.
function axisPose(node: StellarNode) {
  if (!node.orbit) return { tilt: 0, lean: 0, tiltPhase: 0 }
  const theta = angle(node) * Math.PI / 180
  const obliquity = 12 * Math.PI / 180
  return {
    tilt: Math.atan2(-Math.sin(obliquity) * Math.cos(theta), Math.cos(obliquity)) * 180 / Math.PI,
    lean: Math.asin(-Math.sin(obliquity) * Math.sin(theta)) * 180 / Math.PI,
    tiltPhase: angle(node),
  }
}
const positionedNodes = computed(() => nodes.map(node => {
  const point = position(node)
  const distance = Math.hypot(point.x, point.y) || 1
  return { ...node, ...point, ...axisPose(node), spin: spin(node), angle: angle(node), skin: skins.value[node.id]!, lightX: -point.x / distance, lightY: point.y / distance }
}))
const depthSortedNodes = computed(() => [...positionedNodes.value].sort((a, b) => a.y - b.y))
const satellites = computed(() => positionedNodes.value.filter(node => node.orbit))
// A seeded background remains stable across selections, resizes and animation frames.
const backgroundStars = Array.from({ length: 84 }, (_, index) => {
  const seed = Math.sin((index + 1) * 127.1) * 43758.5453
  const seed2 = Math.sin((index + 1) * 311.7) * 92735.3519
  return { x: (seed - Math.floor(seed)) * 780 - 390, y: (seed2 - Math.floor(seed2)) * 440 - 220, radius: index % 17 === 0 ? 1.5 : 0.7, opacity: 0.2 + (index % 5) * 0.12 }
})
function reset() {
  skins.value = Object.fromEntries(nodes.map(node => [node.id, node.skin]))
  selectedId.value = 'core'; orbitSpeed.value = 1; spinSpeed.value = 1; elapsed.value = 0; orbitElapsed.value = 0; spinElapsed.value = 0; wantsMotion.value = true
}
let frame = 0
let lastTime = 0
let motionQuery: MediaQueryList | undefined
let intersection: IntersectionObserver | undefined
let resize: ResizeObserver | undefined
function animate(time: number) {
  if (!moving.value) { frame = 0; lastTime = 0; return }
  if (lastTime) {
    const delta = Math.min(time - lastTime, 80)
    elapsed.value += delta
    orbitElapsed.value += delta * orbitSpeed.value
    spinElapsed.value += delta * spinSpeed.value
  }
  lastTime = time
  frame = requestAnimationFrame(animate)
}
function syncAnimation() {
  if (frame) cancelAnimationFrame(frame)
  frame = 0; lastTime = 0
  if (moving.value) frame = requestAnimationFrame(animate)
}
function onMotionChange(event: MediaQueryListEvent) { reducedMotion.value = event.matches }
function syncViewport() {
  const bounds = surface.value?.getBoundingClientRect()
  inViewport.value = Boolean(bounds && bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.right > 0 && bounds.top < window.innerHeight && bounds.left < window.innerWidth)
}
function onVisibilityChange() { documentVisible.value = !document.hidden; syncViewport() }
const stopWatch = watch(moving, syncAnimation)
onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = motionQuery.matches
  motionQuery.addEventListener('change', onMotionChange)
  documentVisible.value = !document.hidden
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('scroll', syncViewport, { passive: true })
  window.addEventListener('resize', syncViewport, { passive: true })
  if (root.value) {
    compact.value = root.value.clientWidth < 530
    resize = new ResizeObserver(entries => { compact.value = (entries[0]?.contentRect.width ?? 800) < 530; syncViewport() })
    resize.observe(root.value)
    intersection = new IntersectionObserver(syncViewport, { threshold: 0 })
    if (surface.value) intersection.observe(surface.value)
    syncViewport()
  }
  syncAnimation()
})
onBeforeUnmount(() => {
  stopWatch()
  if (frame) cancelAnimationFrame(frame)
  intersection?.disconnect(); resize?.disconnect()
  motionQuery?.removeEventListener('change', onMotionChange)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('scroll', syncViewport)
  window.removeEventListener('resize', syncViewport)
})
</script>

<template>
  <section ref="root" class="stellar-graph" :aria-labelledby="`${uid}-title`">
    <div class="stellar-toolbar">
      <div><span class="etched-label">ORBITAL / 主体与环绕关系</span><h4 :id="`${uid}-title`">围绕一个中心，想法自成星系。</h4></div>
      <div class="stellar-actions"><button type="button" class="motion-button" :disabled="reducedMotion" :aria-pressed="wantsMotion && !reducedMotion" @click="wantsMotion = !wantsMotion">{{ wantsMotion && !reducedMotion ? 'Ⅱ 暂停动画' : '▷ 继续动画' }}</button><button type="button" @click="reset">重置星系 ↺</button></div>
    </div>
    <div ref="surface" class="stellar-surface" :class="{ 'is-still': !moving }">
      <div class="space-readout" aria-hidden="true"><span><i :class="{ lit: moving }" />ORBITAL FIELD</span><span>06 BODIES / 05 ORBITS</span></div>
      <svg class="stellar-svg" :viewBox="viewBox" role="img" :aria-labelledby="`${uid}-svg-title ${uid}-svg-desc`">
        <title :id="`${uid}-svg-title`">围绕创作主体运行的星空关系图</title>
        <desc :id="`${uid}-svg-desc`">五颗行星分别沿完整轨道环绕中心太阳。太阳表面水平自转并呈现翻涌日冕，行星在自转中轻微倾向主体，倾斜方向随公转一圈变化一圈。可点击星体，或使用图下方按钮选择同一节点。当前选择 {{ selected.name }}，皮肤为 {{ selectedSkinInfo.label }}。</desc>
        <defs>
          <radialGradient :id="`${uid}-space`"><stop stop-color="var(--milk-raised,var(--milk-color-fbfcff))"/><stop offset=".65" stop-color="var(--milk-canvas,var(--milk-color-f3f5f7))"/><stop offset="1" stop-color="var(--milk-panel,var(--milk-color-eef1f5))"/></radialGradient>
        </defs>
        <rect x="-400" y="-230" width="800" height="460" :fill="`url(#${uid}-space)`"/>
        <g aria-hidden="true" fill="var(--milk-emission,#fbfcff)"><circle v-for="(star, index) in backgroundStars" :key="index" :cx="star.x" :cy="star.y" :r="star.radius" :opacity="star.opacity"/></g>
        <g class="orbital-guides" aria-hidden="true" fill="none"><ellipse v-for="node in satellites" :key="node.id" :data-orbit-id="node.id" :rx="orbitRx(node.orbit)" :ry="orbitRy(node.orbit)" :class="{ selected: selectedId === node.id }"/></g>
        <g v-for="node in depthSortedNodes" :key="node.id" class="stellar-body" :class="{ 'is-selected': selectedId === node.id }" :transform="`translate(${node.x}, ${node.y})`" :data-star-id="node.id" :data-skin="node.skin" :data-orbit-angle="node.angle.toFixed(3)" :data-spin-angle="node.spin.toFixed(3)" :data-tilt-angle="node.tilt.toFixed(3)" :data-lean-angle="node.lean.toFixed(3)" :data-tilt-phase="node.tiltPhase.toFixed(3)" @click="selectedId = node.id">
          <circle class="body-hit" :r="Math.max(node.radius + 12, 27)"/>
          <foreignObject :x="-node.radius * 1.8" :y="-node.radius * 1.8" :width="node.radius * 3.6" :height="node.radius * 3.6" class="body-render" aria-hidden="true">
            <StellarSurface :skin="node.skin" :spin="node.spin" :tilt="node.tilt" :lean="node.lean" :light-x="node.lightX" :light-y="node.lightY" :time="elapsed / 1000"/>
          </foreignObject>
          <circle class="body-selection" :r="node.radius + (node.skin === 'star' ? 15 : 8)"/>
          <text class="body-name" :y="node.orbit && node.y < -25 ? -node.radius - 15 : node.radius + (node.skin === 'star' ? 27 : node.skin === 'ringed' ? 24 : 21)">{{ node.name }}</text>
          <text v-if="!node.orbit" class="body-core-label" y="-76">CENTRAL SUN</text>
        </g>
      </svg>
      <div class="space-footer"><span>星体自转 · 倾斜与公转同周期</span><span>选择星体 · 调整表面</span></div>
    </div>
    <p class="motion-status" role="status"><i aria-hidden="true" :class="{ lit: moving }"/>{{ status }}</p>
    <div class="stellar-selector" role="group" aria-label="选择星空关系节点"><button v-for="node in nodes" :key="node.id" type="button" :aria-pressed="selectedId === node.id" @click="selectedId = node.id"><i aria-hidden="true" :style="{ '--skin-color': skinOptions.find(skin => skin.id === skins[node.id])!.tint }"/>{{ node.name }}</button></div>
    <div class="stellar-inspector milk-relief milk-relief-card">
      <div class="stellar-detail"><span class="etched-label">{{ selected.orbit ? `ORBIT ${String(selected.orbit).padStart(2, '0')}` : 'CENTRAL SUBJECT' }}</span><strong>{{ selected.name }}<small>{{ selected.orbit ? '1 条主体关联' : '5 条轨道关联' }}</small></strong><p>{{ selected.relation }}</p></div>
      <div class="skin-control"><label :for="`${uid}-skin`">星体表面</label><select :id="`${uid}-skin`" v-model="selectedSkin"><option v-for="skin in skinOptions" :key="skin.id" :value="skin.id">{{ skin.label }}</option></select><span>{{ selectedSkinInfo.note }}</span></div>
      <div class="speed-control"><label :for="`${uid}-orbit-speed`">公转速度 <output :for="`${uid}-orbit-speed`">{{ orbitSpeed.toFixed(2) }}×</output></label><input :id="`${uid}-orbit-speed`" v-model.number="orbitSpeed" type="range" min="0.25" max="2" step="0.25"/><div class="speed-ticks" aria-hidden="true"><span>慢 / 0.25</span><span>标准 / 1.00</span><span>快 / 2.00</span></div></div>
      <div class="speed-control"><label :for="`${uid}-spin-speed`">自转速度 <output :for="`${uid}-spin-speed`">{{ spinSpeed.toFixed(2) }}×</output></label><input :id="`${uid}-spin-speed`" v-model.number="spinSpeed" type="range" min="0.25" max="2" step="0.25"/><div class="speed-ticks" aria-hidden="true"><span>慢 / 0.25</span><span>标准 / 1.00</span><span>快 / 2.00</span></div></div>
    </div>
  </section>
</template>

<style scoped>
.stellar-graph{min-width:0;margin-top:21px;color:var(--milk-color-2e3540)}.stellar-toolbar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:15px}.etched-label{font-size:9px;font-weight:700;letter-spacing:.11em;color:var(--milk-color-5b6573);text-shadow:none}.stellar-toolbar h4{margin:5px 0 0;font-size:17px;letter-spacing:-.02em;font-weight:600}.stellar-actions{display:flex;flex-wrap:wrap;gap:8px}.stellar-actions button,.stellar-selector button{border:var(--milk-border-width,1px) solid transparent;min-height:37px;padding:7px 12px;border-radius:999px;background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-button-shadow);font-size:11px;color:var(--milk-color-3f3f3f);text-shadow:none}.stellar-actions button:hover:not(:disabled){transform:none;box-shadow:var(--milk-hover-shadow)}.stellar-selector button:hover{transform:none}.stellar-actions button:active:not(:disabled),.stellar-selector button[aria-pressed]:active{transform:none;box-shadow:var(--milk-pressed);background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;}.stellar-actions button:disabled{opacity:.55;cursor:default}.stellar-surface{border:var(--milk-border-width,1px) solid transparent;overflow:hidden;border-radius:17px;background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-control-shadow);position:relative}.space-readout,.space-footer{display:flex;justify-content:space-between;gap:12px;position:relative;z-index:1;color:var(--milk-color-5b6573);font-size:8px;font-weight:500;letter-spacing:.1em;padding:15px 18px 0;text-shadow:none;pointer-events:none}.space-readout>span:first-child{display:flex;align-items:center;gap:6px}.space-readout i,.motion-status i{display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--milk-color-a0a0a0)}.space-readout i.lit{background:var(--milk-color-818181);box-shadow:none}.stellar-svg{display:block;max-width:100%;width:100%;height:auto;min-height:280px;margin:-8px 0 -5px;isolation:isolate}.space-footer{padding:0 18px 13px;font-size:9px;font-weight:400;letter-spacing:0;color:var(--milk-color-5b6573);line-height:1.6}.orbital-guides ellipse{stroke:var(--milk-color-b5b5b5);stroke-opacity:.55;stroke-width:.9;vector-effect:non-scaling-stroke}.orbital-guides ellipse.selected{stroke:var(--milk-color-858585);stroke-opacity:.85;stroke-width:1.5}.stellar-body{cursor:pointer}.body-hit{fill:transparent;pointer-events:all}.body-render{overflow:visible;pointer-events:none}.body-selection{fill:none;stroke:transparent;stroke-width:1.1;stroke-dasharray:2 4}.is-selected .body-selection{stroke:var(--milk-color-2e3540);stroke-opacity:.8}.body-name{text-anchor:middle;fill:var(--milk-color-2e3540);font-size:12px;letter-spacing:.05em;font-weight:500;paint-order:stroke;stroke:var(--milk-canvas,var(--milk-color-f3f5f7));stroke-width:3px;stroke-linejoin:round;pointer-events:none}.body-core-label{text-anchor:middle;fill:var(--milk-color-606060);font-size:7px;letter-spacing:1.4px;pointer-events:none}.motion-status{display:flex;align-items:center;gap:7px;margin:11px 0 0;color:var(--milk-color-5b6573);font-size:10px;line-height:1.6;min-height:16px}.motion-status i{flex:none}.motion-status i.lit{background:var(--milk-color-818181)}.stellar-selector{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 20px}.stellar-selector button{box-shadow:var(--milk-button-shadow);display:flex;align-items:center;gap:7px;padding:7px 11px;background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box}.stellar-selector button[aria-pressed=true]{border:var(--milk-border-width,1px) solid transparent;background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;color:var(--milk-color-2e3540);box-shadow:var(--milk-button-shadow)}.stellar-selector i{width:8px;height:8px;border-radius:50%;background:var(--skin-color);box-shadow:none}.stellar-inspector{display:grid;grid-template-columns:1.25fr 1fr;gap:20px 26px;border:var(--milk-border-width,1px) solid transparent;padding:18px;border-radius:14px;background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-card-shadow)}.stellar-detail strong{display:flex;align-items:center;gap:12px;font-size:14px;margin-top:5px}.stellar-detail small{font-size:10px;font-weight:400;color:var(--milk-color-5b6573)}.stellar-detail p{font-size:12px;color:var(--milk-color-5b6573);line-height:1.7;margin:5px 0 0}.skin-control{display:flex;flex-direction:column;align-items:stretch;gap:7px;min-width:0}.skin-control label,.speed-control label{font-size:11px;font-weight:600;text-shadow:none;color:var(--milk-color-505050)}.skin-control select{border:var(--milk-border-width,1px) solid transparent;width:100%;min-width:0;padding:9px 11px;min-height:39px;border-radius:9px;background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;color:var(--milk-color-2e3540);font-size:12px;box-shadow:var(--milk-control-shadow);cursor:pointer}.skin-control>span{font-size:10px;color:var(--milk-color-5b6573);line-height:1.5}.speed-control{min-width:0}.speed-control label{display:flex;align-items:center;justify-content:space-between;gap:8px}.speed-control output{border:var(--milk-border-width,1px) solid transparent;font-family:ui-monospace,monospace;font-size:11px;font-weight:500;color:var(--milk-color-505050);padding:3px 7px;border-radius:5px;background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-control-shadow)}.speed-control input{width:100%;display:block;margin:13px 0 7px;accent-color:var(--milk-color-3f3f3f);cursor:pointer;min-height:20px;padding:0;border:0;border-radius:0;background:none;box-shadow:none}.speed-ticks{display:flex;justify-content:space-between;gap:5px;font-size:8px;color:var(--milk-color-707070);background:repeating-linear-gradient(90deg,var(--milk-color-bcbcbc) 0 1px,transparent 1px 12.5%) left top / 100% 4px no-repeat;padding-top:9px}:focus-visible{outline:3px solid var(--milk-color-6b7c93);outline-offset:4px}@media(max-width:600px){.stellar-graph{margin-top:16px}.stellar-toolbar{flex-wrap:wrap;gap:11px}.stellar-toolbar h4{font-size:16px}.stellar-actions{width:100%;gap:8px}.stellar-actions button{font-size:10px;flex:1;padding:7px 9px}.stellar-surface{border-radius:13px;box-shadow:var(--milk-control-shadow)}.space-readout{padding:13px 12px 0;font-size:7px;gap:6px;letter-spacing:.07em}.space-readout>span:last-child{font-size:6px;letter-spacing:.02em}.stellar-svg{min-height:280px;margin:0}.space-footer{padding:0 12px 12px;font-size:8px;gap:8px}.space-footer>span:last-child{display:none}.stellar-selector{gap:7px;margin-bottom:18px}.stellar-selector button{font-size:10px;padding:7px 9px;min-height:36px;box-shadow:var(--milk-button-shadow)}.stellar-inspector{grid-template-columns:1fr;gap:18px;padding:16px;box-shadow:var(--milk-card-shadow)}.stellar-detail strong{font-size:13px}.stellar-detail p{font-size:11px}.skin-control select{font-size:12px;box-shadow:var(--milk-control-shadow)}.speed-control input{min-height:25px}.speed-ticks{font-size:8px}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important}}

.skin-control select:is(:focus,:focus-visible){outline:none;outline-offset:0;border-color:transparent;box-shadow:var(--milk-pressed)}
.speed-control input[type=range]:is(:focus,:focus-visible){outline:none;outline-offset:0;border-color:transparent;box-shadow:none;accent-color:var(--milk-focus,var(--milk-color-6b7c93))}
.skin-control:focus-within,.speed-control:focus-within{outline:none;outline-offset:0;box-shadow:none}

/* Hold the pressed material through the shared damped return lifecycle. */
.stellar-graph button[data-milk-press="down"]:not(:disabled):not([aria-disabled="true"]){background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-pressed)}
</style>
