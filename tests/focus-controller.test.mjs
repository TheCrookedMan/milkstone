import test from 'node:test'
import assert from 'node:assert/strict'
import { initFocusBorder } from '../skills/milk-white-web-design/assets/focus-controller.ts'

class EventSurface {
  listeners = new Map()
  addEventListener(type, listener) {
    const handlers = this.listeners.get(type) ?? new Set()
    handlers.add(listener)
    this.listeners.set(type, handlers)
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener) }
  emit(type) { for (const handler of [...(this.listeners.get(type) ?? [])]) handler({ type, target: this }) }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0) }
}
const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height })
class DomElement {
  children = []
  style = {}
  isConnected = true
  parentElement = null
  namespaceURI = 'http://www.w3.org/1999/xhtml'
  rect = box(100, 100, 120, 40)
  computed = { visibility: 'visible', display: 'block', opacity: '1', contain: 'none', overflowX: 'visible', overflowY: 'visible', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px', borderBottomLeftRadius: '12px' }
  constructor(tag, attributes = {}, parent = null) {
    this.tagName = tag
    this.attributes = new Map(Object.entries(attributes).map(([key, value]) => [key, String(value)]))
    parent?.append(this)
  }
  append(...nodes) {
    for (const node of nodes) {
      node.remove()
      node.parentElement = this
      node.isConnected = true
      this.children.push(node)
    }
  }
  remove() {
    if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(node => node !== this)
    this.parentElement = null
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)) }
  getAttribute(name) { return this.attributes.get(name) ?? null }
  hasAttribute(name) { return this.attributes.has(name) }
  removeAttribute(name) { this.attributes.delete(name) }
  matches(selector) {
    return selector.split(',').some(part => {
      let simple = part.trim(), excluded = false
      simple = simple.replace(/:not\(([^()]*)\)/g, (_, inner) => { excluded ||= this.matches(inner); return '' })
      if (excluded) return false
      if (simple.includes(':disabled')) {
        if (!this.hasAttribute('disabled')) return false
        simple = simple.replace(':disabled', '')
      }
      if (simple === ':popover-open') return this.hasAttribute('popover-open')
      let attributesMatch = true
      simple = simple.replace(/\[([^=\]]+)(?:="([^"]*)")?\]/g, (_, name, value) => {
        attributesMatch &&= value === undefined ? this.hasAttribute(name) : this.getAttribute(name) === value
        return ''
      })
      return attributesMatch && (!simple || simple === this.tagName)
    })
  }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null }
  contains(other) { for (let node = other; node; node = node.parentElement) if (node === this) return true; return false }
  querySelector(selector) {
    for (const child of this.children) {
      if (child.matches(selector)) return child
      const found = child.querySelector(selector)
      if (found) return found
    }
    return null
  }
  getBoundingClientRect() {
    if (this.tagName === 'svg') return this.parentElement?.overlayOrigin ?? box(0, 0, 1000, 800)
    return this.rect
  }
  get type() {
    const value = (this.getAttribute('type') ?? 'text').toLowerCase()
    return ['button', 'checkbox', 'color', 'date', 'datetime-local', 'email', 'file', 'hidden', 'image', 'month', 'number', 'password', 'radio', 'range', 'reset', 'search', 'submit', 'tel', 'text', 'time', 'url', 'week'].includes(value) ? value : 'text'
  }
  get isContentEditable() {
    const value = this.getAttribute('contenteditable')?.toLowerCase()
    if (value === 'false') return false
    if (value === '' || value === 'true' || value === 'plaintext-only') return true
    return this.parentElement?.isContentEditable ?? false
  }
  get offsetWidth() { return this.layoutWidth ?? this.rect.width }
  get offsetHeight() { return this.layoutHeight ?? this.rect.height }
  get clientWidth() { return this.innerWidth ?? this.offsetWidth }
  get clientHeight() { return this.innerHeight ?? this.offsetHeight }
  get clientLeft() { return 0 }
  get clientTop() { return 0 }
}
function fixture(run) {
  const names = ['document', 'window']
  const descriptors = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))
  const doc = new EventSurface(), win = new EventSurface()
  doc.documentElement = new DomElement('html')
  doc.body = new DomElement('body', {}, doc.documentElement)
  doc.activeElement = doc.body
  doc.hidden = false
  doc.createElementNS = (namespace, tag) => { const node = new DomElement(tag); node.namespaceURI = namespace; return node }
  let hit = null
  doc.elementFromPoint = () => hit
  win.innerWidth = 1000
  win.innerHeight = 800
  win.getComputedStyle = node => node.computed
  const frames = new Map()
  let frameId = 0
  win.requestAnimationFrame = handler => { frames.set(++frameId, handler); return frameId }
  win.cancelAnimationFrame = id => frames.delete(id)
  globalThis.document = doc
  globalThis.window = win
  const dispose = initFocusBorder()
  const context = {
    doc, win, dispose,
    element: (tag, attrs = {}, parent = doc.body) => new DomElement(tag, attrs, parent),
    focus(node) { doc.activeElement = node; doc.emit('focusin') },
    setHit(node) { hit = node },
    flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()) },
    get pending() { return frames.size },
    get overlay() { return doc.documentElement.querySelector('svg') },
  }
  try { return run(context) }
  finally {
    dispose()
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  }
}
const marked = (node, kind) => node.hasAttribute(`data-milk-focus-${kind}`)
const path = context => context.overlay.querySelector('[class="milk-focus-track"]').getAttribute('d')

