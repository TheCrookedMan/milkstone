# Milkstone

**纸上成形，触感有度。**

融合前端工程架构、实体感 UI 组件、设计规范、可视化工作台与 Agent Skill 的 Vue Web 设计工具集。

*A tactile Vue design system combining editable UI components, visual workbenches, frontend architecture, and a portable Agent Skill.*

[![License: MIT](https://img.shields.io/badge/License-MIT-555b66.svg)](LICENSE)
[![CI](https://github.com/TheCrookedMan/milkstone/actions/workflows/ci.yml/badge.svg)](https://github.com/TheCrookedMan/milkstone/actions/workflows/ci.yml)
[![Vue 3](https://img.shields.io/badge/Vue-3-555b66.svg)](https://vuejs.org/)
[![shadcn-vue](https://img.shields.io/badge/shadcn--vue-70_components-555b66.svg)](docs/shadcn-registry-source.json)

[快速开始](#快速开始) · [组件与工作台](#组件与工作台) · [设计规范](#设计规范) · [Agent Skill](#agent-skill) · [下载技能包](https://github.com/TheCrookedMan/milkstone/releases/latest)

## 为什么叫 Milkstone

**Milk** 对应冷灰纸白、柔和高光与细腻表面，**Stone** 对应石墨暗色、实体厚度与稳定的按压反馈。两种明暗共享一套材料角色、布局和交互规则。

Milkstone 将可运行的页面、可编辑的组件源码和可供 Agent 复用的规范放在同一个工程中。你可以浏览组件、复制领域工作台，也可以安装技能，让 Agent 按相同的设计语言完成后续页面。

## 界面预览

下图为仓库中真实运行的 Card、按钮、搜索框和分类导航。明暗模式保持相同的凸起与凹槽关系。

| 纸白 / Light | 石墨 / Dark |
| --- | --- |
| ![纸白模式的组件与卡片](docs/images/components-light.jpg) | ![石墨模式的组件与卡片](docs/images/components-dark.jpg) |

## 组件与工作台

| 模块 | 已实现能力 |
| --- | --- |
| **shadcn-vue 组件目录** | 70 项交互演示，支持中英文搜索、分类筛选；按钮、Card、表单、Tabs、表格、日历、导航、浮层等共享材质与排版规范 |
| **实体控件** | 刻度旋钮、蚀刻标签、胶囊按键、凹槽导航、开关及轻压回弹反馈 |
| **数据图表** | ECharts 折线与柱形切换、系列显隐、数据明细；组件目录另含 Unovis Chart 和 TanStack Data Table |
| **关系与星空** | 神经网络、章鱼图、星空三种模式；沿路径移动的电流光点、轨道、自转、公转及五类可配置星体皮肤 |
| **园区雷达** | 原生 Canvas 2D 柔焦等距建筑、粒子、XYZ 坐标、每五秒一圈的扫描和楼层亮起效果 |
| **节点工作流** | Vue Flow 节点拖动、连线、参数编辑、JSON 导入导出及本地拓扑模拟 |
| **Agent Skill** | 设计、架构、交互和验收规范，可复用源码、三个独立示例以及技能安装与导出工具 |

70 项组件以 **2026-10-09 核对的 shadcn-vue 官方目录**为基准；本地来源、版本与适配方式记录在[组件来源清单](docs/shadcn-registry-source.json)中。

星体使用程序生成的 WebGL 球面材质，并提供 Canvas 2D 回退。工作流支持明确的 **ComfyUI Workflow JSON 0.4 子集**，详见[格式与接入范围](skills/milk-white-web-design/references/workflow-editor.md)。

## 快速开始

完整开发与测试建议使用 **Node.js 24.10.0** 和 **pnpm 10.18.3**，与本项目验证环境及 CI 一致。工程声明的运行基线见 [package.json](package.json)。

```bash
git clone https://github.com/TheCrookedMan/milkstone.git
cd milkstone
pnpm install --frozen-lockfile
pnpm dev
```

打开 [http://127.0.0.1:4340/](http://127.0.0.1:4340/)。开发和预览服务默认监听 `0.0.0.0:4340`，同一局域网中的电脑可使用启动终端显示的 Network 地址访问。

仅需本机访问时：

```bash
pnpm dev --host 127.0.0.1
```

| 本地入口 | 内容 |
| --- | --- |
| `/#/#stack` | 技术栈与技能能力 |
| `/#/#shadcn` | 70 项基础组件 |
| `/#/#instruments` | 实体控件 |
| `/#/#charts` | 数据图表 |
| `/#/#relations` | 关系与星空 |
| `/#/#campus` | 园区雷达 |
| `/#/#workflow` | 节点工作流 |
| `/#/#theme` | 明暗设计规范 |
| `/#/guide` | 使用指南 |

### 检查与构建

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

`pnpm dev` 和 `pnpm build` 会先自动同步独立组件目录并生成技能包。生产静态文件输出到 `dist/`；使用 Hash 路由，可放到支持静态文件的站点根路径。

## 技术架构

| 层级 | 技术与职责 |
| --- | --- |
| 工程基础 | Vue 3、TypeScript、Vite 8、Tailwind CSS 4、Vue Router |
| UI 与可访问交互 | 本地 shadcn-vue 源码、Reka UI、VueUse、Lucide |
| 数据与图形 | ECharts、Unovis、TanStack Table、SVG、Canvas 2D、原生 WebGL |
| 节点编辑 | Vue Flow 与独立的 ComfyUI 格式适配器 |
| 状态与动效 | Vue 响应式状态、已注册的 Pinia 入口、主题控制器、共享按压控制器、GSAP 首屏入场 |
| Agent 交付 | SKILL.md、参考规范、可复用资产、Node.js 安装器、ZIP / tar.gz 归档 |

```text
milkstone/
├── src/
│   ├── app/                         应用壳
│   ├── pages/                       落地页与指南
│   ├── router/                      Hash 路由
│   ├── components/ui/               shadcn-vue 本地组件源码
│   ├── components/shadcn-gallery/   基础组件交互示例
│   ├── data/                        组件目录与技术栈
│   └── styles/                      共享材质、间距和字阶
├── skills/milk-white-web-design/
│   ├── SKILL.md
│   ├── references/                  设计、架构、交互、接入与验收
│   └── assets/
│       ├── components/              五个领域工作台及其支持模块
│       ├── vue-panel/               最小 Vue 示例
│       ├── component-lab/           领域组件沙盒
│       └── shadcn-catalog/          独立基础组件目录
├── bin/                             本地 CLI
├── lib/                             安装与归档
├── scripts/                         源码同步、打包与校验
├── tests/                           安装器、工作流、主题和按压测试
├── docs/                            接入说明、来源和预览
└── public/licenses/                 第三方许可文本
```

领域组件以技能资产中的文件为开发来源，落地页直接引用。基础组件以根工程 `src/` 为开发来源，打包时同步到独立 `shadcn-catalog`，避免演示与交付内容分叉。

## 设计规范

- **材料与光照**：冷灰纸白 / 石墨暗色，轻微纸纹；左上受光、右下柔影。Card 浮起，输入框和 Tabs 槽位内收，选中拨片浮起。
- **间距**：使用 4、8、12、16、24、32px 节奏；标签与控件 8px，独立分区 24px，操作区 12px。
- **字阶**：辅助文字 12px、标签与普通按钮 13px、正文 14px、次标题 16px、Card 标题 18px、弹层标题 20px。
- **尺寸**：普通控件 44px、small 36px、图标按钮 40px、Tabs 拨片 40px；日历与嵌入控件保留专用密度。
- **按压**：90ms 按下、至少 88ms 反馈、320ms 回位；普通按钮下沉 1.5px、缩放至 0.985。
- **明暗一致**：共用几何、层级与状态规则，按材料角色切换配色，保留相同的凸起和凹槽感。
- **键盘与动态偏好**：保留 Reka 的键盘、ARIA 和焦点管理；输入焦点通过内凹材质反馈，普通按钮与链接保留可见键盘焦点；支持减少动态效果。

详细说明：[设计规范](skills/milk-white-web-design/references/design-system.md) · [双模式主题](skills/milk-white-web-design/references/theme-modes.md) · [交互与动画](skills/milk-white-web-design/references/motion-and-network.md) · [组件目录规范](skills/milk-white-web-design/references/shadcn-catalog.md)。

## Agent Skill

项目公开名称为 **Milkstone**；现有 **`milk-white-web-design` Skill ID、CLI 文件名和归档名保持兼容**。安装器在用户主动执行时写入目标目录，支持预演，默认拒绝覆盖已有内容；`--replace` 更新时保留备份。

### 安装到目标项目

先进入你需要开发的业务项目，再执行本仓库中的 CLI：

```bash
cd /path/to/your-project

# Codex 项目技能
node /path/to/milkstone/bin/milk-white-web-design.mjs install --agent codex --project

# Claude Code 项目技能
node /path/to/milkstone/bin/milk-white-web-design.mjs install --agent claude-code --project

# 其他兼容 SKILL.md 的宿主：明确指定技能目录
node /path/to/milkstone/bin/milk-white-web-design.mjs install --target /path/to/skills
```

可以先添加 `--dry-run` 查看目标，个人安装可使用 `--global`。项目路径分别为 `.agents/skills/` 与 `.claude/skills/`。

安装后在支持的 Agent 中调用：

```text
$milk-white-web-design 为我的产品实现纸感界面，支持明暗主题与实体交互。
```

ChatGPT 桌面插件注册、其他宿主路径与实际验证范围见 [Agent 接入说明](docs/agent-installation.md)。文件写入与宿主实际启用分别验证。

### 导出技能包

在 Milkstone 仓库根目录执行：

```bash
pnpm skill:pack
```

生成内容一致的三个归档：

```text
public/milk-white-web-design.skill
public/milk-white-web-design.skill.zip
public/milk-white-web-design.tar.gz
```

也可以指定输出位置：

```bash
node bin/milk-white-web-design.mjs export --format skill --out milk-white-web-design.skill
node bin/milk-white-web-design.mjs export --format zip --out milk-white-web-design.skill.zip
node bin/milk-white-web-design.mjs export --format tgz --out milk-white-web-design.tar.gz
```

可从 [GitHub Releases](https://github.com/TheCrookedMan/milkstone/releases) 下载构建后的技能包。目前使用仓库内 CLI，尚未发布 npm 包。

### 独立运行示例

将技能的 **整个 `assets/` 目录**复制到工作目录，再运行对应示例，保留组件和令牌的相对路径：

```bash
# 在复制后的 assets 目录中
cd component-lab
pnpm install --frozen-lockfile
pnpm dev
```

`shadcn-catalog/` 已包含独立运行所需源码，也可单独复制后使用 pnpm。最小 `vue-panel/` 示例使用 `npm ci` 与 `npm run dev`。请在工作副本中安装依赖，保持技能资产目录便于复用和打包。

## 当前范围

页面中的表单、收藏、星体配置与工作流用于本地交互演示，未连接业务后端。主题选择保存在浏览器本地。

工作流不包含 ComfyUI 服务、模型权重或真实图像生成；不支持 API prompt 格式及未声明的工作流版本。神经图呈现关系示例，园区场景使用原创演示建筑。Pinia 已注册，具体业务 store 可按需增加；Three.js / TresJS 是可选扩展路线。

本仓库提供源码和技能分发，公共演示站点尚未部署。验证范围与已知限制见 [验证记录](docs/verification.md)。

## 参与贡献

欢迎通过 Issue 描述场景或通过 Pull Request 改进组件。开发来源、同步要求和提交前检查见 [贡献指南](CONTRIBUTING.md)。

## 许可与来源

本项目代码与文档采用 [MIT License](LICENSE)。第三方组件、字体和依赖保留各自版权及许可，包括 shadcn-vue 的 MIT、字体 OFL、ECharts 的 Apache-2.0，以及 GSAP 的独立许可。

[第三方声明](public/third-party-notices.md) · [项目来源与许可范围](LICENSE-NOTICE.md) · [技能来源说明](skills/milk-white-web-design/references/source-and-license.md)。
