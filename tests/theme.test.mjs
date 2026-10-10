import test from 'node:test'
import assert from 'node:assert/strict'
import { invertHex, themeColor, initTheme, getTheme, setTheme, THEME_STORAGE_KEY, THEME_EVENT } from '../skills/milk-white-web-design/assets/theme-controller.ts'

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
