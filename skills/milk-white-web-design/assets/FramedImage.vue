<script setup lang="ts">
defineProps<{ src: string; alt: string; width: number; height: number }>()
</script>

<template>
  <span class="frame milk-relief milk-relief-card" :style="{ width: `${width}px` }"><img :src="src" :alt="alt" :width="width" :height="height" loading="lazy" /></span>
</template>

<style scoped>
.frame {
  display: block;
  max-width: 100%;
  overflow: visible;
  border:3px solid var(--milk-color-ffffff);
  box-shadow:var(--milk-card-shadow);
  background: var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box;
}
.frame img{display:block;width:100%;height:auto;object-fit:cover;border-radius:calc(28px - 3px)}
</style>
