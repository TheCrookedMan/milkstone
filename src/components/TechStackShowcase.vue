<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

type Technology = { name: string; version: string; role: string; kind?: string }
type TechnologyGroup = {
  id: string; label: string; index: string; summary: string; items: Technology[]
}
const props = defineProps<{
  version: string
  groups: TechnologyGroup[]
  choices: Array<{ name: string; note: string }>
  capabilities: Array<{ index: string; title: string; description: string; href: string }>
  commands: Array<{ label: string; command: string }>
  stats: Array<{ value: string; label: string }>
}>()
const selectedGroup = ref('all')
const visibleGroups = computed(() => selectedGroup.value === 'all'
  ? props.groups : props.groups.filter(group => group.id === selectedGroup.value))
const visibleCount = computed(() => visibleGroups.value.reduce((sum, group) => sum + group.items.length, 0))
</script>

<template>
  <div class="stack-showcase">
    <div class="specification milk-relief milk-relief-card" data-milk-reveal>
      <div class="specification-identity">
        <span class="technical-label">MILK / DESIGN KIT</span>
        <div class="skill-name">MILK / Paper <span class="version">v{{ version }}</span></div>
        <span class="specification-caption">材质 · 交互 · 工程</span>
      </div>
      <dl class="specification-stats">
        <div v-for="stat in stats" :key="stat.label">
          <dt>{{ stat.label }}</dt>
          <dd>{{ stat.value }}</dd>
        </div>
      </dl>
    </div>

    <div class="catalog-toolbar" data-milk-reveal>
      <div class="category-filter" role="group" aria-label="筛选技术栈分类">
        <button type="button" :aria-pressed="selectedGroup === 'all'" @click="selectedGroup = 'all'">全部</button>
        <button v-for="group in groups" :key="group.id" type="button"
          :aria-pressed="selectedGroup === group.id" @click="selectedGroup = group.id">{{ group.label }}</button>
      </div>
      <p class="catalog-count" aria-live="polite">{{ visibleCount }} 项技术<span> / 构成这份触感</span></p>
    </div>

    <div class="technology-groups" data-milk-reveal-group :class="{ 'is-filtered': selectedGroup !== 'all' }">
      <article v-for="group in visibleGroups" :key="group.id" class="technology-card milk-relief milk-relief-card">
        <header class="group-heading">
          <span class="group-number" aria-hidden="true">{{ group.index }}</span>
          <div><h3>{{ group.label }}</h3><p>{{ group.summary }}</p></div>
        </header>
        <ul class="technology-list">
          <li v-for="item in group.items" :key="item.name">
            <div class="technology-title"><h4>{{ item.name }}</h4><span class="technology-version">{{ item.version }}</span></div>
            <p>{{ item.role }}</p>
            <span v-if="item.kind" class="technology-kind">{{ item.kind }}</span>
          </li>
        </ul>
        <div class="card-calibration" aria-hidden="true"><span>TOOLS / MILK</span><i></i><b>{{ group.index }}</b></div>
      </article>
    </div>

    <section v-if="choices.length" class="integration-choices milk-relief milk-relief-card" data-milk-reveal aria-labelledby="integration-title">
      <div class="section-caption"><span class="technical-label">ROOM TO GROW</span><h3 id="integration-title">按需扩展</h3></div>
      <ul><li v-for="choice in choices" :key="choice.name"><h4>{{ choice.name }}</h4><p>{{ choice.note }}</p></li></ul>
    </section>

    <section class="capability-section" aria-labelledby="capability-title">
      <div class="subsection-heading" data-milk-reveal>
        <div><span class="technical-label">EXPLORE THE COLLECTION</span><h3 id="capability-title">沿着组件，继续探索。</h3></div>
        <span class="subsection-note">选择一项，进入对应展区 <span aria-hidden="true">↗</span></span>
      </div>
      <div class="capability-grid" data-milk-reveal-group>
        <RouterLink v-for="capability in capabilities" :key="capability.index"
          :to="{ path: '/', hash: capability.href }" class="capability-link milk-relief milk-relief-card">
          <div class="capability-top"><span>{{ capability.index }}</span><span class="capability-arrow" aria-hidden="true">↗</span></div>
          <h4>{{ capability.title }}</h4><p>{{ capability.description }}</p>
        </RouterLink>
      </div>
    </section>

    <details v-if="commands.length" id="skill-guide" class="quickstart milk-relief milk-relief-card" data-milk-reveal>
      <summary><span class="quickstart-heading"><span class="technical-label">QUICK START</span><strong>启动项目与使用技能</strong></span><span class="details-indicator" aria-hidden="true">+</span></summary>
      <div class="command-list"><p class="command-note">在对应目录执行命令，即可开始预览与接入。</p><div v-for="command in commands" :key="command.label" class="command-row"><h4>{{ command.label }}</h4><pre><code>{{ command.command }}</code></pre></div></div>
    </details>
  </div>
