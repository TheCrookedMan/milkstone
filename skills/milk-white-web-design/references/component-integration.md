# 组件集成与独立运行
领域组件以技能 `assets/components/` 为源码来源，根落地页直接 import 同一份组件。复制整个 assets 到工作目录；不要在已安装技能目录中装依赖。在 assets/component-lab 执行 pnpm install、pnpm typecheck、pnpm build、pnpm dev。components 和 milk-tokens.css 保持相邻。vue-panel 是最小按钮样本，使用 npm；component-lab 使用 pnpm，两者锁文件互相独立。

shadcn-vue 目录以根工程 `src/` 为开发来源，打包同步至独立 `assets/shadcn-catalog/`。完整基础组件库的复制、依赖与主题说明见 [shadcn-vue 组件目录](shadcn-catalog.md)。

全部组件默认 light 采用浅灰柔和拟物表面，milk-white-web-design 和 milk-tokens.css 保留兼容标识。普通外框与已有结构边界复用 --milk-border-width、--milk-border-color 和 --milk-border-gradient，使用 1px 半透明白边；图片区专用 3px 白色 rim。圆角闭合外框可用 padding-box/border-box，无圆角单边结构线可用同源 border-image，不为文字布局额外套框。Card 圆角浮起，按钮紧凑胶囊，输入及读数窗内凹，Tabbar 为凹槽并让选中拨片浮起。左上白色高光与右下灰色柔影、协调的灰白表面共同表达实体层级；按角色复用八类真实阴影，数值以 milk-tokens.css 为准。milk-relief 及 control/card/tabbar 类保留兼容，depth 为 0，不再创建 ::before/::after 硬底座或 isolation 结构。焦点遵循 [统一荧光边框](design-system.md)：实际聚焦控件在已有边框内显示流动冷白蓝光段，复合输入只装饰一处可见边界，dark 和 Portal 同样适用；成功装饰时取消额外外圈，未接管时保留可见键盘 outline 回退。极轻纸纹不影响读数；SVG、图表和 Canvas/WebGL 内容保持可读，园区柔焦、扫描灯层、星体光晕和电流光尾继续保留。设计令牌见 [设计系统](design-system.md)。

主题集成同时保留 theme-controller.ts、theme-colors.css 和模式开关。dark 使用对应深色背景、主题和文本；边框、表面及八类阴影按材料角色校准颜色与透明度，保持左上受光、右下投影、凸面较亮和凹槽较暗。边框宽度、圆角、投影方向、偏移与模糊及交互几何保持。Portal、SVG 和图表连接同一控制器与语义令牌；Canvas/WebGL 保持星体与建筑的自然照明，监听 milk-theme-change 更新需要适配的背景、文字、坐标和轨道，卸载时清理订阅，不用整页反相 filter。接口见 [双模式主题](theme-modes.md)。

按键触感同时保留 assets/press-controller.ts，在入口 initTheme() 后、mount 前调用一次 initPressFeedback()，卸载与 HMR dispose 调用其返回的清理函数；领域组件、最小面板和 shadcn 沙盒共用同一控制器。使用统一按下／回位令牌与 data-milk-press 状态，不给每个按钮各写计时器。按钮、Tab 与开关轻微压下后平稳回位，快速点击仍有最短反馈时间，鼠标、触摸和键盘行为一致；拖拽节点、滑杆、SVG 与浮层定位不被按键动效改写。完整时序和减少动态效果规则见 [交互规范](motion-and-network.md)。

| 组件 | 运行依赖 | 用途 |
| --- | --- | --- |
| InstrumentControls.vue | Vue、Reka UI | 刻度、实体 Tab、按键、开关 |
| ChartStudio.vue | Vue、ECharts 6 | 趋势、柱图、图例、数据表 |
| RelationStudio.vue + StellarGraph.vue + StellarSurface.vue | Vue、SVG、原生 Canvas/WebGL | 电流神经／章鱼关系、球面星体与太阳日冕的星空图 |
| CampusRadar.vue | Vue、原生 Canvas 2D | 柔焦等距园区、漂浮粒子、XYZ 坐标、五秒雷达扫描与亮层余辉 |
| WorkflowStudio.vue | Vue、Vue Flow | 节点拖动、连线、参数、JSON交换 |

这些组件使用 useId，最低 Vue 3.5；Vue Flow 自身 peer 范围较宽，不代表示例兼容 Vue 3.3/3.4。旧工程可替换 ID 生成策略，或在用户允许下升级 Vue。

WorkflowStudio.vue 按需复制时须一并保留相邻 ../workflow-model.mjs 和 ../workflow-model.d.mts；独立项目仍建议复制整个 assets。

RelationStudio.vue 导入相邻 StellarGraph.vue，后者导入 StellarSurface.vue；按需复制时保留这三个文件。独立星空保留 StellarGraph.vue 与 StellarSurface.vue。球面渲染使用浏览器原生 Canvas/WebGL，提供 Canvas 2D 回退，无新增 npm 依赖或外部纹理；具体运动与生命周期见 [动态关系与星空](stellar-relations.md)。

CampusRadar.vue 可单独复制到 Vue 工程，样式令牌仍取自 milk-tokens.css。以 `<CampusRadar />` 嵌入有可用宽度的容器；不需要 Three.js、图片下载、地图 SDK 或额外 npm 依赖。示例是程序生成的园区场景，接入真实楼栋与监测数据时需另设业务适配层；投影与扫描时序见 [园区雷达扫描](campus-radar.md)。

已有工程只安装当前需要的依赖，不强制引入全套或改换框架。Vue Flow 1.48.2 peer Vue ^3.3.0，与本工程 Vue3.5.43 相容；ECharts 按需注册。大型图需独立做聚合、虚拟化与性能验收。

可把内部样本替换为 props 与业务适配器，保留键盘列表、状态和错误反馈。格式适配不包含 ComfyUI 服务器、模型或执行权限；真实接入需另行定义端点、队列、取消和错误处理。
