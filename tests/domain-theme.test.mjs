import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { computed, nextTick, ref, watch } from 'vue'

const assets = new URL('../skills/milk-white-web-design/assets/', import.meta.url)
const themeSource = readFileSync(new URL('theme-controller.ts', assets), 'utf8')

function eventTarget() {
  const listeners = new Map()
  return {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(callback)
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback) },
    dispatchEvent(event) {
      for (const callback of [...(listeners.get(event.type) ?? [])]) callback(event)
    },
    listenerCount(type) { return listeners.get(type)?.size ?? 0 },
  }
}

// Record the actual drawing commands and ImageData produced by each component.
// This deliberately does not implement the component's color conversion.
function recordingContext() {
  const calls = [], gradients = [], images = [], strokes = [], fills = [], composites = [], shadowColors = []
  let path = []
  const context = {
    calls, gradients, images, strokes, fills, composites, shadowColors, frame: 0, lineWidth: 1,
    clearRect(...args) { this.frame++; calls.push(['clearRect', ...args]) },
    createImageData(width, height) { return { width, height, data: new Uint8ClampedArray(width * height * 4) } },
    putImageData(image) { images.push(new Uint8ClampedArray(image.data)) },
    createRadialGradient(...args) { return gradient('radial', args) },
    createLinearGradient(...args) { return gradient('linear', args) },
    beginPath() { path = []; calls.push(['beginPath']) },
    stroke() {
      calls.push(['stroke'])
      strokes.push({ color: this.strokeStyle, width: this.lineWidth, path: structuredClone(path) })
    },
    fill() { calls.push(['fill']); fills.push({ color: this.fillStyle, path: structuredClone(path), frame: this.frame }) },
    drawImage(_image, ...bounds) { calls.push(['drawImage', ...bounds]) },
  }
  function gradient(kind, args) {
    const result = { kind, args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]) } }
    calls.push([`${kind}Gradient`, ...args]); gradients.push(result)
    return result
  }
  return new Proxy(context, {
    set(target, property, value) {
      if (property === 'globalCompositeOperation') composites.push(value)
      if (property === 'shadowColor') shadowColors.push(value)
      target[property] = value
      return true
    },
    get(target, property) {
      if (property in target) return target[property]
      return (...args) => {
        calls.push([property, ...args])
        if (['moveTo', 'lineTo', 'arc', 'ellipse', 'rect', 'closePath'].includes(property)) path.push([property, ...args])
      }
    },
  })
}

function harness(name, expose, { props = {}, css = {} } = {}) {
  const mounts = [], unmounts = [], stopWatches = [], layers = [], observers = []
  const window = Object.assign(eventTarget(), { devicePixelRatio: 1 })
  const media = Object.assign(eventTarget(), { matches: false })
  window.matchMedia = () => media
  const document = Object.assign(eventTarget(), {
    hidden: false,
    documentElement: { dataset: { theme: 'light' }, style: {} },
    querySelector: () => ({ setAttribute() {} }),
    createElement(tag) {
      assert.equal(tag, 'canvas')
      const context = recordingContext()
      const layer = { width: 0, height: 0, getContext: () => context }
      layers.push(layer)
      return layer
    },
  })
  const pendingFrames = new Map()
  let frameId = 0
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this) }
    observe() {}
    disconnect() { this.disconnected = true }
  }
  const vue = {
    computed, nextTick, ref, useId: () => 'domain-theme-test',
    onMounted: callback => mounts.push(callback),
    onBeforeUnmount: callback => unmounts.push(callback),
    onUnmounted: callback => unmounts.push(callback),
    watch(...args) { const stop = watch(...args); stopWatches.push(stop); return stop },
  }
  const sandbox = vm.createContext({
    window, document, ResizeObserver: Observer, IntersectionObserver: Observer,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail } },
    localStorage: { setItem() {}, getItem() { return null } },
    getComputedStyle: () => ({ getPropertyValue: key => css[document.documentElement.dataset.theme]?.[key] ?? '' }),
    requestAnimationFrame(callback) { const id = ++frameId; pendingFrames.set(id, callback); return id },
    cancelAnimationFrame: id => pendingFrames.delete(id),
    defineProps: () => props,
    withDefaults: (value, defaults) => Object.assign({}, defaults, value),
  })
  const options = [], chart = { setOption: option => options.push(option), resize() {}, dispose() { this.disposed = true } }
  const dependencies = {
    vue,
    'echarts/core': { init: () => chart, use() {} },
    'echarts/charts': {}, 'echarts/components': {}, 'echarts/renderers': {},
  }
  function execute(source, filename) {
    const code = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText
    const module = { exports: {} }
    const run = vm.runInContext(`(function(require, module, exports) {\n${code}\n})`, sandbox, { filename })
    run(id => {
      assert.ok(id in dependencies, `Unexpected runtime dependency: ${id}`)
      return dependencies[id]
    }, module, module.exports)
    return module.exports
  }
  const theme = execute(themeSource, 'theme-controller.ts')
  dependencies['../theme-controller'] = theme
  const source = readFileSync(new URL(`components/${name}.vue`, assets), 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1]
  assert.ok(source, `${name} script setup is available`)
  const component = execute(`${source}\nmodule.exports.__test = { ${expose} };`, `${name}.vue`).__test
  return {
    component, theme, window, media, layers, observers, options, chart,
    pendingFrames,
    async mount() { for (const callback of mounts) callback(); await nextTick(); await nextTick() },
    async unmount() { for (const callback of unmounts) callback(); for (const stop of stopWatches) stop(); await nextTick() },
    async step(timestamp) {
      const callbacks = [...pendingFrames.values()]; pendingFrames.clear()
      for (const callback of callbacks) callback(timestamp)
      await nextTick()
    },
  }
}

