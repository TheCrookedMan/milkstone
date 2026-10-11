import { computed, readonly, ref } from 'vue'
import { sanitizeHairlineSvg } from './hairline-sanitize'
import { builtinArtworks, defaultSceneArtworkIds, isBuiltinArtwork } from './hairline-builtins'
export { builtinArtworks, isBuiltinArtwork } from './hairline-builtins'

export type HairlineScene = 'data' | 'people' | 'search'
export const hairlineScenes: ReadonlyArray<{ id: HairlineScene; label: string }> = [
  { id: 'data', label: '暂无数据' }, { id: 'people', label: '暂无用户' }, { id: 'search', label: '无搜索结果' },
]

export interface HairlineArtwork {
  id: string
  name: string
  means: string
  prompt: string
  source: string
  html: string
  previewHtml: string
  createdAt: string
  model: string | null
  runtimeVersion: string
  validation: 'static'
  lightSvg?: string
  darkSvg?: string
  milkSvg?: string
}

export interface HairlineCapabilities { configured: boolean; model: string | null; runtimeVersion: string; requiresToken: boolean }
export const hairlineStorageKey = 'milkstone-hairline-library-v1'
export const maxSavedArtworks = 24
export const maxArtworkLength = 1_200_000
export const maxHairlineResponseBytes = maxArtworkLength * 4
const maxLibraryLength = 4_000_000
const builtinId = 'milkstone-empty-tray'
const saved = ref<HairlineArtwork[]>([])
const selectedId = ref(builtinId)
const sceneSelections = ref<Record<HairlineScene, string>>({ ...defaultSceneArtworkIds })
const storageWarning = ref('')
let hydrated = false

export const builtinArtwork = builtinArtworks.find(item => item.id === builtinId)!

function knownArtwork(id: string, artworks: HairlineArtwork[]) {
  return isBuiltinArtwork(id) || artworks.some(item => item.id === id)
}

function readScenes(value: unknown, artworks: HairlineArtwork[], fallback = defaultSceneArtworkIds): Record<HairlineScene, string> {
  if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value))) throw new Error('场景配置格式不正确。')
  const input = (value ?? {}) as Record<string, unknown>
  return Object.fromEntries(hairlineScenes.map(({ id }) => {
    const selection = input[id] ?? fallback[id]
    if (typeof selection !== 'string') throw new Error('场景配置格式不正确。')
    return [id, knownArtwork(selection, artworks) ? selection : defaultSceneArtworkIds[id]]
  })) as Record<HairlineScene, string>
}

export function normalizeHairlinePrompt(prompt: string): string { return prompt.trim().replace(/\s+/g, ' ') }

export function validateHairlineArtwork(value: unknown, requireSvg = false): HairlineArtwork {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('作品数据格式不正确。')
  const item = value as Record<string, unknown>
  const bounded = (key: string, max: number, allowEmpty = false): string => {
    const text = item[key]
    if (typeof text !== 'string' || text.length > max || (!allowEmpty && !text.trim())) throw new Error(`作品字段 ${key} 不符合要求。`)
    return text
  }
  const id = bounded('id', 100)
  if (!/^[a-zA-Z\d_-]+$/.test(id) || isBuiltinArtwork(id)) throw new Error('作品标识不正确。')
  const createdAt = bounded('createdAt', 40)
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error('作品时间不正确。')
  if (item.validation !== 'static' || (item.model !== null && (typeof item.model !== 'string' || item.model.length > 160))) throw new Error('作品验证信息不正确。')
  const artwork: HairlineArtwork = {
    id, name: bounded('name', 100), means: bounded('means', 200), prompt: bounded('prompt', 2_000),
    source: bounded('source', maxArtworkLength), html: bounded('html', maxArtworkLength),
    previewHtml: bounded('previewHtml', maxArtworkLength, requireSvg), createdAt,
    model: item.model as string | null, runtimeVersion: bounded('runtimeVersion', 120), validation: 'static',
  }
  if (item.lightSvg !== undefined) artwork.lightSvg = sanitizeHairlineSvg(item.lightSvg)
  if (item.darkSvg !== undefined) artwork.darkSvg = sanitizeHairlineSvg(item.darkSvg)
  if (item.milkSvg !== undefined) artwork.milkSvg = sanitizeHairlineSvg(item.milkSvg)
  if (requireSvg && (!artwork.lightSvg || !artwork.darkSvg)) throw new Error('作品还没有通过明暗线稿预览，请先完成预览。')
  return artwork
}

