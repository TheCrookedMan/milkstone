# 在线发布

Milkstone 是静态 Vue / Vite 网站，无需数据库、服务端密钥或后端运行时。落地页、组件演示、使用指南、Hairline 交互 HTML 和三个 Agent Skill 下载包均由同一次构建产出。

## GitHub Pages

公共演示地址：[thecrookedman.github.io/milkstone](https://thecrookedman.github.io/milkstone/)。仓库的 Pages 工作流在 `main` 更新后构建并发布生产版本，也可从 Actions 页面手动运行。

仓库 Settings → Pages 的发布来源选择 **GitHub Actions**。工作流使用 Node.js 24.10.0 和 pnpm 10.18.3，执行：

```bash
pnpm install --frozen-lockfile
pnpm run build --base=/milkstone/
```

构建会先执行 `prebuild`，同步技能资产并生成三个归档，再运行 Vite，最后将 `dist/` 上传为 Pages 产物并发布。保留完整 `pnpm` 构建流程，直接运行 `vite build` 不会自动生成技能包。

工作流通过 GitHub 提供的令牌和 OIDC 部署，需要 `contents: read`、`pages: write`、`id-token: write` 权限及 `github-pages` 环境，无需添加部署密钥或账号令牌。

### 子路径、路由与下载

Pages 将本项目放在 `/milkstone/` 子路径。构建的 `base` 会调整图片、字体和脚本等资源路径；页面里的技能下载与来源说明链接使用 `import.meta.env.BASE_URL`，保持在同一子路径内。

若账号的用户站点配置了自定义域名，未单独绑定域名的项目站点会继承该域名，并保留 `/milkstone/` 子路径。为本项目单独绑定域名时，还需配置域名 DNS，并按实际发布路径调整构建 `base`。参见 GitHub 官方的 [域名继承说明](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)与 [DNS 配置步骤](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)。

网站使用 Hash 路由，例如 `/milkstone/#/guide`、`/milkstone/#/#shadcn` 和 `/milkstone/#/#empty-states`，无需将请求重写到首页。Hairline 独立 HTML 保留直接访问能力。

三个技能包随页面发布，下载按钮保留 `download` 属性：

- `/milkstone/milk-white-web-design.skill`
- `/milkstone/milk-white-web-design.skill.zip`
- `/milkstone/milk-white-web-design.tar.gz`

`vercel.json` 中的附件响应头和 `no-store` 仅适用于 Vercel，不会应用到 GitHub Pages。

## 可选：Vercel

在 Vercel 中导入 `TheCrookedMan/milkstone`，根目录保留仓库根目录，Node.js 选用 24.x。仓库的 `vercel.json` 声明了 Vite 框架、固定 pnpm 10.18.3 的安装与构建命令，以及 `dist` 输出目录，无需另外填写环境变量。

```bash
npx --yes pnpm@10.18.3 install --frozen-lockfile
npx --yes pnpm@10.18.3 run build
```

Vercel 使用域名根路径，不需要 Pages 的 `--base=/milkstone/`。将 `main` 设置为生产分支后，连接该仓库的项目可随提交自动更新。三个技能下载路径由 `vercel.json` 设置附件响应头和 `no-store`。

也可在仓库根目录通过 CLI 关联项目并发布：

```bash
pnpm dlx vercel login
pnpm dlx vercel link
pnpm dlx vercel --prod
```

`.vercel/` 是被 Git 忽略的本机项目关联配置。不要将账号令牌写入仓库。

## 发布后核对

打开公开地址，检查首页、组件目录、明暗切换、空状态示例与使用指南。下载三个归档，确认返回 200、文件名正确，且内容与本次构建的技能源码一致。检查 Hairline 独立 HTML 能打开。

参考：[Vite 部署到 GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Vercel 项目配置](https://vercel.com/docs/project-configuration/vercel-json)、[Vercel 包管理器选择](https://vercel.com/docs/package-managers)、[Vercel CLI 发布](https://vercel.com/docs/cli/deploy)。
