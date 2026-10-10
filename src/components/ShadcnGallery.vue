<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { Search } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import InputDemos from './shadcn-gallery/InputDemos.vue'
import OverlayDemos from './shadcn-gallery/OverlayDemos.vue'
import DisplayDemos from './shadcn-gallery/DisplayDemos.vue'
import { shadcnCatalog, shadcnCategories, shadcnCatalogSource } from '@/data/shadcn-catalog'

const searchId = useId()
const query = ref('')
const category = ref('全部')
const visible = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  return shadcnCatalog.filter(item =>
    (category.value === '全部' || item.category === category.value) &&
    (!needle || `${item.id} ${item.name} ${item.label} ${item.description}`.toLocaleLowerCase().includes(needle)),
  )
})
const compatibility = new Set(['form', 'pin-input', 'toast'])
function reset() { query.value = ''; category.value = '全部' }
</script>

<template>
  <div class="shadcn-gallery">
    <div class="shadcn-gallery-summary">
      <div><span class="eyebrow">SHADCN / MATERIAL COLLECTION</span><br><strong><span>从一个按钮，</span><span>到整张界面。</span></strong><p>卡片有厚度，输入有落点，轻按有回应。让熟悉的 shadcn-vue 组件，带上 MILK 的纸面质感。</p></div>
      <div class="shadcn-gallery-count"><b>{{ shadcnCatalog.length }}</b><span>COMPONENTS</span></div>
    </div>
    <div class="shadcn-toolbar">
      <div class="shadcn-search"><label class="sr-only" :for="searchId">搜索 shadcn 组件</label><Search aria-hidden="true"/><Input :id="searchId" v-model="query" type="search" placeholder="搜索组件，例如 Button / 按钮" autocomplete="off"/></div>
      <div class="shadcn-filters" role="group" aria-label="组件分类"><Button v-for="group in ['全部', ...shadcnCategories]" :key="group" size="sm" :variant="category === group ? 'default' : 'outline'" :aria-pressed="category === group" @click="category = group">{{ group }}</Button></div>
    </div>
    <div class="shadcn-result-line"><span role="status">显示 {{ visible.length }} / {{ shadcnCatalog.length }} 项</span><a :href="shadcnCatalogSource" target="_blank" rel="noopener noreferrer">官方目录 · 2026.10 核对 ↗</a></div>
    <div v-if="visible.length" class="shadcn-grid">
      <article v-for="item in visible" :id="`shadcn-${item.id}`" :key="item.id" class="shadcn-example" :class="{ wide:item.wide }" :data-component="item.id" :aria-labelledby="`shadcn-title-${item.id}`">
        <header class="shadcn-example-head"><div><h3 :id="`shadcn-title-${item.id}`">{{ item.name }}<span v-if="compatibility.has(item.id)" class="shadcn-compat">兼容项</span></h3><p>{{ item.label }}</p></div><span class="index" aria-hidden="true">{{ String(shadcnCatalog.indexOf(item) + 1).padStart(2, '0') }}</span></header>
        <div class="shadcn-demo"><InputDemos v-if="item.owner === 'input'" :name="item.id"/><OverlayDemos v-else-if="item.owner === 'overlay'" :name="item.id"/><DisplayDemos v-else :name="item.id"/></div>
        <div class="shadcn-example-foot"><p>{{ item.description }}</p><a :href="`https://www.shadcn-vue.com/docs/components/${item.id}`" target="_blank" rel="noopener noreferrer">{{ item.name }} 文档 ↗</a></div>
      </article>
    </div>
    <div v-else class="shadcn-empty"><p>暂未找到组件，换个名称试试。</p><Button variant="outline" @click="reset">查看全部组件</Button></div>
  </div>
</template>
