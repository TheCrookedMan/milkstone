<script setup lang="ts">
import type { SwitchRootEmits, SwitchRootProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  SwitchRoot,
  SwitchThumb,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<SwitchRootProps & { class?: HTMLAttributes["class"] }>()

const emits = defineEmits<SwitchRootEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <SwitchRoot
    v-slot="slotProps"
    data-slot="switch"
    v-bind="forwarded"
    :class="cn(
      'peer relative inline-flex h-8 w-15 shrink-0 items-center rounded-full border border-transparent p-0 shadow-xs outline-none disabled:cursor-not-allowed disabled:opacity-50',
      props.class,
    )"
  >
    <span data-slot="switch-state" aria-hidden="true">
      <span data-switch-on>开</span>
      <span data-switch-off>关</span>
    </span>
    <SwitchThumb
      data-slot="switch-thumb"
      class="pointer-events-none absolute block size-6 rounded-full ring-0"
    >
      <slot name="thumb" v-bind="slotProps" />
    </SwitchThumb>
  </SwitchRoot>
</template>
