import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createGenerator } from '../server/hairline-service.mjs'
import { createHairlineServer } from '../server/hairline-server.mjs'
import { validate } from '../server/hairline-runtime/validate.mjs'

const source = await readFile(new URL('../server/hairline-runtime/examples/riffle.js', import.meta.url), 'utf8')
const validFigure = {
  name: 'riffle',
  means: 'Eight cards in a tray: the one under the pointer stands up, and its neighbours lean away in turn.',
  source,
}
const invalidFigure = { ...validFigure, source: source.replace('const N = 8', 'const N = ;') }
const prompt = '用没有内容的卡片托盘表现暂无数据，指针靠近时卡片轻轻抬起。'

async function configFor(t, overrides = {}) {
  const dataDir = await mkdtemp(join(tmpdir(), 'milkstone-hairline-test-'))
  t.after(() => rm(dataDir, { recursive: true, force: true }))
  return {
    baseUrl: 'https://models.example.invalid/v1',
    apiKey: 'sk-hairline-test-private-key',
    model: 'hairline-test-model',
    accessToken: 'hairline-test-private-access-token',
    allowedOrigins: ['https://milkstone.dipp.cc'],
    dataDir,
    timeoutMs: 60_000,
    jsonMode: true,
    ...overrides,
  }
}

function modelFixture(responses = [validFigure]) {
  const calls = []
  const fetchImpl = async (input, init) => {
    const request = new Request(input, init)
    const body = await request.json()
    calls.push({ url: request.url, headers: request.headers, body })
    const response = responses[Math.min(calls.length - 1, responses.length - 1)]
    if (response instanceof Response) return response.clone()
    return Response.json({ choices: [{ message: { content: JSON.stringify(response) } }] })
  }
  return { calls, fetchImpl }
}

