<script setup lang="ts">
import ShadcnGallery from './components/ShadcnGallery.vue'
import ThemeModeSwitch from './components/ThemeModeSwitch.vue'
import MaterialModeSwitch from './components/MaterialModeSwitch.vue'
import GlassMaterialShowcase from './components/GlassMaterialShowcase.vue'
</script>
<template><main class="catalog-shell"><header class="catalog-intro" data-milk-reveal-group><div class="catalog-material-controls"><ThemeModeSwitch/><MaterialModeSwitch/></div><span class="eyebrow">MILK / PAPER COMPONENT LIBRARY</span><h1>七十种组件，一种触感。</h1><p>按键、表单、导航与浮层。70 项 shadcn-vue 交互示例，在同一张纸面上展开。</p></header><GlassMaterialShowcase/><ShadcnGallery/></main></template>
