<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { THEME_EVENT, isDark, themeColor } from '../theme-controller'

// All scene elements share one world projection: Y is vertical, X / Z lie on the ground.
const SCAN_CYCLE = 5000
const TAU = Math.PI * 2
const instanceId = useId()
const canvas = ref<HTMLCanvasElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const elapsed = ref(0)
const phase = ref(0)
const illuminated = ref(0)
const paused = ref(false)
const particles = ref(true)
const reducedMotion = ref(false)
const motionOptIn = ref(false)
const visible = ref(true)
const inViewport = ref(true)
const mounted = ref(false)
const canvasSupported = ref(true)
const animationState = computed(() => {
  if (paused.value) return 'paused'
  if (reducedMotion.value && !motionOptIn.value) return 'reduced-motion'
  if (!visible.value) return 'background'
  if (!inViewport.value) return 'offscreen'
  return mounted.value ? 'running' : 'ready'
})
const running = computed(() => animationState.value === 'running')
const stateLabel = computed(() => ({ running: '扫描运行中', paused: '扫描已暂停', 'reduced-motion': '静态预览 · 减少动态效果', background: '后台暂停', offscreen: '离屏暂停', ready: '准备扫描' }[animationState.value]))
const playLabel = computed(() => animationState.value === 'reduced-motion' ? '播放扫描' : paused.value ? '继续扫描' : '暂停扫描')
const cycles = computed(() => Math.floor(elapsed.value / SCAN_CYCLE))

