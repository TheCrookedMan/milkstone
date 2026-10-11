import manifest from '../../package.json'

const dependencies = manifest.devDependencies

export const skillOverview = {
  version: manifest.version,
  stats: [
    { value: '05', label: '组件工作台' },
    { value: '03', label: '关系图模式' },
    { value: '05', label: '星体皮肤' },
    { value: '70', label: 'shadcn 组件' },
  ],
  groups: [
    {
      id: 'foundation', label: '基础工程', index: '01', summary: '为每一层界面，铺好基础。',
      items: [
        { name: 'Vue', version: dependencies.vue, role: '以组件组织界面，让同一份材质与交互在不同页面复用。' },
        { name: 'TypeScript', version: dependencies.typescript, role: '约束组件参数与流程数据，让连接与编辑更可靠。' },
        { name: 'Vite', version: dependencies.vite, role: '启动本地预览，按需加载页面，生成可交付的构建。' },
        { name: 'Tailwind CSS', version: dependencies.tailwindcss, role: '用间距、比例和设计令牌，组织适应不同屏幕的布局。' },
      ],
    },
    {
      id: 'interface', label: '界面交互', index: '02', summary: '让触碰与切换，都有回应。',
      items: [
        { name: 'Vue Router', version: dependencies['vue-router'], role: '连接组件展区、设计规范与使用指南。' },
        { name: 'shadcn-vue', version: '本地源码', role: '70 项组件演示，共用白色、黑色与乳白三种材质主题。' },
        { name: 'Reka UI', version: dependencies['reka-ui'], role: '处理标签切换、键盘导航与浮层焦点，让操作自然衔接。' },
        { name: 'VueUse', version: dependencies['@vueuse/core'], role: '连接响应式属性与系统偏好，让组件随环境调整。' },
        { name: 'GSAP', version: dependencies.gsap, role: '按需编排复杂转场，与内置渐入过渡和减少动态效果规范配合。' },
        { name: 'Milk 设计令牌', version: 'CSS', role: '统一纸面、凸面与凹槽的色调和光影，让明暗主题保持同一触感。', kind: '技能内置 · milk-tokens.css' },
      ],
    },
    {
      id: 'graphics', label: '图形与工作流', index: '03', summary: '让数值、关联与想法，逐层成形。',
      items: [
        { name: 'Apache ECharts', version: dependencies.echarts, role: '折线与柱形共用数据源，联动图例、读数和明细表。' },
        { name: 'Unovis', version: dependencies['@unovis/vue'], role: '为组件图表提供坐标、系列与悬浮读数。' },
        { name: 'TanStack Table', version: dependencies['@tanstack/vue-table'], role: '处理表格排序、筛选和分页，让内容易于查找。' },
        { name: 'Vue Flow', version: dependencies['@vue-flow/core'], role: '节点拖动、连线与参数编辑，支持 ComfyUI 0.4 子集导入导出及本地模拟。' },
        { name: 'SVG / Canvas / WebGL', version: '浏览器原生', role: '绘制电流路径、轨道星体与园区扫描；星体支持 Canvas 2D 回退。' },
        { name: 'hairline-create', version: 'Prompt 生成 · 可复用图库', role: '模型按提示词生成等距线稿，经固定引擎校验与预览后保存；已有作品直接复用。', kind: '生成需连接模型服务 · 复用无需调用模型' },
      ],
    },
    {
      id: 'delivery', label: '运行与交付', index: '04', summary: '从本地预览，到下一张界面。',
      items: [
        { name: 'Node.js', version: manifest.engines.node, role: '驱动本地预览、构建与技能安装。' },
        { name: 'pnpm', version: manifest.packageManager.split('@')[1], role: '管理工程与沙盒的依赖和锁文件；最小面板示例使用 npm。' },
        { name: 'vue-tsc', version: dependencies['vue-tsc'], role: '检查 Vue 组件与 TypeScript 接口，提早发现参数问题。' },
      ],
    },
  ],
  choices: [
    { name: `Pinia ${dependencies.pinia}`, note: '入口已配置，可按项目需要加入共享状态。' },
    { name: 'Three.js / TresJS', note: '需要更复杂的 3D 场景时选用；当前星体采用原生 WebGL。' },
  ],
  capabilities: [
    { index: '00', title: 'shadcn-vue 组件集', description: '70 项交互示例，归于一套材质与触感。', href: '#shadcn' },
    { index: '01', title: '实体控件', description: '刻度旋钮、凹槽导航与轻压回弹的按键。', href: '#instruments' },
    { index: '02', title: '数据图表', description: '在折线与柱形之间，查看趋势与明细。', href: '#charts' },
    { index: '03', title: '关系与星空', description: '沿电流追寻关联，循轨道探索星体。', href: '#relations' },
    { index: '04', title: '园区雷达', description: '柔焦楼群与 XYZ 坐标，五秒一圈的逐层光扫。', href: '#campus' },
    { index: '05', title: '节点工作流', description: '连接节点、调整参数，预演一条流程。', href: '#workflow' },
    { index: '06', title: '空状态插图', description: '按提示词生成线稿，保存为图库，在不同空状态中复用。', href: '#empty-states' },
    { index: '07', title: '运行与使用', description: '从本地启动到组件接入，找到下一步。', href: '#skill-guide' },
  ],
  commands: [
    { label: '本地预览 · 在项目根目录执行', command: 'pnpm install --frozen-lockfile\npnpm dev' },
    { label: '检查与交付 · 同步构建技能包', command: 'pnpm typecheck\npnpm build' },
    { label: '独立工作台 · 先复制技能的完整 assets 目录', command: 'cd component-lab\npnpm install --frozen-lockfile\npnpm dev' },
    { label: '使用技能 · 安装后发送给 Agent', command: '$milk-white-web-design 为我的产品实现纸感界面，支持白色、黑色与乳白主题和实体交互。' },
  ],
}
