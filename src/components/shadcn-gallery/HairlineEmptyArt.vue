<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/theme-controller'
import lightArt from './hairline/empty-tray.svg?url'
import darkArt from './hairline/empty-tray-dark.svg?url'

const { theme } = useTheme()
const source = computed(() => theme.value === 'dark' ? darkArt : lightArt)
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