test('input focus follows changing geometry without mutating layout and stops after focus leaves', () => fixture(context => {
  const { element, focus, flush, doc } = context
  const control = element('input')
  const initialStyle = { ...control.style }
  focus(control)
  assert.ok(marked(control, 'source') && marked(control, 'owner'))
  assert.equal(context.overlay.getAttribute('aria-hidden'), 'true')
  assert.equal(context.overlay.getAttribute('focusable'), 'false')
  assert.equal(context.pending, 1)
  const resting = path(context)
  control.rect = box(101.5, 102, 117, 39)
  flush()
  assert.notEqual(path(context), resting)
  assert.match(path(context), /A/)
  // The soft light and its mask follow exactly the same geometry as the steady
  // rim, so a moving/pressed control cannot leak blurred pixels outside its edge.
  const light = context.overlay.querySelector('[class="milk-focus-light"]')
  const mask = context.overlay.querySelector('mask')
  assert.equal(light.getAttribute('d'), path(context))
  assert.equal(mask.querySelector('path').getAttribute('d'), path(context))
  assert.equal(light.parentElement.getAttribute('mask'), `url(#${mask.getAttribute('id')})`)
  const spectrum = context.overlay.querySelector('linearGradient')
  assert.equal(light.getAttribute('stroke'), `url(#${spectrum.getAttribute('id')})`)
  assert.equal(spectrum.getAttribute('gradientUnits'), 'userSpaceOnUse')
  for (const [attribute, value] of Object.entries({ x1: 101.5, y1: 102, x2: 218.5, y2: 141 })) assert.equal(Number(spectrum.getAttribute(attribute)), value)
  assert.deepEqual(control.style, initialStyle)
  doc.activeElement = doc.body
  doc.emit('focusout')
  flush()
  assert.equal(context.pending, 0)
  assert.equal(context.overlay.style.visibility, 'hidden')
  assert.equal(marked(control, 'source'), false)
}))

test('composite editors decorate one visible owner and embedded buttons clear that decoration', () => fixture(context => {
  const { element, focus, flush } = context
  for (const slot of ['input-group', 'number-field-content', 'tags-input', 'command-input-wrapper']) {
    const group = element('div', { 'data-slot': slot })
    const input = element('input', {}, group)
    focus(input); flush()
    assert.equal(marked(group, 'owner'), true, slot)
    assert.equal(marked(input, 'owner'), false, slot)
    const button = element('button', {}, group)
    focus(button); flush()
    assert.equal(marked(button, 'owner'), false, slot)
    assert.equal(marked(button, 'source'), false, slot)
    assert.equal(marked(group, 'owner'), false, slot)
    assert.equal(marked(input, 'source'), false, slot)
    assert.equal(context.overlay.style.visibility, 'hidden', slot)
    assert.equal(context.pending, 0, slot)
  }
}))

test('PIN and OTP inputs keep the visible active editing boundary', () => fixture(context => {
  const { element, focus, flush } = context
  const pin = element('input', { 'data-slot': 'pin-input-slot', type: 'text' })
  focus(pin)
  assert.equal(marked(pin, 'source'), true)
  assert.equal(marked(pin, 'owner'), true)
  const container = element('div', { 'data-input-otp-container': '' })
  const first = element('div', { 'data-slot': 'input-otp-slot', 'data-active': 'true' }, container)
  const second = element('div', { 'data-slot': 'input-otp-slot', 'data-active': 'false' }, container)
  const editor = element('input', { 'data-input-otp': '' }, container)
  editor.computed.opacity = '0'
  focus(editor); flush()
  assert.equal(marked(first, 'owner'), true)
  first.setAttribute('data-active', 'false')
  second.setAttribute('data-active', 'true')
  flush()
  assert.equal(marked(first, 'owner'), false)
  assert.equal(marked(second, 'owner'), true)
  assert.equal(marked(editor, 'source'), true)
  assert.equal(marked(pin, 'source'), false)
  const button = element('button', {}, container)
  focus(button); flush()
  assert.equal(marked(second, 'owner'), false)
  assert.equal(marked(editor, 'source'), false)
  assert.equal(context.overlay.style.visibility, 'hidden')
  assert.equal(context.pending, 0)
}))

