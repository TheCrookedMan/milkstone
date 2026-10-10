<script setup lang="ts">
import { useTheme } from '../theme-controller'
const { isDark, toggle } = useTheme()
</script>

<template>
  <button class="theme-mode-switch milk-relief milk-relief-tabbar" type="button" role="switch" aria-label="黑色风格" :aria-checked="isDark" :title="isDark ? '切换为白色风格' : '切换为黑色风格'" @click="toggle">
    <span class="milk-relief milk-relief-control" :class="{ selected: !isDark }"><span aria-hidden="true">☀</span> 白色</span>
    <span class="milk-relief milk-relief-control" :class="{ selected: isDark }"><span aria-hidden="true">☾</span> 黑色</span>
  </button>
</template>

<style scoped>
.theme-mode-switch{border:var(--milk-border-width,1px) solid transparent;display:inline-flex;align-items:center;flex-shrink:0;gap:4px;padding:3px;border-radius:999px;background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-control-shadow);color:var(--milk-muted);font-size:12px;white-space:nowrap;text-shadow:none;line-height:1.5}
.theme-mode-switch>span{border:var(--milk-border-width,1px) solid transparent;background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box;display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:999px;transition:background var(--milk-duration),color var(--milk-duration);box-shadow:none}
.theme-mode-switch>span.selected{border:var(--milk-border-width,1px) solid transparent;background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;color:var(--milk-ink);box-shadow:var(--milk-button-shadow)}
.theme-mode-switch:hover{transform:none;box-shadow:var(--milk-control-shadow)}
.theme-mode-switch:active{transform:none;box-shadow:var(--milk-pressed);background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;}
@media(max-width:480px){.theme-mode-switch>span{border:var(--milk-border-width,1px) solid transparent;padding:3px 7px;gap:3px;box-shadow:none}}

.theme-mode-switch>span:not(.selected){background:transparent;border-color:transparent;box-shadow:none}
.theme-mode-switch:is(:focus,:focus-visible){outline:none;outline-offset:0;border-color:transparent;box-shadow:var(--milk-pressed)}

/* Hold the pressed material through the shared damped return lifecycle. */
.theme-mode-switch[data-milk-press="down"]:not(:disabled):not([aria-disabled="true"]){background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-pressed)}
</style>
