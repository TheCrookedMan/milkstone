<script lang="ts" setup>
import type { ToasterProps } from "vue-sonner"
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon, XIcon } from "@lucide/vue"
import { Toaster as Sonner } from "vue-sonner"
import "vue-sonner/style.css"
import { cn } from "@/lib/utils"
import { useTheme } from "@/theme-controller"

const props = defineProps<ToasterProps>()
const { theme } = useTheme()
</script>

<template>
  <Teleport to="body">
  <Sonner
    :class="cn('toaster group', props.class)"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-bg-hover': 'var(--milk-panel)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--normal-border-hover': 'var(--milk-edge)',
      '--gray1': 'var(--milk-light)',
      '--gray2': 'var(--milk-raised)',
      '--gray3': 'var(--milk-panel)',
      '--gray4': 'var(--milk-warm)',
      '--gray5': 'var(--milk-inset)',
      '--gray6': 'var(--milk-depth)',
      '--gray7': 'var(--milk-edge)',
      '--gray8': 'var(--milk-accent)',
      '--gray9': 'var(--milk-muted)',
      '--gray10': 'var(--milk-focus)',
      '--gray11': 'var(--milk-muted)',
      '--gray12': 'var(--milk-ink)',
      '--success-bg': 'var(--popover)',
      '--success-border': 'var(--border)',
      '--success-text': 'var(--popover-foreground)',
      '--info-bg': 'var(--popover)',
      '--info-border': 'var(--border)',
      '--info-text': 'var(--popover-foreground)',
      '--warning-bg': 'var(--popover)',
      '--warning-border': 'var(--border)',
      '--warning-text': 'var(--popover-foreground)',
      '--error-bg': 'var(--popover)',
      '--error-border': 'var(--border)',
      '--error-text': 'var(--popover-foreground)',
      '--border-radius': 'var(--radius)',
    }"
    v-bind="props"
    :theme="theme"
  >
    <template #success-icon>
      <CircleCheckIcon class="size-4" />
    </template>
    <template #info-icon>
      <InfoIcon class="size-4" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon class="size-4" />
    </template>
    <template #error-icon>
      <OctagonXIcon class="size-4" />
    </template>
    <template #loading-icon>
      <div>
        <Loader2Icon class="size-4 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-4" />
    </template>
  </Sonner>
  </Teleport>
</template>
