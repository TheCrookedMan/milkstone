<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { THEME_EVENT } from '../theme-controller'

type Skin = 'star' | 'rock' | 'gas' | 'ringed' | 'ice'
const props = withDefaults(defineProps<{
  skin: Skin
  spin: number
  tilt: number
  lean?: number
  lightX: number
  lightY: number
  time: number
}>(), { lean: 0 })

// The parent owns time and visibility. This renderer never creates an animation loop.
// Its square is 3.6 planetary radii wide; the projected sphere therefore has radius 1/1.8.
const canvas = ref<HTMLCanvasElement>()
const canvasKey = ref(0)
const renderer = ref('initializing')
let gl: WebGLRenderingContext | null = null
let context2d: CanvasRenderingContext2D | null = null
let program: WebGLProgram | null = null
let vertices: WebGLBuffer | null = null
let eventCanvas: HTMLCanvasElement | undefined
let destroyed = false
let uniforms: Record<string, WebGLUniformLocation | null> = {}
const skinIndex: Record<Skin, number> = { star: 0, rock: 1, gas: 2, ringed: 3, ice: 4 }

const vertexSource = `
attribute vec2 aPosition;
varying vec2 vPosition;
void main() {
  vPosition = aPosition * 1.8;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const fragmentSource = `
precision highp float;
varying vec2 vPosition;
uniform float uSkin;
uniform float uSpin;
uniform float uTilt;
uniform float uLean;
uniform float uTime;
uniform float uPixel;
uniform vec2 uLight;