function hydrate() {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  try {
    const text = window.localStorage.getItem(hairlineStorageKey)
    if (!text) return
    if (text.length > maxLibraryLength) throw new Error('图库数据过大。')
    const payload = JSON.parse(text)
    if (payload?.version !== 1 || !Array.isArray(payload.artworks) || payload.artworks.length > maxSavedArtworks || typeof payload.selectedId !== 'string') throw new Error('图库格式不正确。')
    const artworks = payload.artworks.map((item: unknown) => validateHairlineArtwork(item, true))
    if (new Set(artworks.map((item: HairlineArtwork) => item.id)).size !== artworks.length) throw new Error('图库中有重复标识。')
    const scenes = readScenes(payload.sceneSelections, artworks)
    saved.value = artworks
    selectedId.value = knownArtwork(payload.selectedId, artworks) ? payload.selectedId : builtinId
    sceneSelections.value = scenes
  } catch {
    storageWarning.value = '已保存图库无法读取，当前使用内置线稿。原有存储未被覆盖。'
  }
}

function persist(artworks: HairlineArtwork[], selection: string, scenes = sceneSelections.value) {
  const serialized = JSON.stringify({ version: 1, selectedId: selection, sceneSelections: scenes, artworks })
  if (serialized.length > maxLibraryLength) throw new Error('图库已超出本地容量，请先导出并删除部分作品。')
  try { window.localStorage.setItem(hairlineStorageKey, serialized) }
  catch { throw new Error('浏览器存储空间不足或不可用。请先导出作品，当前操作尚未保存。') }
  storageWarning.value = ''
}

export function useHairlineLibrary() {
  hydrate()
  const artworks = computed(() => [...builtinArtworks, ...saved.value])
  const savedCount = computed(() => saved.value.length)
  const selected = computed(() => artworks.value.find(item => item.id === selectedId.value) ?? builtinArtwork)
  function select(id: string) {
    if (!artworks.value.some(item => item.id === id)) return
    selectedId.value = id
    try { persist(saved.value, id) }
    catch { storageWarning.value = '线稿已应用到当前页面，但浏览器无法记住选择。请导出图库备份，刷新后可能恢复原选图。' }
  }
  function getSceneArtwork(scene: HairlineScene): HairlineArtwork {
    return artworks.value.find(item => item.id === sceneSelections.value[scene]) ?? builtinArtworks.find(item => item.id === defaultSceneArtworkIds[scene])!
  }
  function selectForScene(scene: HairlineScene, id: string) {
    if (!hairlineScenes.some(item => item.id === scene) || !knownArtwork(id, saved.value)) return
    sceneSelections.value = { ...sceneSelections.value, [scene]: id }
    try { persist(saved.value, selectedId.value) }
    catch { storageWarning.value = '线稿已应用到当前场景，但浏览器无法记住选择。请导出图库备份，刷新后可能恢复原选图。' }
  }
  function save(value: HairlineArtwork, scene?: HairlineScene) {
    const artwork = validateHairlineArtwork(value, true)
    const existing = saved.value.filter(item => item.id !== artwork.id)
    if (existing.length >= maxSavedArtworks) throw new Error(`图库最多保存 ${maxSavedArtworks} 幅作品，请先导出并删除部分作品。`)
    const next = [artwork, ...existing]
    const scenes = scene ? { ...sceneSelections.value, [scene]: artwork.id } : sceneSelections.value
    persist(next, artwork.id, scenes)
    saved.value = next
    selectedId.value = artwork.id
    sceneSelections.value = scenes
  }
  function remove(id: string) {
    if (isBuiltinArtwork(id)) return
    const next = saved.value.filter(item => item.id !== id)
    const selection = selectedId.value === id ? builtinId : selectedId.value
    const scenes = readScenes(sceneSelections.value, next)
    persist(next, selection, scenes)
    saved.value = next
    selectedId.value = selection
    sceneSelections.value = scenes
  }
  function findPrompt(prompt: string) { return artworks.value.find(item => normalizeHairlinePrompt(item.prompt) === normalizeHairlinePrompt(prompt)) }
  function exportJson() { return JSON.stringify({ version: 1, selectedId: selectedId.value, sceneSelections: sceneSelections.value, artworks: saved.value }, null, 2) }
  function importJson(text: string) {
    if (text.length > maxLibraryLength) throw new Error('导入文件过大。')
    const payload = JSON.parse(text)
    if (payload?.version !== 1 || typeof payload.selectedId !== 'string' || !Array.isArray(payload.artworks) || payload.artworks.length > maxSavedArtworks) throw new Error('请选择 Milkstone 导出的图库 JSON。')
    const incoming = payload.artworks.map((item: unknown) => validateHairlineArtwork(item, true)) as HairlineArtwork[]
    if (new Set(incoming.map(item => item.id)).size !== incoming.length) throw new Error('导入的图库中有重复作品标识。')
    const merged = new Map(saved.value.map(item => [item.id, item]))
    incoming.forEach(item => merged.set(item.id, item))
    if (merged.size > maxSavedArtworks) throw new Error(`合并后超过 ${maxSavedArtworks} 幅，请先删除部分作品。`)
    const next = [...merged.values()]
    const selection = knownArtwork(payload.selectedId, next) ? payload.selectedId : selectedId.value
    const scenes = readScenes(payload.sceneSelections, next, sceneSelections.value)
    persist(next, selection, scenes)
    saved.value = next
    selectedId.value = selection
    sceneSelections.value = scenes
    return incoming.length
  }
  return { artworks, selected, savedCount, sceneSelections: readonly(sceneSelections), storageWarning: readonly(storageWarning), getSceneArtwork, selectForScene, select, save, remove, findPrompt, exportJson, importJson }
}