interface Point { x: number; y: number; z: number }
interface ScreenPoint { x: number; y: number }
interface Building { x: number; z: number; width: number; depth: number; height: number; floors: number; id: string }
const buildings: Building[] = [
  { x: -140, z: -110, width: 48, depth: 44, height: 110, floors: 13, id: 'A01' },
  { x: -22, z: -135, width: 54, depth: 50, height: 154, floors: 18, id: 'A02' },
  { x: 112, z: -85, width: 48, depth: 56, height: 120, floors: 14, id: 'A03' },
  { x: -155, z: 20, width: 62, depth: 50, height: 88, floors: 10, id: 'B01' },
  { x: 128, z: 45, width: 55, depth: 56, height: 158, floors: 19, id: 'B02' },
  { x: -62, z: 125, width: 64, depth: 48, height: 74, floors: 9, id: 'C01' },
  { x: 58, z: 142, width: 54, depth: 40, height: 98, floors: 12, id: 'C02' },
]
const contactTimes = buildings.map(() => Number.NEGATIVE_INFINITY)
const entryTimes = buildings.map(() => Number.NEGATIVE_INFINITY)
const contacts = buildings.map(() => false)
const trees = [ [-194,-87], [-181,-145], [26,-173], [165,-118], [-191,73], [-145,100], [167,104], [113,177], [-99,168], [9,191] ]
// A deterministic field keeps reset, snapshots and independent instances reproducible.
const motes = Array.from({ length: 62 }, (_, index) => {
  const a = Math.sin(index * 127.1 + 43.7) * 43758.5453
  const b = Math.sin(index * 269.5 + 19.1) * 19937.511
  const c = Math.sin(index * 53.3 + 91.2) * 32719.713
  return { x: (a - Math.floor(a) - .5) * 570, z: (b - Math.floor(b) - .5) * 500, y: (c - Math.floor(c)) * 215, size: index % 9 === 0 ? 4.2 : 1.2 + index % 4 * .45, speed: .32 + index % 5 * .1, seed: index * 1.31 }
})
let ctx: CanvasRenderingContext2D | null = null
let surfaceColors = { raised: '#eef0f4', canvas: '#e9eaee', panel: '#ebedf1' }
let width = 0, height = 0, pixelRatio = 1, sceneScale = 1
let activeElapsed = 0, previousFrame: number | null = null, frameId = 0, lastReadout = -100
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let mediaQuery: MediaQueryList | null = null
let buildingLayers: { image: HTMLCanvasElement; x: number; y: number; width: number; height: number }[] = []
const wrap = (value: number) => (value % TAU + TAU) % TAU
function project(x: number, y: number, z: number): ScreenPoint {
  return { x: width * .5 + (x - z) * .82 * sceneScale, y: height * .58 + (x + z) * .34 * sceneScale - y * .93 * sceneScale }
}
function path(points: Point[], close = true) {
  if (!ctx || !points.length) return
  ctx.beginPath()
  points.forEach((point, index) => { const p = project(point.x, point.y, point.z); if (index === 0) ctx!.moveTo(p.x, p.y); else ctx!.lineTo(p.x, p.y) })
  if (close) ctx.closePath()
}
function polygon(points: Point[], fill: string, stroke?: string, lineWidth = .7, physical = false) {
  if (!ctx) return
  path(points)
  // Scene faces and emissive windows retain their light source in both themes.
  ctx.fillStyle = physical ? fill : themeColor(fill); ctx.fill()
  if (stroke) { ctx.strokeStyle = physical ? stroke : themeColor(stroke); ctx.lineWidth = lineWidth; ctx.stroke() }
}
function line(points: Point[], color: string, lineWidth = .6) {
  if (!ctx) return
  path(points, false); ctx.strokeStyle = themeColor(color); ctx.lineWidth = lineWidth; ctx.stroke()
}
function groundRing(radius: number, color: string, lineWidth = .6) {
  if (!ctx) return
  const points = Array.from({ length: 97 }, (_, i) => ({ x: Math.cos(i / 96 * TAU) * radius, y: .2, z: Math.sin(i / 96 * TAU) * radius }))
  line(points, color, lineWidth)
}
function updateContacts(time: number) {
  const sweep = time / SCAN_CYCLE * TAU
  buildings.forEach((building, index) => {
    const footprint = Math.atan2(Math.hypot(building.width, building.depth) * .38, Math.hypot(building.x, building.z))
    const bearing = wrap(Math.atan2(building.z, building.x) + Math.PI / 2)
    const firstEntry = bearing - footprint
    const recentEntry = firstEntry + Math.floor((sweep - firstEntry) / TAU) * TAU
    const entryTime = recentEntry / TAU * SCAN_CYCLE
    const exitTime = (recentEntry + footprint * 2) / TAU * SCAN_CYCLE
    // Derive the latest complete swept interval, including wraparound and dropped frames.
    // Before a building's first pass, there is no invented previous-cycle afterglow.
    entryTimes[index] = exitTime < 0 ? Number.NEGATIVE_INFINITY : entryTime
    contactTimes[index] = exitTime < 0 ? Number.NEGATIVE_INFINITY : Math.min(time, exitTime)
    contacts[index] = time >= entryTime && time <= exitTime
  })
}
function glowFor(index: number, time: number) {
  const age = time - contactTimes[index]
  return age > 2600 ? 0 : Math.exp(-age / 730)
}
function syncReadout(time: number, force = false) {
  if (!force && time - lastReadout < 100) return
  elapsed.value = Math.round(time)
  phase.value = Math.round(wrap(time / SCAN_CYCLE * TAU) / TAU * 3600) / 10
  illuminated.value = buildings.filter((_, index) => glowFor(index, time) > .16).length
  lastReadout = time
}
function drawGround(theta: number) {
  if (!ctx) return
  polygon([{ x:-225,y:0,z:-225 },{ x:225,y:0,z:-225 },{ x:225,y:0,z:225 },{ x:-225,y:0,z:225 }], '#e5e5e580', '#a8a8a830')
  for (let n = -210; n <= 210; n += 30) {
    line([{ x:n,y:0,z:-225 },{ x:n,y:0,z:225 }], n === 0 ? '#9a9a9a42' : '#a0a0a026')
    line([{ x:-225,y:0,z:n },{ x:225,y:0,z:n }], n === 0 ? '#9a9a9a42' : '#a0a0a026')
  }
  polygon([{ x:-220,y:.1,z:67 },{ x:220,y:.1,z:67 },{ x:220,y:.1,z:79 },{ x:-220,y:.1,z:79 }], '#b0b0b024')
  polygon([{ x:24,y:.1,z:-220 },{ x:35,y:.1,z:-220 },{ x:35,y:.1,z:220 },{ x:24,y:.1,z:220 }], '#b0b0b024')
  for (const radius of [80, 155, 230]) groundRing(radius, '#a5a5a54a', radius === 230 ? .9 : .6)
  // The fan is a horizontal X/Z plane, not a screen-space circle.
  const fan: Point[] = [{ x:0,y:.6,z:0 }]
  for (let i = 0; i <= 36; i++) { const a = theta - .55 + i / 36 * .55; fan.push({ x:Math.cos(a)*242,y:.6,z:Math.sin(a)*242 }) }
  const center = project(0, .6, 0)
  const edge = project(Math.cos(theta)*242, .6, Math.sin(theta)*242)
  const fanGradient = ctx.createRadialGradient(center.x,center.y,0,center.x,center.y,255*sceneScale)
  fanGradient.addColorStop(0,themeColor('#a0a0a014')); fanGradient.addColorStop(.7,themeColor('#9a9a9a1c')); fanGradient.addColorStop(1,themeColor('#9a9a9a03'))
  path(fan); ctx.fillStyle=fanGradient; ctx.fill()
  ctx.save(); ctx.shadowColor='#ffffff'; ctx.shadowBlur=12
  const beam = ctx.createLinearGradient(center.x,center.y,edge.x,edge.y)
  beam.addColorStop(0,'#7676768c'); beam.addColorStop(.8,'#838383b0'); beam.addColorStop(1,'#93939355')
  ctx.beginPath();ctx.moveTo(center.x,center.y);ctx.lineTo(edge.x,edge.y);ctx.strokeStyle=beam;ctx.lineWidth=1.35;ctx.stroke();ctx.restore()
  groundRing(8, '#808080a0', .9)
  ctx.beginPath();ctx.arc(center.x,center.y,2.3,0,TAU);ctx.fillStyle=themeColor('#808080');ctx.fill()
}
function drawTree(x: number, z: number) {
  if (!ctx) return
  const top=project(x,18,z), base=project(x,0,z)
  ctx.save();ctx.filter='blur(.65px)'
  ctx.strokeStyle=themeColor('#92929260');ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(top.x,top.y);ctx.stroke()
  const radius=8*sceneScale
  const halo=ctx.createRadialGradient(top.x,top.y,0,top.x,top.y,radius)
  halo.addColorStop(0,themeColor('#9b9b9b50'));halo.addColorStop(.65,themeColor('#a0a0a030'));halo.addColorStop(1,themeColor('#99999900'))
  ctx.fillStyle=halo;ctx.beginPath();ctx.arc(top.x,top.y,radius,0,TAU);ctx.fill();ctx.restore()
}
function drawBuilding(building: Building, index: number, time: number, lightingOnly = false) {
  if (!ctx) return
  const { x,z,width:w,depth:d,height:h,floors }=building
  const x0=x-w/2,x1=x+w/2,z0=z-d/2,z1=z+d/2
  const glow=lightingOnly ? glowFor(index,time) : 0
  if(lightingOnly && glow<.025)return
  const floorHeight=h/floors
  const base=project(x,0,z)
  ctx.save();ctx.filter=lightingOnly?'none':'blur(.55px)'
  if(!lightingOnly) {
  const shadow=ctx.createRadialGradient(base.x,base.y,1,base.x,base.y,w*sceneScale*.85)
  shadow.addColorStop(0,isDark()?`rgba(0,0,0,${.20+glow*.04})`:`rgba(175,175,175,${.10+glow*.04})`);shadow.addColorStop(1,'#00000000')
  ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(base.x,base.y,w*sceneScale*.85,d*sceneScale*.4,0,0,TAU);ctx.fill()
  polygon([{x:x0-5,y:0,z:z0-5},{x:x1+5,y:0,z:z0-5},{x:x1+5,y:0,z:z1+5},{x:x0-5,y:0,z:z1+5}], '#b6b6b63b','#b6b6b660', .7, true)
  polygon([{x:x1,y:0,z:z0},{x:x1,y:0,z:z1},{x:x1,y:h,z:z1},{x:x1,y:h,z:z0}], '#a0a0a07a','#a4a4a480', .7, true)
  polygon([{x:x0,y:0,z:z1},{x:x1,y:0,z:z1},{x:x1,y:h,z:z1},{x:x0,y:h,z:z1}], '#b7b7b78a','#b2b2b290', .7, true)
  polygon([{x:x0,y:h,z:z0},{x:x1,y:h,z:z0},{x:x1,y:h,z:z1},{x:x0,y:h,z:z1}], '#d7d7d770','#bfbfbf90', .7, true)
  }
  const age=time-entryTimes[index]
  const bandHeight=Math.min(1,Math.max(0,age/1150))*h
  for(let floor=1;floor<=floors;floor++) {
    const y=floor*floorHeight-1.2
    const layer=glow*(.18+.82*Math.exp(-Math.pow((y-bandHeight)/(h*.24),2)))
    const alpha=(lightingOnly ? 0 : .045)+layer*.63
    polygon([{x:x0,y:y-.9,z:z1+.25},{x:x1,y:y-.9,z:z1+.25},{x:x1,y:y+.7,z:z1+.25},{x:x0,y:y+.7,z:z1+.25}],`rgba(239,239,239,${alpha})`, undefined, .7, true)
    polygon([{x:x1+.25,y:y-.9,z:z0},{x:x1+.25,y:y-.9,z:z1},{x:x1+.25,y:y+.7,z:z1},{x:x1+.25,y:y+.7,z:z0}],`rgba(226,226,226,${alpha*.75})`, undefined, .7, true)
    for(let column=0;column<5;column++) {
      const windowOn=(floor+column*3+index)%5!==0
      const intensity=windowOn ? (lightingOnly ? 0 : .09)+layer*.7 : (lightingOnly ? 0 : .035)+layer*.12
      const left=x0+3+column*(w-6)/5, right=left+(w-6)/5*.57
      polygon([{x:left,y:y-5.2,z:z1+.4},{x:right,y:y-5.2,z:z1+.4},{x:right,y:y-2,z:z1+.4},{x:left,y:y-2,z:z1+.4}],`rgba(234,234,234,${intensity})`, undefined, .7, true)
      const near=z0+3+column*(d-6)/5, far=near+(d-6)/5*.56
      polygon([{x:x1+.4,y:y-5.2,z:near},{x:x1+.4,y:y-5.2,z:far},{x:x1+.4,y:y-2,z:far},{x:x1+.4,y:y-2,z:near}],`rgba(221,221,221,${intensity*.75})`, undefined, .7, true)
    }
  }
  // Slim mullions and rooftop equipment distinguish the translucent volumes.
  if(!lightingOnly) {
  for(let n=1;n<5;n++) {
    line([{x:x0+n*w/5,y:0,z:z1+.6},{x:x0+n*w/5,y:h,z:z1+.6}], '#a0a0a038', .55)
    line([{x:x1+.6,y:0,z:z0+n*d/5},{x:x1+.6,y:h,z:z0+n*d/5}], '#a0a0a038', .55)
  }
  polygon([{x:x-10,y:h+.2,z:z-9},{x:x+8,y:h+.2,z:z-9},{x:x+8,y:h+7,z:z-9},{x:x-10,y:h+7,z:z-9}], '#b0b0b075','#ababab6a', .7, true)
  polygon([{x:x-10,y:h+7,z:z-9},{x:x+8,y:h+7,z:z-9},{x:x+8,y:h+7,z:z+7},{x:x-10,y:h+7,z:z+7}], '#cacaca80','#ababab6a', .7, true)
  }
  ctx.restore()
  if(glow>.06) {
    // A soft glow follows actual floor bands, never the surrounding frame.
    // A lit floor adds light in both themes; it never becomes a dark cutout.
    ctx.save();ctx.globalCompositeOperation='screen';ctx.filter='blur(4px)'
    const band=project(x,Math.min(h-5,bandHeight),z1)
    const light=ctx.createRadialGradient(band.x,band.y,0,band.x,band.y,w*sceneScale*.55)
    light.addColorStop(0,`rgba(233,233,233,${glow*.18})`);light.addColorStop(1,'#e9e9e900')
    ctx.fillStyle=light;ctx.beginPath();ctx.ellipse(band.x,band.y,w*sceneScale*.58,Math.max(4,h*.06*sceneScale),-.18,0,TAU);ctx.fill();ctx.restore()
  }
  if(!lightingOnly) {
  const label=project(x,0,z1+10)
  ctx.font='9px "IBM Plex Sans", monospace';ctx.fillStyle=themeColor(glow>.25?'#595959':'#787878');ctx.textAlign='center';ctx.fillText(building.id,label.x,label.y+9)
  }
}
function cacheBuildings() {
  const mainContext=ctx
  if(!mainContext)return
  buildingLayers=buildings.map((building,index)=>{
    const corners=[project(building.x-building.width/2-9,0,building.z-building.depth/2-9),project(building.x+building.width/2+9,0,building.z+building.depth/2+9),project(building.x,building.height+12,building.z)]
    const left=Math.floor(Math.min(...corners.map(p=>p.x))-building.width*sceneScale*.9)
    const top=Math.floor(Math.min(...corners.map(p=>p.y))-12)
    const right=Math.ceil(Math.max(...corners.map(p=>p.x))+building.width*sceneScale*.9)
    const bottom=Math.ceil(Math.max(...corners.map(p=>p.y))+20)
    const layer=document.createElement('canvas')
    layer.width=Math.max(1,Math.ceil((right-left)*pixelRatio));layer.height=Math.max(1,Math.ceil((bottom-top)*pixelRatio))
    ctx=layer.getContext('2d')
    if(ctx) { ctx.setTransform(pixelRatio,0,0,pixelRatio,-left*pixelRatio,-top*pixelRatio);drawBuilding(building,index,0) }
    return { image:layer,x:left,y:top,width:right-left,height:bottom-top }
  })
  ctx=mainContext
}
function drawAxes() {
  if(!ctx)return
  const axes: { key:string; end:Point; color:string; tick: (n:number)=>Point }[] = [
    { key:'X',end:{x:260,y:0,z:0},color:'#747474',tick:n=>({x:n,y:0,z:0}) },
    { key:'Y',end:{x:0,y:219,z:0},color:'#747474',tick:n=>({x:0,y:n,z:0}) },
    { key:'Z',end:{x:0,y:0,z:260},color:'#747474',tick:n=>({x:0,y:0,z:n}) },
  ]
  ctx.save();ctx.setLineDash([3,4]);
  for(const axis of axes) {
    line([{x:0,y:0,z:0},axis.end],`${axis.color}70`,.8)
    ctx.setLineDash([])
    for(let n=40;n<(axis.key==='Y'?210:250);n+=40) {
      const p=project(...pointTuple(axis.tick(n)))
      ctx.beginPath();ctx.moveTo(p.x-2.5,p.y);ctx.lineTo(p.x+2.5,p.y);ctx.strokeStyle=themeColor(`${axis.color}80`);ctx.lineWidth=.7;ctx.stroke()
    }
    const p=project(...pointTuple(axis.end)), origin=project(0,0,0)
    const a=Math.atan2(p.y-origin.y,p.x-origin.x)
    ctx.beginPath();ctx.moveTo(p.x-7*Math.cos(a-.4),p.y-7*Math.sin(a-.4));ctx.lineTo(p.x,p.y);ctx.lineTo(p.x-7*Math.cos(a+.4),p.y-7*Math.sin(a+.4));ctx.strokeStyle=themeColor(axis.color);ctx.lineWidth=.8;ctx.stroke()
    ctx.font='11px "IBM Plex Sans", monospace';ctx.textAlign='center';ctx.fillStyle=themeColor(axis.color);ctx.fillText(axis.key,p.x+(axis.key==='X'?10:axis.key==='Z'?-10:0),p.y+(axis.key==='Y'?-10:5))
    ctx.setLineDash([3,4])
  }
  ctx.restore()
}
function pointTuple(point:Point):[number,number,number] { return [point.x,point.y,point.z] }
function drawParticles(time:number) {
  if(!ctx||!particles.value)return
  ctx.save();ctx.globalCompositeOperation='source-over'
  motes.forEach(mote=>{
    const y=(mote.y+time*.0025*mote.speed)%235
    const p=project(mote.x+Math.sin(time*.00018+mote.seed)*11,y,mote.z+Math.cos(time*.00013+mote.seed)*8)
    const radius=mote.size*Math.max(.7,sceneScale)
    const opacity=.12+(Math.sin(time*.00045+mote.seed)+1)*.055
    const halo=ctx!.createRadialGradient(p.x,p.y,0,p.x,p.y,radius*2.1)
    halo.addColorStop(0,themeColor(`rgba(128,128,128,${opacity})`));halo.addColorStop(.3,themeColor(`rgba(150,150,150,${opacity*.55})`));halo.addColorStop(1,themeColor('#90909000'))
    ctx!.fillStyle=halo;ctx!.beginPath();ctx!.arc(p.x,p.y,radius*2.1,0,TAU);ctx!.fill()
  });ctx.restore()
}
function render(time:number) {
  if(!ctx||!width||!height)return
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0)
  ctx.clearRect(0,0,width,height)
  const background=ctx.createRadialGradient(width*.5,height*.37,0,width*.5,height*.5,width*.7)
  background.addColorStop(0,surfaceColors.raised);background.addColorStop(.45,surfaceColors.canvas);background.addColorStop(1,surfaceColors.panel)
  ctx.fillStyle=background;ctx.fillRect(0,0,width,height)
  const haze=ctx.createRadialGradient(width*.48,height*.33,0,width*.48,height*.33,width*.32)
  haze.addColorStop(0,themeColor('#bdbdbd0a'));haze.addColorStop(1,themeColor('#bdbdbd00'));ctx.fillStyle=haze;ctx.fillRect(0,0,width,height)
  const theta=time/SCAN_CYCLE*TAU-Math.PI/2
  drawGround(theta)
  trees.forEach(([x,z])=>drawTree(x,z))
  buildings.map((building,index)=>({building,index})).sort((a,b)=>a.building.x+a.building.z-b.building.x-b.building.z).forEach(({building,index})=>{
    const layer=buildingLayers[index]
    if(layer)ctx!.drawImage(layer.image,layer.x,layer.y,layer.width,layer.height)
    drawBuilding(building,index,time,true)
  })
  drawAxes()
  drawParticles(time)
  const vignette=ctx.createRadialGradient(width*.5,height*.48,width*.2,width*.5,height*.48,width*.66)
  vignette.addColorStop(0,themeColor('#ffffff00'));vignette.addColorStop(1,themeColor('#ffffff55'));ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height)
}
function resizeCanvas() {
  if(!canvas.value||!stage.value)return
  const style=getComputedStyle(stage.value)
  surfaceColors={
    raised:style.getPropertyValue('--milk-raised').trim()||themeColor('#eef0f4'),
    canvas:style.getPropertyValue('--milk-canvas').trim()||themeColor('#e9eaee'),
    panel:style.getPropertyValue('--milk-panel').trim()||themeColor('#ebedf1'),
  }
  const rect=stage.value.getBoundingClientRect()
  width=Math.round(rect.width);height=Math.round(rect.height);pixelRatio=Math.min(window.devicePixelRatio||1,2)
  canvas.value.width=Math.max(1,Math.round(width*pixelRatio));canvas.value.height=Math.max(1,Math.round(height*pixelRatio))
  sceneScale=Math.min(width/790,height/500)
  cacheBuildings()
  render(activeElapsed)
}
function animate(timestamp:number) {
  frameId=0
  if(!running.value)return
  if(previousFrame!==null)activeElapsed+=Math.max(0,timestamp-previousFrame)
  previousFrame=timestamp
  updateContacts(activeElapsed);render(activeElapsed);syncReadout(activeElapsed)
  frameId=requestAnimationFrame(animate)
}
function syncAnimation() {
  if(frameId)cancelAnimationFrame(frameId)
  frameId=0;previousFrame=null
  if(!mounted.value)return
  updateContacts(activeElapsed);render(activeElapsed);syncReadout(activeElapsed,true)
  if(running.value&&ctx)frameId=requestAnimationFrame(animate)
}
function togglePlayback() {
  if(reducedMotion.value&&!motionOptIn.value) { motionOptIn.value=true;paused.value=false }
  else paused.value=!paused.value
}
function restartScan() {
  activeElapsed=0;previousFrame=null;lastReadout=-100
  contactTimes.fill(Number.NEGATIVE_INFINITY);entryTimes.fill(Number.NEGATIVE_INFINITY);contacts.fill(false)
  updateContacts(0);render(0);syncReadout(0,true)
}
function visibilityChanged() { visible.value=!document.hidden }
function preferenceChanged(event:MediaQueryListEvent) { reducedMotion.value=event.matches;motionOptIn.value=false }
watch(running,syncAnimation)
watch(particles,()=>render(activeElapsed))
onMounted(()=>{
  ctx=canvas.value?.getContext('2d')??null
  canvasSupported.value=Boolean(ctx)
  mediaQuery=window.matchMedia('(prefers-reduced-motion: reduce)');reducedMotion.value=mediaQuery.matches
  visible.value=!document.hidden
  mediaQuery.addEventListener('change',preferenceChanged)
  document.addEventListener('visibilitychange',visibilityChanged)
  window.addEventListener('resize',resizeCanvas)
  // Rebuild raster caches and repaint the same instant, including paused/static scenes.
  window.addEventListener(THEME_EVENT,resizeCanvas)
  resizeObserver=new ResizeObserver(resizeCanvas)
  if(stage.value)resizeObserver.observe(stage.value)
  intersectionObserver=new IntersectionObserver(entries=>{inViewport.value=entries[0]?.isIntersecting??false},{threshold:.05})
  if(stage.value)intersectionObserver.observe(stage.value)
  mounted.value=true
  resizeCanvas();syncAnimation()
})
onBeforeUnmount(()=>{
  mounted.value=false
  if(frameId)cancelAnimationFrame(frameId)
  resizeObserver?.disconnect();intersectionObserver?.disconnect()
  buildingLayers=[]
  mediaQuery?.removeEventListener('change',preferenceChanged)
  document.removeEventListener('visibilitychange',visibilityChanged)
  window.removeEventListener('resize',resizeCanvas)
  window.removeEventListener(THEME_EVENT,resizeCanvas)
})
</script>

