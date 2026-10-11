<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import HairlineEmptyArt from './HairlineEmptyArt.vue'
import HairlineGeneratedPreview from './HairlineGeneratedPreview.vue'
import { builtinArtwork, downloadHairlineFile, hairlineEndpoint, hairlineRequest, useHairlineLibrary, validateHairlineArtwork, type HairlineArtwork, type HairlineCapabilities } from './hairline-library'

defineProps<{ compact?: boolean }>()
const id = useId()
const library = useHairlineLibrary()
const { artworks, selected, storageWarning } = library
const prompt = ref('一个圆角名册架，留着尚未放入姓名卡片的空槽；指针靠近时卡槽轻轻抬起。')
const endpoint = ref(new URL('/api/hairline', window.location.origin).href)
const token = ref('')
const configOpen = ref(false)
const capability = ref<HairlineCapabilities | null>(null)
const busy = ref<'checking' | 'generating' | null>(null)
const message = ref('已有线稿可直接复用；新图通过连接的大模型生成。')
const error = ref('')
const candidate = ref<HairlineArtwork | null>(null)
const previewReady = ref(false)
const importInput = ref<HTMLInputElement>()
const connected = computed(() => capability.value?.configured === true)
const waitingForPreview = computed(() => !!candidate.value && !previewReady.value)
let controller: AbortController | undefined
let operation = 0

function clearError() { error.value = '' }
function explain(value: unknown) { return value instanceof Error ? value.message : '操作未完成，请稍后重试。' }
function invalidateConnection() { capability.value = null }
function begin(mode: 'checking' | 'generating') {
  controller?.abort()
  controller = new AbortController()
  busy.value = mode
  error.value = ''
  return { signal: controller.signal, current: ++operation }
}
async function capabilities(signal: AbortSignal) {
  const value = await hairlineRequest<HairlineCapabilities>(endpoint.value, 'capabilities', token.value, signal)
  if (!value || typeof value.configured !== 'boolean' || typeof value.requiresToken !== 'boolean' || typeof value.runtimeVersion !== 'string' || value.runtimeVersion.length > 120 || (value.model !== null && (typeof value.model !== 'string' || value.model.length > 160))) throw new Error('该地址没有提供兼容的 Hairline 生成服务。')
  return value
}
async function connect() {
  const { signal, current } = begin('checking')
  try {
    endpoint.value = hairlineEndpoint(endpoint.value)
    const value = await capabilities(signal)
    if (current !== operation) return
    capability.value = value
    message.value = value.configured ? `已连接 ${value.model ?? '生成模型'}，可以开始创作。` : '服务已连接，模型尚未配置。已有线稿仍可直接复用。'
    if (!value.configured) configOpen.value = true
  } catch (value) {
    if (current !== operation) return
    capability.value = null
    error.value = explain(value)
    configOpen.value = true
  } finally { if (current === operation) busy.value = null }
}
async function generate() {
  const text = prompt.value.trim()
  if (!text || text.length > 2_000) { error.value = '请用 1–2000 个字符描述想要的物件和回应。'; return }
  const existing = library.findPrompt(text)
  if (existing) {
    try { library.select(existing.id); candidate.value = null; previewReady.value = false; error.value = ''; message.value = '已复用图库中的同提示词作品，没有调用模型。' }
    catch (value) { error.value = explain(value) }
    return
  }
  const { signal, current } = begin('generating')
  candidate.value = null
  previewReady.value = false
  message.value = '正在按提示词制作线稿，完成校验后会出现在这里。'
  try {
    const value = await capabilities(signal)
    if (current !== operation) return
    capability.value = value
    if (!value.configured) throw new Error('生成服务尚未配置大模型。请先在服务端完成模型配置。')
    if (value.requiresToken && !token.value.trim()) { configOpen.value = true; throw new Error('该生成服务需要访问令牌，请在服务设置中填写。') }
    const response = await hairlineRequest<{ artwork: unknown; reused: boolean }>(endpoint.value, 'generate', token.value, signal, { prompt: text })
    if (current !== operation) return
    if (!response || typeof response.reused !== 'boolean' || !response.artwork) throw new Error('生成服务返回的作品格式不正确。')
    candidate.value = validateHairlineArtwork(response.artwork)
    message.value = response.reused ? '服务复用了已生成作品，正在确认预览。' : '线稿已生成，正在确认明暗两种预览。'
  } catch (value) {
    if (current !== operation) return
    error.value = explain(value)
    message.value = '此次未生成可用作品，图库保持原样。'
    if (!connected.value) configOpen.value = true
  } finally { if (current === operation) busy.value = null }
}
function cancel() {
  operation++
  controller?.abort()
  busy.value = null
  candidate.value = null
  previewReady.value = false
  message.value = '已取消此次生成，图库保持原样。'
}
function ready(artwork: HairlineArtwork) {
  if (candidate.value?.id !== artwork.id) return
  candidate.value = artwork
  previewReady.value = true
  message.value = '明暗线稿已可用。保存后可在页面和 Empty 组件中复用。'
}
function previewError(value: string) { candidate.value = null; previewReady.value = false; error.value = value; message.value = '此次预览失败，结果未保存。' }
function save() {
  if (!candidate.value || !previewReady.value) return
  try { library.save(candidate.value); message.value = '已保存到此浏览器的图库，并应用到空状态组件。'; candidate.value = null; previewReady.value = false; clearError() }
  catch (value) { error.value = explain(value) }
}
function choose(artwork: HairlineArtwork) {
  try { library.select(artwork.id); message.value = `已使用「${artwork.name}」，无需重新生成。`; clearError() }
  catch (value) { error.value = explain(value) }
}
function remove(artwork: HairlineArtwork) {
  try { library.remove(artwork.id); message.value = `已从此浏览器移除「${artwork.name}」。`; clearError() }
  catch (value) { error.value = explain(value) }
}
function download(artwork: HairlineArtwork) { downloadHairlineFile(`hairline-${artwork.id}.html`, artwork.html, 'text/html;charset=utf-8') }
async function importLibrary(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    if (file.size > 4_000_000) throw new Error('图库文件不能超过 4 MB。')
    const count = library.importJson(await file.text())
    message.value = `已导入 ${count} 幅线稿，可以直接复用。`
    clearError()
  } catch (value) { error.value = explain(value) }
  finally { input.value = '' }
}
onBeforeUnmount(() => { operation++; controller?.abort(); token.value = '' })
</script>

