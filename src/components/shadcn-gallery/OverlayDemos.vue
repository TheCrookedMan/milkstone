<script setup lang="ts">
import { ref, useId } from 'vue'
import { toast as sonnerToast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarTrigger } from '@/components/ui/menubar'
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from '@/components/ui/navigation-menu'
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from '@/components/ui/sidebar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Toaster as LegacyToaster, useToast } from '@/components/ui/toast'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { Stepper, StepperIndicator, StepperItem, StepperSeparator, StepperTitle, StepperTrigger } from '@/components/ui/stepper'

defineProps<{ name: string }>()

const inputId = useId()
const message = ref('操作后，在这里查看演示反馈')
const breadcrumb = ref('组件')
const draftName = ref('MILK · 纸面组件集')
const savedName = ref('MILK · 纸面组件集')
const dailyGoal = ref(8)
const page = ref(1)
const density = ref('舒适')
const sidebarPage = ref('概览')
const selectedTab = ref('overview')
const step = ref(1)
const steps = [{ title: '选材', detail: '从样本中挑选一个构件。' }, { title: '调校', detail: '调整尺寸、间距与材质。' }, { title: '成形', detail: '回到画布，检查整体层次。' }]
const { toast } = useToast()

function saveName() {
  savedName.value = draftName.value.trim() || '未命名方案'
  message.value = `已保存：${savedName.value}`
}
</script>

