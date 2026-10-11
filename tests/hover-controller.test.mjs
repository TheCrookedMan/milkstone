import test from 'node:test'
import assert from 'node:assert/strict'
import { initHoverRipple } from '../skills/milk-white-web-design/assets/hover-controller.ts'

class Events {
  listeners = new Map()
  addEventListener(type, listener) {
    const group = this.listeners.get(type) ?? new Set()
    group.add(listener); this.listeners.set(type, group)
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener) }
  emit(type, event = {}) { for (const listener of [...(this.listeners.get(type) ?? [])]) listener({ type, target: this, ...event }) }
  get count() { return [...this.listeners.values()].reduce((sum, group) => sum + group.size, 0) }
}
const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height })
class Element {
  children = []; parentElement = null; style = {}; isConnected = true
  namespaceURI = 'http://www.w3.org/1999/xhtml'
  rect = box(100, 100, 120, 40)
  computed = { visibility: 'visible', display: 'block', opacity: '1', contain: 'none', overflowX: 'visible', overflowY: 'visible', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', borderBottomRightRadius: '20px', borderBottomLeftRadius: '20px' }
  constructor(tag, attrs = {}, parent = null) { this.tag = tag; this.attrs = new Map(Object.entries(attrs)); parent?.append(this) }
  append(...nodes) { for (const node of nodes) { node.remove(); node.parentElement = this; this.children.push(node) } }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(node => node !== this); this.parentElement = null }
  setAttribute(name, value) { this.attrs.set(name, String(value)) }
  getAttribute(name) { return this.attrs.get(name) ?? null }
  hasAttribute(name) { return this.attrs.has(name) }
  matches(selector) {
    return selector.split(',').some(part => {
      let simple = part.trim(), valid = true
      simple = simple.replace(/:not\(([^()]*)\)/g, (_, inner) => { valid &&= !this.matches(inner); return '' })
      if (simple.includes(':disabled')) { valid &&= this.hasAttribute('disabled'); simple = simple.replace(':disabled', '') }
      if (simple === ':popover-open') return this.hasAttribute('popover-open')
      simple = simple.replace(/\[([^=\]]+)(?:="([^"]*)")?\]/g, (_, name, value) => { valid &&= value === undefined ? this.hasAttribute(name) : this.getAttribute(name) === value; return '' })
      simple = simple.replace(/\.([\w-]+)/g, (_, name) => { valid &&= (this.getAttribute('class') ?? '').split(' ').includes(name); return '' })
      return valid && (!simple || simple === this.tag)
    })
  }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null }
  contains(other) { for (let node = other; node; node = node.parentElement) if (node === this) return true; return false }
  querySelector(selector) { for (const child of this.children) { if (child.matches(selector)) return child; const found = child.querySelector(selector); if (found) return found } return null }
  getBoundingClientRect() { return this.tag === 'svg' ? this.parentElement?.overlayOrigin ?? box(0, 0, 1000, 800) : this.rect }
  get offsetWidth() { return this.layoutWidth ?? this.rect.width }
  get offsetHeight() { return this.layoutHeight ?? this.rect.height }
  get clientWidth() { return this.innerWidth ?? this.offsetWidth }
  get clientHeight() { return this.innerHeight ?? this.offsetHeight }
  get clientLeft() { return 0 }
  get clientTop() { return 0 }
}
function fixture(run) {
  const names = ['document', 'window', 'Element']
  const descriptors = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))
  const doc = new Events(), win = new Events()
  doc.documentElement = new Element('html'); doc.body = new Element('body', {}, doc.documentElement); doc.hidden = false
  doc.createElementNS = (namespace, tag) => { const node = new Element(tag); node.namespaceURI = namespace; return node }
  let hit = null, now = 0, id = 0
  doc.elementFromPoint = () => hit
  win.innerWidth = 1000; win.innerHeight = 800; win.getComputedStyle = node => node.computed
  win.performance = { now: () => now }
  const media = new Map()
  win.matchMedia = query => { const surface = new Events(); surface.matches = query === '(any-hover: hover)'; media.set(query, surface); return surface }
  const frames = new Map()
  win.requestAnimationFrame = callback => { frames.set(++id, callback); return id }
  win.cancelAnimationFrame = frame => frames.delete(frame)
  globalThis.document = doc; globalThis.window = win; globalThis.Element = Element
  const dispose = initHoverRipple()
  const context = {
    doc, win, dispose, media,
    element: (tag, attrs = {}, parent = doc.body) => new Element(tag, attrs, parent),
    enter(node, fields = {}) { doc.emit('pointerover', { target: node, pointerType: 'mouse', buttons: 0, clientX: 112, clientY: 120, relatedTarget: null, ...fields }) },
    leave(node, relatedTarget = null) { doc.emit('pointerout', { target: node, relatedTarget }) },
    flush(time) { now = time; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now)) },
    setHit(node) { hit = node },
    get pending() { return frames.size },
    get overlay() { return doc.documentElement.querySelector('svg') },
  }
  try { run(context) } finally {
    dispose()
    for (const [name, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name] }
  }
}

