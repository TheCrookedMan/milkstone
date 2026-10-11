import test from 'node:test'
import assert from 'node:assert/strict'
import { materialTransition } from '../src/components/ui/carousel/materialTransition.ts'

class EventSurface {
  listeners = new Map()
  on(type, handler) {
    const handlers = this.listeners.get(type) ?? new Set()
    handlers.add(handler)
    this.listeners.set(type, handlers)
    return this
  }
  off(type, handler) { this.listeners.get(type)?.delete(handler); return this }
  emit(type) { for (const handler of [...(this.listeners.get(type) ?? [])]) handler(this) }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, handlers) => sum + handlers.size, 0) }
}

class MotionPreference extends EventSurface {
  constructor(matches = false) { super(); this.matches = matches }
  addEventListener(type, handler) { this.on(type, handler) }
  removeEventListener(type, handler) { this.off(type, handler) }
  set(matches) { this.matches = matches; this.emit('change') }
}

class InlineStyle {
  values = new Map()
  priorities = new Map()
  constructor(properties = {}) { for (const [name, value] of Object.entries(properties)) this.setProperty(name, value) }
  getPropertyValue(name) { return this.values.get(name) ?? '' }
  getPropertyPriority(name) { return this.priorities.get(name) ?? '' }
  setProperty(name, value, priority = '') {
    this.values.set(name, String(value))
    this.priorities.set(name, priority)
  }
  removeProperty(name) {
    const old = this.getPropertyValue(name)
    this.values.delete(name)
    this.priorities.delete(name)
    return old
  }
  get opacity() { return this.getPropertyValue('opacity') }
  set opacity(value) { this.setProperty('opacity', value) }
}

function slide({ opacity = 0, hidden = null, inert = false, properties = {} } = {}) {
  const attributes = new Map(hidden === null ? [] : [['aria-hidden', hidden]])
  return {
    style: new InlineStyle({ opacity, ...properties }),
    inert,
    getAttribute(name) { return attributes.get(name) ?? null },
    setAttribute(name, value) { attributes.set(name, String(value)) },
    removeAttribute(name) { attributes.delete(name) },
  }
}

function fixture({ nodes = [slide({ opacity: 1 }), slide(), slide()], selected = 0, reduced = false, scrollAxis = 'x', direction = 1, snaps = [0, -320, -640] } = {}) {
  const motion = new MotionPreference(reduced)
  const api = new EventSurface()
  let current = selected
  const engine = { axis: { scroll: scrollAxis, direction: value => value * direction }, scrollSnaps: snaps, slideRegistry: nodes.map((_, index) => [index]) }
  api.slideNodes = () => nodes
  api.selectedScrollSnap = () => current
  api.internalEngine = () => engine
  api.rootNode = () => ({ ownerDocument: { defaultView: { matchMedia(query) {
    assert.equal(query, '(prefers-reduced-motion: reduce)')
    return motion
  } } } })
  return {
    api, motion, nodes, engine,
    select(index) { current = index; api.emit('select') },
    fade(opacities, event = 'scroll') {
      opacities.forEach((opacity, index) => { nodes[index].style.opacity = opacity })
      api.emit(event)
    },
  }
}

const depth = node => Number(node.style.getPropertyValue('--milk-carousel-depth'))
const opacity = node => Number(node.style.getPropertyValue('--milk-carousel-opacity'))

