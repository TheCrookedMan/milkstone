# 发布到 Vercel

Milkstone 是静态 Vue / Vite 网站，无需数据库、服务端密钥或后端运行时。落地页、组件演示、使用指南、Hairline 交互 HTML 和三个 Agent Skill 下载包均由同一次构建产出。

## 从 GitHub 导入

在 Vercel 中导入 `TheCrookedMan/milkstone`，根目录保留仓库根目录，Node.js 选用 24.x。仓库的 `vercel.json` 声明了 Vite 框架、固定 pnpm 10.18.3 的安装与构建命令，以及 `dist` 输出目录，无需另外填写环境变量。

构建会先执行 `prebuild`，同步技能资产并生成三个归档，再运行 Vite。请保留完整构建命令，不要直接改为 `vite build`，否则技能包不会自动生成。

```bash
npx --yes pnpm@10.18.3 install --frozen-lockfile
npx --yes pnpm@10.18.3 run build
```

将 `main` 设置为生产分支后，连接该仓库的 Vercel 项目可随提交自动更新。部署生成的生产域名可直接访问页面。

## 使用 CLI 发布

也可以在仓库根目录登录 Vercel，关联或创建 `milkstone` 项目，再发布生产版本：

```bash
pnpm dlx vercel login
pnpm dlx vercel link
pnpm dlx vercel --prod
```

`.vercel/` 是本机项目关联配置，已被 Git 忽略。不要将账号令牌写入仓库。

## 路由与下载

网站使用 Hash 路由，例如 `/#/guide`、`/#/#shadcn` 和 `/#/#empty-states`，无需将全部请求重写到首页。构建生成的 Hairline HTML 也需要保留直接访问能力。

以下下载路径由 `vercel.json` 设置附件响应头和 `no-store`，避免把技能包当作网页打开或长期缓存旧版本：

- `/milk-white-web-design.skill`
- `/milk-white-web-design.skill.zip`
- `/milk-white-web-design.tar.gz`

## 发布后核对

打开生产域名，检查首页、组件目录、明暗切换、空状态示例与使用指南。下载三个归档，确认返回 200、附件文件名正确，且内容与本次构建的技能源码一致。检查 Hairline 独立 HTML 能打开。

参考：[Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)、[项目配置](https://vercel.com/docs/project-configuration/vercel-json)、[包管理器选择](https://vercel.com/docs/package-managers)、[CLI 发布](https://vercel.com/docs/cli/deploy)。
