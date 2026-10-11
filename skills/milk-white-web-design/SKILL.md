---
name: milk-white-web-design
description: 创建、改造或评审浅灰纸底与细微纹理、左上白高光和右下灰柔影、浮起圆角 Card、紧凑胶囊按钮、内凹输入与 Tabbar 构成的柔和拟物 Web 界面，并支持保持相同凸起与凹槽光照关系的黑色风格，包含 shadcn-vue 组件目录、刻度控件、ECharts、动态关系与星空、柔焦园区雷达、Hairline 空状态插图、Vue Flow / ComfyUI 格式工作流及 Vue 初始化参考。适用于用户选择浅灰柔和实体设计语言的项目；保留已有框架和品牌约束。
---

# 浅灰柔和拟物 Web 设计

以浅灰画布与极轻随机纸纹作为最大面积，用协调的灰白表面、左上白色柔和高光与右下灰色柔影呈现柔和拟物（soft neumorphic）。Card 圆角浮起，按钮是紧凑胶囊，输入框与 Tabbar 为凹槽，选中 Tab 浮起，图片使用 3px 白 rim 和较清晰的柔软投影。按用户业务组织页面，不固定模块数，不要求神经图。milk-white-web-design 与 milk-tokens.css 保留兼容标识；默认 light，dark 使用对应深色主题配色并保持相同实体与凹槽感。

## 工作方式

先确定主要任务、页面流、内容与数据来源。已有工程保留框架；新工程优先 Vue 3 + TypeScript + Vite、Tailwind 4，按需启用 Router、Pinia、Reka/shadcn 本地组件和 GSAP。用户指定的框架与包管理器优先。

- 设计页面、令牌和控件时读取 [设计系统](references/design-system.md)，复制 [CSS 令牌](assets/milk-tokens.css)，参考 [组件示例](assets/vue-panel/src/App.vue) 与 [实体相框图片](assets/FramedImage.vue)。
- 实现白色／黑色风格切换时读取 [双模式主题](references/theme-modes.md)，保留源码主题控制、选择记忆与绘制器同源取色。
- 使用 shadcn-vue 或展示完整基础组件库时读取 [shadcn-vue 组件目录](references/shadcn-catalog.md)，复用本地源码、交互语义和浅灰柔和拟物主题。
- 需要暂无数据、暂无用户或无搜索结果的简洁等距线稿时读取 [空状态插图](references/empty-state-illustrations.md)；新建交互图形可调用可用的 `hairline-create`，文字和操作仍由页面组件承接。
- 需要实体 Tabbar、旋钮、开关和刻印读数时读取 [实体控件](references/instrument-components.md)，使用 [控件示例](assets/components/InstrumentControls.vue)。
- 需要图表或关系图时读取 [数据可视化](references/data-visualization.md)，复用 [ECharts 图表](assets/components/ChartStudio.vue) 与 [神经／章鱼／星空图](assets/components/RelationStudio.vue)。
- 需要电流光点、球面星体、太阳日冕及自转与公转设置时读取 [动态关系与星空](references/stellar-relations.md)，独立集成时保留 [星体组件](assets/components/StellarGraph.vue) 与相邻 `StellarSurface.vue`。
- 需要虚化园区／小区建筑、漂浮粒子、XYZ 坐标与扫描亮层时读取 [园区雷达扫描](references/campus-radar.md)，复用 [园区组件](assets/components/CampusRadar.vue)。
- 需要节点编辑或 ComfyUI 数据交换时读取 [工作流编辑](references/workflow-editor.md)，复用 [工作台](assets/components/WorkflowStudio.vue)。
- 完整组件沙盒与按需依赖见 [组件集成](references/component-integration.md)；所有演示数据和本地模拟状态须明确标记。
- 初始化工程时读取 [初始化](references/project-initialization.md) 与 [架构](references/web-architecture.md)。独立示例是最小可运行样本，不覆盖已有 package.json。
- 实现状态和动画时读取 [交互规范](references/motion-and-network.md)，复用 [入场控制器](assets/reveal-controller.ts)、[入场样式](assets/milk-motion.css)、[按压控制器](assets/press-controller.ts) 与统一阻尼令牌。
- 交付前按 [验收](references/acceptance.md) 检查真实页面，注明未执行项。
- 复用来源相关内容时读取 [来源与许可](references/source-and-license.md)。

## 核心约束

