<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTheme } from '@/theme-controller'
import type { HairlineArtwork } from './hairline-library'
import { hairlineSvgUrl, sanitizeHairlineSvg } from './hairline-sanitize'
import HairlineEmptyArt from './HairlineEmptyArt.vue'

const props = defineProps<{ artwork: HairlineArtwork }>()
const emit = defineEmits<{ ready: [artwork: HairlineArtwork]; error: [message: string] }>()
const { theme } = useTheme()
const frame = ref<HTMLIFrameElement>()
const lightSvg = ref('')
const darkSvg = ref('')
const milkSvg = ref('')
const completed = ref(false)
const failed = ref(false)
const lightUrl = computed(() => lightSvg.value ? hairlineSvgUrl(lightSvg.value) : '')
const darkUrl = computed(() => darkSvg.value ? hairlineSvgUrl(darkSvg.value) : '')
const milkUrl = computed(() => milkSvg.value ? hairlineSvgUrl(milkSvg.value) : '')
const loaded = new Set<string>()
let timer: ReturnType<typeof setTimeout> | undefined
let disposed = false

function fail(message: string) {
  if (disposed || completed.value || failed.value) return
  failed.value = true
  clearTimeout(timer)
  emit('error', message)
}
function snapshot(event: MessageEvent) {
  if (disposed || event.source !== frame.value?.contentWindow || completed.value || failed.value) return
  const data = event.data
  if (!data || data.type !== 'milkstone-hairline-preview' || data.id !== props.artwork.id) return
  if (data.error) return fail('线稿预览未能完成，请调整提示词后重新生成。')
  try {
    lightSvg.value = sanitizeHairlineSvg(data.lightSvg)
    darkSvg.value = sanitizeHairlineSvg(data.darkSvg)
    milkSvg.value = data.milkSvg ? sanitizeHairlineSvg(data.milkSvg) : ''
  } catch (error) { fail(error instanceof Error ? error.message : '线稿无法安全显示。') }
}
function imageLoaded(mode: string) {
  if (disposed) return
  loaded.add(mode)
  if (loaded.size !== (milkSvg.value ? 3 : 2) || completed.value || failed.value) return
  clearTimeout(timer)
  completed.value = true
  emit('ready', { ...props.artwork, lightSvg: lightSvg.value, darkSvg: darkSvg.value, ...(milkSvg.value ? { milkSvg: milkSvg.value } : {}) })
}
watch(() => props.artwork.id, () => {
  const artwork = props.artwork
  clearTimeout(timer)
  lightSvg.value = ''
  darkSvg.value = ''
  milkSvg.value = ''
  completed.value = false
  failed.value = false
  loaded.clear()
  try {
    if (artwork.lightSvg && artwork.darkSvg) {
      lightSvg.value = sanitizeHairlineSvg(artwork.lightSvg)
      darkSvg.value = sanitizeHairlineSvg(artwork.darkSvg)
      milkSvg.value = artwork.milkSvg ? sanitizeHairlineSvg(artwork.milkSvg) : ''
    }
  } catch { fail('作品线稿无法读取。') }
  if (!failed.value) timer = setTimeout(() => fail('线稿预览超时。此次结果未保存，可重新生成。'), 15_000)
}, { immediate: true })
onMounted(() => window.addEventListener('message', snapshot))
onBeforeUnmount(() => { disposed = true; clearTimeout(timer); window.removeEventListener('message', snapshot) })
</script>

<template>
  <div class="hairline-generated-preview" :aria-busy="!completed && !failed">
    <iframe v-if="!completed && !failed && !lightSvg" ref="frame" :srcdoc="artwork.previewHtml" sandbox="allow-scripts" title="生成线稿的隔离预览" aria-hidden="true" tabindex="-1" referrerpolicy="no-referrer" />
    <HairlineEmptyArt v-if="completed" :artwork="{ ...artwork, lightSvg, darkSvg, ...(milkSvg ? { milkSvg } : {}) }" interactive play />
    <img v-if="lightUrl && !completed" :src="lightUrl" :class="{ 'preview-hidden': theme === 'dark' || (theme === 'milk' && !!milkSvg) }" width="400" height="320" alt="" @load="imageLoaded('light')" @error="fail('浅色线稿无法显示，此次结果未保存。')">
    <img v-if="darkUrl && !completed" :src="darkUrl" :class="{ 'preview-hidden': theme !== 'dark' }" width="400" height="320" alt="" @load="imageLoaded('dark')" @error="fail('深色线稿无法显示，此次结果未保存。')">
    <img v-if="milkUrl && !completed" :src="milkUrl" :class="{ 'preview-hidden': theme !== 'milk' }" width="400" height="320" alt="" @load="imageLoaded('milk')" @error="fail('乳白线稿无法显示，此次结果未保存。')">
    <p v-if="!lightSvg && !failed" role="status">正在确认线稿的明暗预览…</p>
    <p v-if="failed" role="status">这幅线稿暂时无法显示。</p>
  </div>
</template>

<style scoped>
.hairline-generated-preview { position: relative; display: grid; place-items: center; width: 240px; max-width: 100%; min-height: 192px; }
.hairline-generated-preview iframe { position: absolute; inset: 0; width: 400px; height: 320px; border: 0; opacity: 0; pointer-events: none; }
.hairline-generated-preview img { display: block; width: 100%; height: auto; border: 0; box-shadow: none; }
.hairline-generated-preview .preview-hidden { position: absolute; opacity: 0; pointer-events: none; }
.hairline-generated-preview p { margin: 0; padding: 16px; color: var(--milk-muted); font-size: 12px; line-height: 1.65; text-align: center; }
</style>
