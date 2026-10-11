<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/theme-controller'
import { type HairlineArtwork, type HairlineScene, useHairlineLibrary } from './hairline-library'
import { hairlineSvgUrl } from './hairline-sanitize'
import HairlineInteractiveArt from './HairlineInteractiveArt.vue'

const props = defineProps<{ artwork?: HairlineArtwork; scene?: HairlineScene; interactive?: boolean; play?: boolean }>()
const { theme } = useTheme()
const { selected, getSceneArtwork } = useHairlineLibrary()
const current = computed(() => props.artwork ?? (props.scene ? getSceneArtwork(props.scene) : selected.value))
const source = computed(() => {
  const artwork = current.value
  return hairlineSvgUrl((theme.value === 'dark' ? artwork.darkSvg : theme.value === 'milk' ? artwork.milkSvg ?? artwork.lightSvg : artwork.lightSvg) ?? '')
})
</script>

<template>
  <HairlineInteractiveArt v-if="interactive && current.source" :artwork="current" :play="play" />
  <span v-else class="hairline-empty-art" :data-theme="theme" aria-hidden="true">
    <img :src="source" alt="" width="400" height="320" loading="lazy" decoding="async">
  </span>
</template>

<style scoped>
/* Keep the rendered solid palette; the space around it belongs to the Card. */
.hairline-empty-art {
  display: block;
  width: 192px;
  max-width: 100%;
  overflow: hidden;
  border-radius: 16px;
}
.hairline-empty-art img { display: block; width: 100%; height: auto; border: 0; box-shadow: none; }
</style>
