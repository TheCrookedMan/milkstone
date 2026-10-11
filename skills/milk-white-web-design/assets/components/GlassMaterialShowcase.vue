<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useTheme } from '../theme-controller'
import MaterialModeSwitch from './MaterialModeSwitch.vue'

const { theme } = useTheme()
const id = `milk-glass-study-${useId()}`
const tabs = [
  { value: 'material', label: '材质观察' },
  { value: 'details', label: '交互记录' },
] as const
type StudyTab = typeof tabs[number]['value']
const activeTab = ref<StudyTab>('material')
const sampleName = ref('光落在玻璃上')
const saved = ref(false)
const feedback = ref('编辑样本名称，或收藏这份材质。')
const themeName = computed(() => ({ light: '纸白', dark: '石墨', milk: '乳白' })[theme.value])
const title = computed(() => sampleName.value.trim() || '光落在玻璃上')

function moveTab(event: KeyboardEvent, index: number) {
  let next = index
  if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
  else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = tabs.length - 1
  else return
  event.preventDefault()
  activeTab.value = tabs[next]!.value
  const tablist = (event.currentTarget as HTMLElement).closest('[role=tablist]')
  tablist?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus()
}

function saveSample() {
  saved.value = !saved.value
  feedback.value = saved.value ? `已收藏「${title.value}」，仅在本页演示。` : '已取消收藏，仍可继续观察材质。'
}
</script>

<template>
  <div class="glass-material-showcase" data-milk-reveal-group>
    <div class="glass-study-heading">
      <div>
        <div class="eyebrow">MATERIAL / FROSTED GLASS</div>
        <h3>让光透过，触感留下。</h3>
        <p>在纸白、石墨与乳白之上，叠一层柔和透光的毛玻璃。</p>
      </div>
      <MaterialModeSwitch/>
    </div>

    <div class="glass-study-scene">
      <div class="glass-study-backdrop" aria-hidden="true">
        <div class="glass-study-orbit glass-study-orbit-one"/>
        <div class="glass-study-orbit glass-study-orbit-two"/>
        <div class="glass-study-disc glass-study-disc-one"/>
        <div class="glass-study-disc glass-study-disc-two"/>
        <span class="glass-study-backdrop-word">light.</span>
      </div>

      <article class="glass-study-card panel milk-glass milk-relief milk-relief-card" :aria-labelledby="`${id}-title`">
        <div class="glass-study-card-topline">
          <span class="glass-study-kicker">MILKSTONE / {{ themeName }}玻璃</span>
          <span class="glass-study-live"><i aria-hidden="true"/>透光样本</span>
        </div>
        <div class="glass-study-tabbar milk-glass milk-relief milk-relief-tabbar" role="tablist" aria-label="毛玻璃样本内容">
          <button
            v-for="(tab, index) in tabs"
            :id="`${id}-tab-${tab.value}`"
            :key="tab.value"
            class="glass-study-tab milk-glass"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.value"
            :aria-controls="`${id}-panel-${tab.value}`"
            :tabindex="activeTab === tab.value ? 0 : -1"
            @click="activeTab = tab.value"
            @keydown="moveTab($event, index)"
          >{{ tab.label }}</button>
        </div>

        <div class="glass-study-content">
          <div class="glass-study-image milk-glass milk-relief milk-relief-control" role="img" aria-label="交叠圆盘与玻璃镜片构成的几何材质画面">
            <span class="glass-study-image-disc"/>
            <span class="glass-study-image-lens milk-glass"/>
            <span class="glass-study-image-caption">SOFT LIGHT<br>QUIET DEPTH</span>
          </div>
          <div class="glass-study-copy">
            <h4 :id="`${id}-title`">{{ title }}</h4>
            <div
              v-show="activeTab === 'material'"
              :id="`${id}-panel-material`"
              role="tabpanel"
              :aria-labelledby="`${id}-tab-material`"
            >
              <p>底景柔化，边缘受光。文字保持清晰，圆润的表面仍有轻轻浮起的分量。</p>
              <div class="glass-study-tags"><span>柔焦透光</span><span>同向受光</span><span>细腻触感</span></div>
            </div>
            <div
              v-show="activeTab === 'details'"
              :id="`${id}-panel-details`"
              role="tabpanel"
              :aria-labelledby="`${id}-tab-details`"
            >
              <p>切换标签、写下名称，再轻按收藏。输入保持内凹，按键保留轻压与缓缓回位。</p>
              <div class="glass-study-tags"><span>名称 {{ sampleName.length }}/24</span><span>{{ saved ? '已收藏' : '未收藏' }}</span></div>
            </div>
          </div>
        </div>

        <form class="glass-study-form" @submit.prevent="saveSample">
          <label :for="`${id}-name`">样本名称</label>
          <div class="glass-study-form-row">
            <input :id="`${id}-name`" v-model="sampleName" class="glass-study-input milk-glass" maxlength="24" placeholder="为这束光起个名字" :aria-describedby="`${id}-feedback`">
            <button class="glass-study-save milk-glass" type="submit" :aria-pressed="saved"><span aria-hidden="true">{{ saved ? '♥' : '♡' }}</span>{{ saved ? '已收藏' : '收藏样本' }}</button>
          </div>
          <p :id="`${id}-feedback`" class="glass-study-feedback" role="status">{{ feedback }}</p>
        </form>
      </article>

      <aside class="glass-study-aside">
        <span class="glass-study-aside-index">01 / THROUGH THE SURFACE</span>
        <strong>清晰的内容，<br>柔和的景深。</strong>
        <p>卡片、标签栏、输入框与按键，共用透光表面与细薄受光边。底景在后，内容在前，层次自然分开。</p>
        <div class="glass-study-layer-notes"><span><i/>底层 · 几何光影</span><span><i/>中层 · 柔焦玻璃</span><span><i/>前层 · 清晰内容</span></div>
      </aside>
    </div>

    <p class="glass-study-caption">此处始终展示毛玻璃样本；开启「毛玻璃」后，可在整页体验当前底色的透光材质。交互与收藏仅在本页演示。</p>
  </div>
