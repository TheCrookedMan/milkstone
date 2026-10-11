import { createServer } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createGenerator, GenerationError } from './hairline-service.mjs'

export function readConfig(env = process.env) {
  const baseUrl = env.HAIRLINE_MODEL_BASE_URL || ''
  if (baseUrl) {
    const parsed = new URL(baseUrl)
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('HAIRLINE_MODEL_BASE_URL must be an HTTP(S) base URL without credentials/query/fragment.')
  }
  return { baseUrl, apiKey: env.HAIRLINE_MODEL_API_KEY || '', model: env.HAIRLINE_MODEL || '', accessToken: env.HAIRLINE_ACCESS_TOKEN || '', allowedOrigins: (env.HAIRLINE_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean), dataDir: resolve(env.HAIRLINE_DATA_DIR || 'work/hairline-data'), timeoutMs: 60000, jsonMode: env.HAIRLINE_JSON_MODE !== 'false', host: env.HAIRLINE_HOST || '127.0.0.1', port: Number(env.HAIRLINE_PORT || 4341) }
}
export function createHairlineServer(config, options = {}) {
  const generator = createGenerator(config, options)
  const requests = new Map()
  return createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const send = (status, data) => { res.writeHead(status); res.end(JSON.stringify(data)) }
    const origin = req.headers.origin
    // Same-origin reverse proxy needs no allowlist entry; explicit cross-origin
    // browser callers must be configured. No credentials or wildcard CORS.
    const sameOrigin = origin && (() => { try { return new URL(origin).host === req.headers.host } catch { return false } })()
    if (origin && !sameOrigin && !(config.allowedOrigins || []).includes(origin)) return send(403, { error: '此页面来源未被生成服务允许。' })
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin') }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      return send(204, {})
    }
    const path = (req.url || '').split('?')[0].replace(/\/+$/, '')
    if (path === '/api/hairline/capabilities' && req.method === 'GET') return send(200, generator.capabilities())
    if (path !== '/api/hairline/generate') return send(404, { error: '接口不存在。' })
    if (req.method !== 'POST') return send(405, { error: '请使用 POST 请求。' })
    if (!generator.capabilities().configured) return send(503, { error: '模型生成服务尚未配置，已有插图可继续复用。' })
    const supplied = Buffer.from(req.headers.authorization || '')
    const expected = Buffer.from(`Bearer ${config.accessToken}`)
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return send(401, { error: '请输入有效的生成服务访问令牌。' })
    if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return send(415, { error: '请求必须使用 JSON。' })
    const key = req.socket.remoteAddress || 'local'
    const now = Date.now(), recent = (requests.get(key) || []).filter(time => now - time < 60000)
    if (recent.length >= 6) return send(429, { error: '请求过于频繁，请稍后重试。' })
    if (requests.size > 1000) for (const [ip, times] of requests) if (now - times.at(-1) >= 60000) requests.delete(ip)
    requests.set(key, [...recent, now])
    const abort = new AbortController()
    res.on('close', () => { if (!res.writableEnded) abort.abort() })
    try {
      let body = '', bytes = 0
      const decoder = new TextDecoder()
      for await (const chunk of req) {
        bytes += chunk.length
        if (bytes > 16000) throw new GenerationError(413, '提示词请求过大。')
        body += decoder.decode(chunk, { stream: true })
      }
      body += decoder.decode()
      let payload
      try { payload = JSON.parse(body) } catch { throw new GenerationError(400, '请求不是有效的 JSON。') }
      const result = await generator.generate(payload?.prompt, { signal: abort.signal })
      if (!res.destroyed) send(200, result)
    } catch (error) {
      if (!res.destroyed) send(error instanceof GenerationError ? error.status : 500, { error: error instanceof GenerationError ? error.message : '生成服务暂时不可用，请稍后重试。' })
    }
  })
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const config = readConfig()
  const server = createHairlineServer(config)
  const configured = Boolean(config.baseUrl && config.apiKey && config.model && config.accessToken)
  server.listen(config.port, config.host, () => console.log(`Hairline generation service listening at http://${config.host}:${config.port}; model ${configured ? 'configured' : 'not configured'}.`))
  for (const event of ['SIGINT', 'SIGTERM']) process.on(event, () => server.close(() => process.exit(0)))
}
