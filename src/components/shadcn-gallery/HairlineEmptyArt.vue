<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/theme-controller'
import { type HairlineArtwork, useHairlineLibrary } from './hairline-library'
import { hairlineSvgUrl } from './hairline-sanitize'

const props = defineProps<{ artwork?: HairlineArtwork }>()
const { theme } = useTheme()
const { selected } = useHairlineLibrary()
const source = computed(() => {
  const artwork = props.artwork ?? selected.value
  return hairlineSvgUrl((theme.value === 'dark' ? artwork.darkSvg : artwork.lightSvg) ?? '')
})
</script>

<template>
  <span class="hairline-empty-art" :data-theme="theme" aria-hidden="true">
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
