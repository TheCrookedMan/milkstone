<script setup lang="ts">
import { useId } from 'vue'
import type { ThemeMode } from '../theme-controller'
import { useTheme } from '../theme-controller'
const { theme, setTheme } = useTheme()
const groupName = `milk-theme-${useId()}`
const modes: Array<{ value: ThemeMode; label: string; symbol: string }> = [
  { value: 'light', label: '白色', symbol: '☀' },
  { value: 'dark', label: '黑色', symbol: '☾' },
  { value: 'milk', label: '乳白', symbol: '◒' },
]
</script>

<template>
  <div class="theme-mode-switch milk-relief milk-relief-tabbar" role="radiogroup" aria-label="界面风格">
    <label
      v-for="mode in modes"
      :key="mode.value"
      class="theme-mode-option milk-relief milk-relief-control"
      :class="{ selected: theme === mode.value }"
      :title="`${mode.label}风格`"
      data-milk-press-target
      data-milk-press-kind="switch"
      data-milk-focus-surface
    >
      <input type="radio" :name="groupName" :value="mode.value" :checked="theme === mode.value" :aria-label="`${mode.label}风格`" @change="setTheme(mode.value)">
      <span aria-hidden="true">{{ mode.symbol }}</span>{{ mode.label }}
    </label>
  </div>
</template>

<style scoped>
.theme-mode-switch{border:var(--milk-border-width,1px) solid transparent;display:inline-flex;align-items:center;flex-shrink:0;gap:4px;padding:3px;border-radius:999px;background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-control-shadow);color:var(--milk-muted);font-size:12px;white-space:nowrap;text-shadow:none;line-height:1.5}
.theme-mode-option{position:relative;border:var(--milk-border-width,1px) solid transparent;background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box;display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:999px;transition:background var(--milk-duration),color var(--milk-duration);box-shadow:none;cursor:pointer;font:inherit}
.theme-mode-option input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:inherit}
.theme-mode-option.selected{border:var(--milk-border-width,1px) solid transparent;background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;color:var(--milk-ink);box-shadow:var(--milk-button-shadow)}
@media(max-width:480px){.theme-mode-option{padding:3px 7px;gap:3px}}

.theme-mode-option:not(.selected){background:transparent;border-color:transparent;box-shadow:none}
.theme-mode-option:focus-within{outline:none;outline-offset:0;border-color:transparent}
.theme-mode-option:has(input:focus-visible){outline:2px solid var(--milk-focus);outline-offset:2px}

/* Hold the pressed material through the shared damped return lifecycle. */
.theme-mode-option[data-milk-press="down"]{background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-pressed)}
</style>