test('ECharts keeps semantic material labels and gridlines, complements data colors, and removes listeners', async () => {
  const h = harness('ChartStudio', 'chartElement', {
    css: {
      light: { '--milk-raised': ' #eef0f4 ', '--milk-ink': ' #2e3540 ', '--milk-muted': ' #5b6573 ', '--milk-edge': ' #cdd2db ' },
      dark: { '--milk-raised': ' #2a2e35 ', '--milk-ink': ' #e4e8ee ', '--milk-muted': ' #a3acb9 ', '--milk-edge': ' #454d59 ' },
    },
  })
  h.component.chartElement.value = {}
  try {
    await h.mount()
    const light = h.options.at(-1)
    assert.equal(light.tooltip.backgroundColor, '#eef0f4')
    assert.equal(light.textStyle.color, '#5b6573')
    assert.equal(light.tooltip.textStyle.color, '#2e3540')
    assert.equal(light.xAxis.axisLine.lineStyle.color, '#cdd2db')
    assert.equal(light.yAxis.splitLine.lineStyle.color, '#cdd2db')
    assert.equal(light.series[0].itemStyle.color, '#575757')
    const count = h.options.length
    h.theme.setTheme('dark')
    assert.equal(h.options.length, count + 1, 'the theme event must update an existing chart')
    const dark = h.options.at(-1)
    assert.equal(dark.tooltip.backgroundColor, '#2a2e35', 'computed CSS is already themed and must not be complemented twice')
    assert.equal(dark.series[0].itemStyle.color, '#a8a8a8')
    assert.equal(dark.series[1].itemStyle.color, '#5f5f5f')
    assert.equal(dark.series[0].areaStyle.color, '#888888')
    assert.equal(light.series[0].emphasis.itemStyle.color, '#5f5f5f')
    assert.equal(dark.series[0].emphasis.itemStyle.color, '#a0a0a0')
    assert.equal(dark.series[0].emphasis.lineStyle.color, '#a0a0a0')
    assert.equal(dark.series[0].emphasis.areaStyle.color, '#7d7d7d')
    assert.equal(dark.series[1].emphasis.itemStyle.color, '#4f4f4f')
    assert.equal(dark.series[1].emphasis.lineStyle.color, '#4f4f4f')
    const withoutColors = value => {
      if (typeof value === 'string' && /^#[\da-f]{6,8}$/i.test(value)) return '<themed-color>'
      if (Array.isArray(value)) return Array.from(value, withoutColors)
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, withoutColors(item)]))
      return value
    }
    assert.deepEqual(withoutColors(dark), withoutColors(light), 'normal and hover geometry, opacity, data, animation, and tooltip rules are identical')
    assert.equal(dark.textStyle.color, '#a3acb9')
    assert.equal(dark.xAxis.axisLabel.color, '#a3acb9')
    assert.equal(dark.yAxis.axisLabel.color, '#a3acb9')
    assert.equal(dark.yAxis.nameTextStyle.color, '#a3acb9')
    assert.equal(dark.tooltip.axisPointer.lineStyle.color, '#a3acb9')
    assert.equal(dark.tooltip.textStyle.color, '#e4e8ee')
    assert.equal(dark.tooltip.axisPointer.shadowStyle.color, '#7575750c', 'raw alpha is preserved')
    assert.equal(dark.xAxis.axisLine.lineStyle.color, '#454d59')
    assert.equal(dark.yAxis.splitLine.lineStyle.color, '#454d59')
    assert.equal(dark.backgroundColor, 'transparent')
    assert.deepEqual(Array.from(dark.series[0].data), Array.from(light.series[0].data))
    assert.equal(h.window.listenerCount(h.theme.THEME_EVENT), 1)
    await h.unmount()
    assert.equal(h.window.listenerCount(h.theme.THEME_EVENT), 0)
    assert.equal(h.media.listenerCount('change'), 0)
    assert.ok(h.observers.every(observer => observer.disconnected))
    assert.equal(h.chart.disposed, true)
    h.theme.setTheme('light')
    assert.equal(h.options.length, count + 1, 'a disposed chart is not repainted')
  } finally { await h.unmount() }
})

