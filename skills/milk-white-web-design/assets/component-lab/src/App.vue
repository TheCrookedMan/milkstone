<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import ThemeModeSwitch from '../../components/ThemeModeSwitch.vue'
import InstrumentControls from '../../components/InstrumentControls.vue'
const ChartStudio = defineAsyncComponent(() => import('../../components/ChartStudio.vue'))
const RelationStudio = defineAsyncComponent(() => import('../../components/RelationStudio.vue'))
const CampusRadar = defineAsyncComponent(() => import('../../components/CampusRadar.vue'))
const WorkflowStudio = defineAsyncComponent(() => import('../../components/WorkflowStudio.vue'))
</script>
<template><main><ThemeModeSwitch/><h1>MILK · 纸面组件工作台</h1><p>从刻度、光线到节点，让交互在纸面上成形。以下为本地演示，工作流未连接生成后端。</p><section><h2>按键与刻度</h2><InstrumentControls/></section><section><h2>数据与尺度</h2><ChartStudio/></section><section><h2>关联与轨道</h2><RelationStudio/></section><section><h2>空间与光层</h2><CampusRadar/></section><section><h2>节点与步骤</h2><WorkflowStudio/></section></main></template>
<style>main{max-width:1180px;margin:auto;padding:30px 24px}section{margin:50px 0}h1,h2{font-weight:500}button{max-width:100%}</style>