light 基准：画布 #e9eaee、面板 #ebedf1、凸面 #eef0f4、浅亮面 #f4f5f8、凹槽 #e4e6eb、深面 #dfe2e8；正文 #2e3540、次字 #5b6573、图形内容线 #cdd2db、焦点 #6b7c93。极轻静态纸纹不能干扰读数。普通外框与结构边界采用 1px 半透明白边，图片区专用 3px 白 rim，圆角外框复用 milk-border-width、milk-border-color 与 milk-border-gradient；文字布局不额外套框。八类阴影恢复真实角色：milk-shadow、milk-card-shadow、milk-card-hover-shadow、milk-floating-shadow 为容器或 Card 外浮；milk-button-shadow、milk-hover-shadow 为小尺度外浮；milk-pressed、milk-control-shadow 为内凹，数值以 assets/milk-tokens.css 为准。表面复用 raised/recessed/panel 令牌，输入与 Tabbar 凹槽内凹、选中拨片浮起，按压有浅凹反馈。milk-relief 及角色类仅保留兼容，depth 为 0，不绘制硬底座、::before/::after 实体层或独立隔离层叠结构。保持清楚文字与可辨焦点反馈，默认、悬浮、按压、禁用和加载状态可辨。

两模式共用设计、材料角色与状态行为。dark 将背景、主题及文本切为对应深色配色，但高光与投影维持白版的光照关系：左上较亮、右下较暗，凸面亮于基底、凹槽暗于基底，选中拨片浮起。按相同角色校准暗色表面、边框、高光、阴影及其透明度，使默认、悬浮、按压、焦点、选中、禁用、加载和错误状态的深度感一致；阴影方向、偏移、模糊与扩展、边框宽度、圆角、尺寸、字体、间距和交互几何不变。选择记住并在刷新后恢复，DOM 与 Portal 复用语义令牌，图表按文本、网格和数据系列角色适配；图片、星体与建筑自然照明保持。由源码控制器及颜色令牌实现，不使用整页 filter。接口见 [双模式主题](references/theme-modes.md)。

控件、图表、关系图、星空、园区扫描与工作流统一使用浅灰柔和拟物材质。页面元素进入视区时以 700ms 渐显并从下方 18px 归位，分组子项每隔 80ms 错峰、延迟上限 240ms，每个元素只播放一次。入场作用于内容包装层，不改变星体、媒体或拖拽节点自身的旋转与定位。按钮使用轻微机械阻尼：100ms 按下、至少保留 112ms 反馈、420ms 单调回位，位移 2px、缩放 0.975；Tab 位移 1px，小开关原位缩放 0.98，阴影同步压实。两模式时序相同，按键操作不等待动画；复用统一控制器，避免覆盖拖拽、滑杆和浮层定位。具体曲线、状态及减少动态效果规则见交互规范。图形内容可保持灰阶，以亮度、线型、形状、图标和文字区分状态。园区柔焦、粒子、扫描灯与余辉、星体光晕、太阳肌理及电流光尾保留自身内容光学与动态关系；它们和 UI 投影分别按各自含义呈现。

按钮用 button，导航用链接，弹窗使用可访问对话框。Input、Textarea、Select、Combobox 及 InputGroup、Tags、PIN/OTP 等复合输入容器聚焦时不显示最外层 outline、Tailwind ring 或焦点边框变色，以内部 inset 材质变化、光标、选中与状态提示表达焦点；正常 1px 半透明边框和柔影保持。普通按钮、Tab 与链接仍保留可见键盘 outline。dark 与 Portal 同样遵循，保留键盘、ARIA 与焦点恢复行为。减少动态效果时去除位移和持续动画，信息仍完整可用。演示数据明确标注，真实接口失败不得回退为假成功。

overflow 为 scroll／auto 的区域使用细而低调的纸感滚动条：凹槽轨道、圆角浮起滑块、白色高光与微投影，悬浮加深、拖拽压实；明暗保持同向光照，横纵轴及 Portal 一致，覆盖 Textarea、Sidebar、Table、Message 与 ScrollArea。不改原有 overflow，保留拖拽、滚轮、触控与键盘访问，具体令牌与原生回退见 [设计系统](references/design-system.md)。

交付设计和可运行结果，运行适合改动的类型检查、构建及浏览器验证。只完成文档时不宣称应用已运行；不自动部署或替换用户已安装技能。