test('text editors retain focus borders across native input types and contenteditable fields', () => fixture(context => {
  const { element, focus, flush } = context
  const editors = [
    element('input'),
    ...['text', 'search', 'email', 'url', 'tel', 'password', 'number', 'date', 'datetime-local', 'month', 'week', 'time'].map(type => element('input', { type })),
    element('textarea'),
    ...['', 'true', 'plaintext-only'].map(contenteditable => element('div', { contenteditable, tabindex: '0' })),
  ]
  for (const editor of editors) {
    focus(editor); flush()
    assert.equal(marked(editor, 'source'), true, `${editor.tagName} ${editor.getAttribute('type') ?? editor.getAttribute('contenteditable') ?? ''}`)
    assert.equal(marked(editor, 'owner'), true)
    assert.equal(context.overlay.style.visibility, 'visible')
  }
}))

test('editable-region children keep editor focus while embedded actions and explicit non-editable regions stay unframed', () => fixture(context => {
  const { element, focus, flush } = context
  const region = element('div', { contenteditable: 'true' })
  const inheritedEditor = element('span', { tabindex: '0' }, region)
  focus(inheritedEditor)
  assert.equal(marked(inheritedEditor, 'source'), true)
  assert.equal(marked(inheritedEditor, 'owner'), true)
  const actions = [
    element('button', { contenteditable: 'true' }, region),
    element('a', { href: '#', contenteditable: 'true' }, region),
    element('select', {}, region),
    ...['button', 'tab', 'checkbox', 'radio', 'switch', 'slider'].map(role => element('div', { role, tabindex: '0' }, region)),
    element('div', { contenteditable: 'false', tabindex: '0' }, region),
  ]
  const nonEditableParent = element('div', { contenteditable: 'false' }, region)
  actions.push(element('span', { tabindex: '0' }, nonEditableParent))
  for (const action of actions) {
    focus(inheritedEditor); flush()
    focus(action); flush()
    assert.equal(marked(inheritedEditor, 'source'), false)
    assert.equal(marked(action, 'source'), false, `${action.tagName} ${action.getAttribute('role') ?? ''}`)
    assert.equal(marked(action, 'owner'), false)
    assert.equal(context.overlay.style.visibility, 'hidden')
    assert.equal(context.pending, 0)
  }
}))

test('non-input controls never receive a focus border and stop an existing input animation', () => fixture(context => {
  const { element, focus, flush } = context
  const input = element('input')
  const controls = [
    element('button'),
    element('a', { href: '#' }),
    element('button', { 'data-slot': 'tabs-trigger', role: 'tab' }),
    element('select', { 'data-slot': 'native-select' }),
    element('button', { 'data-slot': 'select-trigger', role: 'combobox' }),
    element('button', { 'data-slot': 'combobox-trigger', role: 'combobox' }),
    element('button', { 'data-slot': 'switch', role: 'switch' }),
    element('span', { 'data-slot': 'slider-thumb', role: 'slider', tabindex: '0' }),
    element('div', { 'data-slot': 'scroll-area-viewport', tabindex: '0' }),
    element('div', { 'data-slot': 'dropdown-menu-item', role: 'menuitem', tabindex: '0' }),
    element('div', { 'data-slot': 'card', tabindex: '0' }),
    element('main', { tabindex: '-1' }),
    element('div', { contenteditable: 'false', tabindex: '0' }),
    element('path', { tabindex: '0' }),
    ...['checkbox', 'radio', 'range', 'color', 'file', 'button', 'submit', 'reset', 'image', 'hidden'].map(type => element('input', { type })),
  ]
  controls.find(control => control.tagName === 'path').namespaceURI = 'http://www.w3.org/2000/svg'
  for (const control of controls) {
    focus(input); flush()
    assert.equal(marked(input, 'source'), true)
    focus(control); flush()
    assert.equal(marked(input, 'source'), false)
    assert.equal(marked(input, 'owner'), false)
    assert.equal(marked(control, 'source'), false, `${control.tagName} ${control.getAttribute('type') ?? control.getAttribute('data-slot') ?? ''}`)
    assert.equal(marked(control, 'owner'), false)
    assert.equal(context.overlay.style.visibility, 'hidden')
    assert.equal(context.pending, 0)
  }
}))

