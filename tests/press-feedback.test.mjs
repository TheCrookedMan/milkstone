import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initPressFeedback, PRESS_FEEDBACK_TIMING } from '../skills/milk-white-web-design/assets/press-controller.ts'

// A small DOM/event fixture lets the real delegated controller run against a
// deterministic clock. Matching is generic for the selectors used by its DOM API.
class EventSurface {
  listeners = new Map()
  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) ?? new Set()
    handlers.add(handler)
    this.listeners.set(type, handlers)
  }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler) }
  emit(type, properties = {}) {
    const event = { type, target: this, defaultPrevented: false, ...properties }
    for (const handler of [...(this.listeners.get(type) ?? [])]) handler(event)
    return event
  }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, handlers) => sum + handlers.size, 0) }
}

class DomElement {
  namespaceURI = 'http://www.w3.org/1999/xhtml'
  isConnected = true
  history = []
  constructor(tagName, attributes = {}, parent = null) {
    this.tagName = tagName.toLowerCase()
    this.attributes = new Map(Object.entries(attributes).map(([name, value]) => [name, String(value)]))
    this.parentElement = parent
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); this.history.push([name, String(value)]) }
  removeAttribute(name) { this.attributes.delete(name) }
  getAttribute(name) { return this.attributes.get(name) ?? null }
  matches(selector) {
    return selector.split(',').some(part => {
      let simple = part.trim()
      let excluded = false
      simple = simple.replace(/:not\(([^()]*)\)/g, (_, inner) => { excluded ||= this.matches(inner); return '' })
      if (excluded) return false
      if (simple.includes(':disabled')) {
        if (!this.attributes.has('disabled')) return false
        simple = simple.replace(':disabled', '')
      }
      let attributesMatch = true
      simple = simple.replace(/\[([^=\]]+)(?:="([^"]*)")?\]/g, (_, name, value) => {
        attributesMatch &&= value === undefined ? this.attributes.has(name) : this.attributes.get(name) === value
        return ''
      })
      if (!attributesMatch) return false
      const classes = (this.attributes.get('class') ?? '').split(/\s+/)
      let classesMatch = true
      simple = simple.replace(/\.([\w-]+)/g, (_, className) => { classesMatch &&= classes.includes(className); return '' })
      return classesMatch && (!simple || simple === this.tagName)
    })
  }
  closest(selector) {
    for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node
    return null
  }
}

function fixture(run, { reducedMotion = false } = {}) {
  const names = ['document', 'window', 'Element', 'performance', 'setTimeout', 'clearTimeout']
  const descriptors = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))
  const doc = new EventSurface()
  doc.hidden = false
  const win = new EventSurface()
  const motion = new EventSurface()
  motion.matches = reducedMotion
  win.matchMedia = query => { assert.equal(query, '(prefers-reduced-motion: reduce)'); return motion }
  let now = 0
  let timerId = 0
  const timers = new Map()
  const globals = {
    document: doc, window: win, Element: DomElement, performance: { now: () => now },
    setTimeout: (handler, delay = 0) => { const id = ++timerId; timers.set(id, { at: now + delay, handler }); return id },
    clearTimeout: id => timers.delete(id),
  }
  for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  const clock = {
    get now() { return now },
    get pending() { return timers.size },
    tick(duration) {
      const end = now + duration
      while (true) {
        const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]
        if (!next) break
        const [id, timer] = next
        timers.delete(id)
        now = timer.at
        timer.handler()
      }
      now = end
    },
  }
  const dispose = initPressFeedback()
  const pointer = (type, target, pointerId = 1, button = 0) => (type === 'pointerdown' ? doc : win).emit(type, { target, pointerId, button })
  const key = (type, target, value, repeat = false) => (type === 'keydown' ? doc : win).emit(type, { target, key: value, repeat })
  try { return run({ doc, win, motion, clock, dispose, pointer, key, element: (...args) => new DomElement(...args) }) }
  finally {
    dispose()
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  }
}

const state = element => element.getAttribute('data-milk-press')
const writes = element => element.history.filter(([name]) => name === 'data-milk-press').map(([, value]) => value)

test('quick pointer click retains compression for 112 ms, then returns for 420 ms without consuming the click', () => fixture(({ doc, clock, pointer, element }) => {
  assert.deepEqual(PRESS_FEEDBACK_TIMING, { minimumHold: 112, release: 420 })
  const button = element('button')
  assert.equal(pointer('pointerdown', button).defaultPrevented, false)
  clock.tick(10)
  pointer('pointerup', button)
  assert.equal(doc.emit('click', { target: button, detail: 1 }).defaultPrevented, false)
  clock.tick(PRESS_FEEDBACK_TIMING.minimumHold - 11)
  assert.equal(state(button), 'down')
  clock.tick(1)
  assert.equal(state(button), 'release')
  clock.tick(PRESS_FEEDBACK_TIMING.release - 1)
  assert.equal(state(button), 'release')
  clock.tick(1)
  assert.equal(state(button), null)
  assert.deepEqual(writes(button), ['down', 'release'])
  assert.equal(clock.pending, 0)
}))