for (const skin of ['star', 'rock', 'gas', 'ringed', 'ice']) {
  test(`StellarSurface ${skin} fallback retains physical illumination, surface relief and alpha at fixed time`, async () => {
    const context = recordingContext()
    const canvas = { width: 0, height: 0, clientWidth: 120, getContext: kind => kind === '2d' ? context : null }
    const h = harness('StellarSurface', 'canvas, renderer', {
      props: { skin, spin: 47, tilt: -17, lean: 14, lightX: -.43, lightY: .71, time: 12.75 },
    })
    h.component.canvas.value = canvas
    try {
      await h.mount()
      assert.equal(h.component.renderer.value, 'canvas2d')
      const light = context.images.at(-1)
      assert.equal(light.length, 128 * 128 * 4)
      const count = context.images.length
      h.theme.setTheme('dark')
      assert.equal(context.images.length, count + 1)
      const dark = context.images.at(-1)
      for (let index = 0; index < light.length; index += 4) {
        for (let channel = 0; channel < 3; channel++) {
          assert.equal(dark[index + channel], light[index + channel], `physical illumination at pixel ${index / 4}, channel ${channel}`)
        }
        assert.equal(dark[index + 3], light[index + 3], `pixel ${index / 4} alpha`)
      }
      assert.equal(light[(64 * 128 + 64) * 4 + 3], 255, 'sphere is rendered, not an empty raster')
      if (skin === 'star') {
        const corona = (64 * 128 + 100) * 4
        assert.ok(light[corona + 3] > 0 && light[corona + 3] < 255, 'the exterior corona has partial alpha')
        assert.equal(light[corona], 176)
        assert.equal(dark[corona], 176, 'corona remains emissive in dark mode')
      }
      if (skin !== 'star') {
        const lit = (48 * 128 + 48) * 4, unlit = (80 * 128 + 80) * 4
        assert.ok(dark[lit] > dark[unlit], 'the side facing the light stays brighter than the night side')
      }
      if (skin === 'ringed') {
        assert.equal(context.strokes.length, 4)
        assert.deepEqual(context.strokes.map(stroke => stroke.color), [
          'rgba(149,149,149,.72)', 'rgba(132,132,132,.62)',
          'rgba(149,149,149,.72)', 'rgba(132,132,132,.62)',
        ])
        for (let index = 0; index < 2; index++) {
          assert.equal(context.strokes[index].width, context.strokes[index + 2].width)
          assert.deepEqual(context.strokes[index].path, context.strokes[index + 2].path, 'ring geometry remains at the same tilt')
        }
      }
      await h.unmount()
      assert.equal(h.window.listenerCount(h.theme.THEME_EVENT), 0)
      h.theme.setTheme('light')
      assert.equal(context.images.length, count + 1, 'destroyed fallback does not repaint')
    } finally { await h.unmount() }
  })
}

