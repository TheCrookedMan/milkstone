export const shadcnCategories = ['基础与展示', '表单与输入', '导航与浮层'] as const

export type ShadcnCategory = typeof shadcnCategories[number]
export type ShadcnOwner = 'input' | 'overlay' | 'display'

export interface ShadcnCatalogItem {
  id: string
  name: string
  label: string
  category: ShadcnCategory
  description: string
  wide?: boolean
  owner: ShadcnOwner
}

// 官方目录核对日期：2026-10-09。目录只用于展示覆盖，组件源码由本地 registry 文件提供。
export const shadcnCatalogSource = 'https://www.shadcn-vue.com/docs/components'

export const shadcnCatalog: ShadcnCatalogItem[] = [
  { id: 'accordion', name: 'Accordion', label: '折叠面板', category: '基础与展示', description: '逐项展开细节，让纸面保留从容的阅读节奏。', owner: 'display' },
  { id: 'alert', name: 'Alert', label: '提示面板', category: '基础与展示', description: '在一张提示卡上，交代当前状态与需要留意的信息。', owner: 'display' },
  { id: 'alert-dialog', name: 'Alert Dialog', label: '确认对话框', category: '导航与浮层', description: '把重要操作放到眼前，留出确认与取消的余地。', owner: 'overlay' },
  { id: 'aspect-ratio', name: 'Aspect Ratio', label: '固定比例', category: '基础与展示', description: '框住画面的比例，让每一幅图像都有合适的落点。', owner: 'display' },
  { id: 'attachment', name: 'Attachment', label: '附件', category: '基础与展示', description: '把文件名称、格式与操作收进一张小卡片。', owner: 'display' },
  { id: 'avatar', name: 'Avatar', label: '头像', category: '基础与展示', description: '用图像或名字，标记内容背后的那个人。', owner: 'display' },
  { id: 'badge', name: 'Badge', label: '状态徽章', category: '基础与展示', description: '一枚小标签，让草稿、发布与同步状态一眼可辨。', owner: 'display' },
  { id: 'breadcrumb', name: 'Breadcrumb', label: '面包屑', category: '导航与浮层', description: '沿着页面层级，找到来处与返回的方向。', owner: 'overlay' },
  { id: 'bubble', name: 'Bubble', label: '对话气泡', category: '基础与展示', description: '让每段对话有自己的表面与位置。', owner: 'display' },
  { id: 'button', name: 'Button', label: '按钮', category: '表单与输入', description: '轻按下沉，松开渐缓回位，每次操作都有一点分量。', owner: 'input' },
  { id: 'button-group', name: 'Button Group', label: '按钮组', category: '表单与输入', description: '把相关操作排成一组，保持按键之间的节奏。', owner: 'input' },
  { id: 'calendar', name: 'Calendar', label: '日历', category: '表单与输入', description: '翻阅月份、点选日期，为计划留下一处标记。', owner: 'input' },
  { id: 'card', name: 'Card', label: '卡片', category: '基础与展示', description: '微光落在边缘，托起一张承载内容的纸面卡片。', owner: 'display' },
  { id: 'carousel', name: 'Carousel', label: '轮播', category: '基础与展示', description: '逐张翻看材质样本，比较表面的深浅与层次。', owner: 'display' },
  { id: 'chart', name: 'Chart', label: '图表', category: '基础与展示', description: '用灰阶、图例与刻度，把数据排列得有迹可循。', owner: 'display', wide: true },
  { id: 'checkbox', name: 'Checkbox', label: '复选框', category: '表单与输入', description: '独立勾选每一项，让选择落在可见的位置。', owner: 'input' },
  { id: 'collapsible', name: 'Collapsible', label: '可收起内容', category: '基础与展示', description: '把次要内容收好，需要时再展开。', owner: 'display' },
  { id: 'combobox', name: 'Combobox', label: '组合选择框', category: '表单与输入', description: '输入关键词，在候选列表中找到目标。', owner: 'input' },
  { id: 'command', name: 'Command', label: '命令面板', category: '表单与输入', description: '用搜索和方向键，快速定位一条操作命令。', owner: 'input', wide: true },
  { id: 'context-menu', name: 'Context Menu', label: '上下文菜单', category: '导航与浮层', description: '在当前内容旁，打开顺手可用的操作。', owner: 'overlay' },
  { id: 'data-table', name: 'Data Table', label: '数据表格', category: '基础与展示', description: '让资产记录按行列铺开，支持筛选、排序与翻页。', owner: 'display', wide: true },
  { id: 'date-picker', name: 'Date Picker', label: '日期选择器', category: '表单与输入', description: '轻按日期入口，在日历浮层中落下选择。', owner: 'input' },
  { id: 'dialog', name: 'Dialog', label: '对话框', category: '导航与浮层', description: '暂时聚焦一件事，完成后回到原来的画面。', owner: 'overlay' },
  { id: 'drawer', name: 'Drawer', label: '底部抽屉', category: '导航与浮层', description: '从页面底部拉出一层，容纳当下需要的设置。', owner: 'overlay' },
  { id: 'dropdown-menu', name: 'Dropdown Menu', label: '下拉菜单', category: '导航与浮层', description: '把相关操作收进按钮旁的一列菜单。', owner: 'overlay' },
  { id: 'empty', name: 'Empty', label: '空状态', category: '基础与展示', description: '等距线稿托盘承接留白，从第一条记录开始。', owner: 'display' },
  { id: 'field', name: 'Field', label: '字段布局', category: '表单与输入', description: '标签、输入与反馈各就其位，组成完整字段。', owner: 'input' },
  { id: 'form', name: 'Form', label: '表单', category: '表单与输入', description: '把填写、校验与提交反馈接成一次完整操作。', owner: 'input', wide: true },
  { id: 'hover-card', name: 'Hover Card', label: '悬浮卡片', category: '导航与浮层', description: '停留片刻，查看名字背后的补充资料。', owner: 'overlay' },
  { id: 'input', name: 'Input', label: '文本输入', category: '表单与输入', description: '一处微微内收的书写面，承接单行文字。', owner: 'input' },
  { id: 'input-group', name: 'Input Group', label: '输入组', category: '表单与输入', description: '把图标、前缀与操作贴近输入，减少视线往返。', owner: 'input' },
  { id: 'input-otp', name: 'Input OTP', label: '验证码输入', category: '表单与输入', description: '逐格填写验证码，随时知道还剩几位。', owner: 'input' },
  { id: 'item', name: 'Item', label: '内容条目', category: '基础与展示', description: '在一行之内，安排标题、说明与下一步操作。', owner: 'display' },
  { id: 'kbd', name: 'Kbd', label: '快捷键', category: '基础与展示', description: '把快捷操作做成小小的键帽提示。', owner: 'display' },
  { id: 'label', name: 'Label', label: '字段标签', category: '表单与输入', description: '为每个输入写下名字，点击文字也能找到控件。', owner: 'input' },
  { id: 'marker', name: 'Marker', label: '内容标记', category: '基础与展示', description: '用时间、编号或状态，标出内容之间的节点。', owner: 'display' },
  { id: 'menubar', name: 'Menubar', label: '菜单栏', category: '导航与浮层', description: '把文件、编辑与视图操作铺成一条菜单栏。', owner: 'overlay' },
  { id: 'message', name: 'Message', label: '消息', category: '基础与展示', description: '将身份、正文与回执放在同一条消息里。', owner: 'display' },
  { id: 'message-scroller', name: 'Message Scroller', label: '消息滚动区', category: '基础与展示', description: '翻阅设计记录，也能随时回到最新一条。', owner: 'display' },
  { id: 'native-select', name: 'Native Select', label: '原生选择框', category: '表单与输入', description: '保留熟悉的原生选择方式，配上同一套材质。', owner: 'input' },
  { id: 'navigation-menu', name: 'Navigation Menu', label: '导航菜单', category: '导航与浮层', description: '把页面入口与分组说明安排在主导航中。', owner: 'overlay', wide: true },
  { id: 'number-field', name: 'Number Field', label: '数字输入', category: '表单与输入', description: '直接输入或逐格增减，让数值调校更顺手。', owner: 'input' },
  { id: 'pagination', name: 'Pagination', label: '分页', category: '导航与浮层', description: '按页翻阅内容，始终知道自己停在哪里。', owner: 'overlay' },
  { id: 'pin-input', name: 'Pin Input', label: '分格密码', category: '表单与输入', description: '逐格接收固定长度的数字或代码。', owner: 'input' },
  { id: 'popover', name: 'Popover', label: '浮动面板', category: '导航与浮层', description: '在操作附近，展开一小层设置。', owner: 'overlay' },
  { id: 'progress', name: 'Progress', label: '进度', category: '基础与展示', description: '让完成比例沿着凹槽轨道，一点点向前。', owner: 'display' },
  { id: 'questionnaire', name: 'Questionnaire', label: '问卷', category: '基础与展示', description: '一次回答一个问题，让选项与反馈保持专注。', owner: 'display', wide: true },
  { id: 'radio-group', name: 'Radio Group', label: '单选组', category: '表单与输入', description: '从互斥的选项里，留下一个明确选择。', owner: 'input' },
  { id: 'range-calendar', name: 'Range Calendar', label: '范围日历', category: '表单与输入', description: '在日历上选出一段连续的时间。', owner: 'input' },
  { id: 'resizable', name: 'Resizable', label: '可调整面板', category: '基础与展示', description: '拖动分隔手柄，为图层与画布分配空间。', owner: 'display', wide: true },
  { id: 'scroll-area', name: 'Scroll Area', label: '滚动区域', category: '基础与展示', description: '在有限的纸面里，继续翻阅较长的内容。', owner: 'display' },
  { id: 'select', name: 'Select', label: '选择器', category: '表单与输入', description: '展开选项浮层，为当前字段挑选一个值。', owner: 'input' },
  { id: 'separator', name: 'Separator', label: '分隔线', category: '基础与展示', description: '用一道细线与适量留白，安排内容的停顿。', owner: 'display' },
  { id: 'sheet', name: 'Sheet', label: '侧边面板', category: '导航与浮层', description: '从侧边展开图层与详情，保留画布的位置。', owner: 'overlay' },
  { id: 'sidebar', name: 'Sidebar', label: '侧边栏', category: '导航与浮层', description: '把工作空间的入口整理在一侧。', owner: 'overlay', wide: true },
  { id: 'skeleton', name: 'Skeleton', label: '骨架占位', category: '基础与展示', description: '先留下内容的轮廓，让等待有迹可循。', owner: 'display' },
  { id: 'slider', name: 'Slider', label: '滑块', category: '表单与输入', description: '沿刻度拖动，或用方向键细调每一个数值。', owner: 'input' },
  { id: 'sonner', name: 'Sonner', label: '消息通知', category: '导航与浮层', description: '操作完成后，递上一条简短反馈与后续入口。', owner: 'overlay' },
  { id: 'spinner', name: 'Spinner', label: '加载指示', category: '基础与展示', description: '用轻量旋转，提示操作仍在进行。', owner: 'display' },
  { id: 'stepper', name: 'Stepper', label: '步骤导航', category: '导航与浮层', description: '从选材到成形，让每一步都有可返回的位置。', owner: 'overlay' },
  { id: 'switch', name: 'Switch', label: '拨动开关', category: '表单与输入', description: '拨片沿槽位移动，在开启与关闭之间切换。', owner: 'input' },
  { id: 'table', name: 'Table', label: '表格', category: '基础与展示', description: '让名称、状态与版本各自对齐，便于逐行比较。', owner: 'display' },
  { id: 'tabs', name: 'Tabs', label: '标签页', category: '导航与浮层', description: '标签浮在槽位之上，轻按切换当前内容。', owner: 'overlay' },
  { id: 'tags-input', name: 'Tags Input', label: '标签输入', category: '表单与输入', description: '把关键词收成小标签，随时补充或移除。', owner: 'input' },
  { id: 'textarea', name: 'Textarea', label: '多行文本', category: '表单与输入', description: '留一块更大的书写面，安放完整的想法。', owner: 'input' },
  { id: 'toast', name: 'Toast', label: '轻提示', category: '导航与浮层', description: '演示经典轻提示接口，保留旧版使用入口。', owner: 'overlay' },
  { id: 'toggle', name: 'Toggle', label: '切换按钮', category: '表单与输入', description: '按下或释放一枚按键，切换当前样式。', owner: 'input' },
  { id: 'toggle-group', name: 'Toggle Group', label: '切换按钮组', category: '表单与输入', description: '把可叠加的样式，排成一组触感按键。', owner: 'input' },
  { id: 'tooltip', name: 'Tooltip', label: '工具提示', category: '导航与浮层', description: '停留或聚焦时，在手边补上一句说明。', owner: 'overlay' },
  { id: 'typography', name: 'Typography', label: '排版', category: '基础与展示', description: '通过字号、字重与留白，安排文字的阅读节奏。', owner: 'display' },
]
