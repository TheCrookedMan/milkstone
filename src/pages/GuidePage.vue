<template>
  <main id="main-content" tabindex="-1" class="guide">
    <div class="eyebrow">MILKSTONE / GET STARTED</div>
    <h1>从一页开始，把触感带入项目。</h1>
    <p>下载并解压技能包，将 milk-white-web-design 文件夹放入目标 Agent 的 skills 目录。也可以在本工程中使用 CLI 安装到当前项目：</p>
    <pre><code>node bin/milk-white-web-design.mjs install --agent codex --project</code></pre>
    <p>在 Agent 中调用：</p>
    <code>$milk-white-web-design 为我的产品实现纸感界面，支持明暗主题与实体交互。</code>
    <p>从纸纹、光影和轻压回弹开始，统一卡片、按钮与内凹输入框的触感。纸白与石墨共用尺寸、间距和交互节奏，保持同一光源下的凸起与凹槽；页头开关会记住你的主题选择。</p>
    <p>技能包含 70 项 shadcn-vue 组件演示、刻度控件、ECharts 图表、电流关系图、轨道星空、园区雷达和 Vue Flow 节点工作流。新项目优先采用 Vue 3、TypeScript、Vite 与 Tailwind 4；已有项目保留原框架，按需引入材质与交互规范。</p>
    <p>体验独立组件沙盒时，请复制完整 assets 目录，在 assets/component-lab 中运行 pnpm install --frozen-lockfile，再运行 pnpm dev。各示例的启动方式见对应 README。</p>
    <p>工作流支持 ComfyUI 0.4 子集的导入导出与本地模拟，未连接图像生成后端。落地页中的表单、收藏和示例数据用于交互演示。下载包由 skills/milk-white-web-design 源码构建。</p>
    <div class="row">
      <a class="pill primary" href="/milk-white-web-design.skill" download>下载技能包 ↓</a>
      <RouterLink class="pill" :to="{path:'/',hash:'#stack'}">查看技术栈与组件</RouterLink>
    </div>
    <p><a href="/design-sources.md">来源与许可证说明 ↗</a></p>
  </main>
</template>
