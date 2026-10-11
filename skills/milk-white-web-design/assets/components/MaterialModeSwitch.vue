<script setup lang="ts">
import { useMaterial } from '../material-controller'

const { isGlass, toggle } = useMaterial()
</script>

<template>
  <button
    class="material-mode-switch milk-relief milk-relief-control"
    type="button"
    role="switch"
    :aria-checked="isGlass"
    aria-label="毛玻璃材质"
    :title="isGlass ? '关闭毛玻璃材质' : '开启毛玻璃材质'"
    data-milk-press-target
    data-milk-press-kind="switch"
    @click="toggle"
  >
    <span class="material-switch-symbol" aria-hidden="true"><i/><i/></span>
    <span>毛玻璃</span>
    <span class="material-switch-state">{{ isGlass ? '开' : '关' }}</span>
  </button>
</template>

<style scoped>
.material-mode-switch{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0;min-height:36px;padding:6px 10px;border-radius:999px;font-size:12px;line-height:1.5;white-space:nowrap;color:var(--milk-muted)}
.material-mode-switch[aria-checked=true]{color:var(--milk-ink)}
.material-switch-symbol{position:relative;display:block;width:16px;height:16px;flex-shrink:0}
.material-switch-symbol i{position:absolute;display:block;width:11px;height:11px;border:1px solid currentColor;border-radius:3px;opacity:.4}
.material-switch-symbol i:first-child{left:0;top:0}
.material-switch-symbol i:last-child{right:0;bottom:0;opacity:.75}
.material-switch-state{display:grid;place-items:center;min-width:20px;min-height:20px;padding:0 4px;border-radius:999px;background:var(--milk-surface-recessed);color:var(--milk-muted);font-size:11px;line-height:1}
.material-mode-switch[aria-checked=true] .material-switch-state{background:var(--milk-ink);color:var(--milk-canvas)}
</style>