async function liveServer(t, config, fetchImpl) {
  const server = createHairlineServer(config, { fetchImpl })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  t.after(async () => {
    server.closeAllConnections?.()
    await new Promise(resolve => server.close(resolve))
  })
  const { port } = server.address()
  const base = `http://127.0.0.1:${port}`
  const post = (body, { authorized = true, origin, raw = false } = {}) => fetch(`${base}/api/hairline/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorized ? { Authorization: `Bearer ${config.accessToken}` } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: raw ? body : JSON.stringify(body),
  })
  return { base, post }
}

test('vendored Hairline engine, bench and tools retain their original bytes', async () => {
  const expected = {
    'kernel.js': '3a034d39d7486984b10992e2786cbc83551dbed3718351f69cf1d54d81ce8718',
    'bench.html': '4d14a7cca8cb9c672c299ff04e47ce781192f3a83d173d0ca09344a3787d70d9',
    'build.mjs': '7907c722890a9758ed4b479e819f9f8c12b9df3c4a59fa050577b235eee233e7',
    'validate.mjs': '6ebd6268dea478d076e50029f55dbf57df11cfb772a5253862347f66de767db8',
  }
  for (const [name, hash] of Object.entries(expected)) {
    const bytes = await readFile(new URL(`../server/hairline-runtime/${name}`, import.meta.url))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hash, `${name} must stay untouched`)
  }
})

test('generation calls a real chat-completions contract and preserves the validated independent page', async t => {
  const config = await configFor(t)
  const model = modelFixture()
  const generator = createGenerator(config, { fetchImpl: model.fetchImpl })
  assert.equal(generator.capabilities().configured, true)
  assert.ok(!JSON.stringify(generator.capabilities()).includes(config.apiKey))
  const result = await generator.generate(prompt)
  assert.equal(result.reused, false)
  assert.equal(model.calls.length, 1)
  const request = model.calls[0]
  assert.equal(request.url, `${config.baseUrl}/chat/completions`)
  assert.equal(request.headers.get('authorization'), `Bearer ${config.apiKey}`)
  assert.equal(request.body.model, config.model)
  assert.equal(request.body.response_format?.type, 'json_object')
  assert.ok(request.body.messages.some(message => message.role === 'user' && message.content === prompt))
  const instructions = request.body.messages.filter(message => message.role === 'system').map(message => message.content).join('\n')
  assert.match(instructions, /hairline/i)
  assert.match(instructions, /mount/)
  assert.match(instructions, /register/)
  assert.match(instructions, /200/)
  assert.ok(!instructions.includes('var HL ='), 'the model receives the public API, not the engine implementation')
  const artwork = result.artwork
  assert.equal(artwork.source, source.trim())
  assert.equal(artwork.name, validFigure.name)
  assert.equal(artwork.means, validFigure.means)
  assert.equal(artwork.prompt, prompt)
  assert.equal(artwork.model, config.model)
  assert.equal(artwork.validation, 'static')
  assert.equal(typeof artwork.id, 'string')
  assert.ok(Number.isFinite(Date.parse(artwork.createdAt)))
  assert.equal(typeof artwork.runtimeVersion, 'string')
  assert.deepEqual(validate(artwork.html), [])
  assert.notEqual(artwork.previewHtml, artwork.html)
  assert.match(artwork.previewHtml, /Content-Security-Policy/i)
  assert.match(artwork.previewHtml, /connect-src\s+'none'/)
  assert.match(artwork.previewHtml, /postMessage/)
  assert.match(artwork.previewHtml, /mount/)
  assert.ok(!artwork.previewHtml.includes('allow-same-origin'))
  assert.ok(!JSON.stringify(artwork).includes(config.apiKey))
})

test('saved prompt results are reused without another model call, including after service recreation', async t => {
  const config = await configFor(t)
  const model = modelFixture()
  const firstService = createGenerator(config, { fetchImpl: model.fetchImpl })
  const first = await firstService.generate(prompt)
  const repeated = await firstService.generate(prompt)
  const restored = await createGenerator(config, { fetchImpl: model.fetchImpl }).generate(prompt)
  assert.equal(repeated.reused, true)
  assert.equal(restored.reused, true)
  assert.equal(repeated.artwork.id, first.artwork.id)
  assert.equal(restored.artwork.html, first.artwork.html)
  assert.equal(model.calls.length, 1)
})

test('cached HTML and preview are rebuilt from the validated source instead of trusting saved executable markup', async t => {
  const config = await configFor(t)
  const model = modelFixture()
  const first = await createGenerator(config, { fetchImpl: model.fetchImpl }).generate(prompt)
  const [cacheName] = (await readdir(config.dataDir)).filter(name => name.endsWith('.json'))
  assert.ok(cacheName, 'a reusable generated figure must be persisted')
  const cachePath = join(config.dataDir, cacheName)
  const cached = JSON.parse(await readFile(cachePath, 'utf8'))
  cached.html = '<script>untrusted-cache-html</script>'
  cached.previewHtml = '<script>untrusted-cache-preview</script>'
  cached.id = '../../untrusted-cache-identity'
  cached.validation = 'visual'
  await writeFile(cachePath, JSON.stringify(cached))
  const restored = await createGenerator(config, { fetchImpl: model.fetchImpl }).generate(prompt)
  assert.equal(restored.reused, true)
  assert.equal(restored.artwork.id, first.artwork.id)
  assert.equal(restored.artwork.validation, 'static')
  assert.equal(restored.artwork.html, first.artwork.html)
  assert.deepEqual(validate(restored.artwork.html), [])
  assert.ok(!restored.artwork.previewHtml.includes('untrusted-cache-preview'))
  assert.match(restored.artwork.previewHtml, /Content-Security-Policy/i)
  assert.equal(model.calls.length, 1)
})

test('UTF-8 model response chunks preserve Chinese descriptions and figure source', async t => {
  const config = await configFor(t)
  const means = '一只托盘中放着八张卡片，指针经过时卡片轻轻抬起。'
  const figure = { ...validFigure, means, source: source.replace(validFigure.means, means) }
  const bytes = Buffer.from(JSON.stringify({ choices: [{ message: { content: JSON.stringify(figure) } }] }))
  const split = bytes.indexOf(Buffer.from('一'))
  assert.ok(split > 0)
  const response = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.subarray(0, split + 1))
      controller.enqueue(bytes.subarray(split + 1, split + 2))
      controller.enqueue(bytes.subarray(split + 2))
      controller.close()
    },
  }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
  const model = modelFixture([response])
  const result = await createGenerator(config, { fetchImpl: model.fetchImpl }).generate(prompt)
  assert.equal(result.artwork.means, means)
  assert.equal(result.artwork.source, figure.source.trim())
  assert.ok(!result.artwork.html.includes('\ufffd'))
  assert.equal(model.calls.length, 1)
})

test('a different prompt does not accidentally reuse an earlier request', async t => {
  const config = await configFor(t)
  const model = modelFixture()
  const generator = createGenerator(config, { fetchImpl: model.fetchImpl })
  await generator.generate(prompt)
  const otherPrompt = '用空置的席位表现还没有用户。'
  const second = await generator.generate(otherPrompt)
  assert.equal(second.reused, false)
  assert.equal(second.artwork.prompt, otherPrompt)
  assert.equal(model.calls.length, 2)
  assert.ok(model.calls[1].body.messages.some(message => message.role === 'user' && message.content === otherPrompt))
})

test('one static validation failure is sent back to the model for a bounded repair', async t => {
  const config = await configFor(t)
  const model = modelFixture([invalidFigure, validFigure])
  const result = await createGenerator(config, { fetchImpl: model.fetchImpl }).generate(prompt)
  assert.equal(model.calls.length, 2)
  assert.deepEqual(validate(result.artwork.html), [])
  const repairMessages = JSON.stringify(model.calls[1].body.messages)
  assert.match(repairMessages, /parse|syntax|语法/i)
  assert.ok(model.calls[1].body.messages.length > model.calls[0].body.messages.length)
})

test('JSON metadata must describe the same figure as the final declaration', async t => {
  const config = await configFor(t)
  const model = modelFixture([{ ...validFigure, means: 'A different and misleading figure description.' }, validFigure])
  const result = await createGenerator(config, { fetchImpl: model.fetchImpl }).generate(prompt)
  assert.equal(model.calls.length, 2)
  assert.equal(result.artwork.means, validFigure.means)
  assert.match(JSON.stringify(model.calls[1].body.messages), /means.*match|match.*means/i)
})

test('valid declaration whitespace is accepted without an unnecessary model repair', async t => {
  const config = await configFor(t)
  const spacedSource = source.replace('\nhairline({', '\nhairline (\n{')
  const model = modelFixture([{ ...validFigure, source: spacedSource }])
  const result = await createGenerator(config, { fetchImpl: model.fetchImpl }).generate(prompt)
  assert.equal(result.artwork.source, spacedSource.trim())
  assert.deepEqual(validate(result.artwork.html), [])
  assert.equal(model.calls.length, 1)
})

test('two failed attempts are rejected and never become reusable cached artwork', async t => {
  const config = await configFor(t)
  const model = modelFixture([invalidFigure])
  const generator = createGenerator(config, { fetchImpl: model.fetchImpl })
  await assert.rejects(generator.generate(prompt))
  assert.equal(model.calls.length, 2)
  await assert.rejects(createGenerator(config, { fetchImpl: model.fetchImpl }).generate(prompt))
  assert.equal(model.calls.length, 4)
})

test('an unconfigured generator reports its state and never calls a model', async t => {
  const config = await configFor(t, { apiKey: '', model: '' })
  const model = modelFixture()
  const generator = createGenerator(config, { fetchImpl: model.fetchImpl })
  assert.equal(generator.capabilities().configured, false)
  await assert.rejects(generator.generate(prompt))
  assert.equal(model.calls.length, 0)
})

test('upstream failures do not expose model credentials or the private access token', async t => {
  const config = await configFor(t)
  const model = modelFixture([Response.json({ error: { message: `Rejected ${config.apiKey} ${config.accessToken}` } }, { status: 500 })])
  await assert.rejects(createGenerator(config, { fetchImpl: model.fetchImpl }).generate(prompt), error => {
    assert.ok(!String(error).includes(config.apiKey))
    assert.ok(!String(error).includes(config.accessToken))
    return true
  })
})

test('HTTP generation requires authorization and rejects malformed or excessive prompts before calling the model', async t => {
  const config = await configFor(t)
  const model = modelFixture()
  const { base, post } = await liveServer(t, config, model.fetchImpl)
  const capabilitiesResponse = await fetch(`${base}/api/hairline/capabilities`)
  assert.equal(capabilitiesResponse.status, 200)
  assert.equal((await capabilitiesResponse.json()).configured, true)
  const unauthorized = await post({ prompt }, { authorized: false })
  assert.equal(unauthorized.status, 401)
  const incorrectToken = await fetch(`${base}/api/hairline/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${'x'.repeat(config.accessToken.length)}` },
    body: JSON.stringify({ prompt }),
  })
  assert.equal(incorrectToken.status, 401)
  const malformed = await post('{"prompt":', { raw: true })
  assert.equal(malformed.status, 400)
  for (const invalid of [{}, { prompt: '' }, { prompt: 42 }, { prompt: 'x'.repeat(20_001) }]) {
    const response = await post(invalid)
    assert.ok([400, 413].includes(response.status), `invalid prompt must fail, received ${response.status}`)
  }
  assert.equal(model.calls.length, 0)
  const generated = await post({ prompt })
  assert.equal(generated.status, 200)
  assert.equal((await generated.json()).artwork.validation, 'static')
  assert.equal(model.calls.length, 1)
})

test('HTTP unconfigured capabilities remain readable while generation returns 503', async t => {
  const config = await configFor(t, { apiKey: '', model: '' })
  const model = modelFixture()
  const { base, post } = await liveServer(t, config, model.fetchImpl)
  const response = await fetch(`${base}/api/hairline/capabilities`)
  assert.equal(response.status, 200)
  assert.equal((await response.json()).configured, false)
  assert.equal((await post({ prompt })).status, 503)
  assert.equal(model.calls.length, 0)
})

test('CORS permits only exact configured origins and rejects lookalike domains', async t => {
  const config = await configFor(t)
  const model = modelFixture()
  const { base, post } = await liveServer(t, config, model.fetchImpl)
  const trusted = await fetch(`${base}/api/hairline/capabilities`, { headers: { Origin: config.allowedOrigins[0] } })
  assert.equal(trusted.status, 200)
  assert.equal(trusted.headers.get('access-control-allow-origin'), config.allowedOrigins[0])
  const untrustedOrigin = 'https://milkstone.dipp.cc.attacker.invalid'
  const rejected = await post({ prompt }, { origin: untrustedOrigin })
  assert.equal(rejected.status, 403)
  assert.notEqual(rejected.headers.get('access-control-allow-origin'), untrustedOrigin)
  assert.equal(model.calls.length, 0)
  const preflight = await fetch(`${base}/api/hairline/generate`, {
    method: 'OPTIONS',
    headers: {
      Origin: config.allowedOrigins[0],
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  })
  assert.ok([200, 204].includes(preflight.status))
  assert.equal(preflight.headers.get('access-control-allow-origin'), config.allowedOrigins[0])
})

test('HTTP upstream failures never return raw provider secrets to a browser', async t => {
  const config = await configFor(t)
  const model = modelFixture([Response.json({ error: { message: `${config.apiKey} ${config.accessToken}` } }, { status: 502 })])
  const { post } = await liveServer(t, config, model.fetchImpl)
  const response = await post({ prompt })
  assert.ok(response.status >= 500)
  const body = await response.text()
  assert.ok(!body.includes(config.apiKey))
  assert.ok(!body.includes(config.accessToken))
})
