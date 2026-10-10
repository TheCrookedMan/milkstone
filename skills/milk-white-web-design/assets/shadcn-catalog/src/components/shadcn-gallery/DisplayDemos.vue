<script setup lang="ts">
import { h, ref } from 'vue'
import { FileText, Layers, Check, Info, X, ArrowUpDown } from '@lucide/vue'
import { VisAxis, VisGroupedBar, VisXYContainer } from '@unovis/vue'
import { columnFilteringFeature, createColumnHelper, createFilteredRowModel, createPaginatedRowModel, createSortedRowModel, filterFn_includesString, FlexRender, rowPaginationFeature, rowSortingFeature, sortFn_alphanumeric, sortFn_basic, tableFeatures, useTable } from '@tanstack/vue-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from '@/components/ui/attachment'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from '@/components/ui/bubble'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { type ChartConfig, ChartContainer, ChartCrosshair, ChartTooltip, ChartTooltipContent, componentToString } from '@/components/ui/chart'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import HairlineEmptyArt from './HairlineEmptyArt.vue'
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker'
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader } from '@/components/ui/message'
import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from '@/components/ui/message-scroller'
import { Progress } from '@/components/ui/progress'
import { Questionnaire, QuestionnaireActions, QuestionnaireChoice, QuestionnaireChoices, QuestionnaireDescription, QuestionnaireError, QuestionnaireItem, QuestionnaireNext, QuestionnairePrevious, QuestionnaireProgress, QuestionnaireSubmit, QuestionnaireTitle } from '@/components/ui/questionnaire'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'

defineProps<{ name: string }>()

const alertVisible = ref(true)
const attachmentVisible = ref(true)
const cardSaved = ref(false)
const collapsedOpen = ref(false)
const emptyRecords = ref<string[]>([])
const itemPinned = ref(false)
const bubbleLiked = ref(false)
const progress = ref(64)
const showSkeleton = ref(true)
const spinnerRunning = ref(true)
const questionnaireResult = ref('')
const questionnaireItems = [
  { name: 'purpose', required: true, choices: [{ value: '组件库' }, { value: '工作流' }] },
  { name: 'density', required: true, choices: [{ value: '紧凑' }, { value: '舒适' }] },
]
const chatMessages = ref([
  { id: 1, text: '欢迎来到 MILK 纸面工作台。' },
  { id: 2, text: '把材质、图层与想法放在同一张纸上。' },
  { id: 3, text: '轻按“添加消息”，补充一条设计记录。' },
  { id: 4, text: '向上翻阅，用箭头回到最新记录。' },
])
const aspectRatio = ref(16 / 9)
const portrait = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"%3E%3Crect width="80" height="80" fill="%23eeeeee"/%3E%3Ccircle cx="40" cy="29" r="13" fill="%23999999"/%3E%3Cpath d="M13 80c0-24 12-34 27-34s27 10 27 34" fill="%23bbbbbb"/%3E%3C/svg%3E'

const chartData = [
  { month: 1, components: 32, workflows: 18 },
  { month: 2, components: 48, workflows: 26 },
  { month: 3, components: 39, workflows: 31 },
  { month: 4, components: 64, workflows: 36 },
  { month: 5, components: 56, workflows: 42 },
  { month: 6, components: 72, workflows: 49 },
]
type ChartDatum = (typeof chartData)[number]
// Data colors follow the theme; portrait and landscape pixels retain their original lighting.
const chartConfig = {
  components: { label: '组件', color: 'var(--milk-color-6b7c93)' },
  workflows: { label: '工作流', color: 'var(--milk-color-b0b0b0)' },
} satisfies ChartConfig
const chartTooltip = componentToString(chartConfig, ChartTooltipContent, {
  labelFormatter: (value: number | Date) => `${Number(value)} 月`,
  class: 'paper-chart-tooltip',
})

