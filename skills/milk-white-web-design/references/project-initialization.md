# 初始化
从用户需求确定页面、主操作、内容模型、数据来源及状态。按项目规模使用 assets/project-design-brief.md，而非机械填充所有模块。

新项目优先 Vue 3 + TypeScript + Vite，Tailwind 4 配合 @tailwindcss/vite；多页使用 Router，共享业务状态再启用 Pinia。已有工程保持框架。根工程 pnpm、单一 pnpm-lock.yaml；独立示例自身也只使用一种包管理器。核对 engines 与 peers，不盲目升级。对 vue-demi 等必要脚本显式允许执行。

复制 assets/milk-tokens.css 时同时保留 assets/theme-colors.css 和 assets/theme-controller.ts，启动时调用 initTheme；需要切换入口时接入 assets/components/ThemeModeSwitch.vue。默认 light，用户切到 dark 后以 milk-design-theme 记住选择；dark 使用对应深色主题并保留相同实体和凹槽的光照关系，详见 [双模式主题](theme-modes.md)。参考 assets/vue-panel 的最小运行示例。该文件名保留兼容，当前令牌为 #e9eaee 浅灰画布、极轻不规则纸纹与协调灰白柔和拟物材质，具体颜色与状态规则见 [设计系统](design-system.md)。两模式共用组件样式、材料角色与状态行为；dark 的颜色和材质透明度在同一令牌体系内校准，保持左上受光、右下投影，凸面较亮、凹槽较暗，不复制另一套布局或交互。示例只演示材质与按钮，不冒充完整应用架构。不要把示例 package.json 覆盖业务工程。先实现代表性业务流，再扩展范围。交付说明演示数据、未接接口和实际验收。

同时保留 assets/press-controller.ts，在 initTheme() 之后、应用 mount 之前调用一次 initPressFeedback()；将返回的清理函数接入卸载与 HMR dispose。按钮、Tab、开关共享轻微机械阻尼与 milk-tokens.css 中的按下／回位令牌，避免各自注册计时器。时序、触发范围、键盘和减少动态效果规则见 [交互规范](motion-and-network.md)。

与 milk-tokens.css、milk-motion.css 一同引入 assets/milk-focus.css，在应用入口调用一次 assets/focus-controller.ts 的 initFocusBorder()，并将返回清理函数接入卸载与 HMR dispose。共享控制器将已有焦点边框呈现为冷白蓝流动荧光，不在组件内重复注册监听；仅成功装饰时移除额外外围焦点框，未接管时保留可见键盘 outline 回退。减少动态效果与强制颜色模式保留静态可辨边界，具体范围与复合输入规则见 [交互规范](motion-and-network.md)。
