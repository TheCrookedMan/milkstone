<script setup lang="ts">
import type { ToastCloseProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { X } from "lucide-vue-next"
import { ToastClose } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<ToastCloseProps & {
  class?: HTMLAttributes["class"]
}>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <ToastClose data-slot="toast-close" aria-label="关闭通知" v-bind="delegatedProps" :class="cn('absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-neutral-300 group-[.destructive]:hover:text-neutral-50 group-[.destructive]:focus:ring-neutral-400 group-[.destructive]:focus:ring-offset-neutral-600', props.class)">
    <X class="h-4 w-4" />
  </ToastClose>
</template>
