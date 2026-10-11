import test from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer } from 'vue'
import { invertHex, themeColor, initTheme, getTheme, isDark, setTheme, useTheme, THEME_STORAGE_KEY, THEME_EVENT } from '../skills/milk-white-web-design/assets/theme-controller.ts'

test('exact RGB inversion preserves alpha and round-trips colors', () => {
  assert.equal(invertHex('#f3f5f7'), '#0c0a08')
  assert.equal(invertHex('#2e3540'), '#d1cabf')
  assert.equal(invertHex('#ffffffcc'), '#000000cc')
  assert.equal(invertHex('#abcd'), '#554433dd')
  for (const color of ['#fbfcff', '#6b7c93', '#00000000', '#ffffffd9', '#e2e7ef']) assert.equal(invertHex(invertHex(color)), color)
  assert.equal(invertHex('transparent'), 'transparent')
})

test('switch applies one source of truth, persists, restores and tolerates blocked storage', () => {
  const originals = Object.fromEntries(['document', 'window', 'localStorage', 'CustomEvent'].map(key => [key, globalThis[key]]))
  const storage = new Map()
  const document = { documentElement: { dataset: {}, style: {} }, querySelector: () => ({ setAttribute: (_key, value) => { document.meta = value } }) }
  const events = []
  Object.assign(globalThis, {
    document, window: { dispatchEvent: event => events.push(event) },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail } },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  })
  try {
    initTheme()
    assert.equal(getTheme(), 'light')
    assert.equal(themeColor('#fbfcff'), '#fbfcff')
    setTheme('dark')
    assert.equal(document.documentElement.dataset.theme, 'dark')
    assert.equal(document.documentElement.style.colorScheme, 'dark')
    assert.equal(document.meta, '#1c1f24')
    assert.equal(storage.get(THEME_STORAGE_KEY), 'dark')
    assert.equal(events.at(-1).type, THEME_EVENT)
    assert.equal(themeColor('#ffffff8c'), '#0000008c')
    assert.equal(themeColor('rgba(239,239,239,.45)'), 'rgba(16,16,16,.45)')
    assert.equal(themeColor('rgb(0,25,255)'), 'rgb(255,230,0)')
    document.documentElement.dataset.theme = 'light'
    initTheme()
    assert.equal(getTheme(), 'dark')
    setTheme('milk')
    assert.equal(getTheme(), 'milk')
    assert.equal(isDark(), false)
    assert.equal(document.documentElement.style.colorScheme, 'light', 'milk uses native light controls')
    assert.equal(document.meta, '#f4f1ea')
    assert.equal(storage.get(THEME_STORAGE_KEY), 'milk')
    assert.equal(events.at(-1).detail, 'milk')
    assert.equal(themeColor('#fbfcff'), '#fbfcff', 'a light material palette must not invert Canvas colors')
    assert.equal(themeColor('rgba(239,239,239,.45)'), 'rgba(239,239,239,.45)')
    document.documentElement.dataset.theme = 'light'
    initTheme()
    assert.equal(getTheme(), 'milk', 'the remembered third theme survives a new initialization')
    setTheme('light')
    document.documentElement.dataset.theme = 'dark'
    initTheme()
    assert.equal(getTheme(), 'light', 'legacy light selections still restore')
    storage.set(THEME_STORAGE_KEY, 'unknown')
    initTheme()
    assert.equal(getTheme(), 'light', 'unrecognized stored values retain the established default')
    globalThis.localStorage = { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } }
    initTheme()
    assert.equal(getTheme(), 'light')
    assert.doesNotThrow(() => setTheme('dark'))
    assert.equal(getTheme(), 'dark')
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key]
      else globalThis[key] = value
    }
  }
})

test('mounted theme consumers share all three modes across storage events and clean up their listeners', () => {
  const originals = Object.fromEntries(['document', 'window', 'localStorage', 'CustomEvent'].map(key => [key, globalThis[key]]))
  const listeners = new Map()
  const events = []
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
  Object.assign(globalThis, {
    document: { documentElement: { dataset: {}, style: {} }, querySelector: () => null },
    window,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail } },
    localStorage: { getItem: () => null, setItem() {} },
  })
  const noop = () => {}
  const renderer = createRenderer({
    patchProp: noop, insert: noop, remove: noop,
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: noop, setElementText: noop, parentNode: () => null, nextSibling: () => null,
  })
  const consumers = []
  const apps = []
  const changeStorage = (key, newValue) => window.dispatchEvent({ type: 'storage', key, newValue })
  try {
    initTheme()
    for (let i = 0; i < 2; i++) {
      const app = renderer.createApp({ setup() { consumers.push(useTheme()); return () => null } })
      apps.push(app)
      app.mount({})
    }
    assert.equal(listeners.get('storage').size, 2)
    changeStorage(THEME_STORAGE_KEY, 'milk')
    assert.deepEqual(consumers.map(({ theme }) => theme.value), ['milk', 'milk'])
    assert.ok(consumers.every(consumer => consumer.isDark.value === false))
    assert.equal(events.filter(event => event.type === THEME_EVENT).at(-1).detail, 'milk')
    changeStorage('other-preference', 'dark')
    assert.equal(getTheme(), 'milk', 'unrelated stored preferences cannot change the theme')
    consumers[0].toggle()
    assert.deepEqual(consumers.map(({ theme }) => theme.value), ['dark', 'dark'], 'legacy toggle still selects dark from a light material')
    consumers[1].toggle()
    assert.deepEqual(consumers.map(({ theme }) => theme.value), ['light', 'light'])
    changeStorage(THEME_STORAGE_KEY, 'dark')
    assert.ok(consumers.every(consumer => consumer.isDark.value === true))
    changeStorage(THEME_STORAGE_KEY, 'unexpected')
    assert.equal(getTheme(), 'light')
    changeStorage(THEME_STORAGE_KEY, 'milk')
    changeStorage(null, null)
    assert.deepEqual(consumers.map(({ theme }) => theme.value), ['light', 'light'], 'cleared storage restores the default')
    while (apps.length) apps.pop().unmount()
    assert.equal(listeners.get('storage').size, 0)
    assert.equal(listeners.get(THEME_EVENT).size, 0)
    changeStorage(THEME_STORAGE_KEY, 'milk')
    assert.equal(getTheme(), 'light', 'disposed consumers no longer react to cross-tab changes')
  } finally {
    while (apps.length) apps.pop().unmount()
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key]
      else globalThis[key] = value
    }
  }
})
