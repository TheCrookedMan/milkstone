# 数据仪表与关系可视化

以下材质和颜色以默认 light 为基准；dark 通过同一主题控制器按背景、文本、网格与数据系列角色适配配色，UI 材质保持左上受光、右下投影以及相同凸起与凹槽感，阴影偏移与模糊和图形几何保持，见 [双模式主题](theme-modes.md)。

图表与关系图是信息组件。先定义数据、单位、方向与操作，再使用协调的浅灰表面、深蓝灰文字、圆角与 1px 半透明白边表现柔和拟物层级。图表 Card 使用 --milk-card-shadow 外浮柔影，操作按钮使用 --milk-button-shadow 与 --milk-hover-shadow，读数窗和功能槽使用 --milk-pressed 内凹阴影，Tooltip 使用 --milk-floating-shadow。左上白色高光与右下灰色投影保持信息清楚，不再绘制伪元素硬底座；按压保留表面变化与小幅位移。表格等现有结构边界复用普通边框，图表轴线、关系连线和轨道仍是信息内容线。极轻纸纹不能干扰读数，图形内容可保持灰阶。动态关系可启用电流光点、星体公转与自转，保留暂停、静态文本及选择反馈；内容光尾、星体光晕和园区柔焦与扫描灯继续保留。

## 已集成组件

| 组件 | 实现 | 页面可操作项 | 复制依赖 |
| --- | --- | --- | --- |
| `assets/components/ChartStudio.vue` | Apache ECharts 6.0.0，按需导入折线、柱图、坐标系、提示与 SVG renderer | 折线 / 柱图切换；逐系列显示 / 隐藏；图上数据提示；原生展开完整数据表 | Vue 3.5+、`echarts@6.0.0` |
| `assets/components/RelationStudio.vue` | Vue + 原生 SVG，组合 `StellarGraph.vue` 与 Canvas/WebGL `StellarSurface.vue` | 神经／章鱼图电流光点；星空完整轨道；暂停；节点选择；星体皮肤和转速设置 | Vue 3.5+，无新增渲染包 |

这些组件不依赖项目根目录的 UI 封装；复制完整 `assets/components` 后可直接导入。单独复制 RelationStudio 时同时保留相邻 StellarGraph.vue 和 StellarSurface.vue。组件最外层使用 `.panel`；导入 `assets/milk-tokens.css` 提供面板与按钮基础外观。其余样式封装在各自 SFC 的 scoped style 中。面板是无远程接口的可运行示例；替换示例数组时，指标、图表与数据表应继续共用同一数据源。星体表面的渲染 props 见 [动态关系与星空](stellar-relations.md)。

```sh
pnpm add echarts@6.0.0
```

```vue
<script setup lang="ts">
import ChartStudio from './components/ChartStudio.vue'
import RelationStudio from './components/RelationStudio.vue'
import './milk-tokens.css'
</script>

<template>
  <ChartStudio />
  <RelationStudio />
</template>
```

## 图表生命周期与数据约束

ECharts 需在已具宽高的 DOM 上 `init`，通过 `setOption` 更新。示例在 Vue `onMounted` 初始化，监听 `ResizeObserver` 后调用 `resize()`，在 `onBeforeUnmount` 断开监听并 `dispose()`。这可覆盖侧栏折叠等不触发 window resize 的尺寸变化。[官方入门](https://echarts.apache.org/handbook/en/get-started/) 与 [容器和尺寸说明](https://echarts.apache.org/handbook/en/concepts/chart-size/) 支持上述生命周期。

折线适合表达连续趋势，柱图适合比较离散分类。切换类型不能修改数值和统计口径。坐标轴明确单位，基线与网格在浅灰背景上可读；不同系列同时使用灰阶亮度、实虚线或形状区分，图例文字与图形一致。图表标题、指标和表格均明确标注演示数据。真实请求失败时显示错误和重试入口，不能悄悄使用此示例数组。

提示框只补充信息。键盘与辅助技术用户可通过完整数据表读取全部值；系列按钮使用原生 `button` + `aria-pressed`，不冒充 ARIA tabs。图表按需导入 `AriaComponent` 并设置 `aria.enabled`，参考 [官方无障碍说明](https://echarts.apache.org/handbook/en/best-practices/aria/)。`prefers-reduced-motion` 变化时关闭 ECharts 动画，保留全部静态信息。主题与图表选项应共享设计令牌；ECharts 在 `milk-theme-change` 后更新现有图表的颜色选项，数据、单位和选中状态保持，非 CSS 颜色按文本、网格、边界与数据系列角色读取当前主题；已解析的 CSS 令牌不再反相；数据内容线与标记保持清楚，不把容器柔影重复叠到每个数据点。

## 神经图与章鱼图

神经图示例是有方向的分层依赖图：文本 / 图像 → 编码 / 条件 → 融合 → 结果。它展示关系，不声称执行模型推理或显示真实权重。真实神经网络结构应接入实际层、张量形状、连接方向与结果。

这里的“章鱼图”明确指中心 + 多分支的放射关系图，适合表现能力地图与导航入口；它并不是一个固定标准或对某第三方库的别名。中心节点为中枢，分支表示能力，连线不自动代表训练权重或工作流执行顺序。

图节点采用灰白圆形表面与半透明白色套圈，用柔和高光、投影、尺寸与刻度构造表现层级。中心节点略大，灰色选中环与关联线共同反馈状态；文字保持深蓝灰实心字且清楚。电流光点保留白色亮核、灰色轮廓与光尾，不引入彩色线条。图形点击与下方原生按钮完成相同选择，详情通过 polite 状态区更新。每个实例通过 Vue useId 保持内容光效 filter、marker 与无障碍描述的 ID 唯一。

神经和章鱼连线的电流光点沿真实路径从源到目标移动。星空模式将中心与分支呈现为有不同皮肤的星体，支持自转与围绕主体公转；具体组件、控制与生命周期见 [动态关系与星空](stellar-relations.md)。这些动画表达关系方向与层次，示例速度和轨道不代表真实天体测量。

窄屏中关系图保持可读最小宽度，在自己的画布内横向滚动；页面本身不得横向溢出。图下按钮自动换行，详情保持正文尺寸。节点很多时使用分层、过滤、折叠与查找，避免将上百个节点压进一个固定尺寸画布。

## 从关系图进入可编辑工作流

仅表达关系时使用上述关系组件。需要拖动节点、连接端口、缩放平移、历史记录、JSON 导入导出和运行反馈时，使用项目的工作流编辑器及其参考规范。关系图的“选中节点”不等于可执行工作流；本页神经图、章鱼图均不调用 ComfyUI 或远程推理服务。

## 来源与许可

ECharts 6.0.0 为 Apache License 2.0；核对 [官方 6.0.0 LICENSE](https://github.com/apache/echarts/blob/6.0.0/LICENSE) 与 [NOTICE](https://github.com/apache/echarts/blob/6.0.0/NOTICE)。本技能提供自己的 Vue 集成源码与 npm 依赖声明，不将 ECharts 源码复制进技能。分发包含 ECharts 的网站构建或第三方代码时保留适用的 LICENSE、NOTICE 与第三方通知；上述示例 UI 不代表 Apache 品牌授权。

记录核对日期：2026-10-09。此处仅锁定实际集成的 ECharts 6.0.0；移植时根据现有工程选择兼容版本，不要求整体升级其他依赖。
