<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import HairlineEmptyArt from './shadcn-gallery/HairlineEmptyArt.vue'
import illustrationUrl from './shadcn-gallery/hairline/hairline-empty-tray.html?url'
import { useTheme } from '../theme-controller'

const id = useId()
const { isDark } = useTheme()
const interactiveUrl = computed(() => `${illustrationUrl}?theme=${isDark.value ? 'dark' : 'light'}`)
const records = ref<string[]>([])
const members = ref<string[]>([])
const emptyQuery = '轨道之外'
const query = ref(emptyQuery)
const components = ['纸面卡片', '触感按钮']
const matches = computed(() => components.filter(name => name.includes(query.value.trim())))

function toggleRecords() {
  records.value = records.value.length ? [] : ['纸面样本记录']
}
function toggleMembers() {
  members.value = members.value.length ? [] : ['示例成员']
}
function toggleQuery() {
  query.value = query.value ? '' : emptyQuery
}
</script>

<template>
  <div class="empty-state-showcase">
    <div class="empty-state-grid" data-milk-reveal-group>
      <article class="empty-state-example panel" :aria-labelledby="`${id}-data-title`">
        <span class="empty-state-label">DATA / 01</span>
        <div class="empty-state-body">
          <HairlineEmptyArt v-if="!records.length" />
          <ul v-else class="empty-state-list" aria-label="本地演示记录">
            <li v-for="(record, index) in records" :key="record"><span>{{ String(index + 1).padStart(2, '0') }}</span><div><strong>{{ record }}</strong><small>仅保存在当前页面</small></div></li>
          </ul>
          <div class="empty-state-copy">
            <h3 :id="`${id}-data-title`">{{ records.length ? '第一条记录，已放在此处。' : '暂无数据' }}</h3>
            <p>{{ records.length ? '这是一条本地示例，刷新页面后清空。' : '这里还没有记录。从一条数据开始，让留白有了内容。' }}</p>
          </div>
          <Button variant="outline" size="sm" type="button" @click="toggleRecords">{{ records.length ? '重置为空状态' : '添加演示记录' }}</Button>
        </div>
        <p class="empty-state-status" role="status">当前页面 · {{ records.length }} 条演示记录</p>
      </article>

      <article class="empty-state-example panel" :aria-labelledby="`${id}-users-title`">
        <span class="empty-state-label">PEOPLE / 02</span>
        <div class="empty-state-body">
          <HairlineEmptyArt v-if="!members.length" />
          <ul v-else class="empty-state-list" aria-label="本地演示成员">
            <li v-for="(member, index) in members" :key="member"><span>{{ String(index + 1).padStart(2, '0') }}</span><div><strong>{{ member }}</strong><small>本地展示用成员</small></div></li>
          </ul>
          <div class="empty-state-copy">
            <h3 :id="`${id}-users-title`">{{ members.length ? '为一位成员，留好了位置。' : '暂无用户' }}</h3>
            <p>{{ members.length ? '仅展示成员样式，没有创建账号或发送邀请。' : '名单还未写下名字。先放入一位演示成员，看看内容如何展开。' }}</p>
          </div>
          <Button variant="outline" size="sm" type="button" @click="toggleMembers">{{ members.length ? '重置为空状态' : '添加演示成员' }}</Button>
        </div>
        <p class="empty-state-status" role="status">当前页面 · {{ members.length }} 位演示成员</p>
      </article>

      <article class="empty-state-example panel" :aria-labelledby="`${id}-search-title`">
        <span class="empty-state-label">SEARCH / 03</span>
        <div class="empty-state-search">
          <label class="sr-only" :for="`${id}-search`">筛选演示构件</label>
          <Input :id="`${id}-search`" v-model="query" type="search" placeholder="筛选演示构件" autocomplete="off" />
        </div>
        <div class="empty-state-body">
          <HairlineEmptyArt v-if="!matches.length" />
          <ul v-else class="empty-state-list" aria-label="筛选后的演示构件">
            <li v-for="(name, index) in matches" :key="name"><span>{{ String(index + 1).padStart(2, '0') }}</span><div><strong>{{ name }}</strong><small>本地演示构件</small></div></li>
          </ul>
          <div class="empty-state-copy">
            <h3 :id="`${id}-search-title`">{{ matches.length ? '找到可以继续的构件。' : '没有匹配结果' }}</h3>
            <p>{{ matches.length ? '调整关键词，可以继续筛选这两项本地示例。' : '换一个关键词，或清除筛选，让已有构件重新出现。' }}</p>
          </div>
          <Button variant="outline" size="sm" type="button" @click="toggleQuery">{{ query ? '清除筛选' : '恢复空结果' }}</Button>
        </div>
        <p class="empty-state-status" role="status">{{ matches.length }} / {{ components.length }} 项演示构件</p>
      </article>
    </div>

    <div class="empty-state-footnote" data-milk-reveal>
      <p>同一只空托盘，承接不同的留白。静态线稿用于页面占位，完整交互图可单独打开。</p>
      <a :href="interactiveUrl" target="_blank" rel="noopener noreferrer">打开交互插图 ↗</a>
    </div>
  </div>
</template>

<style scoped>
.empty-state-showcase { min-width: 0; color: var(--milk-ink); }
.empty-state-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
.empty-state-example { display: flex; min-width: 0; flex-direction: column; gap: 16px; padding: 24px; border-radius: 24px; }
.empty-state-label { color: var(--milk-muted); font: 12px/1.5 'IBM Plex Sans', monospace; letter-spacing: 1.4px; }
.empty-state-body { display: flex; flex: 1; min-width: 0; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; }
.empty-state-copy { display: grid; gap: 8px; margin-bottom: 8px; }
.empty-state-copy h3 { margin: 0; font-size: 18px; line-height: 1.4; font-weight: 600; letter-spacing: -.01em; }
.empty-state-copy p { margin: 0; max-width: 28ch; color: var(--milk-muted); font-size: 14px; line-height: 1.65; }
.empty-state-status { margin: 8px 0 0; color: var(--milk-muted); font-size: 12px; line-height: 1.5; text-align: center; }
.empty-state-search { width: 100%; }
.empty-state-list { display: flex; width: 100%; min-height: 154px; flex-direction: column; justify-content: center; gap: 8px; margin: 0; padding: 0; list-style: none; text-align: left; }
.empty-state-list li { display: flex; align-items: center; gap: 16px; padding: 16px; border: var(--milk-border-width) solid transparent; border-radius: 16px; background: var(--milk-surface-recessed) padding-box, var(--milk-border-gradient) border-box; box-shadow: var(--milk-pressed); }
.empty-state-list li > span { color: var(--milk-muted); font: 12px/1.5 'IBM Plex Sans', monospace; }
.empty-state-list li > div { display: grid; min-width: 0; gap: 4px; }
.empty-state-list strong { font-size: 14px; line-height: 1.5; font-weight: 500; overflow-wrap: anywhere; }
.empty-state-list small { color: var(--milk-muted); font-size: 12px; line-height: 1.5; }
.empty-state-footnote { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-top: 24px; font-size: 13px; line-height: 1.5; }
.empty-state-footnote p { max-width: 62ch; margin: 0; color: var(--milk-muted); }
.empty-state-footnote a { flex-shrink: 0; text-decoration: underline; text-underline-offset: 4px; }
@media (max-width: 1000px) { .empty-state-grid { grid-template-columns: minmax(0, 1fr); } .empty-state-copy p { max-width: 36ch; } }
</style>