test('held controls release on pointerup, cancellation or lost capture anywhere in the window', () => fixture(({ clock, pointer, element }) => {
  const outside = element('div')
  for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    const button = element('button')
    pointer('pointerdown', button, 7)
    clock.tick(150)
    assert.equal(state(button), 'down', ending)
    pointer(ending, outside, 7)
    assert.equal(state(button), 'release', ending)
    clock.tick(PRESS_FEEDBACK_TIMING.release)
    assert.equal(state(button), null, ending)
  }
}))

test('a cancelled quick touch or lost capture starts returning without completing a click hold', () => fixture(({ clock, pointer, element }) => {
  for (const ending of ['pointercancel', 'lostpointercapture']) {
    const button = element('button')
    pointer('pointerdown', button, 7)
    clock.tick(5)
    pointer(ending, element('div'), 7)
    assert.equal(state(button), 'release', ending)
    clock.tick(PRESS_FEEDBACK_TIMING.release)
    assert.equal(state(button), null, ending)
    assert.equal(clock.pending, 0)
  }
}))

test('rapid presses interrupt both pending release and return cleanup without an old timer clearing the new press', () => fixture(({ clock, pointer, element }) => {
  const button = element('button')
  pointer('pointerdown', button, 1)
  clock.tick(5)
  pointer('pointerup', button, 1)
  clock.tick(35)
  pointer('pointerdown', button, 2)
  clock.tick(10)
  pointer('pointerup', button, 2)
  clock.tick(PRESS_FEEDBACK_TIMING.minimumHold - 50) // The first press would have released here.
  assert.equal(state(button), 'down')
  clock.tick(40)
  assert.equal(state(button), 'release')
  clock.tick(32)
  pointer('pointerdown', button, 3)
  clock.tick(PRESS_FEEDBACK_TIMING.release - 32) // The second return's previous cleanup deadline.
  assert.equal(state(button), 'down')
  pointer('pointerup', element('div'), 3)
  assert.equal(state(button), 'release')
  clock.tick(PRESS_FEEDBACK_TIMING.release)
  assert.equal(state(button), null)
  assert.equal(clock.pending, 0)
}))

test('Space and Enter repeat events and their native synthetic click do not duplicate press cycles', () => fixture(({ doc, clock, key, element }) => {
  for (const value of [' ', 'Enter']) {
    const button = element('button')
    key('keydown', button, value)
    key('keydown', button, value, true)
    key('keydown', button, value) // Duplicate down without repeat still has the same source.
    doc.emit('click', { target: button, detail: 0 })
    clock.tick(PRESS_FEEDBACK_TIMING.minimumHold)
    assert.equal(state(button), 'down')
    assert.deepEqual(writes(button), ['down'])
    key('keyup', element('div'), value)
    assert.equal(state(button), 'release')
    clock.tick(PRESS_FEEDBACK_TIMING.release)
    assert.equal(state(button), null)
    assert.deepEqual(writes(button), ['down', 'release'])
  }
  const button = element('button')
  key('keydown', button, 'ArrowDown')
  assert.equal(state(button), null)
}))

test('delegation excludes disabled, inert, draggable, editable and slider surfaces while accepting nested icons', () => fixture(({ doc, pointer, element }) => {
  const ignored = [
    element('button', { disabled: '' }),
    element('button', { 'aria-disabled': 'true' }),
    element('button', { 'data-disabled': '' }),
    element('button', {}, element('div', { inert: '' })),
    element('button', {}, element('div', { 'data-milk-press-ignore': '' })),
    element('button', {}, element('div', { draggable: 'true' })),
    element('button', {}, element('div', { class: 'vue-flow__node' })),
    element('button', {}, element('div', { class: 'workflow-node' })),
    element('button', { role: 'slider' }),
    element('input', { type: 'range', 'data-milk-press-target': '' }),
    element('input', { type: 'text' }, element('button')),
    element('textarea', {}, element('button')),
    element('span', { contenteditable: 'true' }, element('button')),
    element('a', { href: '#' }),
  ]
  const svgControl = element('button')
  svgControl.namespaceURI = 'http://www.w3.org/2000/svg'
  ignored.push(svgControl)
  for (const control of ignored) {
    pointer('pointerdown', control)
    doc.emit('click', { target: control, detail: 0 })
    assert.equal(state(control), null)
    assert.equal(state(control.parentElement ?? control), null)
  }
  const button = element('button')
  pointer('pointerdown', button, 1, 2)
  assert.equal(state(button), null)
  const icon = element('svg', {}, button)
  icon.namespaceURI = 'http://www.w3.org/2000/svg'
  pointer('pointerdown', icon)
  assert.equal(state(button), 'down')
}))