export function hairlineEndpoint(value: string): string {
  const url = new URL(value)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('生成服务需为不含账号、查询参数或锚点的 HTTP / HTTPS 地址。')
  return url.href.replace(/\/$/, '')
}

export async function hairlineRequest<T>(endpoint: string, path: string, token: string, signal: AbortSignal, body?: unknown): Promise<T> {
  const request = new AbortController()
  const cancel = () => request.abort(signal.reason)
  if (signal.aborted) cancel()
  else signal.addEventListener('abort', cancel, { once: true })
  let timedOut = false
  const timeout = setTimeout(() => { timedOut = true; request.abort() }, path === 'capabilities' ? 20_000 : 150_000)
  try {
    const response = await fetch(`${hairlineEndpoint(endpoint)}/${path}`, {
      method: body === undefined ? 'GET' : 'POST', signal: request.signal,
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    const declaredLength = Number(response.headers.get('Content-Length'))
    if (declaredLength > maxHairlineResponseBytes) {
      void response.body?.cancel().catch(() => {})
      throw new Error('生成服务返回的数据过大。')
    }
    let text = ''
    if (response.body) {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      const parts: string[] = []
      let bytes = 0
      try {
        while (true) {
          const chunk = await reader.read()
          if (chunk.done) break
          bytes += chunk.value.byteLength
          if (bytes > maxHairlineResponseBytes) {
            void reader.cancel().catch(() => {})
            throw new Error('生成服务返回的数据过大。')
          }
          parts.push(decoder.decode(chunk.value, { stream: true }))
        }
        parts.push(decoder.decode())
        text = parts.join('')
      } finally { reader.releaseLock() }
    }
    let payload
    try { payload = JSON.parse(text) } catch { throw new Error(response.status === 404 ? '当前地址没有生成服务，请配置服务 URL。' : '生成服务没有返回有效数据。') }
    if (!response.ok) throw new Error(payload && typeof payload.error === 'string' ? payload.error.slice(0, 240) : `生成服务暂不可用（${response.status}）。`)
    return payload as T
  } catch (error) {
    if (timedOut) throw new Error(path === 'capabilities' ? '连接生成服务超时，请检查服务地址后重试。' : '生成等待超时，此次结果未保存，请稍后重试。')
    throw error
  } finally { clearTimeout(timeout); signal.removeEventListener('abort', cancel) }
}

export function downloadHairlineFile(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