<template>
  <div v-if="name === 'alert-dialog'" class="demo-stack">
    <AlertDialog>
      <AlertDialogTrigger as-child><Button variant="outline">重置演示设置</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>恢复默认设置？</AlertDialogTitle>
          <AlertDialogDescription>确认后，卡片中会显示重置反馈；选择取消可保留当前反馈。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="message = '演示设置已恢复默认'">确认重置</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <p class="demo-caption" aria-live="polite">{{ message }}</p>
  </div>

  <div v-else-if="name === 'breadcrumb'" class="demo-stack">
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem><BreadcrumbLink as-child><button type="button" @click="breadcrumb = '工作台'">工作台</button></BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbLink as-child><button type="button" @click="breadcrumb = '设计系统'">设计系统</button></BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbPage>{{ breadcrumb }}</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
    <p class="demo-caption">点击前级路径，切换本地层级。</p>
  </div>

  <div v-else-if="name === 'context-menu'" class="demo-stack">
    <ContextMenu>
      <ContextMenuTrigger class="context-surface" tabindex="0" aria-label="演示画布，右键或长按打开菜单">
        <span class="surface-crosshair" aria-hidden="true">＋</span>
        <strong>在此右键 / 长按</strong>
        <span>画布快捷操作</span>
      </ContextMenuTrigger>
      <ContextMenuContent class="w-48">
        <ContextMenuLabel>画布操作</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem @select="message = '演示：已复制当前图层'">复制图层</ContextMenuItem>
        <ContextMenuItem @select="message = '演示：图层已居中对齐'">居中对齐</ContextMenuItem>
        <ContextMenuItem @select="message = '演示：已恢复画布比例'">恢复比例</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
    <p class="demo-caption" aria-live="polite">{{ message }}</p>
  </div>

  <div v-else-if="name === 'dialog'" class="demo-stack">
    <Dialog>
      <DialogTrigger as-child><Button variant="outline">编辑项目名称</Button></DialogTrigger>
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>项目设置</DialogTitle>
          <DialogDescription>修改演示项目的名称，保存后结果显示在卡片中。</DialogDescription>
        </DialogHeader>
        <div class="demo-field">
          <Label :for="`${inputId}-project`">项目名称</Label>
          <Input :id="`${inputId}-project`" v-model="draftName" maxlength="40" />
        </div>
        <DialogFooter>
          <DialogClose as-child><Button variant="outline">取消</Button></DialogClose>
          <DialogClose as-child><Button @click="saveName">保存名称</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <p class="demo-caption" aria-live="polite">{{ savedName }}</p>
  </div>

  <div v-else-if="name === 'drawer'" class="demo-stack">
    <Drawer>
      <DrawerTrigger as-child><Button variant="outline">打开底部抽屉</Button></DrawerTrigger>
      <DrawerContent>
        <div class="drawer-inner">
          <DrawerHeader>
            <DrawerTitle>每日设计目标</DrawerTitle>
            <DrawerDescription>为今天设置要完成的组件数量。</DrawerDescription>
          </DrawerHeader>
          <div class="goal-control">
            <Button variant="outline" size="icon" aria-label="减少目标" :disabled="dailyGoal <= 1" @click="dailyGoal--">−</Button>
            <div><strong>{{ dailyGoal }}</strong><span>个组件 / 天</span></div>
            <Button variant="outline" size="icon" aria-label="增加目标" :disabled="dailyGoal >= 20" @click="dailyGoal++">＋</Button>
          </div>
          <DrawerFooter>
            <DrawerClose as-child><Button @click="message = `今日目标：${dailyGoal} 个组件`">保存目标</Button></DrawerClose>
            <DrawerClose as-child><Button variant="outline">关闭</Button></DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
    <p class="demo-caption" aria-live="polite">{{ message }}</p>
  </div>

  <div v-else-if="name === 'dropdown-menu'" class="demo-stack">
    <DropdownMenu>
      <DropdownMenuTrigger as-child><Button variant="outline">项目操作 <span aria-hidden="true">⌄</span></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-48">
        <DropdownMenuLabel>MILK · 纸面组件集</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="message = '演示：已创建方案副本'">新建副本</DropdownMenuItem>
        <DropdownMenuItem @select="message = '演示：方案已加入收藏'">加入收藏</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="message = '演示设置已恢复'">恢复设置</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <p class="demo-caption" aria-live="polite">{{ message }}</p>
  </div>

  <div v-else-if="name === 'hover-card'" class="demo-stack">
    <HoverCard :open-delay="200" :close-delay="150">
      <HoverCardTrigger as-child><Button variant="link">@设计系统</Button></HoverCardTrigger>
      <HoverCardContent align="start" class="w-64">
        <div class="hover-profile"><span class="profile-monogram" aria-hidden="true">M</span><div><strong>MILK Design</strong><p>以纸为底，以光成形。恰到好处的界面触感。</p></div></div>
        <p class="demo-caption">Vue 3 · shadcn-vue · Reka UI</p>
      </HoverCardContent>
    </HoverCard>
    <p class="demo-caption">悬停或聚焦名称，查看资料卡。</p>
  </div>

  <div v-else-if="name === 'menubar'" class="demo-stack">
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>文件</MenubarTrigger>
        <MenubarContent>
          <MenubarItem @select="message = '演示：已新建画布'">新建画布<MenubarShortcut>⌘N</MenubarShortcut></MenubarItem>
          <MenubarItem @select="message = '演示：画布已保存'">保存演示<MenubarShortcut>⌘S</MenubarShortcut></MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>编辑</MenubarTrigger>
        <MenubarContent>
          <MenubarItem @select="message = '演示：已撤销上一步'">撤销</MenubarItem>
          <MenubarSeparator />
          <MenubarItem @select="message = '演示：已选中全部图层'">选择全部</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>视图</MenubarTrigger>
        <MenubarContent>
          <MenubarItem @select="message = '演示：视图为 100%'">实际大小</MenubarItem>
          <MenubarItem @select="message = '演示：网格已显示'">显示网格</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
    <p class="demo-caption" aria-live="polite">{{ message }}</p>
  </div>

  <div v-else-if="name === 'navigation-menu'" class="demo-stack">
    <NavigationMenu :viewport="false">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>组件</NavigationMenuTrigger>
          <NavigationMenuContent class="w-56 p-2">
            <NavigationMenuLink as-child><button type="button" class="navigation-option" @click="message = '已选择：基础组件'">基础组件<small>按钮、输入与反馈</small></button></NavigationMenuLink>
            <NavigationMenuLink as-child><button type="button" class="navigation-option" @click="message = '已选择：空间可视化'">空间可视化<small>星空、园区与关系图</small></button></NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink as-child><button type="button" @click="message = '已选择：设计规范'">设计规范</button></NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
    <p class="demo-caption" aria-live="polite">{{ message }}</p>
  </div>

  <div v-else-if="name === 'pagination'" class="demo-stack">
    <Pagination v-model:page="page" :total="40" :items-per-page="10" :sibling-count="0">
      <PaginationContent>
        <PaginationPrevious size="icon" aria-label="上一页">‹</PaginationPrevious>
        <PaginationItem v-for="number in 4" :key="number" :value="number" :is-active="number === page" :aria-label="`第 ${number} 页`">{{ number }}</PaginationItem>
        <PaginationNext size="icon" aria-label="下一页">›</PaginationNext>
      </PaginationContent>
    </Pagination>
    <p class="demo-caption" aria-live="polite">第 {{ page }} / 4 页 · 第 {{ (page - 1) * 10 + 1 }}–{{ page * 10 }} 项</p>
  </div>

  <div v-else-if="name === 'popover'" class="demo-stack">
    <Popover>
      <PopoverTrigger as-child><Button variant="outline">显示设置</Button></PopoverTrigger>
      <PopoverContent align="start" class="w-64">
        <div class="demo-stack">
          <strong>面板密度</strong>
          <p class="demo-caption">选择一个密度选项，体验设置反馈。</p>
          <div class="demo-row">
            <Button v-for="item in ['紧凑', '舒适']" :key="item" :variant="density === item ? 'default' : 'outline'" size="sm" :aria-pressed="density === item" @click="density = item">{{ item }}</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
    <p class="demo-caption" aria-live="polite">密度选项：{{ density }}</p>
  </div>

  <div v-else-if="name === 'sheet'" class="demo-stack">
    <Sheet>
      <SheetTrigger as-child><Button variant="outline">打开侧边面板</Button></SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>图层检查器</SheetTitle>
          <SheetDescription>当前演示项目的图层结构与本地状态。</SheetDescription>
        </SheetHeader>
        <div class="sheet-layers demo-stack">
          <button v-for="layer in ['纸面基底', '刻度网格', '触感按钮']" :key="layer" type="button" :class="['layer-option', { 'is-selected': message === `已选中：${layer}` }]" @click="message = `已选中：${layer}`"><span aria-hidden="true">◇</span>{{ layer }}</button>
          <p class="demo-caption" aria-live="polite">{{ message }}</p>
        </div>
        <SheetFooter><SheetClose as-child><Button>完成检查</Button></SheetClose></SheetFooter>
      </SheetContent>
    </Sheet>
    <p class="demo-caption" aria-live="polite">{{ message }}</p>
  </div>

  <div v-else-if="name === 'sidebar'" class="demo-stack">
    <SidebarProvider class="contained-sidebar" style="--sidebar-width: 116px; min-height: 0; height: 210px;">
      <Sidebar collapsible="none" class="contained-sidebar-panel">
        <SidebarHeader><strong class="sidebar-mark">MILK</strong></SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>工作空间</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem v-for="item in ['概览', '组件', '资产']" :key="item">
                  <SidebarMenuButton :is-active="sidebarPage === item" @click="sidebarPage = item"><span>{{ item }}</span></SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter><span class="demo-caption">本地工作台</span></SidebarFooter>
      </Sidebar>
      <div class="sidebar-preview"><span class="demo-caption">WORKSPACE</span><strong>{{ sidebarPage }}</strong><div class="preview-lines" aria-hidden="true"><i /><i /><i /></div></div>
    </SidebarProvider>
  </div>

  <Tabs v-else-if="name === 'tabs'" v-model="selectedTab" class="w-full">
    <TabsList class="w-full">
      <TabsTrigger value="overview" class="flex-1">概览</TabsTrigger>
      <TabsTrigger value="parameters" class="flex-1">参数</TabsTrigger>
      <TabsTrigger value="history" class="flex-1">历史</TabsTrigger>
    </TabsList>
    <TabsContent value="overview" class="tab-surface"><strong>纸面组件集</strong><p>纸上成形，触感有度。</p></TabsContent>
    <TabsContent value="parameters" class="tab-surface"><strong>材质调校</strong><p>标签浮起，槽位内收。轻按有分量，松开渐缓回位。</p></TabsContent>
    <TabsContent value="history" class="tab-surface"><strong>调校记录</strong><p>微调按压阻尼，让每次操作都有恰到好处的回应。</p></TabsContent>
  </Tabs>

  <div v-else-if="name === 'tooltip'" class="demo-stack">
    <TooltipProvider :delay-duration="200">
      <Tooltip>
        <TooltipTrigger as-child><Button variant="outline">悬停查看提示 <span aria-hidden="true">ⓘ</span></Button></TooltipTrigger>
        <TooltipContent side="top"><p>支持键盘聚焦与悬停预览。</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <p class="demo-caption">将辅助信息放在需要它的位置。</p>
  </div>

  <div v-else-if="name === 'toast'" class="demo-stack">
    <Button variant="outline" @click="toast({ title: '保存反馈示例', description: '这是一条操作完成后的通知样式。', duration: 4000 })">显示 Toast 通知</Button>
    <p class="demo-caption">经典通知接口 · 官方目前推荐 Sonner。</p>
    <LegacyToaster />
  </div>

  <div v-else-if="name === 'sonner'" class="demo-stack">
    <Button variant="outline" @click="sonnerToast('演示：组件已加入画布', { description: '通知样式预览，可点击撤销查看后续反馈。', duration: 4000, action: { label: '撤销', onClick: () => sonnerToast('演示：已撤销添加') } })">显示 Sonner 通知</Button>
    <p class="demo-caption">轻量堆叠通知，支持撤销操作。</p>
    <SonnerToaster position="bottom-right" close-button :rich-colors="false" />
  </div>

  <div v-else-if="name === 'stepper'" class="demo-stack">
    <Stepper v-model="step" :linear="false" class="demo-stepper">
      <StepperItem v-for="(item, index) in steps" :key="item.title" :step="index + 1" class="demo-step">
        <StepperTrigger>
          <StepperIndicator>{{ index + 1 }}</StepperIndicator>
          <StepperTitle>{{ item.title }}</StepperTitle>
        </StepperTrigger>
        <StepperSeparator v-if="index < steps.length - 1" class="step-connector" />
      </StepperItem>
    </Stepper>
    <p class="demo-caption" aria-live="polite">{{ steps[step - 1]?.detail }}</p>
    <div class="demo-row">
      <Button variant="outline" size="sm" :disabled="step === 1" @click="step--">上一步</Button>
      <Button size="sm" :disabled="step === steps.length" @click="step++">下一步</Button>
    </div>
  </div>
