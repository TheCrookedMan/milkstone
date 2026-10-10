<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { init, use, type EChartsType, type EChartsCoreOption } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import { THEME_EVENT, themeColor } from '../theme-controller'

use([BarChart, LineChart, AriaComponent, GridComponent, TooltipComponent, SVGRenderer])

const componentId = useId()
const chartElement = ref<HTMLDivElement>()
const mode = ref<'line' | 'bar'>('line')
const showTasks = ref(true)
const showAccepted = ref(true)
const rows = [
  { day: '周一', tasks: 320, accepted: 288 },
  { day: '周二', tasks: 420, accepted: 382 },
  { day: '周三', tasks: 386, accepted: 354 },
  { day: '周四', tasks: 568, accepted: 518 },
  { day: '周五', tasks: 510, accepted: 472 },
  { day: '周六', tasks: 708, accepted: 654 },
  { day: '周日', tasks: 864, accepted: 806 },
]
const total = computed(() => rows.reduce((value, row) => value + row.tasks, 0))
const acceptance = computed(() => Math.round(rows.reduce((value, row) => value + row.accepted, 0) / total.value * 100))
let chart: EChartsType | undefined
let observer: ResizeObserver | undefined
let motionQuery: MediaQueryList | undefined

function render() {
  const style = chartElement.value ? getComputedStyle(chartElement.value) : undefined
  // Resolved material roles keep graphite labels and gridlines readable without
  // complementing them again. Only data-series colors use the inverse palette.
  const materialColor = (name: string, fallback: string) => style?.getPropertyValue(name).trim() || themeColor(fallback)
  const surfaceColor = materialColor('--milk-raised', '#eef0f4')
  const textColor = materialColor('--milk-ink', '#2e3540')
  const mutedColor = materialColor('--milk-muted', '#5b6573')
  const edgeColor = materialColor('--milk-edge', '#cdd2db')
  const series = []
  if (showTasks.value) series.push({
    name: '生成任务', type: mode.value, data: rows.map(row => row.tasks),
    symbol: 'circle', symbolSize: 8, smooth: 0.2, barMaxWidth: 22,
    lineStyle: { width: 3 }, itemStyle: { color: themeColor('#575757'), borderRadius: [5, 5, 0, 0] },
    areaStyle: mode.value === 'line' ? { color: themeColor('#777777'), opacity: 0.07 } : undefined,
    // Resolve the white-mode hover palette before inversion. ECharts otherwise
    // lightens each mode independently, which breaks complementary hover colors.
    emphasis: {
      itemStyle: { color: themeColor('#5f5f5f') },
      lineStyle: { color: themeColor('#5f5f5f') },
      areaStyle: mode.value === 'line' ? { color: themeColor('#828282') } : undefined,
    },
  })
  if (showAccepted.value) series.push({
    name: '通过验收', type: mode.value, data: rows.map(row => row.accepted),
    symbol: 'diamond', symbolSize: 8, smooth: 0.2, barMaxWidth: 22,
    lineStyle: { width: 2, type: 'dashed' }, itemStyle: { color: themeColor('#a0a0a0'), borderRadius: [5, 5, 0, 0] },
    emphasis: {
      itemStyle: { color: themeColor('#b0b0b0') },
      lineStyle: { color: themeColor('#b0b0b0') },
    },
  })
  const option: EChartsCoreOption = {
    animation: !motionQuery?.matches,
    animationDuration: 300,
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'inherit', color: mutedColor },
    aria: { enabled: true, label: { description: '一周演示任务趋势。完整数值可在下方数据表中查看。' } },
    grid: { top: 30, right: 15, bottom: 28, left: 42 },
    tooltip: {
      className: 'milk-relief milk-relief-card',
      trigger: 'axis', confine: true, backgroundColor: surfaceColor, borderColor: 'transparent', borderWidth: 1,
      textStyle: { color: textColor, fontSize: 12 },
      extraCssText: `border:var(--milk-border-width,1px) solid transparent;border-radius:16px;box-shadow:var(--milk-floating-shadow);background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;`,
      axisPointer: { lineStyle: { color: mutedColor, type: 'dashed' }, shadowStyle: { color: themeColor('#8a8a8a0c') } },
    },
    xAxis: {
      type: 'category', data: rows.map(row => row.day), boundaryGap: mode.value === 'bar',
      axisLine: { lineStyle: { color: edgeColor } }, axisTick: { alignWithLabel: true, length: 6 },
      axisLabel: { color: mutedColor, fontSize: 11, margin: 13 },
    },
    yAxis: {
      type: 'value', min: 0, max: 1000, interval: 250, name: '次',
      nameTextStyle: { color: mutedColor, align: 'right', padding: [0, 8, 0, 0] },
      axisLabel: { color: mutedColor, fontSize: 11 },
      splitLine: { lineStyle: { color: edgeColor, type: 'dashed' } },
    },
    series,
  }
  chart?.setOption(option, { notMerge: true })
}