test('material depth follows real Fade opacity through drag frames and clamps endpoint overshoot', () => {
  const { api, nodes, fade, select } = fixture()
  const plugin = materialTransition()
  plugin.init(api)
  try {
    assert.equal(depth(nodes[0]), 1)
    assert.equal(depth(nodes[1]), 0)
    select(1)
    fade([0.75, 0.25, 0])
    assert.equal(opacity(nodes[0]), 0.75)
    assert.equal(opacity(nodes[1]), 0.25)
    assert.ok(depth(nodes[0]) > depth(nodes[1]))
    assert.ok(depth(nodes[1]) > 0 && depth(nodes[1]) < opacity(nodes[1]), 'relief rises gently behind visibility')
    const earlier = depth(nodes[1])
    fade([0.2, 0.8, 0])
    assert.ok(depth(nodes[1]) > earlier)
    assert.ok(depth(nodes[0]) < depth(nodes[1]))
    fade([-0.02, 1.02, 0], 'settle')
    assert.equal(depth(nodes[0]), 0)
    assert.equal(depth(nodes[1]), 1)
    assert.equal(opacity(nodes[1]), 1)
  } finally { plugin.destroy() }
})

test('outgoing and hidden slides stay inert and hidden from assistive technology', () => {
  const { api, nodes, fade, select } = fixture({ nodes: [slide({ opacity: 1, hidden: 'false' }), slide(), slide({ inert: true })] })
  const plugin = materialTransition()
  plugin.init(api)
  try {
    assert.equal(nodes[0].inert, false)
    assert.equal(nodes[0].getAttribute('aria-hidden'), 'false', 'preserve the active slide caller attribute')
    for (const node of nodes.slice(1)) {
      assert.equal(node.inert, true)
      assert.equal(node.getAttribute('aria-hidden'), 'true')
    }
    select(1)
    fade([0.65, 0.35, 0])
    assert.equal(nodes[0].inert, true, 'the outgoing content loses input immediately')
    assert.equal(nodes[0].getAttribute('aria-hidden'), 'true')
    assert.equal(nodes[1].inert, true, 'a barely visible incoming item is not interactive yet')
    fade([0.35, 0.65, 0])
    assert.equal(nodes[1].inert, false)
    assert.equal(nodes[1].getAttribute('aria-hidden'), null)
    select(2)
    fade([0, 0, 1], 'slideFocus')
    assert.equal(nodes[2].inert, true, 'selection does not override caller-owned inert')
  } finally { plugin.destroy() }
})

test('rapid selections and reversal use the latest snap without retaining stale material or input state', () => {
  const { api, nodes, fade, select } = fixture()
  const plugin = materialTransition()
  plugin.init(api)
  try {
    select(1)
    fade([0.4, 0.6, 0])
    assert.equal(nodes[1].inert, false)
    select(2)
    fade([0.15, 0.55, 0.3])
    assert.equal(nodes[1].inert, true, 'the previous incoming slide cannot remain interactive')
    select(0)
    fade([0.7, 0.2, 0.1])
    assert.equal(nodes[0].inert, false)
    assert.equal(nodes[1].inert, true)
    assert.equal(nodes[2].inert, true)
    assert.equal(opacity(nodes[0]), 0.7)
    fade([1, 0, 0], 'settle')
    assert.deepEqual(nodes.map(depth), [1, 0, 0])
    assert.deepEqual(nodes.map(node => node.getAttribute('aria-hidden')), [null, 'true', 'true'])
  } finally { plugin.destroy() }
})

test('reduced motion immediately commits one selected material and keeps snap position compensation', () => {
  const { api, nodes, motion, fade, select } = fixture({ selected: 2, reduced: true })
  const plugin = materialTransition()
  plugin.init(api)
  try {
    assert.deepEqual(nodes.map(opacity), [0, 0, 1], 'selected material must appear without waiting for Fade')
    assert.equal(nodes[2].style.getPropertyValue('--milk-carousel-position'), 'translateX(-640px)')
    assert.equal(nodes[2].inert, false)
    select(1)
    assert.deepEqual(nodes.map(depth), [0, 1, 0])
    assert.deepEqual(nodes.map(node => node.inert), [true, false, true])
    motion.set(false)
    fade([0.2, 0.8, 0])
    assert.equal(opacity(nodes[1]), 0.8)
    motion.set(true)
    assert.deepEqual(nodes.map(opacity), [0, 1, 0], 'changing the system preference settles the in-flight fade')
  } finally { plugin.destroy() }
})

