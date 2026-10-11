import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initRevealMotion, REVEAL_TIMING } from '../skills/milk-white-web-design/assets/reveal-controller.ts'

// Run the real controller with deterministic DOM and observer delivery. The
// fixture models the selector, containment and event APIs, without a browser.
class EventSurface {
  listeners = new Map()
  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) ?? new Set()
    handlers.add(handler)
    this.listeners.set(type, handlers)
  }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler) }
  emit(type, properties = {}) {
    const event = { type, target: this, ...properties }
    for (const handler of [...(this.listeners.get(type) ?? [])]) handler(event)
    return event
  }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, handlers) => sum + handlers.size, 0) }
}

function contains(node, candidate) {
  for (let current = candidate; current; current = current.parentNode) if (current === node) return true
  return false
}

function append(parent, child) {
  if (child.parentNode) child.parentNode.children.splice(child.parentNode.children.indexOf(child), 1)
  child.parentNode = parent
  child.parentElement = parent instanceof DomElement ? parent : null
  parent.children.push(child)
  return child
}

function querySelectorAll(node, selector) {
  const matches = []
  for (const child of node.children) {
    if (child.matches(selector)) matches.push(child)
    matches.push(...querySelectorAll(child, selector))
  }
  return matches
}

class DomElement extends EventSurface {
  children = []
  parentNode = null
  parentElement = null
  history = []
  properties = new Map()
  style = {
    setProperty: (name, value) => this.properties.set(name, value),
    removeProperty: name => this.properties.delete(name),
    getPropertyValue: name => this.properties.get(name) ?? '',
  }
  constructor(ownerDocument, attributes = {}) {
    super()
    this.ownerDocument = ownerDocument
    this.attributes = new Map(Object.entries(attributes).map(([name, value]) => [name, String(value)]))
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); this.history.push([name, String(value)]) }
  removeAttribute(name) { this.attributes.delete(name) }
  getAttribute(name) { return this.attributes.get(name) ?? null }
  hasAttribute(name) { return this.attributes.has(name) }
  contains(candidate) { return contains(this, candidate) }
  querySelectorAll(selector) { return querySelectorAll(this, selector) }
  append(child) { return append(this, child) }
  remove() {
    if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1)
    this.parentNode = this.parentElement = null
  }
  matches(selector) {
    return selector.split(',').some(part => {
      const simple = part.trim()
      const child = simple.match(/^(.*?)\s*>\s*\*$/)
      if (child) return this.parentElement?.matches(child[1]) ?? false
      const attribute = simple.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/)
      if (!attribute) throw new Error(`Unsupported fixture selector: ${simple}`)
      return attribute[2] === undefined ? this.hasAttribute(attribute[1]) : this.getAttribute(attribute[1]) === attribute[2]
    })
  }
  closest(selector) {
    for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node
    return null
  }
}
class HtmlElement extends DomElement {}

function fixture(run, { reducedMotion = false, hidden = false, missingObserver, legacyMotion = false } = {}) {
  const names = ['document', 'window', 'Element', 'HTMLElement', 'IntersectionObserver', 'MutationObserver']
  const descriptors = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))
  const doc = new EventSurface()
  Object.assign(doc, {
    children: [], hidden, activeElement: null,
    contains: candidate => contains(doc, candidate),
    querySelectorAll: selector => querySelectorAll(doc, selector),
    append: child => append(doc, child),
  })
  const motion = new EventSurface()
  motion.matches = reducedMotion
  if (legacyMotion) motion.addEventListener = undefined
  const intersections = []
  const mutations = []
  class IntersectionObserver {
    observed = new Set()
    unobserved = []
    disconnectCount = 0
    constructor(callback, options) { this.callback = callback; this.options = options; intersections.push(this) }
    observe(element) { this.observed.add(element) }
    unobserve(element) { this.observed.delete(element); this.unobserved.push(element) }
    disconnect() { this.observed.clear(); this.disconnectCount++ }
    deliver(entries = [...this.observed].map(target => ({ target, isIntersecting: true }))) { this.callback(entries) }
  }
  class MutationObserver {
    disconnectCount = 0
    constructor(callback) { this.callback = callback; mutations.push(this) }
    observe(root, options) { this.root = root; this.options = options }
    disconnect() { this.disconnectCount++ }
    deliver({ added = [], removed = [] } = {}) { this.callback([{ addedNodes: added, removedNodes: removed }]) }
  }
  const win = {
    IntersectionObserver, MutationObserver,
    matchMedia(query) { assert.equal(query, '(prefers-reduced-motion: reduce)'); return motion },
  }
  if (missingObserver) delete win[missingObserver]
  const globals = { document: doc, window: win, Element: DomElement, HTMLElement: HtmlElement, IntersectionObserver, MutationObserver }
  for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  const disposers = new Set()
  const install = (root = doc) => { const dispose = initRevealMotion(root); disposers.add(dispose); return dispose }
  const element = (attributes = {}, parent = doc, { html = true } = {}) => {
    const node = new (html ? HtmlElement : DomElement)(doc, attributes)
    if (parent) parent.append(node)
    return node
  }
  try { return run({ doc, win, motion, element, install, intersections, mutations }) }
  finally {
    for (const dispose of disposers) dispose()
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  }
}