</template>

<style scoped>
.context-surface { display: flex; min-height: 144px; width: 100%; flex-direction: column; align-items: center; justify-content: center; gap: var(--milk-ui-space-2); padding: var(--milk-ui-space-4); border: 1px solid transparent; border-radius: 12px; background: var(--muted); color: var(--foreground); box-shadow: var(--milk-pressed); }
.context-surface strong { font-size: var(--milk-ui-font-body); font-weight: var(--milk-ui-weight-medium); line-height: var(--milk-ui-leading-body); }
.context-surface > span:last-child { font-size: var(--milk-ui-font-caption); line-height: var(--milk-ui-leading-label); color: var(--muted-foreground); }
.surface-crosshair { font: 23px/1 monospace; color: var(--muted-foreground); }
.drawer-inner { display: flex; flex-direction: column; gap: var(--milk-ui-space-6); width: min(100%, 400px); margin: 0 auto; }
.goal-control { display: flex; align-items: center; justify-content: center; gap: var(--milk-ui-space-6); }
.goal-control > div { display: grid; text-align: center; gap: var(--milk-ui-space-2); }
.goal-control strong { font-size: 44px; line-height: 1; font-variant-numeric: tabular-nums; }
.goal-control span { font-size: var(--milk-ui-font-caption); line-height: var(--milk-ui-leading-label); color: var(--muted-foreground); }
.hover-profile { display: flex; gap: var(--milk-ui-space-3); margin-bottom: var(--milk-ui-space-4); align-items: flex-start; }
.hover-profile strong { font-size: var(--milk-ui-font-subtitle); font-weight: var(--milk-ui-weight-medium); line-height: var(--milk-ui-leading-title); }
.hover-profile p { font-size: var(--milk-ui-font-body); line-height: var(--milk-ui-leading-body); color: var(--muted-foreground); margin-top: var(--milk-ui-space-1); }
.profile-monogram { display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; border-radius: 50%; border: 1px solid transparent; background: var(--milk-raised); box-shadow: var(--milk-control-shadow); font-weight: var(--milk-ui-weight-semibold); }
.navigation-option { width: 100%; text-align: left; }
.navigation-option small { display: block; margin-top: var(--milk-ui-space-1); color: var(--muted-foreground); font-size: var(--milk-ui-font-caption); line-height: var(--milk-ui-leading-label); }
.sheet-layers { padding: 0; }
.layer-option { display: flex; align-items: center; gap: var(--milk-ui-space-3); min-height: 44px; padding: var(--milk-ui-space-3); border: 1px solid transparent; border-radius: 8px; color: var(--foreground); background: linear-gradient(var(--milk-raised),var(--milk-panel)); box-shadow: var(--milk-control-shadow); text-align: left; font-size: var(--milk-ui-font-body); line-height: var(--milk-ui-leading-label); }
.layer-option.is-selected, .layer-option:active { background: var(--primary); color: var(--primary-foreground); box-shadow: var(--milk-pressed); }
.contained-sidebar { overflow: hidden; border: 1px solid transparent; border-radius: 12px; box-shadow: var(--milk-shadow); }
.contained-sidebar-panel { flex-shrink: 0; width: 116px; border-right: 1px solid var(--border); }
.sidebar-mark { font-size: var(--milk-ui-font-caption); line-height: var(--milk-ui-leading-label); letter-spacing: 0.14em; padding: var(--milk-ui-space-1) var(--milk-ui-space-2); }
.sidebar-preview { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: var(--milk-ui-space-3); padding: var(--milk-ui-space-6) var(--milk-ui-space-4); background: var(--background); }
.sidebar-preview strong { font-size: var(--milk-ui-font-title); font-weight: var(--milk-ui-weight-medium); line-height: var(--milk-ui-leading-title); }
.preview-lines { display: grid; gap: var(--milk-ui-space-2); }
.preview-lines i { display: block; height: 8px; border-radius: 3px; background: var(--muted); }
.preview-lines i:nth-child(2) { width: 72%; }
.preview-lines i:nth-child(3) { width: 87%; }
.tab-surface { min-height: 112px; padding: var(--milk-ui-space-4) 0 0; }
.tab-surface strong { font-size: var(--milk-ui-font-subtitle); font-weight: var(--milk-ui-weight-medium); line-height: var(--milk-ui-leading-title); }
.tab-surface p { margin-top: var(--milk-ui-space-2); color: var(--muted-foreground); font-size: var(--milk-ui-font-body); line-height: var(--milk-ui-leading-body); }
.demo-stepper { width: 100%; gap: 0; }
.demo-step { position: relative; flex: 1; justify-content: center; }
.step-connector { position: absolute; height: 1px; top: calc(var(--milk-ui-space-1) + var(--milk-ui-control-sm) / 2); left: 75%; width: 50%; }
</style>