test('assistive activation, pill links, summaries and explicit checkbox labels receive the same brief feedback', () => fixture(({ doc, clock, element }) => {
  const controls = [element('button'), element('a', { class: 'pill', href: '#' }), element('summary'), element('label', { 'data-milk-press-target': '' })]
  for (const control of controls) {
    const origin = control.tagName === 'label' ? element('input', { type: 'checkbox' }, control) : control
    doc.emit('click', { target: origin, detail: 0 })
    assert.equal(state(control), 'down')
    clock.tick(PRESS_FEEDBACK_TIMING.minimumHold)
    assert.equal(state(control), 'release')
    clock.tick(PRESS_FEEDBACK_TIMING.release)
    assert.equal(state(control), null)
  }
  const button = element('button')
  doc.emit('click', { target: button, detail: 1 })
  assert.equal(state(button), null)
}))

test('blur, hidden documents and motion changes clear active controls and outstanding timers', () => fixture(({ doc, win, motion, clock, pointer, element }) => {
  const button = element('button')
  pointer('pointerdown', button)
  doc.emit('visibilitychange')
  assert.equal(state(button), 'down')
  win.emit('blur')
  assert.equal(state(button), null)
  assert.equal(clock.pending, 0)
  pointer('pointerdown', button)
  pointer('pointerup', button)
  doc.hidden = true
  doc.emit('visibilitychange')
  assert.equal(state(button), null)
  assert.equal(clock.pending, 0)
  doc.hidden = false
  pointer('pointerdown', button)
  clock.tick(PRESS_FEEDBACK_TIMING.minimumHold)
  pointer('pointerup', button)
  assert.equal(state(button), 'release')
  motion.matches = true
  motion.emit('change')
  assert.equal(state(button), null)
  assert.equal(clock.pending, 0)
  clock.tick(1000)
  assert.equal(state(button), null)
}))

test('installation and disposal stay idempotent, including an old disposer called after reinstall', () => fixture(({ doc, win, motion, clock, dispose, pointer, element }) => {
  assert.equal(initPressFeedback(), dispose)
  const counts = [doc.listenerCount, win.listenerCount, motion.listenerCount]
  assert.deepEqual(counts, [4, 5, 1])
  const button = element('button')
  pointer('pointerdown', button)
  pointer('pointerup', button)
  assert.equal(clock.pending, 1)
  dispose()
  assert.equal(state(button), null)
  assert.equal(clock.pending, 0)
  assert.deepEqual([doc.listenerCount, win.listenerCount, motion.listenerCount], [0, 0, 0])
  const replacement = initPressFeedback()
  try {
    assert.notEqual(replacement, dispose)
    dispose()
    assert.equal(initPressFeedback(), replacement)
    assert.deepEqual([doc.listenerCount, win.listenerCount, motion.listenerCount], counts)
    pointer('pointerdown', button)
    assert.equal(state(button), 'down')
  } finally { replacement() }
  assert.deepEqual([doc.listenerCount, win.listenerCount, motion.listenerCount], [0, 0, 0])
}))

test('reduced motion clears on release immediately without hold or return timers', () => fixture(({ doc, clock, pointer, key, element }) => {
  const button = element('button')
  pointer('pointerdown', button)
  pointer('pointerup', button)
  assert.equal(state(button), null)
  assert.equal(clock.pending, 0)
  key('keydown', button, ' ')
  key('keyup', button, ' ')
  assert.equal(state(button), null)
  doc.emit('click', { target: button, detail: 0 })
  assert.equal(state(button), null)
  assert.equal(clock.pending, 0)
}, { reducedMotion: true }))

test('the shared CSS return duration matches controller cleanup and compression completes before a quick tap releases', () => {
  const css = readFileSync(new URL('../skills/milk-white-web-design/assets/milk-tokens.css', import.meta.url), 'utf8')
  const duration = name => Number(css.match(new RegExp(`--milk-${name}-duration:([\\d.]+)ms`))?.[1])
  assert.equal(duration('release'), PRESS_FEEDBACK_TIMING.release)
  assert.ok(duration('press') > 0 && duration('press') <= PRESS_FEEDBACK_TIMING.minimumHold)
})