const state = element => element.getAttribute('data-milk-reveal-state')
const delay = element => element.style.getPropertyValue('--milk-reveal-delay')
const entry = (target, isIntersecting = true) => ({ target, isIntersecting })

test('offscreen surfaces wait, enter once, and release animation styles after completion or cancellation', () => fixture(({ doc, element, install, intersections }) => {
  const completed = element({ 'data-milk-reveal': '' })
  const cancelled = element({ 'data-milk-reveal': 'soft' })
  install()
  const observer = intersections[0]
  assert.equal(state(completed), 'pending')
  observer.deliver([entry(completed, false)])
  assert.equal(state(completed), 'pending')
  observer.deliver([entry(completed), entry(cancelled)])
  assert.equal(state(completed), 'entering')
  assert.equal(observer.observed.size, 0)
  doc.emit('animationend', { target: completed, animationName: 'another-animation' })
  assert.equal(state(completed), 'entering')
  doc.emit('animationend', { target: completed, animationName: 'milk-reveal-in' })
  doc.emit('animationcancel', { target: cancelled, animationName: 'milk-reveal-in' })
  assert.equal(state(completed), null)
  assert.equal(state(cancelled), null)
  assert.equal(delay(completed), '')
  assert.equal(delay(cancelled), '')
  observer.deliver([entry(completed)]) // Already queued entries cannot restart a finished reveal.
  assert.equal(state(completed), null)
  assert.equal(completed.history.filter(([name]) => name === 'data-milk-reveal-state').length, 2)
}))

test('each visible group staggers independently and caps the wait for long groups', () => fixture(({ element, install, intersections }) => {
  const groupA = element({ 'data-milk-reveal-group': '' })
  const groupB = element({ 'data-milk-reveal-group': '' })
  const childrenA = Array.from({ length: 8 }, () => element({}, groupA))
  const childrenB = Array.from({ length: 3 }, () => element({}, groupB))
  const standalone = element({ 'data-milk-reveal': '' })
  install()
  intersections[0].deliver([...childrenA.map(child => entry(child)), ...childrenB.map(child => entry(child)), entry(standalone)])
  assert.deepEqual(childrenA.map(delay), childrenA.map((_, index) => `${Math.min(index * REVEAL_TIMING.stagger, REVEAL_TIMING.maximumDelay)}ms`))
  assert.deepEqual(childrenB.map(delay), childrenB.map((_, index) => `${Math.min(index * REVEAL_TIMING.stagger, REVEAL_TIMING.maximumDelay)}ms`))
  assert.equal(delay(standalone), '0ms')
  assert.equal(delay(childrenA.at(-1)), `${REVEAL_TIMING.maximumDelay}ms`)
}))

test('nested reveal surfaces do not hide content inside an already animated surface', () => fixture(({ element, install, intersections }) => {
  const outer = element({ 'data-milk-reveal': '' })
  const nested = element({ 'data-milk-reveal': '' }, outer)
  const innerGroup = element({ 'data-milk-reveal-group': '' }, outer)
  const groupChild = element({}, innerGroup)
  const nonHtml = element({ 'data-milk-reveal': '' }, undefined, { html: false })
  install()
  assert.deepEqual([...intersections[0].observed], [outer])
  for (const surface of [nested, groupChild, nonHtml]) assert.equal(state(surface), null)
}))

