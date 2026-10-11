<script setup lang="ts">
import ThemeModeSwitch from '../../skills/milk-white-web-design/assets/components/ThemeModeSwitch.vue'
import MaterialModeSwitch from '../../skills/milk-white-web-design/assets/components/MaterialModeSwitch.vue'
const baseUrl = import.meta.env.BASE_URL
function skip(){const main=document.getElementById('main-content');main?.focus();main?.scrollIntoView({behavior:'auto'})}</script>
<template><div class="shell"><a class="skip" href="#main-content" @click.prevent="skip">跳到页面内容</a><header class="header" data-milk-reveal="soft"><RouterLink class="brand" to="/">Milkstone<span aria-hidden="true">.</span><small>纸感界面设计</small></RouterLink><nav class="nav" aria-label="主要导航"><div class="header-material-controls"><ThemeModeSwitch/><MaterialModeSwitch/></div><RouterLink :to="{path:'/',hash:'#theme'}">设计规范</RouterLink><RouterLink :to="{path:'/',hash:'#stack'}">技术栈</RouterLink><RouterLink :to="{path:'/',hash:'#shadcn'}">组件库</RouterLink><RouterLink :to="{path:'/',hash:'#workflow'}">工作流</RouterLink><RouterLink to="/guide">使用指南</RouterLink><a class="pill" :href="baseUrl + 'milk-white-web-design.skill'" download>下载技能包 ↓</a></nav></header><RouterView/><footer data-milk-reveal="soft"><span>Milkstone / 纸上成形，触感有度。</span><span>纸感设计系统 · Vue 3</span></footer></div></template>

<style scoped>
.header{height:auto;min-height:100px;gap:16px}
.header-material-controls{display:flex;align-items:center;gap:8px;flex-shrink:0}
.nav{gap:14px;padding-left:10px}
@media(max-width:1260px){.brand small{display:none}.nav{gap:12px}}
@media(max-width:1120px){.header{flex-wrap:wrap;align-items:flex-start;gap:12px;padding-block:20px}.nav{width:100%;justify-content:space-between;gap:12px;padding:7px 10px}.brand small{display:inline;font-size:11px}}
@media(max-width:900px){.header{min-height:80px;padding-block:16px}.nav{gap:8px}.brand small{display:none}.nav>a:not(.pill){display:none}}
@media(max-width:600px){.header{gap:12px}.nav{padding:5px}.header-material-controls{width:100%;justify-content:space-between}.nav>.pill{display:none}}
@media(max-width:380px){.header-material-controls{gap:6px}.header-material-controls :deep(.theme-mode-option){padding:3px 4px;gap:2px;font-size:11px}.header-material-controls :deep(.material-mode-switch){padding-inline:8px;gap:5px}}
</style>
