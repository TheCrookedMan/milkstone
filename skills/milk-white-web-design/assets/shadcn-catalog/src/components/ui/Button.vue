<script setup lang="ts">
import { cva } from 'class-variance-authority'
import { cn } from './utils'
const props = withDefaults(defineProps<{ variant?: 'primary' | 'secondary' | 'ghost'; size?: 'default' | 'small'; class?: string; type?: 'button' | 'submit' | 'reset' }>(), { variant: 'primary', size: 'default', type: 'button' })
const variants = cva('ui-button', { variants: { variant: { primary: 'primary', secondary: '', ghost: 'ghost' }, size: { default: '', small: 'small' } } })
</script>
<template><button :type="type" :class="cn(variants({ variant, size }), props.class)"><slot /></button></template>