</template>

<style scoped>
.glass-material-showcase{margin-top:32px;color:var(--milk-ink)}
.glass-study-heading{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:24px}
.glass-study-heading h3{margin:8px 0;font-size:24px;font-weight:500;line-height:1.4;letter-spacing:-.4px}
.glass-study-heading p{margin:0;color:var(--milk-muted);font-size:14px;line-height:1.7}
.glass-study-scene{position:relative;isolation:isolate;display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);align-items:center;gap:48px;overflow:hidden;min-height:480px;padding:48px;border:1px solid color-mix(in srgb,var(--milk-edge) 55%,transparent);border-radius:32px;background:radial-gradient(ellipse at 15% 12%,color-mix(in srgb,var(--milk-accent) 65%,transparent),transparent 55%),linear-gradient(125deg,var(--milk-light),var(--milk-canvas) 55%,var(--milk-inset))}
.glass-study-backdrop{position:absolute;inset:0;z-index:-1;overflow:hidden;pointer-events:none;background-image:linear-gradient(color-mix(in srgb,var(--milk-muted) 6%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--milk-muted) 6%,transparent) 1px,transparent 1px);background-size:40px 40px}
.glass-study-orbit{position:absolute;width:520px;height:520px;border:1px solid color-mix(in srgb,var(--milk-muted) 15%,transparent);border-radius:50%}
.glass-study-orbit-one{left:-160px;top:-200px}
.glass-study-orbit-two{right:-260px;bottom:-400px;width:720px;height:720px}
.glass-study-disc{position:absolute;border-radius:50%;background:linear-gradient(135deg,color-mix(in srgb,var(--milk-focus) 32%,var(--milk-light)),color-mix(in srgb,var(--milk-accent) 40%,var(--milk-canvas)));box-shadow:inset 1px 1px 0 color-mix(in srgb,var(--milk-highlight) 75%,transparent),12px 16px 32px color-mix(in srgb,var(--milk-muted) 12%,transparent)}
.glass-study-disc-one{left:-55px;top:100px;width:260px;height:260px}
.glass-study-disc-two{left:32%;bottom:-95px;width:300px;height:300px;background:linear-gradient(150deg,color-mix(in srgb,var(--milk-focus) 24%,var(--milk-light)),var(--milk-depth))}
.glass-study-backdrop-word{position:absolute;left:32%;top:4px;color:color-mix(in srgb,var(--milk-muted) 14%,transparent);font-family:Georgia,serif;font-size:124px;line-height:1;letter-spacing:-7px;transform:rotate(-8deg)}
.glass-study-card{min-width:0;padding:24px;border-radius:24px}
.glass-study-card-topline{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;font-size:12px;line-height:1.5;color:var(--milk-muted)}
.glass-study-kicker{letter-spacing:1.2px}
.glass-study-live{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.glass-study-live i{width:5px;height:5px;border-radius:50%;background:var(--milk-muted)}
.glass-study-tabbar{display:flex;gap:4px;width:fit-content;max-width:100%;padding:4px;border:var(--milk-border-width) solid transparent;border-radius:999px;margin-bottom:24px}
.glass-study-tab{min-height:34px;padding:6px 14px;font-size:12px;line-height:1.5;white-space:nowrap;box-shadow:none;color:var(--milk-muted)}
.glass-study-tab[aria-selected=true]{color:var(--milk-ink);box-shadow:var(--milk-button-shadow);font-weight:500}
.glass-study-content{display:grid;grid-template-columns:136px minmax(0,1fr);align-items:center;gap:24px;margin-bottom:24px}
.glass-study-image{position:relative;isolation:isolate;aspect-ratio:1;overflow:hidden;border:var(--milk-border-width) solid transparent;border-radius:20px}
.glass-study-image-disc{position:absolute;left:-8%;top:12%;width:78%;height:78%;border-radius:50%;background:linear-gradient(150deg,color-mix(in srgb,var(--milk-focus) 48%,var(--milk-light)),var(--milk-depth));box-shadow:inset 1px 1px 0 color-mix(in srgb,var(--milk-highlight) 55%,transparent)}
.glass-study-image-lens{position:absolute;right:8%;top:15%;width:65%;height:65%;border:var(--milk-border-width) solid transparent;border-radius:50%;box-shadow:var(--milk-button-shadow)}
.glass-study-image-caption{position:absolute;bottom:12px;left:12px;font-size:8px;letter-spacing:1.5px;line-height:1.6;color:var(--milk-ink)}
.glass-study-copy h4{margin:0 0 8px;font-size:18px;font-weight:500;line-height:1.5;overflow-wrap:anywhere}
.glass-study-copy p{margin:0;color:var(--milk-muted);font-size:14px;line-height:1.8}
.glass-study-tags{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:12px;color:var(--milk-muted);font-size:12px;line-height:1.6}
.glass-study-form label{margin-bottom:8px;font-size:12px;line-height:1.5;color:var(--milk-muted)}
.glass-study-form-row{display:flex;align-items:center;gap:12px}
.glass-study-form-row .glass-study-input{flex:1;min-width:0;min-height:42px;padding:9px 12px;border-radius:12px;font-size:14px;line-height:1.6}
.glass-study-save{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0;min-height:42px;padding:9px 14px;font-size:12px;line-height:1.6;white-space:nowrap}
.glass-study-save>span{font-size:16px;line-height:1}
.glass-study-feedback{min-height:18px;margin:8px 0 0;color:var(--milk-muted);font-size:12px;line-height:1.6}
.glass-study-aside{position:relative;max-width:290px;padding:12px 0}
.glass-study-aside-index{font-size:12px;letter-spacing:1.3px;color:var(--milk-muted)}
.glass-study-aside strong{display:block;margin:16px 0;font-size:28px;font-weight:500;line-height:1.5;letter-spacing:-.6px}
.glass-study-aside>p{margin:0;color:var(--milk-muted);font-size:14px;line-height:1.85}
.glass-study-layer-notes{display:grid;gap:12px;margin-top:24px;font-size:12px;color:var(--milk-muted)}
.glass-study-layer-notes>span{display:flex;align-items:center;gap:8px}
.glass-study-layer-notes i{width:16px;height:6px;border:1px solid color-mix(in srgb,var(--milk-muted) 45%,transparent);border-radius:999px;background:color-mix(in srgb,var(--milk-panel) 55%,transparent);transform:rotate(-25deg)}
.glass-study-layer-notes>span:nth-child(2) i{opacity:.65}
.glass-study-layer-notes>span:nth-child(3) i{background:var(--milk-muted)}
.glass-study-caption{margin:16px 0 0;color:var(--milk-muted);font-size:12px;line-height:1.75}
@media(max-width:1080px){.glass-study-scene{gap:24px;padding:32px;grid-template-columns:minmax(0,1.5fr) minmax(0,.8fr)}.glass-study-content{grid-template-columns:108px minmax(0,1fr);gap:16px}.glass-study-aside strong{font-size:24px}.glass-study-card{padding:20px}}
@media(max-width:760px){.glass-study-scene{grid-template-columns:minmax(0,1fr);padding:32px 24px;gap:32px}.glass-study-aside{max-width:none;padding:0}.glass-study-aside strong{font-size:22px}.glass-study-aside strong br{display:none}.glass-study-layer-notes{display:flex;flex-wrap:wrap;gap:12px 24px;margin-top:16px}.glass-study-content{grid-template-columns:136px minmax(0,1fr)}.glass-study-disc-two{left:auto;right:-60px;bottom:25%}}
@media(max-width:480px){.glass-study-heading{align-items:flex-start;gap:16px}.glass-study-heading h3{font-size:20px}.glass-study-heading p{font-size:14px}.glass-study-heading .material-mode-switch{margin-top:24px}.glass-study-scene{padding:24px 16px;border-radius:24px}.glass-study-card{padding:20px 16px}.glass-study-card-topline{gap:8px;font-size:12px}.glass-study-kicker{letter-spacing:.6px}.glass-study-content{grid-template-columns:88px minmax(0,1fr);gap:16px}.glass-study-copy h4{font-size:18px}.glass-study-copy p{font-size:14px}.glass-study-image-caption{font-size:6px;letter-spacing:1px;bottom:8px;left:8px}.glass-study-form-row{flex-wrap:wrap;gap:12px}.glass-study-form-row .glass-study-input{flex-basis:100%}.glass-study-save{width:100%}.glass-study-tab{padding-inline:12px}.glass-study-backdrop-word{font-size:96px;left:18%}}
</style>