test('position compensation follows vertical and reversed axes rather than assuming left-to-right', () => {
  const { api, nodes } = fixture({ selected: 1, reduced: true, scrollAxis: 'y', direction: -1, snaps: [0, -240, -480] })
  const plugin = materialTransition()
  plugin.init(api)
  try {
    assert.equal(nodes[1].style.getPropertyValue('--milk-carousel-position'), 'translateY(240px)')
    assert.equal(opacity(nodes[1]), 1)
  } finally { plugin.destroy() }
})

test('destroy restores caller styles, ARIA and inert while leaving Fade-owned opacity untouched', () => {
  const first = slide({ opacity: 1, hidden: 'false', properties: { '--milk-carousel-depth': '.42', '--milk-carousel-position': 'translateX(12px)', color: 'red' } })
  const second = slide({ inert: true, hidden: 'true', properties: { '--milk-carousel-opacity': '.17' } })
  first.style.setProperty('--milk-carousel-depth', '.42', 'important')
  first.style.setProperty('--milk-carousel-position', 'translateX(12px)', 'important')
  second.style.setProperty('--milk-carousel-opacity', '.17', 'important')
  const { api, nodes, motion, fade, select } = fixture({ nodes: [first, second] })
  const before = nodes.map(node => ({ attributes: node.getAttribute('aria-hidden'), inert: node.inert, values: new Map(node.style.values), priorities: new Map(node.style.priorities) }))
  const plugin = materialTransition()
  plugin.init(api)
  select(1)
  fade([0.2, 0.8])
  plugin.destroy()
  assert.equal(api.listenerCount, 0)
  assert.equal(motion.listenerCount, 0)
  nodes.forEach((node, index) => {
    assert.equal(node.inert, before[index].inert)
    assert.equal(node.getAttribute('aria-hidden'), before[index].attributes)
    for (const property of ['--milk-carousel-depth', '--milk-carousel-opacity', '--milk-carousel-position', 'color']) {
      assert.equal(node.style.getPropertyValue(property), before[index].values.get(property) ?? '')
      assert.equal(node.style.getPropertyPriority(property), before[index].priorities.get(property) ?? '', `${property} restores caller priority`)
    }
  })
  assert.deepEqual(nodes.map(node => node.style.opacity), ['0.2', '0.8'])
  motion.set(true)
  api.emit('scroll')
  assert.equal(first.style.getPropertyValue('--milk-carousel-depth'), '.42', 'disposed event sources cannot write to slides')
})

test('destroy/init reinitialization binds new geometry and releases old API and media listeners', () => {
  const initial = fixture()
  const replacement = fixture({ nodes: [slide(), slide({ opacity: 1 })], selected: 1, snaps: [0, -456] })
  const plugin = materialTransition()
  plugin.init(initial.api)
  const listenerCount = initial.api.listenerCount
  assert.ok(listenerCount > 0)
  assert.equal(initial.motion.listenerCount, 1)
  plugin.destroy()
  plugin.init(replacement.api)
  try {
    assert.equal(initial.api.listenerCount, 0)
    assert.equal(initial.motion.listenerCount, 0)
    assert.equal(replacement.api.listenerCount, listenerCount)
    assert.equal(replacement.motion.listenerCount, 1)
    assert.equal(replacement.nodes[1].style.getPropertyValue('--milk-carousel-position'), 'translateX(-456px)')
    assert.deepEqual(replacement.nodes.map(depth), [0, 1])
    initial.motion.set(true)
    initial.api.emit('scroll')
    assert.equal(initial.nodes[0].style.getPropertyValue('--milk-carousel-depth'), '')
    replacement.select(0)
    replacement.fade([1, 0], 'settle')
    assert.deepEqual(replacement.nodes.map(depth), [1, 0])
  } finally { plugin.destroy() }
  assert.equal(replacement.api.listenerCount, 0)
  assert.equal(replacement.motion.listenerCount, 0)
})