test('lazy children and whole mounted subtrees register, while removed surfaces release their hidden state', () => fixture(({ doc, element, install, intersections, mutations }) => {
  const group = element({ 'data-milk-reveal-group': '' })
  const waiting = element({}, group)
  install()
  const observer = intersections[0]
  const lazy = element({}, group)
  mutations[0].deliver({ added: [lazy] })
  assert.equal(state(lazy), 'pending')
  const wrapper = element()
  const mounted = element({ 'data-milk-reveal': '' }, wrapper)
  mutations[0].deliver({ added: [wrapper] })
  assert.equal(state(mounted), 'pending')
  observer.deliver([entry(lazy)])
  assert.equal(state(lazy), 'entering')
  group.remove()
  mutations[0].deliver({ removed: [group] })
  assert.equal(state(waiting), null)
  assert.equal(state(lazy), null)
  assert.equal(delay(lazy), '')
  assert.deepEqual([...observer.observed], [mounted])
  doc.append(group)
  mutations[0].deliver({ added: [group] })
  assert.equal(state(waiting), null) // Reusing an already seen node does not animate it twice.
  assert.equal(state(lazy), null)
  observer.deliver([entry(waiting), entry(lazy)])
  assert.equal(state(waiting), null)
  assert.equal(state(lazy), null)
}))

test('an observer scoped to a mounted element cannot register surfaces outside its root', () => fixture(({ element, install, intersections, mutations }) => {
  const root = element()
  const inside = element({ 'data-milk-reveal': '' }, root)
  const outside = element({ 'data-milk-reveal': '' })
  install(root)
  assert.deepEqual([...intersections[0].observed], [inside])
  mutations[0].deliver({ added: [outside] })
  assert.equal(state(outside), null)
  assert.equal(mutations[0].root, root)
}))

test('keyboard focus makes a pending or entering surface immediately readable', () => fixture(({ doc, element, install, intersections }) => {
  const pending = element({ 'data-milk-reveal': '' })
  const entering = element({ 'data-milk-reveal': '' })
  const input = element({}, pending)
  const button = element({}, entering)
  install()
  intersections[0].deliver([entry(entering)])
  doc.activeElement = input
  doc.emit('focusin', { target: input })
  assert.equal(state(pending), null)
  assert.equal(state(entering), 'entering')
  doc.activeElement = button
  doc.emit('focusin', { target: button })
  assert.equal(state(entering), null)
  assert.equal(delay(entering), '')
  intersections[0].deliver([entry(pending), entry(entering)])
  assert.equal(state(pending), null)
  assert.equal(state(entering), null)
}))

test('an initially focused surface stays visible and focus arriving before intersection delivery avoids an animation', () => fixture(({ doc, element, install, intersections }) => {
  const focusedAtMount = element({ 'data-milk-reveal': '' })
  const inputAtMount = element({}, focusedAtMount)
  const focusedLater = element({ 'data-milk-reveal': '' })
  const inputLater = element({}, focusedLater)
  doc.activeElement = inputAtMount
  install()
  assert.equal(state(focusedAtMount), null)
  assert.equal(state(focusedLater), 'pending')
  doc.activeElement = inputLater
  intersections[0].deliver([entry(focusedLater)])
  assert.equal(state(focusedLater), null)
  assert.equal(delay(focusedLater), '')
}))

test('initial reduced motion never hides surfaces, including content mounted later', () => fixture(({ element, install, intersections, mutations, motion }) => {
  const surface = element({ 'data-milk-reveal': '' })
  install()
  assert.equal(state(surface), null)
  const lazy = element({ 'data-milk-reveal': '' })
  mutations[0].deliver({ added: [lazy] })
  assert.equal(state(lazy), null)
  assert.equal(intersections[0].observed.size, 0)
  motion.matches = false
  motion.emit('change')
  assert.equal(state(surface), null)
  assert.equal(state(lazy), null)
}, { reducedMotion: true }))

test('enabling reduced motion releases both waiting and animating surfaces without a later replay', () => fixture(({ element, install, intersections, motion, mutations }) => {
  const waiting = element({ 'data-milk-reveal': '' })
  const animating = element({ 'data-milk-reveal': '' })
  install()
  intersections[0].deliver([entry(animating)])
  motion.matches = true
  motion.emit('change')
  for (const surface of [waiting, animating]) {
    assert.equal(state(surface), null)
    assert.equal(delay(surface), '')
  }
  const lazyWhileReduced = element({ 'data-milk-reveal': '' })
  mutations[0].deliver({ added: [lazyWhileReduced] })
  assert.equal(state(lazyWhileReduced), null)
  motion.matches = false
  motion.emit('change')
  intersections[0].deliver([entry(waiting), entry(animating)])
  assert.equal(state(waiting), null)
  assert.equal(state(animating), null)
  const later = element({ 'data-milk-reveal': '' })
  mutations[0].deliver({ added: [later] })
  assert.equal(state(later), 'pending')
}))

