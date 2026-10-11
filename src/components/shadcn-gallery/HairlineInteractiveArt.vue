<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTheme } from '@/theme-controller'
import type { HairlineArtwork } from './hairline-library'
import { hairlineInteractionDocument, hairlinePalettes } from './hairline-interaction'
import { hairlineSvgUrl } from './hairline-sanitize'

const props = defineProps<{ artwork: HairlineArtwork; play?: boolean }>()
const { theme } = useTheme()
const host = ref<HTMLElement>()
const frame = ref<HTMLIFrameElement>()
const inView = ref(false)
const foreground = ref(true)
const ready = ref(false)
const error = ref('')
const documentHtml = ref('')
const playing = ref(props.play === true)
const reduced = ref(false)
const source = computed(() => hairlineSvgUrl((theme.value === 'dark' ? props.artwork.darkSvg : theme.value === 'milk' ? props.artwork.milkSvg ?? props.artwork.lightSvg : props.artwork.lightSvg) ?? ''))
const active = computed(() => inView.value && foreground.value && !!documentHtml.value && !error.value)
let observer: IntersectionObserver | undefined
let preference: MediaQueryList | undefined
let timer: ReturnType<typeof setTimeout> | undefined

function control() {
  const palette = { ...hairlinePalettes[theme.value] }
  if (host.value) {
    const panel = host.value.closest('.panel,.studio-selected,.studio-result,.studio-artwork') ?? host.value
    const surface = getComputedStyle(panel)
    const background = surface.backgroundColor
    const color = background && !['rgba(0, 0, 0, 0)', 'transparent'].includes(background)
      ? background
      : surface.getPropertyValue('--milk-panel').trim()
    if (color && !['rgba(0, 0, 0, 0)', 'transparent'].includes(color)) palette.plate = color
  }
  frame.value?.contentWindow?.postMessage({ type: 'milkstone-hairline-control', id: props.artwork.id, theme: theme.value, palette, play: playing.value && !reduced.value }, '*')
}
function receive(event: MessageEvent) {
  if (event.source !== frame.value?.contentWindow || event.data?.type !== 'milkstone-hairline-interaction' || event.data.id !== props.artwork.id) return
  if (event.data.error) { clearTimeout(timer); ready.value = false; error.value = '交互暂不可用，已显示静态线稿。'; return }
  if (event.data.ready) { clearTimeout(timer); ready.value = true; control() }
}
function prepare() {
  ready.value = false
  error.value = ''
  try { documentHtml.value = hairlineInteractionDocument(props.artwork.id, props.artwork.source) }
  catch (value) { documentHtml.value = ''; error.value = value instanceof Error ? value.message : '交互暂不可用。' }
}
function visibility() { foreground.value = document.visibilityState !== 'hidden' }
function motion() { reduced.value = preference?.matches ?? false; control() }
watch(() => props.artwork.id + props.artwork.source, prepare, { immediate: true })
watch(() => props.play, value => { playing.value = value === true })
watch([theme, playing], control, { flush: 'post' })
watch(active, value => {
  clearTimeout(timer)
  ready.value = false
  if (value) timer = setTimeout(() => { error.value = '交互加载超时，已显示静态线稿。' }, 9000)
})
onMounted(() => {
  window.addEventListener('message', receive)
  document.addEventListener('visibilitychange', visibility)
  visibility()
  preference = matchMedia('(prefers-reduced-motion: reduce)')
  motion()
  preference.addEventListener('change', motion)
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => { inView.value = entries[0]?.isIntersecting ?? false }, { rootMargin: '80px' })
    if (host.value) observer.observe(host.value)
  } else inView.value = true
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  observer?.disconnect()
  preference?.removeEventListener('change', motion)
  window.removeEventListener('message', receive)
  document.removeEventListener('visibilitychange', visibility)
})
</script>

<template>
  <span ref="host" class="hairline-interactive-art" :data-interaction-state="error ? 'fallback' : ready ? 'ready' : 'rest'">
    <span class="hairline-interactive-stage">
      <img :src="source" alt="" width="400" height="320" :class="{ 'is-covered': ready && active }" loading="lazy" decoding="async">
      <iframe v-if="active" ref="frame" :key="artwork.id" :srcdoc="documentHtml" :class="{ 'is-ready': ready }" sandbox="allow-scripts" :title="`${artwork.name} · 可交互线稿，方向键探索`" referrerpolicy="no-referrer" @load="control" />
    </span>
    <span class="hairline-interactive-controls">
      <span v-if="error" class="hairline-interactive-hint" role="status">{{ error }}</span>
      <span v-else class="hairline-interactive-hint">{{ reduced || !playing ? '移动指针，探索形状' : '移入探索 · 移开继续演示' }}</span>
      <button v-if="!error && !reduced" type="button" :aria-pressed="playing" :aria-label="`${playing ? '暂停' : '播放'}${artwork.name}的自动演示`" @click="playing = !playing">{{ playing ? '暂停演示' : '播放演示' }}</button>
    </span>
  </span>
</template>

<style scoped>
.hairline-interactive-art { display: flex; flex-direction: column; align-items: center; width: 240px; max-width: 100%; gap: 8px; }
.hairline-interactive-stage { position: relative; display: block; width: 100%; aspect-ratio: 5 / 4; overflow: hidden; border-radius: 16px; }
.hairline-interactive-stage img,.hairline-interactive-stage iframe { display: block; width: 100%; height: 100%; border: 0; box-shadow: none; transition: opacity 240ms ease; }
.hairline-interactive-stage iframe { position: absolute; inset: 0; opacity: 0; pointer-events: none; background: transparent; }
.hairline-interactive-stage iframe.is-ready { opacity: 1; pointer-events: auto; }
.hairline-interactive-stage img.is-covered { opacity: 0; }
.hairline-interactive-controls { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 8px 12px; width: 100%; }
.hairline-interactive-hint { color: var(--milk-muted); font-size: 11px; line-height: 1.5; }
.hairline-interactive-controls button { padding: 4px 8px; border: 0; border-radius: 10px; background: var(--milk-surface-raised); box-shadow: var(--milk-button-shadow); color: var(--milk-ink); font-size: 11px; line-height: 1.5; cursor: pointer; }
@media(prefers-reduced-motion:reduce) { .hairline-interactive-stage img,.hairline-interactive-stage iframe { transition: none; } }
</style>