test('explicit focus surfaces accept text editors but cannot turn a choice or button into an input', () => fixture(context => {
  const { element, focus, flush } = context
  const surface = element('div', { 'data-milk-focus-surface': '' })
  const input = element('input', {}, surface)
  focus(input)
  assert.equal(marked(surface, 'owner'), true)
  assert.equal(marked(input, 'source'), true)
  const button = element('button', {}, surface)
  focus(button); flush()
  assert.equal(marked(surface, 'owner'), false)
  assert.equal(marked(button, 'source'), false)
  assert.equal(context.pending, 0)
  for (const type of ['checkbox', 'radio']) {
    const choice = element('label', { 'data-slot': 'questionnaire-choice', 'data-milk-focus-surface': '' })
    const control = element('input', { type, 'data-slot': 'questionnaire-choice-input' }, choice)
    control.computed.opacity = '0'
    focus(control); flush()
    assert.equal(marked(choice, 'owner'), false)
    assert.equal(marked(control, 'source'), false)
    assert.equal(context.overlay.style.visibility, 'hidden')
    assert.equal(context.pending, 0)
  }
}))

test('clipping, occlusion and transformed native dialog coordinates do not leak a focus border over other UI', () => fixture(context => {
  const { element, focus, flush, doc } = context
  const scroller = element('div')
  scroller.rect = box(80, 90, 200, 25)
  scroller.computed.overflowY = 'auto'
  const control = element('input', {}, scroller)
  focus(control)
  const clip = context.overlay.querySelector('rect')
  assert.equal(clip.getAttribute('x'), '0') // Only the Y axis clips.
  assert.equal(clip.getAttribute('y'), '90')
  assert.equal(clip.getAttribute('height'), '25')
  const mask = context.overlay.querySelector('mask')
  for (const attribute of ['x', 'y', 'width', 'height']) assert.equal(mask.getAttribute(attribute), clip.getAttribute(attribute))
  context.setHit(element('header'))
  flush()
  assert.equal(context.overlay.style.visibility, 'hidden')
  assert.equal(marked(control, 'source'), false)
  context.setHit(null)
  const dialog = element('dialog', { open: '' })
  dialog.overlayOrigin = box(200, 100, 900, 720)
  const input = element('input', {}, dialog)
  input.rect = box(290, 190, 180, 36)
  input.layoutWidth = 200
  input.layoutHeight = 40
  focus(input); flush()
  assert.equal(context.overlay.parentElement, dialog)
  assert.match(path(context), /^M112,101H288A11,11/)
  const portalInput = element('textarea')
  focus(portalInput); flush()
  assert.equal(context.overlay.parentElement, doc.body)
}))

test('disabled or disconnected editors never retain a marker and zero-size owners stay unpainted', () => fixture(context => {
  const { element, focus, flush } = context
  const edge = element('input')
  focus(edge)
  assert.equal(marked(edge, 'source'), true)
  edge.isConnected = false
  flush()
  assert.equal(marked(edge, 'source'), false)
  assert.equal(context.pending, 0)
  const disabled = element('input', { disabled: '' })
  focus(disabled)
  assert.equal(marked(disabled, 'source'), false)
  const hidden = element('input')
  hidden.rect = box(0, 0, 0, 0)
  focus(hidden)
  assert.equal(context.overlay.style.visibility, 'hidden')
  assert.equal(marked(hidden, 'source'), false)
}))

test('blur, page visibility and HMR disposal cancel frames, remove decoration and allow an idempotent reinstall', () => fixture(context => {
  const { element, focus, doc, win, dispose, flush } = context
  const control = element('input')
  focus(control)
  assert.equal(initFocusBorder(), dispose)
  win.emit('blur')
  assert.equal(context.pending, 0)
  assert.equal(marked(control, 'owner'), false)
  win.emit('focus')
  assert.equal(context.pending, 1)
  doc.hidden = true
  doc.emit('visibilitychange')
  assert.equal(context.pending, 0)
  doc.hidden = false
  doc.emit('visibilitychange')
  flush()
  assert.equal(marked(control, 'source'), true)
  dispose()
  assert.equal(context.overlay, null)
  assert.equal(context.pending, 0)
  assert.equal(doc.listenerCount + win.listenerCount, 0)
  const next = initFocusBorder()
  try {
    assert.notEqual(next, dispose)
    dispose()
    assert.equal(initFocusBorder(), next)
    assert.equal(marked(control, 'source'), true)
  } finally { next() }
  assert.equal(doc.listenerCount + win.listenerCount, 0)
}))