<template>
  <section class="hairline-prompt-studio" :class="{ 'is-compact': compact }" :aria-labelledby="`${id}-title`">
    <header class="studio-heading">
      <div><span class="studio-eyebrow">HAIRLINE / PROMPT TO FORM</span><h3 :id="`${id}-title`">让一句描述，成为留白的形状。</h3><p>描述一个物件与它的轻微回应，生成后保存，下一次直接取用。</p></div>
      <Button type="button" variant="outline" size="sm" :aria-expanded="configOpen" :aria-controls="`${id}-settings`" @click="configOpen = !configOpen">服务设置</Button>
    </header>

    <div v-if="configOpen" :id="`${id}-settings`" class="studio-settings">
      <label :for="`${id}-endpoint`">生成服务 URL<Input :id="`${id}-endpoint`" v-model="endpoint" type="url" placeholder="https://你的服务/api/hairline" autocomplete="off" :disabled="!!busy" @update:model-value="invalidateConnection" /></label>
      <label :for="`${id}-token`">服务访问令牌 <span>仅本次页面有效</span><Input :id="`${id}-token`" v-model="token" type="password" placeholder="由生成服务提供" autocomplete="off" :disabled="!!busy" @update:model-value="invalidateConnection" /></label>
      <div class="studio-settings-footer"><p>默认接入 DeepSeek。使用者在自己的生成服务中配置模型与密钥，也可改用其他兼容服务。<a href="https://github.com/TheCrookedMan/milkstone/blob/main/skills/milk-white-web-design/references/hairline-generation-service.md" target="_blank" rel="noopener noreferrer">查看配置说明 ↗</a></p><Button type="button" variant="outline" size="sm" :disabled="!!busy" @click="connect">{{ busy === 'checking' ? '正在连接…' : '测试连接' }}</Button></div>
    </div>

    <form class="studio-prompt" @submit.prevent="generate">
      <label :for="`${id}-prompt`">描述你需要的空状态线稿</label>
      <Textarea :id="`${id}-prompt`" v-model="prompt" maxlength="2000" rows="3" placeholder="例如：一个空置的圆角名册架，指针靠近时卡槽轻轻抬起。" :disabled="!!busy" />
      <div class="studio-prompt-footer"><span>{{ connected ? `模型 · ${capability?.model ?? '已连接'}` : '连接大模型后生成 · 已有图形可直接复用' }}</span><div class="studio-actions"><Button v-if="busy || waitingForPreview" type="button" variant="outline" size="sm" @click="cancel">取消</Button><Button type="submit" size="sm" :disabled="!!busy || waitingForPreview || !prompt.trim()">{{ busy === 'generating' ? '正在生成线稿…' : waitingForPreview ? '正在确认预览…' : '生成线稿' }}</Button></div></div>
    </form>

    <p v-if="error" class="studio-error" role="alert">{{ error }}</p>
    <p v-if="storageWarning" class="studio-error" role="status">{{ storageWarning }}</p>
    <p class="studio-status" role="status" aria-live="polite">{{ message }}</p>

    <div v-if="candidate" class="studio-result">
      <HairlineGeneratedPreview :key="candidate.id" :artwork="candidate" @ready="ready" @error="previewError" />
      <div class="studio-result-copy"><h4>{{ candidate.name }}</h4><p>{{ candidate.means }}</p><small>模型 · {{ candidate.model ?? '生成服务' }} · 已通过静态校验</small><div class="studio-actions"><Button type="button" size="sm" :disabled="!previewReady" @click="save">保存并使用</Button><Button type="button" variant="outline" size="sm" :disabled="!previewReady" @click="download(candidate)">下载 HTML</Button></div></div>
    </div>

    <div class="studio-library-heading"><div><h4>可复用线稿</h4><p>{{ artworks.length - 1 }} / 24 幅已保存 · 保存在此浏览器</p></div><div class="studio-actions"><Button type="button" size="sm" variant="outline" @click="downloadHairlineFile('milkstone-hairline-library.json', library.exportJson(), 'application/json')">导出图库</Button><Button type="button" size="sm" variant="outline" @click="importInput?.click()">导入图库</Button><input ref="importInput" class="studio-import-input" type="file" accept="application/json,.json" tabindex="-1" aria-label="导入 Hairline 图库 JSON" @change="importLibrary"></div></div>
    <div class="studio-library">
      <article v-for="artwork in artworks" :key="artwork.id" class="studio-artwork" :data-selected="selected.id === artwork.id">
        <HairlineEmptyArt :artwork="artwork" />
        <div class="studio-artwork-copy"><h5>{{ artwork.name }}</h5><p>{{ artwork.means }}</p><span>{{ artwork.model ? `模型 · ${artwork.model}` : '内置线稿' }}</span></div>
        <div class="studio-actions"><Button type="button" size="sm" variant="outline" :aria-pressed="selected.id === artwork.id" @click="choose(artwork)">{{ selected.id === artwork.id ? '正在使用' : '使用线稿' }}</Button><Button type="button" size="sm" variant="ghost" @click="download(artwork)">下载</Button><Button v-if="artwork.id !== builtinArtwork.id" type="button" size="sm" variant="ghost" :aria-label="`删除线稿 ${artwork.name}`" @click="remove(artwork)">删除</Button></div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.studio-import-input { display: none !important; }