float hash(vec3 p) {
  p = fract(p * .3183099 + vec3(.17, .31, .57));
  // Keep the final product below the guaranteed mediump finite range.
  p *= 10.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
vec3 hash3(float n) {
  return vec3(hash(vec3(n, 13.2, 7.1)), hash(vec3(2.4, n, 91.3)), hash(vec3(5.7, 31.1, n)));
}
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
                 mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                 mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float value = 0.0, weight = .53;
  for (int i = 0; i < 4; i++) {
    value += weight * noise(p);
    p = p * 2.07 + vec3(11.7, 4.3, 8.1);
    weight *= .48;
  }
  return value;
}
vec3 axisFrame(vec3 normal) {
  // Q^-1 = Rx(-lean) * Rz(tilt). Applying longitude last spins a 3D sphere,
  // rather than rotating a flat circular bitmap or moving the illumination.
  float c = cos(uTilt), s = sin(uTilt);
  vec3 p = vec3(c*normal.x-s*normal.y, s*normal.x+c*normal.y, normal.z);
  c = cos(uLean); s = sin(uLean);
  return vec3(p.x, c*p.y+s*p.z, -s*p.y+c*p.z);
}
vec3 rotatingSurface(vec3 p) {
  float c = cos(uSpin), s = sin(uSpin);
  return vec3(c*p.x+s*p.z, p.y, -s*p.x+c*p.z);
}
void over(inout vec4 destination, vec3 color, float alpha) {
  alpha = clamp(alpha, 0.0, 1.0);
  destination.rgb = color * alpha + destination.rgb * (1.0-alpha);
  destination.a = alpha + destination.a * (1.0-alpha);
}
vec3 rocky(vec3 p) {
  float continent = fbm(p*5.5), grain = fbm(p*31.0);
  vec3 albedo = mix(vec3(.22,.205,.185), vec3(.61,.57,.49), continent);
  albedo *= .79 + grain*.46;
  // Craters live on the unit sphere, so their rims foreshorten naturally at the limb.
  for (int i = 0; i < 18; i++) {
    float seed = float(i)+3.0;
    vec3 center = normalize(hash3(seed)*2.0-1.0);
    float radius = .055 + hash(vec3(seed, 7.9, 2.1))*.19;
    float d = length(p-center) / radius;
    float bowl = 1.0-smoothstep(.52,.87,d);
    float rim = exp(-pow((d-.93)*12.0,2.0));
    float rimFacing = dot(normalize(p-center+vec3(.001)), vec3(-.45,.6,.35));
    albedo *= 1.0-bowl*.32;
    albedo += rim * (.095 + rimFacing*.08);
  }
  return albedo;
}
vec3 clouds(vec3 p, bool saturn) {
  float eddies = fbm(p*8.0 + vec3(0,uTime*.006,0));
  float belt = sin(p.y*32.0 + eddies*5.2 + sin(p.x*12.0+p.z*9.0)*.24);
  float fine = fbm(p*38.0);
  vec3 pale = saturn ? vec3(.79,.70,.51) : vec3(.85,.73,.57);
  vec3 dark = saturn ? vec3(.57,.48,.32) : vec3(.50,.29,.18);
  vec3 color = mix(dark, pale, smoothstep(-.9,.8,belt));
  color = mix(color, vec3(.90,.83,.68), smoothstep(.55,.80,eddies)*.40);
  color *= .88 + fine*.23;
  // A persistent oval storm moves with longitude, not with screen-space shading.
  vec3 stormCenter = normalize(vec3(.48,-.23,.84));
  float oval = pow((p.x-stormCenter.x)/.28,2.0) + pow((p.y-stormCenter.y)/.105,2.0)
             + pow((p.z-stormCenter.z)/.25,2.0);
  float storm = (1.0-smoothstep(.45,1.25,oval)) * (saturn ? .24 : .77);
  float swirl = .5+.5*sin(sqrt(max(oval,.001))*22.0 + eddies*6.0);
  return mix(color, mix(vec3(.51,.22,.12),vec3(.79,.48,.29),swirl),storm);
}
vec3 ice(vec3 p) {
  float terrain = fbm(p*6.0), frost = fbm(p*38.0);
  vec3 color = mix(vec3(.26,.47,.52),vec3(.76,.85,.82),terrain*.8+.2);
  float cracks = abs(sin(p.x*15.0+p.z*11.0+fbm(p*7.0)*4.0));
  float crossCracks = abs(sin(p.y*23.0-p.z*9.0+noise(p*11.0)*3.0));
  float fissure = 1.0-smoothstep(.018,.08,min(cracks,crossCracks));
  color = mix(color,vec3(.12,.28,.32),fissure*.72);
  return color * (.9+frost*.21);
}
vec3 plasma(vec3 p, vec3 normal) {
  vec3 drift = p*9.0 + vec3(sin(uTime*.15)*.17,uTime*.055,cos(uTime*.11)*.15);
  float convection = fbm(drift);
  float granules = noise(p*53.0 + convection*2.8 + vec3(0,uTime*.12,0));
  float threads = fbm(p*24.0 + vec3(convection*2.0,uTime*.035,0));
  float heat = clamp(convection*.77+granules*.32,0.0,1.0);
  vec3 color = mix(vec3(.74,.105,.008),vec3(1.0,.64,.105),smoothstep(.18,.72,heat));
  color = mix(color,vec3(1.0,.85,.38),smoothstep(.60,.79,threads)*.55);
  float spots = smoothstep(.69,.84,fbm(p*4.7+vec3(5.2,2.1,1.7)));
  color *= 1.0-spots*.52;
  // Solar limb darkening preserves a visibly spherical photosphere.
  return color * (.63+.37*pow(max(normal.z,0.0),.42));
}
void main() {
  vec2 q = vPosition;
  float radius = length(q);
  vec4 result = vec4(0.0);
  bool sun = uSkin < .5;
  bool ringed = uSkin > 2.5 && uSkin < 3.5;
  if ((!sun && !ringed && radius > 1.16) || (sun && radius > 1.42) || (ringed && radius > 1.72)) {
    gl_FragColor = vec4(0.0);
    return;
  }
  float bodyAlpha = 1.0-smoothstep(1.0-uPixel,1.0+uPixel,radius);

  if (sun) {
    vec2 direction = q/max(radius,.001);
    float angle = atan(direction.y,direction.x);
    float evolving = noise(vec3(direction*5.0,uTime*.21));
    float turbulent = noise(vec3(direction*17.0,uTime*.38));
    float tongue = pow(max(0.0,sin(angle*13.0+evolving*5.0+sin(uTime*.8)*.6)),8.0);
    float height = .027 + turbulent*.055 + tongue*(.13+evolving*.14);
    float outside = max(0.0,radius-1.0);
    float fire = (1.0-smoothstep(height*.35,height,outside))*smoothstep(.985,1.015,radius);
    float corona = exp(-outside*9.0)*.15*smoothstep(.96,1.02,radius);
    over(result,vec3(1.0,.34,.025),corona);
    over(result,mix(vec3(.95,.18,.008),vec3(1.0,.68,.12),1.0-outside/max(height,.001)),fire*.81);
    // Three anchored magnetic prominence loops breathe and break up in place;
    // no angle is advanced with time, so the corona never rotates like a wheel.
    for (int i = 0; i < 3; i++) {
      float a = float(i)*2.13+.45;
      vec2 center = vec2(cos(a),sin(a))*(1.025+.015*sin(uTime*.6+float(i)));
      float loopRadius = .105+.035*sin(uTime*.42+float(i)*1.7);
      float loop = exp(-abs(length(q-center)-loopRadius)*105.0);
      loop *= smoothstep(1.005,1.05,radius)*(1.0-smoothstep(1.2,1.28,radius));
      loop *= .47+.22*noise(vec3(q*25.0,uTime*.6));
      over(result,vec3(1.0,.38,.025),loop);
    }
  } else {
    // A restrained limb atmosphere keeps detail and the terminator readable.
    float halo = exp(-pow((radius-1.012)*26.0,2.0))*.17*smoothstep(.98,1.01,radius);
    vec3 atmosphere = uSkin > 3.5 ? vec3(.32,.69,.78) : vec3(.51,.64,.69);
    over(result,atmosphere,halo);
  }

  vec3 normal = vec3(q,sqrt(max(0.0,1.0-dot(q,q))));
  vec3 axisNormal = axisFrame(normal);
  vec3 p = rotatingSurface(axisNormal);
  vec3 light = normalize(vec3(uLight,.72));
  if (bodyAlpha > .001) {
    vec3 color;
    if (sun) color = plasma(p,normal);
    else {
      if (uSkin < 1.5) color = rocky(p);
      else if (uSkin < 3.5) color = clouds(p,ringed);
      else color = ice(p);
      float diffuse = max(dot(normal,light),0.0);
      // The quiet night hemisphere still carries readable surface relief.
      color *= .115+.88*pow(diffuse,.78);
      float rim = pow(1.0-normal.z,3.8)*max(dot(normal,light),0.0);
      color += (uSkin > 3.5 ? vec3(.11,.27,.31) : vec3(.10,.12,.13))*rim;
      if (ringed) {
        // Equatorial ring shadow follows the tilted axis, never the longitude.
        float shadow = exp(-pow(axisNormal.y/.052,2.0))*smoothstep(-.25,.35,dot(normal,light));
        color *= 1.0-shadow*.28;
      }
    }
    over(result,color,bodyAlpha);
  }

  if (ringed) {
    float c = cos(uTilt), s = sin(uTilt);
    vec2 r = vec2(c*q.x-s*q.y,s*q.x+c*q.y);
    // The ring plane shares the axis tilt. A small finite thickness remains
    // visible when the equator is edge-on instead of popping out of existence.
    float flatten = sin(uLean);
    flatten = abs(flatten) < .052 ? (flatten < 0.0 ? -.052 : .052) : flatten;
    float ringRadius = length(vec2(r.x,r.y/flatten));
    float ringDepth = -r.y/flatten*cos(uLean);
    float mask = smoothstep(1.10,1.15,ringRadius)*(1.0-smoothstep(1.66,1.70,ringRadius));
    float cassiniGap = 1.0-.92*exp(-pow((ringRadius-1.46)/.025,2.0));
    float innerGap = 1.0-.45*exp(-pow((ringRadius-1.24)/.012,2.0));
    float grain = noise(vec3(ringRadius*150.0,1.7,4.1));
    float fineBands = .64+.36*sin(ringRadius*310.0);
    float opacity = mask*cassiniGap*innerGap*(.42+grain*.20+fineBands*.16);
    vec3 ringColor = mix(vec3(.37,.30,.20),vec3(.79,.70,.48),grain*.45+fineBands*.35);
    // At every pixel, compare the ring's view-space depth with the sphere.
    // Far arcs disappear behind the globe; near arcs cross its front.
    if (radius < 1.0 && ringDepth < normal.z) opacity = 0.0;
    if (ringDepth < 0.0 && abs(r.x) < .92) ringColor *= .47;
    over(result,ringColor,opacity);
  }
  // A matte gray floor preserves spherical relief on white paper, while the sun
  // keeps emissive contrast. Multiply the floor by alpha for clean translucent limbs.
  float luminance = dot(clamp(result.rgb,0.0,1.0),vec3(.2126,.7152,.0722));
  float paperLuminance = (sun ? .10 : .18) * result.a + luminance * (sun ? 1.10 : .76);
  // Theme changes the surrounding material, never the direction of illumination.
  // Photosphere, corona, crater rims and night hemispheres retain physical light.
  vec3 rgb = vec3(clamp(paperLuminance,0.0,1.0));
  gl_FragColor = vec4(rgb,result.a);
}`

function compile(type: number, source: string) {
  if (!gl) throw new Error('WebGL unavailable')
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Unable to allocate stellar shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(message ?? 'Stellar shader compilation failed')
  }
  return shader
}

function createProgram() {
  if (!gl) return
  const vertex = compile(gl.VERTEX_SHADER, vertexSource)
  let fragment: WebGLShader | undefined
  try {
    const highPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision
    fragment = compile(gl.FRAGMENT_SHADER, highPrecision ? fragmentSource : fragmentSource.replace('precision highp', 'precision mediump'))
    program = gl.createProgram()
    if (!program) throw new Error('Unable to allocate stellar program')
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Stellar link failed')
    gl.useProgram(program)
    vertices = gl.createBuffer()
    if (!vertices) throw new Error('Unable to allocate stellar vertices')
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'aPosition')
    if (position < 0) throw new Error('Stellar position attribute missing')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    uniforms = Object.fromEntries(['uSkin','uSpin','uTilt','uLean','uTime','uPixel','uLight'].map(name => [name,gl!.getUniformLocation(program!,name)]))
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.BLEND)
  } finally {
    gl.deleteShader(vertex)
    if (fragment) gl.deleteShader(fragment)
  }
}

function render() {
  if (destroyed || !canvas.value) return
  if (context2d) { renderFallback(); return }
  if (!gl || !program || gl.isContextLost()) return
  const radians = Math.PI/180
  gl.viewport(0,0,canvas.value.width,canvas.value.height)
  gl.useProgram(program)
  gl.uniform1f(uniforms.uSkin,skinIndex[props.skin])
  gl.uniform1f(uniforms.uSpin,props.spin*radians)
  gl.uniform1f(uniforms.uTilt,props.tilt*radians)
  gl.uniform1f(uniforms.uLean,props.lean*radians)
  gl.uniform1f(uniforms.uTime,props.time)
  gl.uniform1f(uniforms.uPixel,3.6/canvas.value.width)
  gl.uniform2f(uniforms.uLight,props.lightX,props.lightY)
  gl.drawArrays(gl.TRIANGLES,0,6)
}

// The fallback also projects longitude on a sphere. It uses a smaller bounded
// raster, so software-only browsers retain the same axis and lighting semantics.
function renderFallback() {
  if (!context2d || !canvas.value) return
  const size = canvas.value.width
  const pixels = context2d.createImageData(size,size)
  const radians = Math.PI/180
  const tilt = props.tilt*radians, lean = props.lean*radians, spin = props.spin*radians
  const ct = Math.cos(tilt), st = Math.sin(tilt), cl = Math.cos(lean), sl = Math.sin(lean), cs = Math.cos(spin), ss = Math.sin(spin)
  const lightLength = Math.hypot(props.lightX,props.lightY,.72)
  const lx=props.lightX/lightLength, ly=props.lightY/lightLength, lz=.72/lightLength
  const sun = props.skin==='star'
  for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
    const nx=((x+.5)/size*2-1)*1.8, ny=(1-(y+.5)/size*2)*1.8, radius=Math.hypot(nx,ny)
    const index=(y*size+x)*4
    if (radius>1) {
      if (sun) {
        const angle=Math.atan2(ny,nx)
        const heat=.5+.5*Math.sin(angle*17+Math.sin(angle*7+props.time*.8)*2)
        const height=.04+Math.pow(heat,6)*.18
        const alpha=Math.max(0,1-(radius-1)/height)*.8+Math.exp(-(radius-1)*13)*.09
        pixels.data[index]=176; pixels.data[index+1]=176; pixels.data[index+2]=176; pixels.data[index+3]=Math.min(255,alpha*255)
      }
      continue
    }
    const nz=Math.sqrt(1-radius*radius)
    const ax=ct*nx-st*ny, ay=st*nx+ct*ny
    const py=cl*ay+sl*nz, az=-sl*ay+cl*nz
    const px=cs*ax+ss*az, pz=-ss*ax+cs*az
    const longitude=Math.atan2(px,pz)
    const grain=.5+.5*Math.sin(px*49+Math.sin(py*29)*2)*Math.sin(pz*43+py*17)
    let color: number[]
    if (sun) {
      const boil=.5+.5*Math.sin(px*21+Math.sin(py*37+props.time*.8)*2+props.time*.4)*Math.sin(pz*28+props.time*.17)
      color=[240+grain*15,67+boil*95+grain*25,5+grain*25]
    } else if (props.skin==='gas'||props.skin==='ringed') {
      const band=.5+.5*Math.sin(py*32+Math.sin(longitude*9+py*10)*.7)
      color=props.skin==='gas' ? [134+band*83,83+band*102,48+band*103] : [148+band*57,128+band*55,85+band*58]
    } else if (props.skin==='ice') {
      const crack=Math.abs(Math.sin(px*18+pz*8+Math.sin(py*11)*1.3))<.07 ? .46 : 1
      color=[(115+grain*67)*crack,(157+grain*55)*crack,(163+grain*51)*crack]
    } else {
      const terrain=.5+.5*Math.sin(px*9+Math.sin(pz*13)*2)*Math.sin(py*14)
      color=[75+terrain*70+grain*20,70+terrain*65+grain*19,63+terrain*56+grain*18]
      for(let crater=0;crater<8;crater++) {
        const a=crater*2.399, latitude=Math.asin(-.8+crater*.225)
        const cx=Math.cos(latitude)*Math.sin(a), cy=Math.sin(latitude), cz=Math.cos(latitude)*Math.cos(a)
        const distance=Math.hypot(px-cx,py-cy,pz-cz)/(.12+crater%3*.04)
        const amount=distance<.75 ? .65 : distance<1 ? 1.15 : 1
        color=color.map(value=>value*amount)
      }
    }
    const lighting=sun ? .63+.37*Math.pow(nz,.42) : .115+.88*Math.pow(Math.max(0,nx*lx+ny*ly+nz*lz),.78)
    const surfaceLuminance=(color[0]!*.2126+color[1]!*.7152+color[2]!*.0722)*lighting
    const luminance=(sun ? .10 : .18)*255+surfaceLuminance*(sun ? 1.10 : .76)
    pixels.data[index]=luminance; pixels.data[index+1]=luminance; pixels.data[index+2]=luminance
    pixels.data[index+3]=255
  }
  context2d.putImageData(pixels,0,0)
  if (props.skin==='ringed') {
    // Split arcs reproduce front/back globe occlusion in the software fallback.
    const radius=size/3.6, flatten=Math.max(.052,Math.abs(Math.sin(lean)))
    context2d.save(); context2d.translate(size/2,size/2); context2d.rotate(tilt)
    context2d.strokeStyle='rgba(149,149,149,.72)'; context2d.lineWidth=radius*.16
    const frontStart=lean < 0 ? Math.PI : 0
    context2d.beginPath(); context2d.ellipse(0,0,radius*1.46,radius*1.46*flatten,0,frontStart,frontStart+Math.PI)
    context2d.stroke()
    context2d.strokeStyle='rgba(132,132,132,.62)'; context2d.lineWidth=radius*.11
    // Far halves are clipped outside the body, while the foreground half crosses it.
    context2d.beginPath(); context2d.rect(-size,-size,size*2,size*2); context2d.arc(0,0,radius,0,Math.PI*2,true); context2d.clip('evenodd')
    context2d.beginPath(); context2d.ellipse(0,0,radius*1.46,radius*1.46*flatten,0,frontStart+Math.PI,frontStart+Math.PI*2); context2d.stroke()
    context2d.restore()
  }
}

function releaseProgram() {
  if (gl && !gl.isContextLost()) {
    if (vertices) gl.deleteBuffer(vertices)
    if (program) gl.deleteProgram(program)
  }
  vertices=null; program=null; uniforms={}
}
function contextLost(event: Event) {
  event.preventDefault()
  renderer.value='context-lost'
  vertices=null; program=null; uniforms={}
}
function contextRestored() {
  try { createProgram(); renderer.value='webgl'; render() }
  catch { void enableFallback() }
}
function unbindContextEvents() {
  eventCanvas?.removeEventListener('webglcontextlost',contextLost)
  eventCanvas?.removeEventListener('webglcontextrestored',contextRestored)
  eventCanvas=undefined
}
async function enableFallback() {
  releaseProgram(); unbindContextEvents()
  gl?.getExtension('WEBGL_lose_context')?.loseContext()
  gl=null
  // A canvas cannot switch context type after WebGL allocation.
  canvasKey.value++
  await nextTick()
  if (destroyed || !canvas.value) return
  canvas.value.width=128; canvas.value.height=128
  context2d=canvas.value.getContext('2d',{ alpha:true })
  renderer.value=context2d ? 'canvas2d' : 'unavailable'
  render()
}
onMounted(() => {
  // Theme changes repaint without advancing the parent's paused orbital clock.
  window.addEventListener(THEME_EVENT,render)
  if (!canvas.value) return
  const dpr=Math.min(window.devicePixelRatio||1,2)
  const size=Math.min(256,Math.max(160,Math.ceil((canvas.value.clientWidth||120)*dpr)))
  canvas.value.width=size; canvas.value.height=size
  gl=canvas.value.getContext('webgl',{ alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,preserveDrawingBuffer:false,powerPreference:'low-power' })
  if (!gl) { void enableFallback(); return }
  eventCanvas=canvas.value
  eventCanvas.addEventListener('webglcontextlost',contextLost)
  eventCanvas.addEventListener('webglcontextrestored',contextRestored)
  try { createProgram(); renderer.value='webgl'; render() }
  catch { void enableFallback() }
})
const stopWatch=watch(() => [props.skin,props.spin,props.tilt,props.lean,props.lightX,props.lightY,props.time],render,{ flush:'post' })
onBeforeUnmount(() => {
  window.removeEventListener(THEME_EVENT,render)
  destroyed=true; stopWatch(); unbindContextEvents(); releaseProgram()
  const lose=gl?.getExtension('WEBGL_lose_context')
  lose?.loseContext()
  gl=null; context2d=null
})
</script>

<template>
  <canvas ref="canvas" :key="canvasKey" class="stellar-body-canvas" aria-hidden="true" :data-skin="skin" :data-spin="spin.toFixed(3)" :data-tilt="tilt.toFixed(3)" :data-lean="lean.toFixed(3)" :data-renderer="renderer" />
</template>

<style scoped>
.stellar-body-canvas{display:block;width:100%;height:100%;pointer-events:none;contain:strict}
</style>