watch([mode, showTasks, showAccepted], render)
onMounted(() => {
  if (!chartElement.value) return
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  chart = init(chartElement.value, undefined, { renderer: 'svg' })
  render()
  observer = new ResizeObserver(() => chart?.resize())
  observer.observe(chartElement.value)
  motionQuery.addEventListener('change', render)
  window.addEventListener(THEME_EVENT, render)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  motionQuery?.removeEventListener('change', render)
  window.removeEventListener(THEME_EVENT, render)
  chart?.dispose()
})
</script>

<template>
  <article class="panel chart-studio" :aria-labelledby="`${componentId}-title`">
    <header class="chart-header">
      <div><span class="instrument-label">01 / DATA INSTRUMENT</span><h3 :id="`${componentId}-title`">让数据，沿刻度成形。</h3></div>
      <div class="mode-switch milk-relief milk-relief-tabbar" role="group" aria-label="图表类型">
        <button type="button" :aria-pressed="mode === 'line'" @click="mode = 'line'">折线</button>
        <button type="button" :aria-pressed="mode === 'bar'" @click="mode = 'bar'">柱图</button>
      </div>
    </header>
    <div class="chart-metrics">
      <div><span>本周生成任务</span><strong>{{ total.toLocaleString() }}<small>次</small></strong></div>
      <div><span>通过验收</span><strong>{{ acceptance }}<small>%</small></strong></div>
      <div class="metric-note"><i aria-hidden="true"/><span>7 天演示数据<br><small>数值与走势一一对应</small></span></div>
    </div>
    <div class="chart-surface">
      <div class="chart-legend" role="group" aria-label="显示的数据系列">
        <button type="button" :aria-pressed="showTasks" @click="showTasks = !showTasks"><i class="legend-line tasks" aria-hidden="true"/>生成任务<span>{{ showTasks ? '显示' : '隐藏' }}</span></button>
        <button type="button" :aria-pressed="showAccepted" @click="showAccepted = !showAccepted"><i class="legend-line accepted" aria-hidden="true"/>通过验收<span>{{ showAccepted ? '显示' : '隐藏' }}</span></button>
      </div>
      <div ref="chartElement" class="chart-plot" role="img" aria-label="本周任务趋势。完整数值可在下方数据表中查看。"/>
      <p v-if="!showTasks && !showAccepted" class="empty-chart milk-relief milk-relief-card" role="status">数据系列已隐藏。点击上方图例，重新查看走势。</p>
    </div>
    <footer class="chart-footer">
      <details><summary class="milk-relief milk-relief-control">查看完整数据表</summary><div class="table-wrap"><table><caption>本周任务数据（演示）</caption><thead><tr><th scope="col">日期</th><th scope="col">生成任务 / 次</th><th scope="col">通过验收 / 次</th></tr></thead><tbody><tr v-for="row in rows" :key="row.day"><th scope="row">{{ row.day }}</th><td>{{ row.tasks }}</td><td>{{ row.accepted }}</td></tr></tbody></table></div></details>
      <span>Apache ECharts 6 · SVG</span>
    </footer>
  </article>
</template>