test('hover ripples stay inside the surface, follow press geometry and finish without an idle animation loop', () => fixture(context => {
  const button = context.element('button')
  const attrs = new Map(button.attrs), style = { ...button.style }
  context.enter(button); context.flush(300)
  const svg = context.overlay, circle = svg.querySelector('circle'), path = svg.querySelector('path')
  assert.equal(svg.getAttribute('aria-hidden'), 'true'); assert.equal(svg.getAttribute('focusable'), 'false')
  assert.equal(svg.style.visibility, 'visible')
  assert.ok(Number(circle.getAttribute('opacity')) > 0)
  assert.ok(Number(circle.getAttribute('r')) < Math.hypot(120, 40))
  const resting = path.getAttribute('d')
  button.rect = box(102, 102, 116, 39)
  context.flush(500)
  assert.notEqual(path.getAttribute('d'), resting)
  assert.equal(Number(circle.getAttribute('cx')), 113.6)
  assert.deepEqual(button.style, style); assert.deepEqual(button.attrs, attrs)
  context.flush(1600)
  assert.equal(context.pending, 0); assert.equal(svg.style.visibility, 'hidden')
  const child = context.element('span', {}, button)
  context.enter(child, { relatedTarget: button })
  assert.equal(context.pending, 0, 'moving between button children does not replay the ripple')
}))

test('slightly early first-frame timestamps and unrelated pointerout events cannot end a valid hover', () => fixture(context => {
  const button = context.element('button')
  context.flush(200); context.enter(button); context.flush(199)
  const circle = context.overlay.querySelector('circle')
  assert.equal(circle.getAttribute('r'), '0'); assert.equal(circle.getAttribute('opacity'), '0')
  assert.equal(context.overlay.style.visibility, 'visible'); assert.equal(context.pending, 1)
  context.flush(400)
  const unrelated = context.element('div')
  context.leave(unrelated); context.flush(650)
  assert.equal(context.overlay.style.visibility, 'visible')
  assert.ok(Number(circle.getAttribute('opacity')) > .3)
  assert.equal(context.pending, 1)
}))

test('touch, disabled, editable and dragged controls do not generate waves; motion/media changes cancel active waves', () => fixture(context => {
  for (const [attrs, fields] of [[{}, { pointerType: 'touch' }], [{ disabled: '' }, {}], [{ 'aria-disabled': 'true' }, {}], [{ 'data-milk-hover-ignore': '' }, {}], [{ draggable: 'true' }, {}], [{ role: 'slider' }, {}], [{}, { buttons: 1 }]]) {
    context.enter(context.element('button', attrs), fields)
    assert.equal(context.pending, 0)
  }
  const button = context.element('button')
  context.enter(context.element('input', { type: 'text' }, button)); assert.equal(context.pending, 0)
  context.enter(button); context.flush(200); assert.equal(context.pending, 1)
  const reduced = context.media.get('(prefers-reduced-motion: reduce)')
  reduced.matches = true; reduced.emit('change')
  assert.equal(context.pending, 0); assert.equal(context.overlay.style.visibility, 'hidden')
  context.enter(button); assert.equal(context.pending, 0)
  reduced.matches = false
  const hover = context.media.get('(any-hover: hover)'); hover.matches = false
  context.enter(button); assert.equal(context.pending, 0)
  hover.matches = true
  const forced = context.media.get('(forced-colors: active)'); forced.matches = true
  context.enter(button); assert.equal(context.pending, 0)
}))

test('waves respect scroll clipping, native dialog coordinates, occlusion and a short exit fade', () => fixture(context => {
  const scroller = context.element('div'); scroller.rect = box(80, 90, 200, 25); scroller.computed.overflowY = 'auto'
  const button = context.element('button', {}, scroller)
  context.enter(button); context.flush(300)
  const svg = context.overlay, clip = svg.querySelector('rect'), circle = svg.querySelector('circle')
  assert.equal(clip.getAttribute('x'), '0'); assert.equal(clip.getAttribute('y'), '90'); assert.equal(clip.getAttribute('height'), '25')
  const before = Number(circle.getAttribute('opacity'))
  context.leave(button); context.flush(400)
  assert.ok(Number(circle.getAttribute('opacity')) < before)
  context.flush(481); assert.equal(context.pending, 0)
  const dialog = context.element('dialog', { open: '' }); dialog.overlayOrigin = box(200, 100, 900, 720)
  const nested = context.element('button', {}, dialog); nested.rect = box(290, 190, 180, 36); nested.layoutWidth = 200; nested.layoutHeight = 40
  context.enter(nested, { clientX: 300, clientY: 200 }); context.flush(700)
  assert.equal(svg.parentElement, dialog)
  assert.ok(Math.abs(Number(circle.getAttribute('cx')) - 111.11111111111111) < .001)
  context.setHit(context.element('header')); context.flush(800)
  assert.equal(svg.style.visibility, 'hidden'); assert.equal(context.pending, 0)
}))

test('installation is idempotent and disposal, backgrounding and detached controls leave no work or listeners', () => fixture(context => {
  assert.equal(initHoverRipple(), context.dispose)
  const button = context.element('summary')
  context.enter(button); context.flush(100)
  button.isConnected = false; context.flush(200)
  assert.equal(context.pending, 0)
  button.isConnected = true; context.leave(button); context.enter(button); context.flush(300)
  context.win.emit('blur'); assert.equal(context.pending, 0)
  context.enter(button); context.flush(400); context.doc.hidden = true; context.doc.emit('visibilitychange')
  assert.equal(context.pending, 0)
  context.dispose(); context.dispose()
  assert.equal(context.overlay, null); assert.equal(context.doc.count, 0); assert.equal(context.win.count, 0)
  for (const surface of context.media.values()) assert.equal(surface.count, 0)
  context.doc.hidden = false
  const next = initHoverRipple(); assert.notEqual(next, context.dispose); next()
}))