<template>
  <div class="campus-radar panel" :data-scan-phase="phase" :data-scan-elapsed="elapsed" :data-scan-cycle="SCAN_CYCLE" :data-lit-buildings="illuminated" :data-animation-state="animationState">
    <div class="radar-heading">
      <div><p class="radar-serial engraved">SPATIAL / CAMPUS RADAR</p><h3>光扫过，空间逐层显影。</h3></div>
      <span class="demo-badge"><i aria-hidden="true"/> 园区扫描演示</span>
    </div>
    <div ref="stage" class="radar-stage" :aria-describedby="`${instanceId}-description`">
      <canvas ref="canvas" aria-hidden="true"/>
      <div class="scene-heading" aria-hidden="true"><span>CAMPUS / 07</span><b>园区空间扫描</b><small>SPACE · LIGHT · LAYERS</small></div>
      <div class="scene-period" aria-hidden="true"><span>SCAN CYCLE</span><b>05<small> SEC</small></b></div>
      <div class="scene-legend" aria-hidden="true"><i/><span>扫描命中 · 楼层亮起</span></div>
      <div class="scene-coordinate" aria-hidden="true">X / Y / Z <span>WORLD SPACE</span></div>
      <p v-if="!canvasSupported" class="canvas-fallback">当前浏览器无法绘制园区场景，请使用支持 Canvas 的浏览器。</p>
    </div>
    <p :id="`${instanceId}-description`" class="radar-description">柔焦楼群与漂浮粒子铺陈于坐标之间，X / Z 标记地面，Y 轴指向高度。雷达每 5 秒环扫一周，窗格随光逐层亮起，再缓缓归于平静。</p>
    <div class="radar-footer">
      <div class="radar-controls">
        <button class="radar-play primary" type="button" :aria-pressed="running" :disabled="!canvasSupported" @click="togglePlayback"><span aria-hidden="true">{{ paused || animationState === 'reduced-motion' ? '▶' : 'Ⅱ' }}</span>{{ playLabel }}</button>
        <button type="button" class="radar-reset" :disabled="!canvasSupported" @click="restartScan"><span aria-hidden="true">↺</span>重新扫描</button>
        <button type="button" class="particle-toggle" :aria-pressed="particles" :disabled="!canvasSupported" @click="particles=!particles"><i aria-hidden="true"/>漂浮粒子</button>
      </div>
      <div class="radar-readout"><span class="playback-state" role="status">{{ stateLabel }}</span><span class="scan-metrics">{{ phase.toFixed(0).padStart(3,'0') }}° <i>/</i> {{ illuminated.toString().padStart(2,'0') }} 栋亮起 <i>/</i> {{ cycles }} 圈</span></div>
    </div>
    <p v-if="animationState === 'reduced-motion'" class="motion-note">已按系统设置减少动态效果，保留坐标与灯层的静态预览。选择“播放扫描”可开启扫描。</p>
  </div>