<style scoped>
.chart-studio{padding:30px;min-width:0;color:var(--milk-ink,var(--milk-color-2e3540));box-shadow:var(--milk-card-shadow)}.chart-header{display:flex;align-items:center;justify-content:space-between;gap:20px}.instrument-label{font-size:10px;letter-spacing:.13em;font-weight:700;color:var(--milk-muted,var(--milk-color-5b6573));text-shadow:none}.chart-header h3{font-size:22px;margin:5px 0 0;letter-spacing:-.035em}
.mode-switch{border:var(--milk-border-width,1px) solid transparent;display:flex;flex:none;gap:5px;padding:5px;border-radius:999px;background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-control-shadow)}.mode-switch button{border:var(--milk-border-width,1px) solid transparent;padding:8px 13px;border-radius:999px;font-size:12px;background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box;box-shadow:none;color:var(--milk-color-5b6573);min-height:38px;text-shadow:none}.mode-switch button[aria-pressed=true]{border:var(--milk-border-width,1px) solid transparent;background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;color:var(--milk-color-2e3540);box-shadow:var(--milk-button-shadow);text-shadow:none}.mode-switch button:hover{transform:none}.mode-switch button:active{transform:none;box-shadow:var(--milk-pressed);background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;}
.chart-metrics{display:flex;align-items:center;gap:38px;margin:28px 0 24px}.chart-metrics>div>span{display:block;font-size:12px;color:var(--milk-muted,var(--milk-color-5b6573))}.chart-metrics strong{display:block;font-size:32px;font-weight:600;letter-spacing:-.04em;font-variant-numeric:tabular-nums;text-shadow:none}.chart-metrics strong small{font-size:12px;margin-left:6px;font-weight:400;letter-spacing:0}.metric-note{margin-left:auto;display:flex;gap:9px;align-items:flex-start;font-size:11px;color:var(--milk-color-5b6573)}.metric-note i{height:7px;width:7px;flex:none;border-radius:50%;background:var(--milk-color-818181);box-shadow:none;margin-top:6px}.metric-note small{font-size:10px}
.chart-surface{border:var(--milk-border-width,1px) solid transparent;position:relative;padding:16px 14px 6px;border-radius:18px;background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-control-shadow)}.chart-legend{display:flex;gap:18px;flex-wrap:wrap;padding:0 0 8px 8px}.chart-legend button{display:flex;align-items:center;gap:7px;border:var(--milk-border-width,1px) solid transparent;border-radius:999px;padding:5px 8px;box-shadow:var(--milk-button-shadow);background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box;font-size:11px;color:var(--milk-color-3f3f3f);min-height:34px;text-shadow:none}.chart-legend button:hover{transform:none}.chart-legend button[aria-pressed=false]{color:var(--milk-color-6b7c93);background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-pressed)}.chart-legend button[aria-pressed=false] i{opacity:.35}.chart-legend button>span{font-size:10px;color:var(--milk-color-5b6573)}.legend-line{width:18px;border-top:3px solid var(--milk-color-575757)}.legend-line.accepted{border-top:2px dashed var(--milk-color-a0a0a0)}.chart-plot{width:100%;height:265px}.empty-chart{border:var(--milk-border-width,1px) solid transparent;position:absolute;left:20%;right:20%;top:45%;text-align:center;font-size:12px;background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box;padding:12px;color:var(--milk-color-5b6573);border-radius:10px;box-shadow:var(--milk-floating-shadow)}
.chart-footer{display:flex;align-items:flex-start;gap:12px;justify-content:space-between;margin-top:17px}.chart-footer>span{font-size:10px;color:var(--milk-color-5b6573);white-space:nowrap;padding-top:3px}.chart-footer details{min-width:0;flex:1}.chart-footer summary{border:var(--milk-border-width,1px) solid transparent;font-size:12px;cursor:pointer;width:fit-content;color:var(--milk-color-3f3f3f);border-radius:999px;background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box;padding:6px 10px;box-shadow:var(--milk-button-shadow)}.table-wrap{overflow:auto;margin-top:12px}.table-wrap table{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums;text-align:left}.table-wrap caption{text-align:left;color:var(--milk-color-5b6573);padding-bottom:8px}.table-wrap th,.table-wrap td{padding:8px 10px;border-bottom:var(--milk-border-width,1px) solid transparent;white-space:nowrap;background-image:var(--milk-border-gradient);background-size:100% var(--milk-border-width,1px);background-position:left bottom;background-origin:border-box;background-repeat:no-repeat}.table-wrap th{font-weight:500}.table-wrap thead{background:var(--milk-panel,var(--milk-color-eef1f5))}:focus-visible{outline:3px solid var(--milk-focus,var(--milk-color-6b7c93));outline-offset:4px}
@media(max-width:600px){.chart-studio{padding:20px;box-shadow:var(--milk-card-shadow)}.chart-header{align-items:flex-start;gap:12px}.chart-header h3{font-size:19px}.instrument-label{font-size:9px}.mode-switch{padding:4px;gap:2px;box-shadow:var(--milk-control-shadow);background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;border-radius:999px}.mode-switch button{padding:7px 10px;box-shadow:none;border-radius:999px}.chart-metrics{gap:28px;flex-wrap:wrap;margin:24px 0 18px}.chart-metrics strong{font-size:28px}.metric-note{display:none}.chart-surface{padding:12px 6px 4px;box-shadow:var(--milk-control-shadow)}.chart-plot{height:245px}.chart-footer{flex-direction:column;gap:10px}.chart-footer details{width:100%}.chart-legend{gap:16px;padding-left:8px}.empty-chart{left:10%;right:10%;box-shadow:var(--milk-floating-shadow)}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important}}.chart-legend button[aria-pressed=true]{background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-button-shadow)}.chart-legend button:active{background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;transform:none;box-shadow:var(--milk-pressed);}
.chart-footer summary:active{transform:none;background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-pressed)}
.mode-switch button[aria-pressed=false]:not(:active){background:transparent;border-color:transparent;box-shadow:none}

/* Hold the pressed material through the shared damped return lifecycle. */
.chart-studio :is(button,summary)[data-milk-press="down"]:not(:disabled):not([aria-disabled="true"]){background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;box-shadow:var(--milk-pressed)}
</style>
