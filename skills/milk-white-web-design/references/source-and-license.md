# 本项目来源
Milkstone 于 2026-10-09 从项目维护者提供的本地 neural-web-landing 基础复制并改造，参考原技能 neural-web-design.skill。复用 Vue 工程架构、安装器、打包工具和测试。纸白／石墨设计令牌、页面、控件规范与技能入口为本项目适配内容。没有继承源 Git 元数据或远程目标。

2026-10-10 起，本项目公开版本的代码和文档采用随技能分发的 [MIT 许可](../LICENSE)。第三方代码、字体和依赖保留各自版权与许可，不由项目许可重新授权。下文“来源、范围与许可”部分保留历史设计研究的来源事实；其中外部项目的许可与本项目的独立实现分别适用。

## 本轮 shadcn-vue 本地组件来源

2026-10-09 为完整组件目录引入 [shadcn-vue 官方仓库](https://github.com/unovue/shadcn-vue) 的 `new-york-v4` registry 本地源码：66 套、447 个文件；旧版 Toast 另保留 10 个文件，对应 [旧版文档](https://v3.shadcn-vue.com/docs/components/toast)。官方 [组件目录](https://www.shadcn-vue.com/docs/components) 当前 70 项的覆盖与组合方式见 [shadcn-vue 组件目录](shadcn-catalog.md)。

这些上游基础组件适用 shadcn-vue 的 [MIT 许可](https://github.com/unovue/shadcn-vue/blob/dev/LICENSE)，版权归属为 `Copyright (c) 2023 unovue`，分发时保留原版权和许可原文。白纸浅色 `shadcn-theme.css`、实体令牌、演示数据和落地页编排是本项目的适配内容。项目 MIT 许可不替代上游版权声明，也不改变下述历史来源材料的许可。

分发位置是 `assets/shadcn-catalog/`，与根工程实际展示的本地源码同步；许可证原文随分发保留。安装后的技能应复制到工作目录再安装依赖。

## Hairline 空状态示例

2026-10-10 使用已安装的 `hairline-create` 制作空托盘示例。Hairline 的固定引擎与演示页面版权为 `Copyright (c) 2026 Lucas Marques`，适用 [随图保留的 MIT 许可](../assets/shadcn-catalog/src/components/shadcn-gallery/hairline/LICENSE.txt)。自包含 HTML 保留原始 kernel 和 bench；明暗 SVG 是该图形静止姿态的渲染快照。空托盘几何、Vue 承载与业务空状态组合由 Milkstone 编写。复用方法见 [空状态插图](empty-state-illustrations.md)。

# 来源、范围与许可

提炼日期：2026-10-09。

## 固定来源

- [neural-creator-dashboard](https://github.com/luoluo-121/neural-creator-dashboard)，固定 [769d690fa1c06d985926d8f16772d15514b718e1](https://github.com/luoluo-121/neural-creator-dashboard/tree/769d690fa1c06d985926d8f16772d15514b718e1)，package 0.2.0。
- 维护者提供的前端架构材料：仅提炼通用工程结构，不分发原文、内部业务名称或本地路径。
- 官方复核：[Vue lifecycle](https://vuejs.org/api/composition-api-lifecycle.html)、[GSAP context](https://gsap.com/docs/v3/GSAP/gsap.context()/)、[Tailwind theme](https://tailwindcss.com/docs/theme)。

## 源码索引

路径均相对于固定提交。

| 来源 | 提炼内容 | 不搬入 |
| --- | --- | --- |
| src/neural/theme.js | 银灰暗色、金色焦点、柔和语义色、玻璃 | 原资产 URL 和品牌绑定 |
| src/neural/neural.css | 顶栏、胶囊、卡片、编辑器、详情、响应式 | 整份 CSS、过小文字、隐藏重要控件 |
| src/neural/Home.jsx | 光球→水母→内容、三级状态、弹簧、暂停和视频绘制经验 | React 代码、固定五模块、媒体、过长入场 |
| src/neural/NetworkCanvas.jsx | 方向脉冲、关系强度、显现、DPR、容错 | 逐帧代码原文、固定粒子数量和图数据 |
| src/neural/graph.js | 稳定节点、引用与互引、关系从内容派生 | 笔记专用解析和隐含 AI 能力 |
| src/neural/Analysis.jsx | 详情和图关系、进入动效 | 原指标、计数、业务文案 |
| src/neural/main.jsx、pages.jsx | 公共壳、作品／编辑／选题的统一视觉 | 固定页面、品牌和写入习惯 |
| skills/neural-creator-dashboard/SKILL.md | 数据先行、令牌集中、场景验收、私有数据区分 | 原 skill 文本、React 安装、Obsidian 导入、部署流程 |
| AGENTS.md | 单帧错误不留空白、视频 Canvas 兼容、实看验证 | “光球和固定五水母必须持续运动”等原仓库专用限制 |

来源观测：底色 #0d0e0e、文字 #ecece9、金色 #e6cf98、16px 面板；光球 halo 约 5.5s，卡片 hover 约 -3px，详情约 .75s，dt 限 0..1/30。新令牌、较短业务动画、可停动效和列表回退属于本包适配，不声称原样复刻。

## 许可区别

当前 [LICENSE](https://github.com/luoluo-121/neural-creator-dashboard/blob/769d690fa1c06d985926d8f16772d15514b718e1/LICENSE) 是 **PolyForm Noncommercial 1.0.0**，有非商用限制，不能概括为当前版本无条件 MIT／自由商用开源。

[NOTICE.md](https://github.com/luoluo-121/neural-creator-dashboard/blob/769d690fa1c06d985926d8f16772d15514b718e1/NOTICE.md) 声明旧 0.1.0 提交 `20d06c9c3a12c0c9a38713a842cafca58a445190` 曾按 MIT 分发。早期材料的既有权利有对应例外，0.2.0 新增／变更不因此全部变成 MIT。未来复用旧代码需确认具体内容的来源版本，保留对应许可和版权。

来源版权标识：`Copyright (c) 2026 luoluo-121 and neural-creator-dashboard contributors`。

原光球／水母媒体涉及 AI 生成平台和原项目授权，本包未包含。本包文档是设计与工程提炼，原有实体令牌和领域 Vue 示例为独立编写，不是 React 源码、原 skill 和原媒体重新打包；新增 shadcn-vue 基础组件按上文记录来源和许可。改名或换技术栈不构成原材料的商用授权；将来直接复制或改编原代码／素材，应落实具体版本及范围的许可。

本包不修改目标业务项目，也不需要保留提炼时的仓库或附件，来源链接和架构摘要均可随包复用。
