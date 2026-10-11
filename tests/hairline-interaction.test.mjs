import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const folder = new URL('../src/components/shadcn-gallery/', import.meta.url)
const fixedKernel = readFileSync(new URL('hairline/runtime/kernel.js', folder), 'utf8')
const source = readFileSync(new URL('hairline-interaction.ts', folder), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const module = { exports: {} }
vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { crypto: webcrypto })(name => {
  assert.equal(name, './hairline/runtime/kernel.js?raw')
  return { default: fixedKernel }
}, module, module.exports)
const { hairlineInteractionDocument, hairlinePalettes } = module.exports

function scripts(page) {
  return [...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map(([, attributes, body]) => ({ attributes, body }))
}

class Surface {
  listeners = new Map()
  events = []
  addEventListener(type, listener, options) {
    const entries = this.listeners.get(type) ?? []
    entries.push({ listener, once: options?.once === true })
    this.listeners.set(type, entries)
  }
  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter(entry => entry.listener !== listener))
  }
  dispatchEvent(event) {
    this.events.push(event)
    for (const entry of [...(this.listeners.get(event.type) ?? [])]) {
      if (entry.once) this.removeEventListener(event.type, entry.listener)
      entry.listener(event)
    }
    return !event.defaultPrevented
  }
  emit(type, properties = {}) {
    const event = { type, defaultPrevented: false, preventDefault() { this.defaultPrevented = true }, ...properties }
    this.dispatchEvent(event)
    return event
  }
}

/** Runs the real host adapter; geometry and RAF belong to the separately pinned kernel. */
function hostHarness() {
  const stage = new Surface()
  Object.assign(stage, {
    dataset: {}, attributes: new Map(), colors: new Map(), hovered: false,
    style: { setProperty: (key, value) => stage.colors.set(key, value) },
    setAttribute: (key, value) => stage.attributes.set(key, value),
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 160 }),
    matches: selector => selector === ':hover' && stage.hovered,
    contains: element => element === stage,
  })
  const readout = { textContent: '静止' }
  const document = { activeElement: null, documentElement: { dataset: {}, style: {} }, getElementById: id => id === 'stage' ? stage : readout }
  const surface = new Surface()
  const parentMessages = []
  const parent = { postMessage: (data, origin) => parentMessages.push({ data, origin }) }
  const timers = new Map()
  const tours = []
  const input = []
  let timerId = 0, mountContext, mountedValue, destroyCount = 0, injectCount = 0
  const HL = {
    LAP: [[40, 50], [170, 160], [300, 240], null],
    inject: () => { injectCount++ },
    mk: (tag, attributes, target) => ({ tag, attributes, target }),
    tour: (target, stops) => {
      const tour = { target, stops, stopsCalled: 0, stop() { this.stopsCalled++ } }
      tours.push(tour)
      return tour
    },
  }
  class PointerEvent {
    constructor(type, properties) { this.type = type; Object.assign(this, properties) }
  }
  const window = {}
  const sandbox = vm.createContext({
    window, document, parent, HL, PointerEvent,
    addEventListener: surface.addEventListener.bind(surface),
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id },
    clearTimeout: id => timers.delete(id),
  })
  const page = hairlineInteractionDocument('test-figure', 'hairline({})')
  vm.runInContext(scripts(page)[1].body, sandbox, { filename: 'hairline-interaction-adapter.js' })
  function mount(overrides = {}) {
    window.hairline({
      name: 'test-figure', means: '一座可以探索的线框', range: [0, 18, 36], tour: HL.LAP,
      mount(context, value) {
        mountContext = context; mountedValue = value
        context.read.textContent = 'rest'
        context.stage.addEventListener('pointermove', event => { input.push(event); context.read.textContent = `point ${event.clientX},${event.clientY}` })
        context.stage.addEventListener('pointerleave', event => { input.push(event); context.read.textContent = 'rest' })
        return { destroy: () => { destroyCount++ } }
      },
      ...overrides,
    })
  }
  const control = (data = {}, from = parent) => surface.emit('message', { source: from, data: { type: 'milkstone-hairline-control', id: 'test-figure', ...data } })
  return {
    page, stage, document, readout, parent, parentMessages, timers, tours, input, surface, mount, control,
    read: () => mountContext.read,
    mountedValue: () => mountedValue,
    destroyCount: () => destroyCount,
    injectCount: () => injectCount,
  }
}