interface AssetRow { name: string; category: string; uses: number }
const assetRows: AssetRow[] = [
  { name: '触感按钮', category: '基础', uses: 128 },
  { name: '轨道星空', category: '可视化', uses: 86 },
  { name: '神经网络', category: '可视化', uses: 73 },
  { name: '园区雷达', category: '场景', uses: 64 },
  { name: '工作流画布', category: '编辑器', uses: 52 },
  { name: '刻度旋钮', category: '控制', uses: 48 },
  { name: '数据图表', category: '可视化', uses: 92 },
  { name: '纸面卡片', category: '布局', uses: 106 },
]
const features = tableFeatures({
  columnFilteringFeature, rowPaginationFeature, rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
})
const columnHelper = createColumnHelper<typeof features, AssetRow>()
const columns = columnHelper.columns([
  columnHelper.accessor('name', { header: '组件名称', filterFn: 'includesString', sortFn: 'alphanumeric' }),
  columnHelper.accessor('category', { header: '分类', sortFn: 'alphanumeric' }),
  columnHelper.accessor('uses', {
    header: ({ column }) => h(Button, { variant: 'ghost', size: 'sm', onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'), 'aria-label': '按使用次数排序' }, () => ['使用次数', h(ArrowUpDown, { class: 'size-3' })]),
    sortFn: 'basic',
  }),
])
const assetTable = useTable({ features, data: assetRows, columns, initialState: { pagination: { pageIndex: 0, pageSize: 4 } } })

function appendMessage() {
  const id = (chatMessages.value.at(-1)?.id ?? 0) + 1
  chatMessages.value.push({ id, text: `记录 ${id}：为组件留一点光，为内容留一点空间。` })
}

function submitQuestionnaire(event: Event) {
  const form = event.target as HTMLFormElement
  const data = new FormData(form)
  questionnaireResult.value = `已记录：${data.get('purpose')} · ${data.get('density')}`
}
</script>

<template>
  <Accordion v-if="name === 'accordion'" type="single" collapsible class="w-full" default-value="style">
    <AccordionItem value="style"><AccordionTrigger>纸面上的厚度从哪里来？</AccordionTrigger><AccordionContent>光从左上落下，卡片微微浮起，输入框向内收拢。明暗切换时，这份凹凸关系始终保留。</AccordionContent></AccordionItem>
    <AccordionItem value="keyboard"><AccordionTrigger>支持键盘操作吗？</AccordionTrigger><AccordionContent>支持 Tab 聚焦、方向键与 Enter / Space 操作。</AccordionContent></AccordionItem>
  </Accordion>

  <div v-else-if="name === 'alert'" class="demo-stack">
    <Alert v-if="alertVisible"><Info /><AlertTitle>纸面样本已就绪</AlertTitle><AlertDescription>从卡片、输入到按钮，试着比较不同表面的深浅与按压反馈。</AlertDescription></Alert>
    <Button variant="outline" size="sm" @click="alertVisible = !alertVisible">{{ alertVisible ? '隐藏提示' : '恢复提示' }}</Button>
  </div>

  <div v-else-if="name === 'aspect-ratio'" class="demo-stack">
    <AspectRatio :ratio="aspectRatio" class="landscape-frame">
      <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="灰阶山峦与圆日插画" class="landscape-svg">
        <rect width="320" height="180" fill="#f6f6f6" /><circle cx="247" cy="45" r="20" fill="#dedede" />
        <path d="M0 139L76 58L170 160L238 98L320 157V180H0Z" fill="#e7e7e7" /><path d="M0 161L116 92L212 163L278 134L320 160V180H0Z" fill="#d1d1d1" /><path d="M0 181Q89 129 170 169T320 165V180Z" fill="#b8b8b8" />
      </svg>
    </AspectRatio>
    <div class="demo-row"><Button size="sm" :variant="aspectRatio === 16 / 9 ? 'default' : 'outline'" @click="aspectRatio = 16 / 9">16:9</Button><Button size="sm" :variant="aspectRatio === 4 / 3 ? 'default' : 'outline'" @click="aspectRatio = 4 / 3">4:3</Button></div>
  </div>

  <div v-else-if="name === 'attachment'" class="demo-stack">
    <Attachment v-if="attachmentVisible" state="done" class="w-full">
      <AttachmentMedia><FileText /></AttachmentMedia>
      <AttachmentContent><AttachmentTitle>MILK-材质手册.pdf</AttachmentTitle><AttachmentDescription>PDF · 2.4 MB · 已就绪</AttachmentDescription></AttachmentContent>
      <AttachmentActions><AttachmentAction aria-label="移除演示附件" @click="attachmentVisible = false"><X /></AttachmentAction></AttachmentActions>
    </Attachment>
    <Button v-else variant="outline" @click="attachmentVisible = true">恢复演示附件</Button>
    <p class="demo-caption">附件样式预览 · 演示文件</p>
  </div>

  <div v-else-if="name === 'avatar'" class="demo-row avatar-row">
    <Avatar class="size-12"><AvatarImage :src="portrait" alt="灰阶人物头像" /><AvatarFallback>MK</AvatarFallback></Avatar>
    <Avatar class="size-10"><AvatarFallback>林</AvatarFallback></Avatar>
    <Avatar class="size-8"><AvatarFallback>WX</AvatarFallback></Avatar>
    <span class="demo-caption">头像图像与姓名缩写</span>
  </div>

  <div v-else-if="name === 'badge'" class="demo-stack">
    <div class="demo-row"><Badge>已发布</Badge><Badge variant="secondary">草稿</Badge><Badge variant="outline">审核中</Badge></div>
    <div class="demo-row"><Badge variant="outline"><Check class="size-3" />已同步</Badge><Badge variant="destructive">待修复</Badge></div>
  </div>

  <BubbleGroup v-else-if="name === 'bubble'" class="w-full pb-3">
    <Bubble variant="secondary"><BubbleContent>这里的卡片，像叠起的一张纸。</BubbleContent></Bubble>
    <Bubble align="end"><BubbleContent>轻轻按下，感受一点分量。</BubbleContent><BubbleReactions><button type="button" class="reaction-button" :aria-pressed="bubbleLiked" @click="bubbleLiked = !bubbleLiked"><Check class="size-3" />{{ bubbleLiked ? 2 : 1 }}</button></BubbleReactions></Bubble>
  </BubbleGroup>

  <Card v-else-if="name === 'card'" class="w-full">
    <CardHeader><CardTitle>纸面样本</CardTitle><CardDescription>冷灰纸面 · MILK / 01</CardDescription></CardHeader>
    <CardContent><p class="card-copy">一束微光落在边缘，让卡片浮出纸面，也让内容有了安放的位置。</p></CardContent>
    <CardFooter><Button size="sm" :variant="cardSaved ? 'outline' : 'default'" :aria-pressed="cardSaved" @click="cardSaved = !cardSaved">{{ cardSaved ? '已加入收藏' : '收藏此方案' }}</Button></CardFooter>
  </Card>

  <Carousel v-else-if="name === 'carousel'" class="w-full" :opts="{ align: 'start' }">
    <CarouselContent>
      <CarouselItem v-for="(title, index) in ['纸面基底', '凹槽表面', '浮起亮面']" :key="title">
        <div class="carousel-surface" :data-tone="index"><span class="demo-caption">MATERIAL / 0{{ index + 1 }}</span><strong>{{ title }}</strong><span class="carousel-disc" aria-hidden="true" /></div>
      </CarouselItem>
    </CarouselContent>
    <div class="carousel-controls"><CarouselPrevious style="position: static; transform: none;" aria-label="上一张" /><span class="demo-caption">滑动或切换材质</span><CarouselNext style="position: static; transform: none;" aria-label="下一张" /></div>
  </Carousel>

  <div v-else-if="name === 'chart'" class="demo-stack w-full">
    <div class="demo-row chart-key"><span><i style="background: var(--milk-color-6b7c93)" />组件</span><span><i style="background: var(--milk-color-b0b0b0)" />工作流</span><span class="demo-caption">复用记录 · 示例数据</span></div>
    <ChartContainer :config="chartConfig" class="h-[230px] w-full" cursor aria-label="一至六月组件和工作流复用次数的柱状图">
      <VisXYContainer :data="chartData" :margin="{ top: 10, right: 8, bottom: 0, left: 0 }">
        <VisGroupedBar :x="(datum: ChartDatum) => datum.month" :y="[(datum: ChartDatum) => datum.components, (datum: ChartDatum) => datum.workflows]" :color="[chartConfig.components.color, chartConfig.workflows.color]" :rounded-corners="3" :bar-padding="0.14" />
        <VisAxis type="x" :x="(datum: ChartDatum) => datum.month" :tick-values="chartData.map(datum => datum.month)" :tick-format="(value: number) => `${value}月`" :tick-line="false" :domain-line="false" :grid-line="false" />
        <VisAxis type="y" :num-ticks="3" :tick-line="false" :domain-line="false" :grid-line="true" />
        <ChartTooltip />
        <ChartCrosshair :y="[(datum: ChartDatum) => datum.components, (datum: ChartDatum) => datum.workflows]" :template="chartTooltip" :color="[chartConfig.components.color, chartConfig.workflows.color]" />
      </VisXYContainer>
    </ChartContainer>
    <p class="demo-caption">悬停查看数值 · Unovis × shadcn-vue</p>
  </div>

  <Collapsible v-else-if="name === 'collapsible'" v-model:open="collapsedOpen" class="w-full demo-stack">
    <div class="demo-row justify-between"><strong class="text-sm">项目资源</strong><CollapsibleTrigger as-child><Button variant="outline" size="sm">{{ collapsedOpen ? '收起' : '展开' }}</Button></CollapsibleTrigger></div>
    <div class="resource-row"><FileText class="size-4" />design-tokens.css</div>
    <CollapsibleContent class="demo-stack"><div class="resource-row"><FileText class="size-4" />components.json</div><div class="resource-row"><FileText class="size-4" />theme.config.ts</div></CollapsibleContent>
  </Collapsible>

  <div v-else-if="name === 'data-table'" class="demo-stack w-full">
    <Input aria-label="按组件名称筛选" placeholder="筛选组件名称…" :model-value="assetTable.getColumn('name')?.getFilterValue() as string" @update:model-value="assetTable.getColumn('name')?.setFilterValue($event)" />
    <div class="data-table-frame">
      <Table>
        <TableHeader><TableRow v-for="group in assetTable.getHeaderGroups()" :key="group.id"><TableHead v-for="header in group.headers" :key="header.id" :aria-sort="header.column.getIsSorted() === 'asc' ? 'ascending' : header.column.getIsSorted() === 'desc' ? 'descending' : undefined"><FlexRender v-if="!header.isPlaceholder" :header="header" /></TableHead></TableRow></TableHeader>
        <TableBody>
          <TableRow v-for="row in assetTable.getRowModel().rows" :key="row.id"><TableCell v-for="cell in row.getAllCells()" :key="cell.id"><FlexRender :cell="cell" /></TableCell></TableRow>
          <TableRow v-if="!assetTable.getRowModel().rows.length"><TableCell :colspan="columns.length" class="text-center">没有匹配的组件。</TableCell></TableRow>
        </TableBody>
      </Table>
    </div>
    <div class="demo-row justify-between"><span class="demo-caption" aria-live="polite">{{ assetTable.getFilteredRowModel().rows.length }} 项 · 第 {{ assetTable.atoms.pagination.get().pageIndex + 1 }} 页</span><div class="demo-row"><Button variant="outline" size="sm" :disabled="!assetTable.getCanPreviousPage()" @click="assetTable.previousPage()">上页</Button><Button variant="outline" size="sm" :disabled="!assetTable.getCanNextPage()" @click="assetTable.nextPage()">下页</Button></div></div>
  </div>

  <Empty v-else-if="name === 'empty'" class="p-5">
    <EmptyHeader>
      <EmptyMedia><HairlineEmptyArt v-if="!emptyRecords.length" /><Check v-else class="size-6" aria-hidden="true" /></EmptyMedia>
      <EmptyTitle>{{ emptyRecords.length ? '第一条记录，已放在此处。' : '暂无数据' }}</EmptyTitle>
      <EmptyDescription>{{ emptyRecords.length ? '这条演示记录仅保存在当前页面。' : '这里还没有记录。放入第一条数据，让留白有了内容。' }}</EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <ul v-if="emptyRecords.length" class="empty-demo-records" aria-label="演示记录"><li v-for="record in emptyRecords" :key="record">{{ record }}</li></ul>
      <Button size="sm" variant="outline" type="button" @click="emptyRecords = emptyRecords.length ? [] : ['纸面样本记录']">{{ emptyRecords.length ? '重置为空状态' : '添加演示记录' }}</Button>
      <p class="demo-caption" role="status">{{ emptyRecords.length }} 条演示记录 · Hairline 静态占位图</p>
    </EmptyContent>
  </Empty>

  <Item v-else-if="name === 'item'" variant="outline" size="sm" class="w-full">
    <ItemMedia variant="icon"><Layers /></ItemMedia><ItemContent><ItemTitle>材质样本集</ItemTitle><ItemDescription>{{ itemPinned ? '已固定在当前工作空间' : '纸面、微光与可复用构件' }}</ItemDescription></ItemContent><ItemActions><Button variant="outline" size="sm" :aria-pressed="itemPinned" @click="itemPinned = !itemPinned">{{ itemPinned ? '已固定' : '固定' }}</Button></ItemActions>
  </Item>

  <div v-else-if="name === 'kbd'" class="demo-stack">
    <div class="demo-row"><span class="shortcut-label">快速搜索</span><KbdGroup><Kbd>⌘</Kbd><Kbd>K</Kbd></KbdGroup></div>
    <div class="demo-row"><span class="shortcut-label">切换焦点</span><Kbd>Tab</Kbd><span class="shortcut-label">关闭浮层</span><Kbd>Esc</Kbd></div>
    <p class="demo-caption">快捷键标签与组合键排版。</p>
  </div>

  <div v-else-if="name === 'marker'" class="demo-stack w-full">
    <Marker variant="separator"><MarkerContent>今天 · 10:24</MarkerContent></Marker>
    <p class="demo-caption">纸面样本已更新。</p>
    <Marker variant="border"><MarkerIcon><Check /></MarkerIcon><MarkerContent>以下为未读消息</MarkerContent></Marker>
  </div>

  <MessageGroup v-else-if="name === 'message'" class="w-full">
    <Message><MessageAvatar class="size-8">M</MessageAvatar><MessageContent><MessageHeader>设计助手</MessageHeader><Bubble variant="secondary"><BubbleContent>这张纸面，留出了光与层次。</BubbleContent></Bubble><MessageFooter>10:24 · 已送达</MessageFooter></MessageContent></Message>
    <Message align="end"><MessageContent><Bubble><BubbleContent>再调一点间距，让内容舒展。</BubbleContent></Bubble><MessageFooter>10:25 · 已读</MessageFooter></MessageContent></Message>
  </MessageGroup>

  <div v-else-if="name === 'message-scroller'" class="demo-stack w-full">
    <MessageScrollerProvider default-scroll-position="end" auto-scroll>
      <MessageScroller class="message-window">
        <MessageScrollerViewport aria-label="演示消息记录"><MessageScrollerContent class="message-log"><MessageScrollerItem v-for="message in chatMessages" :key="message.id" :message-id="`demo-message-${message.id}`"><Bubble variant="secondary"><BubbleContent>{{ message.text }}</BubbleContent></Bubble></MessageScrollerItem></MessageScrollerContent></MessageScrollerViewport>
        <MessageScrollerButton direction="end" aria-label="滚动到最新消息" />
      </MessageScroller>
    </MessageScrollerProvider>
    <div class="demo-row"><Button variant="outline" size="sm" @click="appendMessage">添加消息</Button><span class="demo-caption" aria-live="polite">{{ chatMessages.length }} 条消息</span></div>
  </div>

  <div v-else-if="name === 'progress'" class="demo-stack w-full">
    <div class="demo-field">
      <div class="demo-row justify-between"><strong class="text-sm">资产准备</strong><span class="demo-caption">{{ progress }}%</span></div>
      <Progress :model-value="progress" aria-label="资产准备进度" />
    </div>
    <div class="demo-row"><Button variant="outline" size="sm" @click="progress = Math.min(100, progress + 12)">推进 12%</Button><Button variant="ghost" size="sm" @click="progress = 0">重置</Button></div>
  </div>

  <div v-else-if="name === 'questionnaire'" class="demo-stack w-full">
    <Questionnaire :items="questionnaireItems" shortcuts="numbers" class="demo-stack" @submit.prevent="submitQuestionnaire">
      <QuestionnaireProgress v-slot="{ current, total }">问题 {{ current }} / {{ total }}</QuestionnaireProgress>
      <QuestionnaireItem name="purpose" required><QuestionnaireTitle>你想先构建什么？</QuestionnaireTitle><QuestionnaireDescription>选择一个使用场景。</QuestionnaireDescription><QuestionnaireChoices class="gap-2"><QuestionnaireChoice value="组件库">组件库</QuestionnaireChoice><QuestionnaireChoice value="工作流">工作流</QuestionnaireChoice></QuestionnaireChoices><QuestionnaireError>请先选择一个场景。</QuestionnaireError></QuestionnaireItem>
      <QuestionnaireItem name="density" required><QuestionnaireTitle>你偏好哪种布局？</QuestionnaireTitle><QuestionnaireDescription>选择适合你的信息密度。</QuestionnaireDescription><QuestionnaireChoices class="gap-2"><QuestionnaireChoice value="紧凑">紧凑</QuestionnaireChoice><QuestionnaireChoice value="舒适">舒适</QuestionnaireChoice></QuestionnaireChoices><QuestionnaireError>请先选择一种布局。</QuestionnaireError></QuestionnaireItem>
      <QuestionnaireActions><QuestionnairePrevious variant="outline" size="sm">上一步</QuestionnairePrevious><QuestionnaireNext size="sm">下一步</QuestionnaireNext><QuestionnaireSubmit size="sm">完成问卷</QuestionnaireSubmit></QuestionnaireActions>
    </Questionnaire>
    <p v-if="questionnaireResult" class="demo-caption" role="status">{{ questionnaireResult }}</p>
  </div>

  <div v-else-if="name === 'resizable'" class="demo-stack w-full">
    <ResizablePanelGroup direction="horizontal" class="resize-frame">
      <ResizablePanel :default-size="40" :min-size="20"><div class="resize-pane"><Layers class="size-5" /><span>图层</span></div></ResizablePanel>
      <ResizableHandle with-handle aria-label="调整左右面板宽度" />
      <ResizablePanel :default-size="60" :min-size="25"><div class="resize-pane resize-pane-secondary"><span class="demo-caption">CANVAS</span><strong>工作画布</strong></div></ResizablePanel>
    </ResizablePanelGroup>
    <p class="demo-caption">拖动分隔条，或聚焦后使用方向键。</p>
  </div>

  <ScrollArea v-else-if="name === 'scroll-area'" class="scroll-list">
    <div class="scroll-content"><strong class="text-sm">组件索引</strong><div v-for="(item, index) in ['触感按钮', '刻度旋钮', '数据图表', '神经网络', '章鱼图', '轨道星空', '园区雷达', '工作流画布', '消息面板', '图层检查器']" :key="item" class="scroll-row"><span class="demo-caption">{{ String(index + 1).padStart(2, '0') }}</span>{{ item }}<Separator /></div></div>
  </ScrollArea>

  <div v-else-if="name === 'separator'" class="demo-stack w-full">
    <div><strong class="text-sm">MILK Design</strong><p class="demo-caption mt-1">纸上成形，触感有度。</p></div>
    <Separator />
    <div class="demo-row separator-links"><span>组件</span><Separator orientation="vertical" class="h-4" /><span>规范</span><Separator orientation="vertical" class="h-4" /><span>资产</span></div>
  </div>

  <div v-else-if="name === 'skeleton'" class="demo-stack w-full">
    <div v-if="showSkeleton" class="skeleton-preview" aria-label="内容加载骨架"><Skeleton class="size-10 shrink-0 rounded-full" /><div class="flex flex-1 flex-col gap-2"><Skeleton class="h-3 w-3/4" /><Skeleton class="h-3 w-full" /><Skeleton class="h-3 w-1/2" /></div></div>
    <div v-else class="skeleton-preview"><Avatar><AvatarFallback>MK</AvatarFallback></Avatar><div><strong class="text-sm">材质样本已就绪</strong><p class="demo-caption mt-1">16 个组件 · 已同步</p></div></div>
    <Button variant="outline" size="sm" @click="showSkeleton = !showSkeleton">{{ showSkeleton ? '显示加载结果' : '显示骨架' }}</Button>
  </div>

  <div v-else-if="name === 'spinner'" class="demo-stack">
    <div class="demo-row"><Spinner class="size-6" :style="{ animationPlayState: spinnerRunning ? 'running' : 'paused' }" :aria-label="spinnerRunning ? '正在处理' : '已暂停'" /><span class="text-sm">{{ spinnerRunning ? '正在处理组件…' : '处理已暂停' }}</span></div>
    <Button variant="outline" size="sm" @click="spinnerRunning = !spinnerRunning">{{ spinnerRunning ? '暂停动画' : '继续动画' }}</Button>
  </div>

  <Table v-else-if="name === 'table'">
    <TableCaption>组件样本 · 示例记录</TableCaption>
    <TableHeader><TableRow><TableHead>组件</TableHead><TableHead>状态</TableHead><TableHead class="text-right">版本</TableHead></TableRow></TableHeader>
    <TableBody><TableRow v-for="row in [{ name: '触感按钮', state: '已就绪', version: '1.0' }, { name: '轨道星空', state: '已就绪', version: '1.3' }, { name: '园区雷达', state: '已就绪', version: '1.4' }]" :key="row.name"><TableCell>{{ row.name }}</TableCell><TableCell>{{ row.state }}</TableCell><TableCell class="text-right font-mono">{{ row.version }}</TableCell></TableRow></TableBody>
    <TableFooter><TableRow><TableCell colspan="2">可用资产</TableCell><TableCell class="text-right">3 项</TableCell></TableRow></TableFooter>
  </Table>

  <article v-else-if="name === 'typography'" class="typography-recipe">
    <h3>纸上成形，触感有度。</h3>
    <p class="typography-lead">为文字留白，为重点留光。</p>
    <blockquote>少一点喧闹，多一点分寸。</blockquote>
    <p>字号、行距与留白，共同安排阅读的节奏。<code>design tokens</code> 让这份节奏延续到每个页面。</p>
    <ul><li>标题落在重点上</li><li>正文留在舒适的行距里</li></ul>
    <small>Typography · MILK 排版样本</small>
  </article>
</template>

<style scoped>
.empty-demo-records { margin: 0; padding: 0; list-style: none; font-size: var(--milk-ui-font-body); line-height: var(--milk-ui-leading-body); }
.landscape-frame { overflow: hidden; border: 1px solid transparent; border-radius: 10px; }
.landscape-svg { width: 100%; height: 100%; }
.avatar-row { min-height: 90px; }
.reaction-button { display: inline-flex; align-items: center; gap: var(--milk-ui-space-1); min-height: 28px; padding: var(--milk-ui-space-1) var(--milk-ui-space-2); border: 1px solid transparent; border-radius: 6px; background: var(--milk-raised); box-shadow: var(--milk-control-shadow); font-size: var(--milk-ui-font-caption); line-height: var(--milk-ui-leading-label); color: var(--foreground); }
.reaction-button[aria-pressed=true], .reaction-button:active { box-shadow: var(--milk-pressed); background: var(--milk-inset); }
.card-copy { font-size: var(--milk-ui-font-body); line-height: var(--milk-ui-leading-body); color: var(--muted-foreground); }
.carousel-surface { margin: var(--milk-ui-space-4); box-shadow:var(--milk-card-shadow); position: relative; display: flex; min-height: 160px; flex-direction: column; justify-content: center; gap: var(--milk-ui-space-2); overflow: hidden; padding: var(--milk-ui-space-6); border: 1px solid transparent; border-radius: 12px; background: var(--milk-canvas); }
.carousel-surface strong { position: relative; z-index: 1; font-size: var(--milk-ui-font-title); font-weight: var(--milk-ui-weight-medium); line-height: var(--milk-ui-leading-title); }
.carousel-surface[data-tone='1'] { background: var(--milk-inset); }
.carousel-surface[data-tone='2'] { background: var(--milk-raised); color: var(--milk-ink); }
.carousel-surface[data-tone='2'] .demo-caption { color: var(--milk-color-555555); }
.carousel-disc { position: absolute; width: 126px; height: 126px; right: -12px; bottom: -30px; border-radius: 50%; background: linear-gradient(135deg,var(--milk-raised),var(--milk-accent)); box-shadow: var(--milk-shadow); }
.carousel-controls { display: flex; align-items: center; justify-content: space-between; gap: var(--milk-ui-space-2); margin-top: var(--milk-ui-space-4); }
.chart-key > span { display: inline-flex; align-items: center; gap: var(--milk-ui-space-2); font-size: var(--milk-ui-font-caption); line-height: var(--milk-ui-leading-label); }
.chart-key i { width: 8px; height: 8px; border-radius: 2px; }
.resource-row { display: flex; align-items: center; gap: var(--milk-ui-space-2); min-height: 40px; min-width: 0; border: 1px solid transparent; border-radius: 8px; padding: var(--milk-ui-space-2) var(--milk-ui-space-3); background: var(--muted); box-shadow: var(--milk-control-shadow); font-family: monospace; font-size: var(--milk-ui-font-caption); line-height: var(--milk-ui-leading-label); overflow-wrap: anywhere; }
.data-table-frame { overflow: hidden; border: 1px solid transparent; border-radius: 10px; box-shadow: var(--milk-pressed); }
.shortcut-label { color: var(--muted-foreground); font-size: var(--milk-ui-font-label); line-height: var(--milk-ui-leading-label); }
.message-window { height: 190px; border: 1px solid transparent; border-radius: 10px; background: var(--background); box-shadow: var(--milk-pressed); }
.message-log { gap: var(--milk-ui-space-3); padding: var(--milk-ui-space-4); }
.resize-frame { height: 162px; overflow: hidden; border: 1px solid transparent; border-radius: 10px; box-shadow: var(--milk-shadow); }
.resize-pane { display: flex; height: 100%; align-items: center; justify-content: center; flex-direction: column; gap: var(--milk-ui-space-3); padding: var(--milk-ui-space-3); font-size: var(--milk-ui-font-body); line-height: var(--milk-ui-leading-body); background: var(--muted); }
.resize-pane-secondary { background: var(--background); }
.scroll-list { height: 200px; width: 100%; border: 1px solid transparent; border-radius: 10px; box-shadow: var(--milk-pressed); }
.scroll-content { padding: var(--milk-ui-space-4); }
.scroll-row { display: flex; flex-wrap: wrap; align-items: center; column-gap: var(--milk-ui-space-3); row-gap: var(--milk-ui-space-3); padding-top: var(--milk-ui-space-3); font-size: var(--milk-ui-font-body); line-height: var(--milk-ui-leading-body); }
.scroll-row [data-slot='separator'] { width: 100%; }
.separator-links { min-height: 24px; font-size: var(--milk-ui-font-label); line-height: var(--milk-ui-leading-label); }
.skeleton-preview { display: flex; align-items: center; gap: var(--milk-ui-space-3); width: 100%; min-height: 80px; }
.typography-recipe { width: 100%; }
.typography-recipe h3 { font-size: var(--milk-ui-font-title); font-weight: var(--milk-ui-weight-semibold); letter-spacing: -0.02em; line-height: var(--milk-ui-leading-title); }
.typography-recipe p { margin-top: var(--milk-ui-space-3); font-size: var(--milk-ui-font-body); line-height: var(--milk-ui-leading-body); }
.typography-recipe .typography-lead { font-size: var(--milk-ui-font-subtitle); color: var(--muted-foreground); }
.typography-recipe blockquote { border-left: 2px solid var(--border); margin-top: var(--milk-ui-space-4); padding-left: var(--milk-ui-space-3); font-size: var(--milk-ui-font-body); line-height: var(--milk-ui-leading-body); font-style: italic; }
.typography-recipe code { border-radius: 4px; padding: 2px var(--milk-ui-space-1); background: var(--muted); font-family: monospace; font-size: var(--milk-ui-font-label); }
.typography-recipe ul { list-style: disc; padding-left: var(--milk-ui-space-6); margin-top: var(--milk-ui-space-3); font-size: var(--milk-ui-font-body); line-height: var(--milk-ui-leading-body); }
.typography-recipe small { display: block; margin-top: var(--milk-ui-space-4); font-size: var(--milk-ui-font-caption); line-height: var(--milk-ui-leading-label); color: var(--muted-foreground); }
</style>
