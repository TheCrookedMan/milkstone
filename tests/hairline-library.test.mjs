import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { computed, readonly, ref } from 'vue'

const folder = new URL('../src/components/shadcn-gallery/', import.meta.url)
function execute(name, dependencies, globals = {}) {
  const source = readFileSync(new URL(name, folder), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }
  const context = vm.createContext({ URL, JSON, Date, Map, Set, Error, Number, setTimeout, clearTimeout, AbortController, TextDecoder, ...globals })
  vm.runInContext(`(function(require,module,exports){${code}\n})`, context)(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`)
    return dependencies[name]
  }, module, module.exports)
  return module.exports
}

function builtinHarness() {
  const source = readFileSync(new URL('hairline-builtins.ts', folder), 'utf8')
  const dependencies = Object.fromEntries([...source.matchAll(/from '(\.\/hairline\/[^']+\?raw)'/g)].map(([, name]) => [name, { default: readFileSync(new URL(name.slice(0, -4), folder), 'utf8') }]))
  return execute('hairline-builtins.ts', dependencies)
}

function libraryHarness({ initial = null, denied = false, timers = {}, fetchImpl = null } = {}) {
  let value = initial
  const writes = []
  const requests = []
  let response = new Response(JSON.stringify({ configured: true }))
  const module = execute('hairline-library.ts', {
    vue: { computed, readonly, ref },
    // Storage tests exercise transaction behavior; SVG filtering is tested separately below and in browser QA.
    './hairline-sanitize': { sanitizeHairlineSvg: value => {
      if (typeof value !== 'string' || !value.startsWith('<svg')) throw new Error('invalid svg')
      return value
    } },
    './hairline-builtins': builtinHarness(),
  }, {
    window: { localStorage: { getItem: () => value, setItem: (_key, next) => {
      if (denied) throw new Error('quota')
      value = next; writes.push(next)
    } } },
    fetch: async (url, options) => { requests.push({ url, options }); return fetchImpl ? fetchImpl(url, options) : response },
    ...timers,
  })
  return { module, store: module.useHairlineLibrary(), writes, requests, stored: () => value, setResponse: value => { response = value } }
}

function artwork(id = 'figure-1', prompt = '空置的名册架') {
  return { id, name: '名册架', means: '为尚未到来的姓名留一个位置。', prompt, source: 'hairline({})', html: '<!doctype html><html>original</html>', previewHtml: '<!doctype html><html>preview</html>', createdAt: '2026-10-11T12:00:00Z', model: 'test-model', runtimeVersion: 'test-runtime', validation: 'static', lightSvg: '<svg viewBox="0 0 400 320"><path d="M0 0L1 1"/></svg>', darkSvg: '<svg viewBox="0 0 400 320"><path d="M0 0L1 1"/></svg>' }
}

test('saved artwork persists, is reused by normalized prompt and survives a new library instance', () => {
  const first = libraryHarness()
  first.store.save(artwork('figure-1', '  空置的\n名册架  '))
  assert.equal(first.store.artworks.value.length, 5)
  assert.equal(first.store.selected.value.id, 'figure-1')
  assert.equal(first.store.findPrompt('空置的 名册架').id, 'figure-1')
  assert.equal(first.requests.length, 0, 'local reuse never calls the model')
  const second = libraryHarness({ initial: first.stored() })
  assert.equal(second.store.selected.value.id, 'figure-1')
  second.store.remove('figure-1')
  assert.equal(second.store.selected.value.id, 'milkstone-empty-tray')
  assert.equal(second.store.artworks.value.length, 4)
  second.store.remove('milkstone-empty-tray')
  assert.equal(second.store.artworks.value.length, 4)
})

test('failed or unpreviewed artwork cannot enter the saved library', () => {
  const { store, writes } = libraryHarness()
  const withoutPreview = artwork()
  delete withoutPreview.darkSvg
  assert.throws(() => store.save(withoutPreview), /预览/)
  assert.equal(store.artworks.value.length, 4)
  assert.equal(writes.length, 0)
})

test('storage failure is atomic and reports a recoverable quota error', () => {
  const { store, writes } = libraryHarness({ denied: true })
  assert.throws(() => store.save(artwork()), /存储空间不足/)
  assert.equal(store.artworks.value.length, 4)
  assert.equal(store.selected.value.id, 'milkstone-empty-tray')
  assert.equal(writes.length, 0)
})

test('malformed stored data is not overwritten and invalid imports preserve usable artworks', () => {
  const malformed = JSON.stringify({ version: 1, selectedId: 'bad', artworks: [{ id: 'bad' }] })
  const { store, writes, stored } = libraryHarness({ initial: malformed })
  assert.match(store.storageWarning.value, /无法读取/)
  assert.equal(store.artworks.value.length, 4)
  assert.equal(stored(), malformed)
  assert.throws(() => store.importJson(JSON.stringify({ version: 1, selectedId: 'bad', artworks: [artwork('bad<script>')] })), /标识/)
  assert.equal(writes.length, 0)
})

test('JSON export/import merges reusable artwork without a model call and enforces the library limit', () => {
  const first = libraryHarness()
  first.store.save(artwork())
  const second = libraryHarness()
  assert.equal(second.store.importJson(first.store.exportJson()), 1)
  assert.equal(second.store.selected.value.id, 'figure-1')
  assert.equal(second.requests.length, 0)
  for (let i = 2; i <= 24; i++) second.store.save(artwork(`figure-${i}`, `prompt ${i}`))
  assert.throws(() => second.store.save(artwork('figure-25')), /最多保存 24/)
  assert.equal(second.store.artworks.value.length, 28, 'four builtins plus twenty-four saved artworks')
})

test('semantic scenes start with distinct builtins and keep overrides across reloads and JSON transfers', () => {
  const first = libraryHarness()
  assert.deepEqual(['data', 'people', 'search'].map(scene => first.store.getSceneArtwork(scene).id), ['milkstone-empty-plot', 'milkstone-empty-roster', 'milkstone-empty-loupe'])
  assert.equal(first.store.savedCount.value, 0)
  first.store.save({ ...artwork(), milkSvg: '<svg viewBox="0 0 400 320"/>' }, 'people')
  assert.equal(first.store.savedCount.value, 1)
  assert.equal(first.store.getSceneArtwork('people').id, 'figure-1')
  assert.equal(first.store.getSceneArtwork('data').id, 'milkstone-empty-plot')
  first.store.selectForScene('search', 'figure-1')
  const reloaded = libraryHarness({ initial: first.stored() })
  assert.equal(reloaded.store.getSceneArtwork('people').id, 'figure-1')
  assert.equal(reloaded.store.getSceneArtwork('search').id, 'figure-1')
  assert.equal(reloaded.store.selected.value.milkSvg, '<svg viewBox="0 0 400 320"/>')
  const imported = libraryHarness()
  imported.store.importJson(first.store.exportJson())
  assert.equal(imported.store.getSceneArtwork('people').id, 'figure-1')
  imported.store.remove('figure-1')
  assert.equal(imported.store.getSceneArtwork('people').id, 'milkstone-empty-roster')
  assert.equal(imported.store.getSceneArtwork('search').id, 'milkstone-empty-loupe')
  assert.equal(imported.store.savedCount.value, 0)
  for (const builtin of imported.store.artworks.value) imported.store.remove(builtin.id)
  assert.equal(imported.store.artworks.value.length, 4, 'every builtin is protected')
})

test('legacy v1 libraries retain old selection while semantic scenes fall back independently', () => {
  const legacy = JSON.stringify({ version: 1, selectedId: 'figure-1', artworks: [artwork()] })
  const { store } = libraryHarness({ initial: legacy })
  assert.equal(store.selected.value.id, 'figure-1')
  assert.equal(store.getSceneArtwork('people').id, 'milkstone-empty-roster')
  store.selectForScene('people', 'figure-1')
  store.importJson(legacy)
  assert.equal(store.getSceneArtwork('people').id, 'figure-1', 'a legacy import preserves current scene bindings')
  const dangling = libraryHarness({ initial: JSON.stringify({ version: 1, selectedId: 'figure-1', artworks: [artwork()], sceneSelections: { data: 'missing', people: 'figure-1' } }) })
  assert.equal(dangling.store.getSceneArtwork('data').id, 'milkstone-empty-plot')
  assert.equal(dangling.store.getSceneArtwork('search').id, 'milkstone-empty-loupe')
  assert.equal(dangling.store.getSceneArtwork('people').id, 'figure-1')
})

test('scene saves are atomic and invalid scene payloads cannot overwrite usable library state', () => {
  const denied = libraryHarness({ denied: true })
  assert.throws(() => denied.store.save(artwork(), 'data'), /存储空间不足/)
  assert.equal(denied.store.savedCount.value, 0)
  assert.equal(denied.store.getSceneArtwork('data').id, 'milkstone-empty-plot')
  const harness = libraryHarness()
  harness.store.save(artwork(), 'people')
  const before = harness.stored()
  assert.throws(() => harness.store.importJson(JSON.stringify({ version: 1, selectedId: 'figure-1', artworks: [], sceneSelections: { people: 4 } })), /场景配置/)
  assert.equal(harness.stored(), before)
  harness.store.selectForScene('data', 'not-present')
  assert.equal(harness.store.getSceneArtwork('data').id, 'milkstone-empty-plot')
  for (const id of ['milkstone-empty-plot', 'milkstone-empty-roster', 'milkstone-empty-loupe', 'milkstone-empty-tray']) assert.throws(() => harness.module.validateHairlineArtwork(artwork(id)), /标识/)
})

test('artwork shapes and generation service URLs have strict bounds', () => {
  const { module } = libraryHarness()
  assert.throws(() => module.validateHairlineArtwork({ ...artwork(), validation: 'unchecked' }), /验证信息/)
  assert.throws(() => module.validateHairlineArtwork({ ...artwork(), html: 'x'.repeat(module.maxArtworkLength + 1) }), /html/)
  for (const url of ['javascript:alert(1)', 'https://user:secret@example.com/api', 'https://example.com/api?token=secret', 'https://example.com/api#token']) assert.throws(() => module.hairlineEndpoint(url))
  assert.equal(module.hairlineEndpoint('https://example.com/api/hairline/'), 'https://example.com/api/hairline')
})

test('generation requests send only the access token in memory and handle incompatible static hosts', async () => {
  const { module, requests, writes, setResponse } = libraryHarness()
  await module.hairlineRequest('https://example.com/api/hairline', 'generate', ' session-token ', new AbortController().signal, { prompt: '空托盘' })
  assert.equal(requests[0].options.headers.Authorization, 'Bearer session-token')
  assert.equal(requests[0].url, 'https://example.com/api/hairline/generate')
  assert.deepEqual(JSON.parse(requests[0].options.body), { prompt: '空托盘' })
  assert.equal(writes.length, 0, 'service tokens never enter localStorage')
  setResponse(new Response('<html>static host</html>', { status: 404 }))
  await assert.rejects(module.hairlineRequest('https://example.com/api/hairline', 'capabilities', '', new AbortController().signal), /没有生成服务/)
})

test('existing and builtin artwork remain usable when browser storage becomes unavailable', () => {
  const first = libraryHarness()
  first.store.save(artwork())
  const second = libraryHarness({ initial: first.stored(), denied: true })
  second.store.select('milkstone-empty-tray')
  assert.equal(second.store.selected.value.id, 'milkstone-empty-tray')
  assert.match(second.store.storageWarning.value, /无法记住选择/)
  second.store.select('figure-1')
  assert.equal(second.store.selected.value.id, 'figure-1')
})

test('duplicate IDs in imports are rejected without changing the saved library', () => {
  const { store, writes } = libraryHarness()
  assert.throws(() => store.importJson(JSON.stringify({ version: 1, selectedId: 'figure-1', artworks: [artwork(), artwork()] })), /重复作品标识/)
  assert.equal(store.artworks.value.length, 4)
  assert.equal(writes.length, 0)
})

test('response bodies are streamed with a byte limit and oversized streams are cancelled', async () => {
  const { module, setResponse } = libraryHarness()
  let cancelled = false
  let pulls = 0
  setResponse(new Response(new ReadableStream({
    pull(controller) { pulls++; controller.enqueue(new Uint8Array(1_000_000)) },
    cancel() { cancelled = true },
  })))
  await assert.rejects(module.hairlineRequest('https://example.com/api/hairline', 'generate', '', new AbortController().signal, { prompt: 'test' }), /数据过大/)
  assert.equal(cancelled, true)
  assert.ok(pulls <= 6, 'the reader stops near the limit instead of buffering the whole response')
  let declaredCancelled = false
  setResponse(new Response(new ReadableStream({ cancel() { declaredCancelled = true } }), { headers: { 'Content-Length': String(module.maxHairlineResponseBytes + 1) } }))
  await assert.rejects(module.hairlineRequest('https://example.com/api/hairline', 'capabilities', '', new AbortController().signal), /数据过大/)
  assert.equal(declaredCancelled, true)
})

test('capability and generation deadlines abort their fetches with useful timeout messages', async () => {
  const delays = []
  const { module } = libraryHarness({
    timers: { setTimeout(callback, delay) { delays.push(delay); queueMicrotask(callback); return 1 }, clearTimeout() {} },
    fetchImpl(_url, { signal }) { return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })) },
  })
  await assert.rejects(module.hairlineRequest('https://example.com/api/hairline', 'capabilities', '', new AbortController().signal), /连接生成服务超时/)
  await assert.rejects(module.hairlineRequest('https://example.com/api/hairline', 'generate', '', new AbortController().signal, { prompt: 'test' }), /生成等待超时/)
  assert.deepEqual(delays, [20_000, 150_000])
})

test('user cancellation is forwarded to fetch without being misreported as a timeout', async () => {
  const { module } = libraryHarness({
    fetchImpl(_url, { signal }) { return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('user cancelled')), { once: true })) },
  })
  const cancellation = new AbortController()
  const pending = module.hairlineRequest('https://example.com/api/hairline', 'generate', '', cancellation.signal, { prompt: 'test' })
  cancellation.abort()
  await assert.rejects(pending, /user cancelled/)
})

test('SVG attribute whitelist rejects executable content, external references and unbounded geometry', () => {
  const { allowedSvgAttribute } = execute('hairline-sanitize.ts', {})
  for (const [key, value] of [['onload', 'alert(1)'], ['href', 'https://example.com'], ['xlink:href', '#shape'], ['style', 'fill:red'], ['fill', 'url(https://example.com)'], ['mask', 'url(/remote.svg#mask)'], ['fill', 'url(#bad id)'], ['id', 'bad id'], ['stroke', 'var(--color)'], ['width', '99999999'], ['viewBox', '0 0 0 320'], ['offset', '101%'], ['stop-opacity', '2'], ['gradientTransform', 'translate(1e9999, 0)'], ['transform', 'translate(1) rotate(alert(1))']]) assert.equal(allowedSvgAttribute(key, value), false, `${key}: ${value}`)
  for (const [key, value] of [['viewBox', '0 0 400 320'], ['d', 'M0 0L1.2 3Z'], ['fill', 'rgb(255, 255, 255)'], ['stroke-width', '0.9px'], ['transform', 'translate(1, 2) rotate(15)'], ['vector-effect', 'non-scaling-stroke'], ['id', 'hl-reflect-1'], ['mask', 'url(#hl-reflect-1)'], ['fill', 'url(#fade)'], ['width', '100%'], ['offset', '50%'], ['stop-color', 'rgb(0, 0, 0)'], ['stop-opacity', '0.5'], ['gradientUnits', 'userSpaceOnUse']]) assert.equal(allowedSvgAttribute(key, value), true, `${key}: ${value}`)
})
