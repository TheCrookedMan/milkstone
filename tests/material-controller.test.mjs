import test from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer } from 'vue'
import { getMaterial, initMaterial, setMaterial, useMaterial, MATERIAL_EVENT, MATERIAL_STORAGE_KEY } from '../skills/milk-white-web-design/assets/material-controller.ts'

function fixture(run) {
  const names = ['document', 'window', 'localStorage', 'CustomEvent']
  const descriptors = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))
  const values = new Map(), listeners = new Map(), events = []
  const document = {
    documentElement: { dataset: { theme: 'milk' }, style: { colorScheme: 'light' } },
    querySelector() { throw new Error('A material change must not touch the browser theme color') },
  }
  const window = {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(callback)
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback) },
    dispatchEvent(event) {
      events.push(event)
      for (const callback of [...(listeners.get(event.type) ?? [])]) callback(event)
    },
  }
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  Object.assign(globalThis, {
    document, window, localStorage: storage,
    CustomEvent: class { constructor(type, { detail }) { this.type = type; this.detail = detail } },
  })
  try { run({ document, window, storage, values, listeners, events }) } finally {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  }
}

test('glass persists independently of all three color themes and restores the solid default for invalid preferences', () => fixture(({ document, values, events }) => {
  initMaterial()
  assert.equal(getMaterial(), 'solid')
  for (const theme of ['light', 'dark', 'milk']) {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light'
    values.set('milk-design-theme', theme)
    const nativeScheme = document.documentElement.style.colorScheme
    setMaterial('glass')
    assert.equal(getMaterial(), 'glass')
    assert.equal(values.get(MATERIAL_STORAGE_KEY), 'glass')
    assert.equal(document.documentElement.dataset.theme, theme)
    assert.equal(values.get('milk-design-theme'), theme)
    assert.equal(document.documentElement.style.colorScheme, nativeScheme)
    assert.equal(events.at(-1).type, MATERIAL_EVENT)
    assert.equal(events.at(-1).detail, 'glass')
    document.documentElement.dataset.material = 'solid'
    initMaterial()
    assert.equal(getMaterial(), 'glass', 'a new page restores the remembered material')
    setMaterial('solid')
    assert.equal(values.get(MATERIAL_STORAGE_KEY), 'solid')
  }
  for (const invalid of ['dark', 'milk', 'unknown', '', null]) {
    if (invalid === null) values.delete(MATERIAL_STORAGE_KEY)
    else values.set(MATERIAL_STORAGE_KEY, invalid)
    initMaterial()
    assert.equal(getMaterial(), 'solid')
  }
  document.documentElement.dataset.material = 'unknown'
  assert.equal(getMaterial(), 'solid', 'invalid DOM attributes cannot become material modes')
  setMaterial('unexpected')
  assert.equal(getMaterial(), 'solid', 'JavaScript callers are normalized at the public boundary')
  assert.equal(values.get(MATERIAL_STORAGE_KEY), 'solid')
}))

test('blocked browser storage still allows switching material in the current page', () => fixture(() => {
  globalThis.localStorage = {
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
  }
  assert.doesNotThrow(initMaterial)
  assert.equal(getMaterial(), 'solid')
  assert.doesNotThrow(() => setMaterial('glass'))
  assert.equal(getMaterial(), 'glass')
  assert.doesNotThrow(() => setMaterial('solid'))
  assert.equal(getMaterial(), 'solid')
}))

test('mounted material consumers synchronize toggles and cross-tab preferences, then dispose listeners', () => fixture(({ window, listeners, document }) => {
  const noop = () => {}
  const renderer = createRenderer({
    patchProp: noop, insert: noop, remove: noop,
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: noop, setElementText: noop, parentNode: () => null, nextSibling: () => null,
  })
  const consumers = [], apps = []
  const changeStorage = (key, newValue) => window.dispatchEvent({ type: 'storage', key, newValue })
  try {
    initMaterial()
    for (let i = 0; i < 2; i++) {
      const app = renderer.createApp({ setup() { consumers.push(useMaterial()); return () => null } })
      apps.push(app)
      app.mount({})
    }
    assert.equal(listeners.get('storage').size, 2)
    consumers[0].toggle()
    assert.deepEqual(consumers.map(({ material }) => material.value), ['glass', 'glass'])
    assert.ok(consumers.every(({ isGlass }) => isGlass.value))
    consumers[1].toggle()
    assert.deepEqual(consumers.map(({ material }) => material.value), ['solid', 'solid'])
    changeStorage(MATERIAL_STORAGE_KEY, 'glass')
    assert.ok(consumers.every(({ isGlass }) => isGlass.value))
    changeStorage('milk-design-theme', 'dark')
    assert.equal(getMaterial(), 'glass', 'theme storage events cannot change the material')
    assert.equal(document.documentElement.dataset.theme, 'milk')
    changeStorage(MATERIAL_STORAGE_KEY, 'invalid')
    assert.deepEqual(consumers.map(({ material }) => material.value), ['solid', 'solid'])
    consumers[1].setMaterial('glass')
    changeStorage(null, null)
    assert.deepEqual(consumers.map(({ material }) => material.value), ['solid', 'solid'], 'clearing storage restores the default')
    while (apps.length) apps.pop().unmount()
    assert.equal(listeners.get('storage').size, 0)
    assert.equal(listeners.get(MATERIAL_EVENT).size, 0)
    changeStorage(MATERIAL_STORAGE_KEY, 'glass')
    assert.equal(getMaterial(), 'solid', 'disposed consumers cannot react to cross-tab updates')
  } finally {
    while (apps.length) apps.pop().unmount()
  }
}))

test('material initialization and selection are safe without browser globals', () => {
  const names = ['document', 'window', 'localStorage', 'CustomEvent']
  const descriptors = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))
  try {
    for (const name of names) delete globalThis[name]
    assert.doesNotThrow(initMaterial)
    assert.equal(getMaterial(), 'solid')
    assert.doesNotThrow(() => setMaterial('glass'))
    assert.equal(getMaterial(), 'glass')
    setMaterial('solid')
  } finally {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  }
})