test('hiding the document releases animations; content mounted while hidden remains readable', () => fixture(({ doc, element, install, intersections, mutations }) => {
  const waiting = element({ 'data-milk-reveal': '' })
  const animating = element({ 'data-milk-reveal': '' })
  install()
  intersections[0].deliver([entry(animating)])
  doc.hidden = true
  doc.emit('visibilitychange')
  assert.equal(state(waiting), null)
  assert.equal(state(animating), null)
  const lazy = element({ 'data-milk-reveal': '' })
  mutations[0].deliver({ added: [lazy] })
  assert.equal(state(lazy), null)
  doc.hidden = false
  doc.emit('visibilitychange')
  assert.equal(state(waiting), null)
  assert.equal(state(lazy), null)
}))

test('installation and disposal are idempotent and stale observer deliveries cannot strand disposed content', () => fixture(({ doc, element, install, intersections, mutations, motion }) => {
  const surface = element({ 'data-milk-reveal': '' })
  const dispose = install()
  assert.equal(install(), dispose)
  assert.equal(intersections.length, 1)
  assert.equal(mutations.length, 1)
  const counts = [doc.listenerCount, motion.listenerCount]
  assert.deepEqual(counts, [4, 1])
  dispose()
  dispose()
  assert.equal(state(surface), null)
  assert.deepEqual([doc.listenerCount, motion.listenerCount], [0, 0])
  assert.equal(intersections[0].disconnectCount, 1)
  assert.equal(mutations[0].disconnectCount, 1)
  intersections[0].deliver([entry(surface)])
  assert.equal(state(surface), null)
  const replacement = install()
  assert.notEqual(replacement, dispose)
  assert.equal(state(surface), 'pending')
  dispose()
  assert.equal(install(), replacement)
  assert.deepEqual([doc.listenerCount, motion.listenerCount], counts)
  replacement()
  assert.equal(state(surface), null)
  assert.deepEqual([doc.listenerCount, motion.listenerCount], [0, 0])
}))

for (const missingObserver of ['IntersectionObserver', 'MutationObserver']) {
  test(`without ${missingObserver}, existing and future content remains visible`, () => fixture(({ doc, element, install, intersections, mutations, motion }) => {
    const existing = element({ 'data-milk-reveal': '' })
    const dispose = install()
    const lazy = element({ 'data-milk-reveal': '' })
    assert.equal(state(existing), null)
    assert.equal(state(lazy), null)
    assert.equal(intersections.length, 0)
    assert.equal(mutations.length, 0)
    assert.deepEqual([doc.listenerCount, motion.listenerCount], [0, 0])
    assert.doesNotThrow(dispose)
    assert.doesNotThrow(dispose)
  }, { missingObserver }))
}

test('legacy motion preferences without event listeners leave all content visible', () => fixture(({ doc, element, install, intersections, mutations, motion }) => {
  const existing = element({ 'data-milk-reveal': '' })
  let dispose
  assert.doesNotThrow(() => { dispose = install() })
  const lazy = element({ 'data-milk-reveal': '' })
  assert.equal(state(existing), null)
  assert.equal(state(lazy), null)
  assert.equal(intersections.length, 0)
  assert.equal(mutations.length, 0)
  assert.deepEqual([doc.listenerCount, motion.listenerCount], [0, 0])
  assert.doesNotThrow(dispose)
}, { legacyMotion: true }))

test('the reveal stylesheet has a visible no-JavaScript default and a reduced-motion override', () => {
  const css = readFileSync(new URL('../skills/milk-white-web-design/assets/milk-motion.css', import.meta.url), 'utf8')
  const duration = Number(css.match(/--milk-reveal-duration:([\d.]+)ms/)?.[1])
  assert.equal(duration, REVEAL_TIMING.duration)
  assert.ok(REVEAL_TIMING.maximumDelay < REVEAL_TIMING.duration)
  // Visibility may be hidden only by the controller's transient state, never by the opt-in markers alone.
  assert.match(css, /\[data-milk-reveal-state="pending"\]\s*\{\s*opacity:0\s*\}/)
  assert.doesNotMatch(css, /\[data-milk-reveal(?:="[^"]*")?\]\s*\{[^}]*opacity:0/)
  assert.match(css, /\[data-milk-reveal-state\]:focus-within\s*\{[^}]*opacity:1/)
  assert.match(css, /@media\s*\(prefers-reduced-motion:reduce\)[\s\S]*opacity:1!important;\s*animation:none!important/)
})