</template>

<style scoped>
.stack-showcase { --stack-muted:var(--milk-color-5b6573); min-width:0; }
.technical-label { display:block; color:var(--milk-color-5b6573); font-size:10px; font-weight:500; letter-spacing:1.8px; line-height:1.5; text-shadow:none; }
.specification{ display:flex; align-items:center; justify-content:space-between; gap:30px; padding:28px 32px; border:var(--milk-border-width) solid transparent; border-radius:22px; background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box; box-shadow:var(--milk-card-shadow); }
.specification-identity { min-width:0; }
.skill-name { display:flex; align-items:center; flex-wrap:wrap; gap:12px; margin:5px 0 3px; font-family:Georgia, serif; font-size:31px; line-height:1.4; color:var(--milk-color-2e3540); }
.version{ padding:3px 8px; border:var(--milk-border-width) solid transparent; border-radius:6px; font-family:ui-monospace, monospace; font-size:11px; color:var(--milk-color-2e3540); box-shadow:var(--milk-button-shadow); background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;}
.specification-caption { color:var(--stack-muted); font-size:12px; }
.specification-stats { display:flex; flex-wrap:wrap; gap:27px; margin:0; }
.specification-stats div { display:flex; flex-direction:column-reverse; min-width:70px; padding-left:22px; border-left:var(--milk-border-width) solid var(--milk-edge); }
.specification-stats dt { margin-top:2px; color:var(--stack-muted); font-size:11px; }
.specification-stats dd { margin:0; color:var(--milk-color-2e3540); font-family:ui-monospace, monospace; font-size:25px; line-height:1.4; font-weight:500; }
.catalog-toolbar { display:flex; align-items:center; justify-content:space-between; gap:18px; margin:30px 0 24px; }
.category-filter { display:flex; flex-wrap:wrap; gap:9px; min-width:0; }
.category-filter button { padding:8px 16px; border-radius:10px; font-size:12px; box-shadow:var(--milk-button-shadow); }
.category-filter button[aria-pressed="true"]{ color:var(--milk-color-2e3540); background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box; border-color:transparent; box-shadow:var(--milk-pressed); }
.category-filter button:hover { transform:translateY(-1px); box-shadow:var(--milk-hover-shadow); }
.category-filter button:active { transform:translateY(1px); background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box; box-shadow:var(--milk-pressed); }
.catalog-count { flex-shrink:0; margin:0; color:var(--milk-color-2e3540); font-size:11px; }
.catalog-count span { color:var(--milk-color-5b6573); }
.technology-groups { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:24px; }
.technology-groups.is-filtered { grid-template-columns:minmax(0, 1fr); }
.is-filtered .technology-list { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); column-gap:28px; }
.technology-card{ min-width:0; padding:25px 26px 16px; border:var(--milk-border-width) solid transparent; border-radius:22px; background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box; box-shadow:var(--milk-card-shadow); }
.group-heading { display:flex; align-items:flex-start; gap:14px; margin-bottom:21px; }
.group-number{ display:grid; place-items:center; flex-shrink:0; width:37px; height:37px; border:var(--milk-border-width) solid transparent; border-radius:11px; color:var(--milk-color-5b6573); background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box; box-shadow:var(--milk-control-shadow); font-family:ui-monospace, monospace; font-size:12px; text-shadow:none; }
.group-heading h3 { margin:0 0 3px; font-size:17px; line-height:1.4; font-weight:500; }
.group-heading p { margin:0; color:var(--stack-muted); font-size:12px; }
.technology-list { padding:0; margin:0; list-style:none; }
.technology-list li { position:relative; padding:16px 0; border-top:var(--milk-border-width) solid var(--milk-edge); }
.technology-title { display:flex; justify-content:space-between; align-items:baseline; gap:12px; }
.technology-title h4 { margin:0; font-size:16px; line-height:1.5; font-weight:500; overflow-wrap:anywhere; }
.technology-version { flex-shrink:0; max-width:45%; color:var(--milk-color-5b6573); font-family:ui-monospace, monospace; font-size:11px; overflow-wrap:anywhere; text-align:right; }
.technology-list p { margin:5px 0 0; color:var(--stack-muted); font-size:12px; line-height:1.8; }
.technology-kind { display:inline-block; margin-top:7px; padding-left:8px; border-left:var(--milk-border-width) solid var(--milk-edge); color:var(--milk-color-5b6573); font-size:10px; letter-spacing:.4px; }
.card-calibration { display:flex; align-items:center; gap:12px; border-top:var(--milk-border-width) solid var(--milk-edge); padding-top:13px; color:var(--milk-color-5b6573); font-size:8px; letter-spacing:1.1px; }
.card-calibration i { flex:1; height:6px; background:repeating-linear-gradient(90deg, var(--milk-color-b4b4b4) 0 1px, transparent 1px 8px); opacity:.65; }
.card-calibration b { font-family:ui-monospace, monospace; font-weight:400; }
.integration-choices{ display:grid; grid-template-columns:minmax(180px, .7fr) minmax(0, 1.8fr); gap:35px; margin-top:28px; padding:26px 30px; border:var(--milk-border-width) solid transparent; border-radius:18px; background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box; box-shadow:var(--milk-card-shadow); }
.section-caption h3 { margin:7px 0 0; font-size:16px; font-weight:500; }
.integration-choices ul { display:grid; gap:16px; padding:0; margin:0; list-style:none; }
.integration-choices li { display:grid; grid-template-columns:minmax(110px, .6fr) minmax(0, 1.4fr); gap:16px; }
.integration-choices h4 { margin:0; font-size:13px; font-weight:500; }
.integration-choices p { margin:0; color:var(--stack-muted); font-size:12px; line-height:1.75; }
.capability-section { margin-top:38px; }
.subsection-heading { display:flex; align-items:end; justify-content:space-between; gap:20px; margin-bottom:20px; }
.subsection-heading h3 { margin:5px 0 0; font-size:22px; font-weight:500; letter-spacing:-.3px; }
.subsection-note { color:var(--stack-muted); font-size:11px; }
.subsection-note span { margin-left:7px; }
.capability-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:12px; }
.capability-link{ min-width:0; display:block; padding:18px; border:var(--milk-border-width) solid transparent; border-radius:15px; background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box; box-shadow:var(--milk-card-shadow); transition:transform 180ms, background-color 180ms; }
.capability-link:hover { transform:translateY(-1px); box-shadow:var(--milk-card-hover-shadow); }
.capability-link:active { transform:translateY(1px); box-shadow:var(--milk-pressed); }
.capability-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:15px; color:var(--milk-color-5b6573); font-family:ui-monospace, monospace; font-size:10px; }
.capability-arrow { color:var(--milk-color-2e3540); font-size:15px; }
.capability-link h4 { margin:0 0 6px; font-size:14px; font-weight:500; }
.capability-link p { margin:0; color:var(--stack-muted); font-size:11px; line-height:1.8; }
.quickstart{ margin-top:28px; border:var(--milk-border-width) solid transparent; border-radius:18px; background:var(--milk-surface-panel) padding-box,var(--milk-border-gradient) border-box; box-shadow:var(--milk-card-shadow); scroll-margin-top:24px; }
.quickstart summary { display:flex; align-items:center; justify-content:space-between; gap:18px; padding:21px 26px; cursor:pointer; list-style:none; border-radius:18px; }
.quickstart summary::-webkit-details-marker { display:none; }
.quickstart-heading strong { display:block; margin-top:4px; color:var(--milk-color-2e3540); font-size:14px; font-weight:500; }
.details-indicator{ display:grid; place-items:center; flex-shrink:0; width:27px; height:27px; border:var(--milk-border-width) solid transparent; border-radius:50%; color:var(--milk-color-5b6573); font-size:20px; line-height:1; background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;}
.quickstart[open] .details-indicator{ transform:rotate(45deg); background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;}
.command-list { padding:0 26px 26px; }
.command-note { margin:0 0 17px; color:var(--stack-muted); font-size:11px; }
.command-row + .command-row { margin-top:19px; }
.command-row h4 { margin:0 0 7px; color:var(--milk-color-2e3540); font-size:11px; font-weight:500; }
.command-row pre{ max-width:100%; margin:0; padding:13px 16px; border:var(--milk-border-width) solid transparent; border-radius:10px; background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box; box-shadow:var(--milk-control-shadow); white-space:pre-wrap; overflow-wrap:anywhere; }
.command-row code { color:var(--milk-color-2e3540); font-family:ui-monospace, monospace; font-size:11px; line-height:1.8; }
@media (max-width:900px) {
  .specification{ padding:24px; gap:24px; flex-wrap:wrap; }
  .specification-stats { gap:20px; }
  .specification-stats div:first-child { padding-left:0; border:0; }
  .integration-choices{ grid-template-columns:1fr; gap:20px; padding:24px; }
  .subsection-heading { align-items:start; flex-direction:column; gap:9px; }
}
@media (max-width:600px) {
  .specification{ padding:22px; }
  .specification-stats { width:100%; justify-content:space-between; gap:12px; border-top:var(--milk-border-width) solid var(--milk-edge); padding-top:19px; }
  .specification-stats div { min-width:0; flex:1; padding-left:12px; }
  .specification-stats dd { font-size:23px; }
  .specification-stats dt { font-size:10px; }
  .catalog-toolbar { align-items:flex-start; flex-direction:column; gap:12px; margin-top:25px; }
  .category-filter { gap:8px; }
  .category-filter button { padding:8px 13px; }
  .technology-groups { grid-template-columns:minmax(0, 1fr); gap:21px; }
  .technology-card{ padding:23px 22px 15px; }
  .integration-choices{ padding:23px 22px; }
  .integration-choices li { grid-template-columns:minmax(0, 1fr); gap:4px; }
  .integration-choices li + li { border-top:var(--milk-border-width) solid var(--milk-edge); padding-top:15px; }
  .capability-grid { grid-template-columns:repeat(2, minmax(0, 1fr)); gap:11px; }
  .capability-link{ padding:17px 15px; }
  .subsection-heading h3 { font-size:21px; }
  .quickstart summary { padding:20px 22px; }
  .command-list { padding:0 18px 22px; }
}