.hairline-prompt-studio { min-width: 0; color: var(--milk-ink); }
.studio-heading,.studio-settings-footer,.studio-prompt-footer,.studio-library-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.studio-heading { align-items: flex-start; margin-bottom: 24px; }
.studio-heading > div { min-width: 0; }
.studio-eyebrow { color: var(--milk-muted); font: 11px/1.5 'IBM Plex Sans',monospace; letter-spacing: 1.2px; }
.studio-heading h3 { margin: 8px 0; font-size: 18px; line-height: 1.4; font-weight: 600; }
.studio-heading p,.studio-result-copy p { margin: 0; font-size: 14px; line-height: 1.65; color: var(--milk-muted); }
.studio-settings { display: grid; gap: 16px; margin-bottom: 24px; padding: 20px; border-radius: 20px; background: var(--milk-surface-recessed); box-shadow: var(--milk-pressed); }
.studio-settings label,.studio-prompt { display: grid; gap: 8px; font-size: 14px; line-height: 1.5; }
.studio-settings label span,.studio-settings-footer p,.studio-prompt-footer > span,.studio-status,.studio-error,.studio-library-heading p,.studio-result-copy small { margin: 0; font-size: 12px; line-height: 1.65; color: var(--milk-muted); }
.studio-prompt-footer > span,.studio-status,.studio-error,.studio-result-copy small,.studio-artwork-copy h5,.studio-artwork-copy span { min-width: 0; overflow-wrap: anywhere; }
.studio-settings label span { display: inline; }
.studio-settings-footer a { margin-inline-start: 8px; text-decoration: underline; text-underline-offset: 3px; }
.studio-prompt { margin-bottom: 16px; }
.studio-prompt-footer { margin-top: 8px; }
.studio-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.studio-status { margin-top: 8px; }
.studio-error { margin-top: 8px; color: var(--milk-ink); }
.studio-result { display: flex; align-items: center; gap: 24px; margin-top: 24px; padding: 24px; border-radius: 24px; background: var(--milk-surface-raised); box-shadow: var(--milk-card-shadow); }
.studio-result-copy { min-width: 0; display: grid; gap: 8px; }
.studio-result-copy h4,.studio-library-heading h4 { margin: 0; font-size: 16px; font-weight: 600; line-height: 1.5; }
.studio-result-copy .studio-actions { margin-top: 8px; }
.studio-library-heading { margin: 24px 0 16px; }
.studio-library-heading p { margin-top: 4px; }
.studio-library { display: grid; grid-template-columns: repeat(auto-fill,minmax(210px,1fr)); gap: 16px; }
.studio-artwork { display: flex; min-width: 0; flex-direction: column; align-items: center; gap: 16px; padding: 20px; border-radius: 20px; background: var(--milk-surface-raised); box-shadow: var(--milk-card-shadow); }
.studio-artwork[data-selected=true] { background: var(--milk-surface-recessed); box-shadow: var(--milk-pressed); }
.studio-artwork-copy { align-self: stretch; min-width: 0; display: grid; gap: 4px; }
.studio-artwork-copy h5 { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.5; }
.studio-artwork-copy p { margin: 0; font-size: 12px; line-height: 1.65; color: var(--milk-muted); overflow-wrap: anywhere; }
.studio-artwork-copy span { font-size: 11px; line-height: 1.5; color: var(--milk-muted); }
.studio-artwork > .studio-actions { align-self: stretch; margin-top: auto; }
.is-compact .studio-heading,.is-compact .studio-library-heading,.is-compact .studio-prompt-footer,.is-compact .studio-settings-footer { align-items: flex-start; flex-direction: column; }
.is-compact .studio-library { grid-template-columns: minmax(0,1fr); }
.is-compact .studio-result { flex-direction: column; align-items: flex-start; padding: 16px; }
@media(max-width:680px) { .studio-heading,.studio-settings-footer,.studio-prompt-footer,.studio-library-heading { align-items: flex-start; flex-direction: column; } .studio-result { flex-direction: column; align-items: flex-start; padding: 16px; } .studio-library { grid-template-columns: minmax(0,1fr); } }
</style>
