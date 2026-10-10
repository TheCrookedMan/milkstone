# 参与 Milkstone

感谢你帮助完善这个由设计规范、组件与 Agent Skill 组成的工具集。

## 开发环境

使用 Node.js 24.10.0、pnpm 10.18.3 和仓库内锁文件：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

## 修改来源

- 基础组件：编辑 `src/components/ui/`。
- 基础组件示例：编辑 `src/components/shadcn-gallery/` 与目录数据。
- 材质与排版：主题在 `src/styles/shadcn-theme.css`，字阶与尺寸在 `src/styles/shadcn-metrics.css`，材料令牌在技能 `assets/`。
- 领域工作台：编辑 `skills/milk-white-web-design/assets/components/`，落地页直接引用。
- 设计与架构规范：编辑技能 `references/`，同时检查实现是否一致。
- `assets/shadcn-catalog/` 中的组件、样式和示例由根源码同步，避免只修改生成副本。

执行 `pnpm skill:pack` 或 `pnpm build` 后，提交需要同步的技能源码；生成归档及 `dist/` 不进入 Git。

## 提交前检查

```bash
pnpm typecheck
pnpm test
pnpm build
node scripts/validate-skill.mjs
pnpm exec vue-tsc --noEmit -p skills/milk-white-web-design/assets/shadcn-catalog/tsconfig.json
```

UI 修改需检查明暗模式和窄屏，尤其关注嵌套控件、Portal 浮层、长文案、键盘焦点、错误状态和减少动态效果。

## 依赖与来源

新增或调整直接依赖后，更新锁文件，并执行 `pnpm licenses:sync` 同步第三方通知。复制第三方源码时保留版权、许可与版本来源；不要将未知许可的源码或私有素材放入仓库。

## Pull Request

说明用户遇到的问题、最终变化及验证方式。涉及 UI 时附截图；涉及工作流格式时给出最小可复现数据。真实服务与本地模拟应明确区分。

默认按仓库的 MIT 许可贡献项目代码；第三方材料保留原许可。