.category-filter button[aria-pressed="true"]{background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;color:var(--milk-color-2e3540);border-color:transparent;text-shadow:none;box-shadow:var(--milk-pressed)}
.skill-name{color:var(--milk-color-2e3540)}.technology-version{color:var(--milk-color-5b6573)}.version{color:var(--milk-color-5b6573);border-color:transparent;background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;}
.capability-link:hover{border-color:transparent}.details-indicator{color:var(--milk-color-5b6573);border-color:transparent;background:var(--milk-surface-raised) padding-box,var(--milk-border-gradient) border-box;}
.command-row pre{background:var(--milk-surface-recessed) padding-box,var(--milk-border-gradient) border-box;}.command-row code{color:var(--milk-color-5b6573)}

/* Quiet one-sided dividers share the soft white highlight. */
.specification-stats div,.technology-list li,.technology-kind,.card-calibration,.specification-stats,.integration-choices li + li{border-image:var(--milk-border-gradient) 1}
.specification-stats div,.technology-kind{border-left-width:var(--milk-border-width)}
.technology-list li,.card-calibration{border-top-width:var(--milk-border-width)}
@media(max-width:900px){.specification-stats{border-top-width:var(--milk-border-width)}.specification-stats div:first-child{border-left-width:0}}
@media(max-width:680px){.integration-choices li + li{border-top-width:var(--milk-border-width)}}
</style>