test('interactive documents rebuild a fixed host with the bundled kernel and never embed artwork HTML', () => {
  const artwork = { id: 'saved-figure', source: 'hairline({name:"safe-source"})', html: '<html><img src="https://example.com/legacy" onerror="legacyExecutable()"></html>' }
  const page = hairlineInteractionDocument(artwork.id, artwork.source)
  const embedded = scripts(page)
  assert.equal(embedded.length, 3)
  assert.equal(embedded[0].body, fixedKernel)
  assert.equal(embedded[2].body, artwork.source)
  assert.doesNotMatch(page, /legacyExecutable|example\.com\/legacy/)
  assert.match(page, /id="stage" role="group" tabindex="0"/)
  assert.match(page, /id="read" aria-live="polite" aria-atomic="true"/)
  assert.doesNotMatch(page, /#read\{[^}]*display\s*:\s*none/)
})

test('each document authorizes only its three nonce scripts and disables external resources', () => {
  const first = hairlineInteractionDocument('first', 'hairline({})')
  const second = hairlineInteractionDocument('second', 'hairline({})')
  const policy = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(first)[1]
  const nonce = /script-src 'nonce-([a-f0-9]+)'/.exec(policy)[1]
  assert.equal(nonce.length, 36)
  for (const script of scripts(first)) assert.match(script.attributes, new RegExp(`nonce="${nonce}"`))
  assert.ok(!second.includes(`nonce="${nonce}"`), 'a new host uses a fresh nonce')
  for (const directive of ["default-src 'none'", "connect-src 'none'", "frame-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"]) assert.ok(policy.includes(directive), directive)
  assert.doesNotMatch(policy, /unsafe-eval|script-src[^;]*unsafe-inline/)
  assert.match(first, /name="referrer" content="no-referrer"/)
  const component = readFileSync(new URL('HairlineInteractiveArt.vue', folder), 'utf8')
  assert.match(component, /sandbox="allow-scripts"/)
  assert.doesNotMatch(component, /allow-same-origin|allow-top-navigation|allow-popups/)
})

test('invalid identity, oversized source and closing script markup cannot form an executable host', () => {
  for (const [id, figure] of [['bad"id', 'hairline({})'], ['x'.repeat(101), 'hairline({})'], ['valid', ' \n '], ['valid', 'x'.repeat(40_001)], ['valid', '/* </ScRiPt><script>outside()</script> */']]) {
    assert.throws(() => hairlineInteractionDocument(id, figure), /交互源码/)
  }
})

test('control messages require the parent window, the control channel and the current artwork identity', () => {
  const host = hostHarness()
  host.mount()
  host.control({ play: true, theme: 'dark', palette: { hi: '#123456' } }, {})
  host.control({ play: true, id: 'other-figure', theme: 'dark' })
  host.control({ play: true, type: 'other-channel', theme: 'dark' })
  host.surface.emit('message', { source: host.parent, data: null })
  assert.equal(host.tours.length, 0)
  assert.equal(host.document.documentElement.dataset.theme, 'light')
  assert.equal(host.stage.colors.size, 0)
  host.control({ play: true, theme: 'dark', palette: { hi: '#123456' } })
  assert.equal(host.tours.length, 1)
  assert.equal(host.stage.colors.get('--hairline-hi'), '#123456')
  assert.equal(host.document.documentElement.dataset.theme, 'dark')
  assert.equal(host.mountedValue(), 18)
  assert.equal(host.injectCount(), 1)
  assert.deepEqual(JSON.parse(JSON.stringify(host.parentMessages)), [{ data: { type: 'milkstone-hairline-interaction', id: 'test-figure', ready: true }, origin: '*' }])
  assert.equal(host.timers.size, 0, 'successful mounting cancels the watchdog')
})

test('light, dark and milk palettes update locally and reject URL values or unknown palette keys', () => {
  const host = hostHarness()
  host.mount()
  for (const theme of ['light', 'dark', 'milk']) {
    host.control({ theme, palette: hairlinePalettes[theme] })
    assert.equal(host.stage.colors.get('--hairline-plate'), hairlinePalettes[theme].plate)
    assert.equal(host.stage.colors.get('--hairline-hi'), hairlinePalettes[theme].hi)
    assert.equal(host.document.documentElement.style.colorScheme, theme === 'dark' ? 'dark' : 'light')
  }
  const before = host.stage.colors.get('--hairline-hi')
  host.control({ palette: { hi: 'url(https://example.com/ink)', plate: 'rgb(235, 237, 241)', unknown: '#fff' } })
  assert.equal(host.stage.colors.get('--hairline-hi'), before)
  assert.equal(host.stage.colors.get('--hairline-plate'), 'rgb(235, 237, 241)')
  assert.equal(host.stage.colors.has('--hairline-unknown'), false)
})

test('play may be configured before mount and repeated controls never restart an active tour', () => {
  const host = hostHarness()
  host.control({ play: true })
  assert.equal(host.tours.length, 0, 'the adapter waits until the engine exists')
  host.mount()
  assert.equal(host.tours.length, 1)
  assert.equal(host.tours[0].target, host.stage)
  host.control({ play: true, theme: 'milk', palette: hairlinePalettes.milk })
  host.control({ play: true })
  assert.equal(host.tours.length, 1, 'palette changes and repeated play do not reset progress')
  host.control({ play: false })
  host.control({ play: false })
  assert.equal(host.tours[0].stopsCalled, 1)
  host.control({ play: true })
  assert.equal(host.tours.length, 2, 'resuming creates a new tour after the old one stopped')
})

test('keyboard exploration starts at the appropriate endpoint, wraps and Home returns to rest without scrolling', () => {
  const left = hostHarness()
  left.mount()
  left.document.activeElement = left.stage
  assert.equal(left.stage.emit('keydown', { key: 'ArrowLeft' }).defaultPrevented, true)
  assert.equal(left.input.at(-1).clientX, 160)
  assert.equal(left.input.at(-1).clientY, 140)
  assert.equal(left.input.at(-1).pointerType, 'keyboard')
  const home = left.stage.emit('keydown', { key: 'Home' })
  assert.equal(home.defaultPrevented, true)
  assert.equal(left.input.at(-1).type, 'pointerleave')
  assert.equal(left.readout.textContent, '静止')
  left.stage.emit('keydown', { key: 'ArrowRight' })
  assert.equal(left.input.at(-1).clientX, 30)
  assert.equal(left.input.at(-1).clientY, 45)
  left.stage.emit('keydown', { key: 'ArrowUp' })
  assert.equal(left.input.at(-1).clientX, 160, 'backward from the first stop wraps to the last')
  const right = hostHarness()
  right.mount()
  right.stage.emit('keydown', { key: 'ArrowRight' })
  assert.equal(right.input.at(-1).clientX, 30)
  right.stage.emit('keydown', { key: 'ArrowDown' })
  assert.equal(right.input.at(-1).clientX, 95)
  assert.equal(right.stage.emit('keydown', { key: 'Tab' }).defaultPrevented, false)
  const count = right.input.length
  right.stage.emit('focusout')
  assert.equal(right.input.length, count + 1)
  assert.equal(right.input.at(-1).type, 'pointerleave')
})

test('automatic pose captions stay silent while pointer or keyboard exploration is announced', () => {
  const host = hostHarness()
  host.mount()
  host.control({ play: true })
  host.read().textContent = 'automatic tour stop 1'
  assert.equal(host.read().textContent, 'automatic tour stop 1', 'the engine still retains its caption')
  assert.equal(host.readout.textContent, '静止', 'automatic stops do not flood the live region')
  host.stage.hovered = true
  host.read().textContent = 'pointer selected tile 2'
  assert.equal(host.readout.textContent, 'pointer selected tile 2')
  host.stage.hovered = false
  host.document.activeElement = host.stage
  host.read().textContent = 'keyboard selected tile 3'
  assert.equal(host.readout.textContent, 'keyboard selected tile 3')
  host.document.activeElement = null
  host.read().textContent = 'automatic tour stop 4'
  assert.equal(host.readout.textContent, 'keyboard selected tile 3')
  host.read().textContent = 'rest'
  assert.equal(host.readout.textContent, '静止')
})

test('pagehide disposes the engine and active tour once, while an unmounted host reports its watchdog failure', () => {
  const host = hostHarness()
  host.mount()
  host.control({ play: true })
  host.surface.emit('pagehide')
  host.surface.emit('pagehide')
  assert.equal(host.tours[0].stopsCalled, 1)
  assert.equal(host.destroyCount(), 1)
  assert.equal(host.timers.size, 0)
  const stalled = hostHarness()
  assert.equal(stalled.timers.size, 1)
  const watchdog = [...stalled.timers.values()][0]
  assert.equal(watchdog.delay, 7000)
  watchdog.callback()
  assert.equal(stalled.parentMessages.at(-1).data.error, true)
  assert.equal(stalled.parentMessages.at(-1).data.id, 'test-figure')
})
