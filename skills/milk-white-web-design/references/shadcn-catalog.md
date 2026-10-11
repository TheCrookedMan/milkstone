# shadcn-vue 组件目录

本项目的落地页展示 [官方组件目录](https://www.shadcn-vue.com/docs/components) 于 2026-10-09 收录的全部 70 项。目录包括 Attachment、Bubble、Marker、Message、Message Scroller、Questionnaire，以及旧版 Toast 和当前 Sonner；数量是本次核对快照，后续以官方目录为准。只列出名称不构成展示覆盖：每项应有对应的本地示例，交互控件须可以操作。

## 本地源码与展示编排

项目通过官方 `new-york-v4` registry 引入可编辑的 Vue 组件，基础源码位于 `src/components/ui/`，`components.json` 记录主题和别名，`src/lib/utils.ts` 的 `cn` 合并类名。保留组件的 props、emits、插槽、组合关系和可访问语义，通过主题令牌与展示数据适配本设计系统。

本次引入 66 套 `new-york-v4` registry 源码，共 447 个文件，并保留 10 个旧版 Toast 文件。目录中部分条目采用组合：Data Table 使用 TanStack Vue Table 9.2.8 与本地 Table，Date Picker 组合 Popover 和 Calendar，Typography 使用原生排版 recipe；Toast 作为旧版兼容示例单独呈现。Reka UI 采用 2.11.0 以支持当前 Drawer，其余依赖和实际版本以各自 `package.json` 与锁文件为准。

落地页的 `src/data/shadcn-catalog.ts` 记录官方英文名、中文标签、说明、类别和演示归属。按基础与展示、表单与输入、导航与浮层组织，搜索和分类只筛选展示，不删除目录项。宽卡用于日期范围、图表、表格等需要空间的内容；小屏转为单列，浮层和滚动区域保留边界。

Chart 与 Data Table 是基础组件和数据工具的组合示例，Typography 展示排版层级；不能为了统一目录而虚构同名运行时组件。Toast 仍保留单独示例并标注旧版，新的通知优先用 Sonner；[官方 Toast 文档](https://www.shadcn-vue.com/docs/components/toast) 已将其标为弃用。

## 技能内独立运行

`assets/shadcn-catalog/` 是独立的 Vue / Vite / pnpm 沙盒，包含完整 `src/components/ui/`、三组 gallery 示例、目录数据、纸感材质 `shadcn-theme.css`、字阶与间距 `shadcn-metrics.css`、`milk-tokens.css` 与双模式主题资源、自己的 `components.json` 和锁文件。根工程 `src/` 是开发来源，打包时将这些源码同步至沙盒；修改根源码后重新打包，避免两份示例分叉。

复制整个 `assets/shadcn-catalog/` 到工作目录后，在复制出的目录执行：

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm dev
```

在工作副本安装依赖，不在技能安装目录直接运行安装命令。完整沙盒使用自己的锁文件；移入已有项目时保留项目原有包管理器，并按所用组件补依赖。

## 浅灰柔和拟物主题

以下材料以默认 light 为基准，dark 使用对应深色主题，材质颜色与透明度按相近感知深度校准；保持左上受光、右下投影、凸面较亮、凹槽较暗以及相同边框宽度、阴影几何和交互几何，见 [双模式主题](theme-modes.md)。

将 shadcn 的 background、foreground、card、popover、primary、secondary、muted、accent、border、input、ring 与 chart 系列映射到 [浅灰柔和拟物设计令牌](design-system.md)。两模式复用同一套组件状态样式，接入上游组件时去除与此规则冲突的 `dark:` 材质和 ring 差异，黑版通过同一语义令牌体系校准颜色与透明度，不能让凸面变凹或将输入槽变为外浮。画布使用 #e9eaee 与极轻随机纸纹，#ebedf1 面板、#eef0f4 凸面及 #e4e6eb 凹槽协调过渡，深蓝灰文字保持可读。选中拨片与主操作通过较亮凸面和柔影浮起；图形数据可保持灰阶。错误与完成状态同时有图标与说明，不依赖彩色。图表用亮度、线型和图例区分数据。

Card、按钮、TabsList、Input、Textarea、Select、面板与 Portal 普通外框采用 1px 半透明白边，图片区专用 3px 白色 rim；页面、列表和表格现有结构边界复用普通边框。复用 --milk-border-width、--milk-border-color 和 --milk-border-gradient，圆角外框可用 padding-box/border-box，无圆角单边结构线可用同源 border-image，不为文字布局新增外框。Card 使用外浮柔影，Button 与选中的 TabsTrigger 使用小尺度外浮柔影；TabsList 为 recessed 凹槽，未选中 Tab 融入槽面，Input、Textarea 与读数窗使用内凹表面及阴影。八类阴影按角色复用 milk-tokens.css，左上白色高光和右下灰色投影形成柔和层次。milk-relief 及角色类保留兼容，depth 为 0，不再绘制伪元素硬底座或 isolation 结构。按压保留表面变化与小幅位移，文字按主题切换并保持清楚。Button、TabsTrigger、链接、Input、Textarea、Select、Combobox 与菜单项聚焦时，在已有边框内显示统一荧光流动效果，不改变原边框几何和柔影。InputGroup、Tags 等复合输入仅选一个可见边界，PIN/OTP 跟随活动格。成功装饰时取消额外 outline 与 Tailwind ring，未接管时保留可见键盘 outline 回退；减少动态效果显示静态亮边，强制颜色模式使用 Highlight，详见 [焦点规范](design-system.md)。此规则同样覆盖 dark 与 Portal，保留 Reka 键盘、ARIA 和焦点管理。Dialog、Popover、Dropdown、Tooltip、Sheet 和通知的 Portal 根继承相同规范，随 html[data-theme] 同步；Unovis 非 CSS 取色按文本、网格与数据系列角色读取当前主题，不对已解析 CSS 令牌重复取反。

## 字阶、密度与组合

所有基础组件及其组合使用同一套字阶与间距，而非只给展示卡片套上材质。统一实现位于根工程 `src/styles/shadcn-metrics.css`，打包时同步到 `assets/shadcn-catalog/src/styles/`。该文件只定义排版、内边距、尺寸和布局节奏，材质与阴影继续交给 `shadcn-theme.css`、`milk-tokens.css`，焦点与按压复用 `milk-focus.css` 及共享 focus／press controller，避免状态样式互相覆盖。

| 角色 | 字号 / 行高 | 字重 |
| --- | --- | --- |
| 正文、输入内容、卡片与弹层说明 | 14px / 1.65 | 400 |
| 普通按钮、菜单与紧凑触发器文字 | 13px / 1.5 | 500 |
| Label、分组标签 | 13px / 1.5 | 500 |
| 辅助提示、帮助说明、时间 | 12px / 1.5 | 400 |
| Card 标题 | 18px / 1.4 | 600 |
| Dialog、Sheet、Drawer 标题 | 20px / 1.4 | 600 |

间距只从 4、8、12、16、24、32px 中选择；嵌套层级靠分组和留白表达，不依赖字号不断缩小。一般图标与文字、标签与控件间隔 8px，紧密关联的字段或演示内容间隔 16px，独立 FieldGroup 与内容分区间隔 24px，操作按钮间隔 12px。普通控件 44px、small 36px、large 48px、独立图标按钮 40px；显式紧凑规格用于局部操作，large 按钮文字为 14px，xs 为 12px。

| 组件组合 | 内部约定 |
| --- | --- |
| Card | 内边距 24px；标题与说明 8px；头部、内容与操作区 24px；操作按钮 12px |
| Dialog、Sheet、Drawer | 内容内边距 24px；分区 24px；标题与说明 8px；窄屏操作区可换行 |
| Form、Field、InputGroup | 标签与输入 8px；FieldGroup 分组 24px、嵌套分组 16px；帮助与错误说明使用辅助字阶；内嵌图标和动作不叠加普通按钮的外部尺寸 |
| Dropdown、Context Menu、Command、Popover | 普通菜单内边距 8px，菜单项最小高度 36px；图标与文案 8px；有自定义内容的 Popover 按内容分组，而非统一压成菜单 |
| Tabs | 凹槽内边距 6px，拨片间隔 4px，普通拨片高度 40px；内容面板与导航间隔 16px |
| Table、Calendar、Sidebar | 保留列、日期网格与导航层级的专用密度；正文和辅助信息仍遵循共享字阶，不强套普通按钮高度 |

窄屏 Card 内边距可降至 20px，标准字号和普通控件高度保持；组合字段、操作区和导航优先换行，确需横向滚动时保留清晰边界。子项设置可收缩宽度，说明允许换行，长名称按实际可用空间折行或截断，浮层宽度限制在视口内。不能靠固定桌面宽度、裁剪文字或缩小字形消除溢出。

Textarea、Sidebar、Table／Data Table、Message Scroller 与浮层的 scroll／auto 区域采用共享纸感滚动条：12px 凹槽轨道、圆角浮起滑块、白高光与微投影，悬浮加深、拖拽压实，light／dark 同向受光，横纵轴及 Portal 一致。原生使用 milk-tokens.css 的 thin／scrollbar-color 回退与受支持的 ::-webkit-scrollbar 完整样式；ScrollArea 自绘条在 shadcn-theme.css 复用相同材质，按 Reka 的 hover／scroll 语义显现，保留滑块拖拽、DOM 测量及键盘行为。仅隐藏 Reka 视口原生条等明确用途的局部滚动条，不改原有 overflow 或用 hidden／clip 裁切内容。区域边界和标签保持可辨，滚轮、触控与键盘仍能访问全部内容，独立非交互滚动区按需提供 tabindex="0" 和可访问名称，不覆盖基础组件自身焦点语义。

这些规则适用于 light、dark 及 Portal 内的组件，几何、层级与受光方向一致。保留基础组件的 props、插槽、尺寸变体和用户传入 `class` 的扩展能力；共享选择器按语义或组件标记作用，不通过全局 `!important` 锁死业务布局。覆盖上游默认密度时同时检查嵌套组合，避免 InputGroup 按钮、Calendar 日期、Sidebar 操作和表格工具栏被放大两次。

## 复用与交互

优先复用本地基础组件，业务页面只组合结构和传入数据。保留 Reka 的焦点管理、方向键、Escape、ARIA 与键盘导航；Label 关联真实输入，图标按钮提供名称。表单演示明确反馈校验和提交结果，菜单动作展示真实状态变化，日期、分页、筛选与步骤控件连接各自的状态。减少动态效果时仍可阅读所有内容。

按钮与触发按键复用共享 press-controller.ts 和阻尼令牌：100ms 轻微下沉、至少 112ms 按下反馈、420ms 平稳回位，默认位移 2px、缩放 0.975，阴影同步变化，业务动作立即执行。TabsTrigger 位移 1px，Switch、Checkbox 和 Radio 原位缩放 0.98，保持自身选中／拨动几何。鼠标、触摸与 Space／Enter 共用短暂 data-milk-press 状态，禁用项不反馈；不要在组件内重复注册计时器，或用按压 transform 覆盖 Popover、Tooltip 和 Slider 的定位。减少动态效果时只保留即时材质反馈，两模式共用同一运动参数。详见 [交互规范](motion-and-network.md)。

目录 Card 的入场使用共享 reveal-controller.ts 与 milk-motion.css，在分组容器添加 data-milk-reveal-group。Card 进入视区时以 700ms 渐显与 18px 上移展现，直接子项按 80ms 错峰、最多延迟 240ms；筛选与延迟加载的新内容由共享观察器登记。动效只施加到展示包装层，不覆盖 Calendar、Slider、拖拽区域或 Portal 的内部定位与已有交互；键盘聚焦时立即显示，减少动态效果时完整静态呈现。

用户只需要某个组件时按依赖关系复制该组件及其组合基础件，不要求其他项目加载全部目录。使用完整演示时保留搜索分类、基础源码、主题、工具函数和相关依赖；现有实体控件、关系图、园区扫描和工作流继续使用各自的领域组件。

## 来源

本地基础源码来自 [shadcn-vue 官方仓库](https://github.com/unovue/shadcn-vue) 及其 registry，适用其 [MIT 许可](https://github.com/unovue/shadcn-vue/blob/dev/LICENSE)。浅灰柔和拟物主题、展示数据与落地页编排为本项目适配内容。保留上游版权和许可原文；这不改变整个项目或其他来源材料的许可，具体区分见 [来源与许可](source-and-license.md)。

全局通知包装组件保留 `vue-sonner/style.css`，并通过 Teleport 挂到 body，确保全局定位与层级。通知使用共享浮层柔影与半透明边框，保留 Sonner 原有滑动、展开命中伪元素和交互，不绘制额外硬底座。