test('paused CampusRadar rebuilds themed raster caches and repaints the same scan instant', async () => {
  const context = recordingContext()
  const colors = {
    light: { '--milk-raised': '#fafcfd', '--milk-canvas': '#f3f5f7', '--milk-panel': '#eef1f5' },
    dark: { '--milk-raised': '#2a2e35', '--milk-canvas': '#1c1f24', '--milk-panel': '#24282e' },
  }
  const h = harness('CampusRadar', 'canvas, stage, elapsed, phase, illuminated, animationState, togglePlayback', { css: colors })
  h.component.canvas.value = { width: 0, height: 0, getContext: () => context }
  h.component.stage.value = { getBoundingClientRect: () => ({ width: 790, height: 500 }) }
  // VM-created dash arrays are normalized to the test realm before deep comparison.
  const lastFrame = () => structuredClone(context.calls.slice(context.calls.findLastIndex(call => call[0] === 'clearRect')))
  try {
    await h.mount()
    await h.step(1000)
    await h.step(2375)
    h.component.togglePlayback()
    await nextTick()
    assert.equal(h.component.animationState.value, 'paused')
    assert.equal(h.component.elapsed.value, 1375, 'exercise a nonzero scan instant before pausing')
    assert.equal(h.pendingFrames.size, 0)
    const readout = [h.component.elapsed.value, h.component.phase.value, h.component.illuminated.value]
    const frame = lastFrame()
    const layerCount = h.layers.length
    const frameCount = context.calls.filter(call => call[0] === 'clearRect').length
    const gradientCount = context.gradients.length
    const lightEmissiveFloors = context.fills.filter(fill => fill.frame === context.frame && typeof fill.color === 'string' && /^rgba\((239|226|234|221),/.test(fill.color))
    assert.ok(lightEmissiveFloors.length > 0, 'the paused instant includes lit floor bands')
    const lightLayer = h.layers.at(-1).getContext('2d')
    assert.ok(lightLayer.fills.some(fill => fill.color === '#d7d7d770'), 'the building roof is lit')
    assert.ok(lightLayer.fills.some(fill => fill.color === '#a0a0a07a'), 'the side wall is shaded')
    assert.deepEqual(context.gradients.find(gradient => gradient.stops.length === 3).stops, [
      [0, colors.light['--milk-raised']], [.45, colors.light['--milk-canvas']], [1, colors.light['--milk-panel']],
    ])
    h.theme.setTheme('dark')
    await nextTick()
    assert.equal(h.layers.length, layerCount + 7, 'all seven building raster caches must be rebuilt')
    assert.equal(context.calls.filter(call => call[0] === 'clearRect').length, frameCount + 1)
    assert.deepEqual(lastFrame(), frame, 'projection, scan fan, lit floors, and particles retain the same geometry')
    assert.deepEqual([h.component.elapsed.value, h.component.phase.value, h.component.illuminated.value], readout)
    assert.equal(h.component.animationState.value, 'paused')
    assert.equal(h.pendingFrames.size, 0, 'a theme event must not restart the paused clock')
    assert.deepEqual(context.gradients[gradientCount].stops, [
      [0, colors.dark['--milk-raised']], [.45, colors.dark['--milk-canvas']], [1, colors.dark['--milk-panel']],
    ], 'resolved CSS surface colors are used directly')
    const darkEmissiveFloors = context.fills.filter(fill => fill.frame === context.frame && typeof fill.color === 'string' && /^rgba\((239|226|234|221),/.test(fill.color))
    assert.deepEqual(darkEmissiveFloors.map(({ color, path }) => ({ color, path })), lightEmissiveFloors.map(({ color, path }) => ({ color, path })), 'windows and floor lights keep the same color, strength and geometry')
    const darkLayer = h.layers.at(-1).getContext('2d')
    for (const face of ['#d7d7d770', '#b7b7b78a', '#a0a0a07a']) {
      assert.deepEqual(darkLayer.fills.find(fill => fill.color === face)?.path, lightLayer.fills.find(fill => fill.color === face)?.path, 'roof and facade lighting keep the same spatial hierarchy')
    }
    assert.ok(context.composites.includes('screen'), 'floor illumination adds light')
    assert.ok(!context.composites.includes('multiply'), 'dark mode does not turn emission into shadow')
    assert.ok(context.shadowColors.every(color => color === '#ffffff'), 'scan glow remains white in both themes')
    assert.ok(context.gradients.slice(gradientCount).some(gradient => gradient.stops.some(([, color]) => /^rgba\(233,233,233,/.test(color))), 'the floor afterglow remains luminous')
    const finalFrameCount = context.calls.filter(call => call[0] === 'clearRect').length
    await h.unmount()
    assert.equal(h.window.listenerCount(h.theme.THEME_EVENT), 0)
    assert.equal(h.window.listenerCount('resize'), 0)
    assert.ok(h.observers.every(observer => observer.disconnected))
    h.theme.setTheme('light')
    assert.equal(context.calls.filter(call => call[0] === 'clearRect').length, finalFrameCount)
  } finally { await h.unmount() }
})
