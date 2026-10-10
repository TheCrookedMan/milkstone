<script setup lang="ts">
import { ArrowUpRight, ArrowRight, ArrowDown, Check, Copy, Download, Play, Pause, X, Menu, Layers, Sparkles, Network, Code2, ChevronRight, Circle, ShieldCheck, MoveRight, RotateCcw, ExternalLink } from 'lucide-vue-next'
const icons = { ArrowUpRight, ArrowRight, ArrowDown, Check, Copy, Download, Play, Pause, X, Menu, Layers, Sparkles, Network, Code2, ChevronRight, Circle, ShieldCheck, MoveRight, RotateCcw, ExternalLink }
defineProps<{ name: keyof typeof icons; size?: number }>()
</script>
<template><component :is="icons[name] ?? Circle" :size="size ?? 18" :stroke-width="1.6" aria-hidden="true" /></template>