</template>

<style scoped>
.campus-radar{border:var(--milk-border-width,1px) solid transparent;padding:28px;background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box;overflow:visible;min-width:0;box-shadow:var(--milk-card-shadow)}.radar-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}.radar-serial{font:10px 'IBM Plex Sans',monospace;letter-spacing:2px;margin:0 0 10px;color:var(--milk-color-707070)}.radar-heading h3{font-size:23px;line-height:1.5;font-weight:500;margin:0;color:var(--milk-color-2e3540)}.demo-badge{border:var(--milk-border-width,1px) solid transparent;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;font-size:11px;color:var(--milk-color-5b6573);padding:7px 11px;border-radius:999px;box-shadow:var(--milk-button-shadow);background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box}.demo-badge i{width:5px;height:5px;border-radius:50%;background:var(--milk-color-d5d5d5);box-shadow:none}.radar-stage{border:var(--milk-border-width,1px) solid transparent;position:relative;height:clamp(360px,47vw,530px);overflow:hidden;border-radius:18px;background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-control-shadow);isolation:isolate}.radar-stage canvas{width:100%;height:100%;display:block}.scene-heading,.scene-period,.scene-legend,.scene-coordinate{position:absolute;pointer-events:none;text-shadow:none;z-index:1}.scene-heading{top:25px;left:27px;display:flex;flex-direction:column;gap:5px}.scene-heading>span{font:9px 'IBM Plex Sans',monospace;letter-spacing:2.5px;color:var(--milk-color-606060bb)}.scene-heading b{font-size:14px;letter-spacing:2px;color:var(--milk-color-3f3f3f);font-weight:400}.scene-heading small{font:8px 'IBM Plex Sans',monospace;letter-spacing:1.5px;color:var(--milk-color-707070bb)}.scene-period{right:26px;top:24px;text-align:right}.scene-period>span{font:8px 'IBM Plex Sans',monospace;letter-spacing:1.6px;color:var(--milk-color-5b6573bb);display:block}.scene-period b{font:31px 'IBM Plex Sans',monospace;letter-spacing:-1px;color:var(--milk-color-454545);font-weight:400}.scene-period b small{font-size:8px;letter-spacing:1px;color:var(--milk-color-5b6573)}.scene-legend{left:26px;bottom:22px;display:flex;align-items:center;gap:8px;color:var(--milk-color-575757);font-size:10px;letter-spacing:.3px}.scene-legend i{width:5px;height:5px;background:var(--milk-emission,#fbfcff);box-shadow:none;border-radius:1px}.scene-coordinate{right:26px;bottom:21px;font:10px 'IBM Plex Sans',monospace;letter-spacing:1.5px;color:var(--milk-color-575757)}.scene-coordinate span{display:block;font-size:7px;letter-spacing:1.4px;color:var(--milk-color-5b6573b0);text-align:right;margin-top:4px}.radar-description{font-size:12px;line-height:1.85;color:var(--milk-color-5b6573);margin:16px 0 20px;max-width:760px}.radar-footer{display:flex;align-items:center;justify-content:space-between;gap:20px;border-top:var(--milk-border-width,1px) solid transparent;padding-top:20px;border-image:var(--milk-border-gradient) 1}.radar-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.radar-controls button{font-size:12px;padding:10px 16px;min-height:43px;white-space:nowrap}.radar-controls button:not(.particle-toggle){box-shadow:var(--milk-button-shadow);}.radar-controls button:not(.particle-toggle):hover:not(:disabled){transform:none;box-shadow:var(--milk-hover-shadow)}.radar-controls button:not(.particle-toggle):active:not(:disabled){transform:none;box-shadow:var(--milk-pressed);background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;}.radar-play span,.radar-reset span{font-size:12px;margin-right:7px}.radar-reset{border:var(--milk-border-width,1px) solid transparent;background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-button-shadow);border-radius:999px}.radar-controls .particle-toggle{padding:8px 10px;display:flex;gap:7px;align-items:center;border-color:transparent;background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-button-shadow);color:var(--milk-color-5b6573);font-size:11px;border-radius:999px}.particle-toggle i{border:var(--milk-border-width,1px) solid transparent;width:20px;height:20px;border-radius:4px;background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-control-shadow);position:relative}.particle-toggle[aria-pressed=true] i{background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;border-color:transparent;box-shadow:var(--milk-button-shadow)}.particle-toggle[aria-pressed=true] i:after{content:'';position:absolute;top:5px;left:5px;width:6px;height:4px;transform:rotate(-45deg);border-left:1.5px solid var(--milk-color-505050);border-bottom:1.5px solid var(--milk-color-505050)}.radar-readout{font-size:11px;display:flex;flex-direction:column;gap:4px;text-align:right;flex-shrink:0}.playback-state{color:var(--milk-color-4d4d4d)}.scan-metrics{font:10px 'IBM Plex Sans',monospace;color:var(--milk-color-5b6573);letter-spacing:.4px;white-space:nowrap}.scan-metrics i{font-style:normal;color:var(--milk-color-606060);margin:0 3px}.motion-note{font-size:11px;color:var(--milk-color-5b6573);margin:18px 0 0}.canvas-fallback{position:absolute;inset:40% 20px auto;color:var(--milk-color-454545);text-align:center;font-size:13px}@media(max-width:720px){.campus-radar{padding:21px;box-shadow:var(--milk-card-shadow)}.radar-heading{align-items:flex-start;gap:12px}.radar-heading h3{font-size:20px}.radar-serial{font-size:9px;letter-spacing:1.5px}.demo-badge{font-size:10px;padding:5px 9px;box-shadow:var(--milk-button-shadow)}.radar-footer{align-items:flex-start;flex-direction:column;gap:18px}.radar-readout{flex-direction:row;width:100%;justify-content:space-between;text-align:left;align-items:center}.radar-controls{gap:9px}.radar-stage{height:390px;box-shadow:var(--milk-control-shadow)}.scene-heading{top:20px;left:20px}.scene-period{top:18px;right:19px}.scene-legend{left:20px;bottom:18px}.scene-coordinate{right:20px;bottom:17px}}@media(max-width:440px){.campus-radar{padding:16px;box-shadow:var(--milk-card-shadow)}.radar-heading{flex-wrap:wrap;gap:11px;margin-bottom:17px}.radar-heading h3{font-size:18px}.demo-badge{font-size:9px;box-shadow:var(--milk-button-shadow)}.radar-stage{height:337px;border-radius:13px;box-shadow:var(--milk-control-shadow)}.scene-heading{top:17px;left:16px}.scene-heading b{font-size:12px;letter-spacing:1px}.scene-heading>span{font-size:8px;letter-spacing:1.5px}.scene-heading small{font-size:6px;letter-spacing:1px}.scene-period{top:14px;right:16px}.scene-period>span{font-size:7px}.scene-period b{font-size:25px}.scene-legend{left:15px;bottom:15px;font-size:8px;gap:5px}.scene-coordinate{right:15px;bottom:13px;font-size:8px;letter-spacing:1px}.scene-coordinate span{font-size:6px;letter-spacing:.7px}.radar-description{font-size:11px;margin:14px 0 16px}.radar-controls{gap:8px;width:100%}.radar-controls button{padding:10px 12px;font-size:11px}.radar-controls .particle-toggle{font-size:10px;padding:8px 4px;gap:5px;box-shadow:var(--milk-button-shadow);border-radius:999px}.radar-footer{padding-top:16px;gap:16px}.radar-readout{font-size:10px}.scan-metrics{font-size:9px;letter-spacing:0}.scan-metrics i{margin:0 2px}}.radar-controls .particle-toggle:active{background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;transform:none;box-shadow:var(--milk-pressed);}


/* Hold the pressed material through the shared damped return lifecycle. */
.radar-controls button[data-milk-press="down"]:not(:disabled):not([aria-disabled="true"]){background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-pressed)}
</style>
