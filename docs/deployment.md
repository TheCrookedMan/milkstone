# 在线发布

Milkstone 的 Vue / Vite 页面可独立静态部署。落地页、组件演示、使用指南、附带 Hairline 交互 HTML 和三个 Agent Skill 下载包均由同一次构建产出。自定义 Prompt 生成空状态线稿是可选扩展，需要另行运行 Node API 并配置真实大模型；已有图库和静态展示不依赖该服务。

现有演示入口：[国内站](https://milkstone.dipp.cc/)（1Panel / OpenResty）与 [GitHub Pages](https://thecrookedman.github.io/milkstone/)。

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

## Gitee 国内镜像与国内站点

源码镜像：[gitee.com/theCrookedMan/milkstone](https://gitee.com/theCrookedMan/milkstone)。仓库从 GitHub 导入，保留 `main`、标签与提交历史；GitHub 是当前上游，CI 和已发布的在线演示继续由 GitHub Actions 管理。

本地为两个平台分别保留远程地址，日常同步 `main` 和标签即可：

```bash
git remote add gitee https://gitee.com/theCrookedMan/milkstone.git
git push origin main
git push gitee main
git push gitee --tags
```

已有 `gitee` 远程地址时无需重复添加。推送需使用本机已配置的 Gitee Git 认证，不要把账号令牌写入代码或远程 URL。若镜像出现独立提交，先检查差异再同步，避免强推覆盖。

截至 2026-10-11，Gitee 官方帮助中心将 [Gitee Pages、Pages Pro 和单页面应用托管](https://gitee.com/help.com/) 均标为“功能已下线”。因此此 Gitee 仓库不提供 Pages 在线地址，不能通过推送 `dist/` 或更改分支恢复服务。

其他静态托管选择包括腾讯 **EdgeOne Makers（原 Pages）**。以下为可选接入配置；当前国内演示使用下文的 1Panel 自有服务器。在 Makers 连接本仓库后，使用仓库根目录、生产分支 `main`、Node.js 24.x，并配置：

```bash
# 安装命令
npx --yes pnpm@10.18.3 install --frozen-lockfile
# 构建命令
npx --yes pnpm@10.18.3 run build
```

输出目录为 `dist`。域名根路径发布使用默认 `base=/`，不要沿用 GitHub Pages 的 `--base=/milkstone/`；Hash 路由、独立 HTML 与技能下载均随完整构建产出。平台账号、域名绑定和部署需另行完成；此处配置说明不代表国内站点已上线。

正式国内访问须使用自定义域名：Makers 的默认项目和部署域名在中国大陆只能通过有效期三小时的预览链接访问。选择中国大陆或全球含大陆节点时，自定义域名须已备案；全球不含大陆节点无需备案。参见腾讯官方的 [域名与加速区域要求](https://cloud.tencent.com/document/product/1552/127403)、[价格与套餐](https://cloud.tencent.com/document/product/1552/132790)。

## 1Panel 自有服务器

国内演示 [milkstone.dipp.cc](https://milkstone.dipp.cc/) 已部署在由 1Panel 管理的 OpenResty 独立静态站点，启用 HTTPS、HTTP 自动跳转和证书自动续签。服务器只需提供静态文件服务，按域名根路径构建：

```bash
pnpm install --frozen-lockfile
pnpm build --base=/
```

1. 在 1Panel 创建**静态网站**并绑定目标域名。菜单、证书选项及目录结构以实际安装的面板版本为准，参见官方的 [创建网站说明](https://docs.fit2cloud.com/1panel/user_manual/websites/website-create/)。
2. 打开该网站的配置 → 网站目录，读取实际根目录与运行目录，上传到面板显示的运行目录；不要根据网站代号猜测磁盘路径。将 `dist/` 的**内容**打包为 ZIP 后上传、解压，使 `index.html` 直接位于运行目录内，保持 `assets/`、`licenses/`、独立 HTML 和三个 Skill 归档的相对路径，避免多嵌套一层 `dist/`。保留发布 ZIP 和旧版本备份于网站运行目录之外，便于回退。
3. 默认文档设为 `index.html`。本项目使用 Hash 路由，`/#/guide` 等页面无需配置伪静态或额外首页重写；独立 HTML 和下载文件仍按实际路径访问。网站目录与默认文档的设置参见 [网站配置说明](https://docs.fit2cloud.com/1panel/user_manual/websites/website-config-basic/)。
4. 在域名 DNS 服务商添加子域名的 A 记录，指向服务器公网 IPv4；确认解析已生效，且网站的 HTTP、HTTPS 服务端口可访问。
5. 为网站选择仍有效且覆盖目标域名的已有证书，或通过 1Panel 的 ACME 账户申请新证书。按验证方式完成 HTTP 或 DNS 校验，启用可用的自动续签，并确认续签后的证书会应用到网站。手动 DNS 验证通常还需人工配合，不应视为已完成自动续签配置。证书生效后，在 HTTPS 设置中开启“自动将 HTTP 跳转到 HTTPS”。参见官方的 [证书申请说明](https://docs.fit2cloud.com/1panel/user-manual/websites/certificate-create/)。
6. 发布后通过域名检查 HTTPS、首页及 Hash 路由，确认 JS、CSS、图片、字体和独立 HTML 均正常加载，再核对三个 Skill 下载返回 200 且内容匹配本次构建。

当前服务器采用静态文件发布，推送 GitHub 或 Gitee 不会自动更新此站点。后续版本重复构建、备份、上传和核对步骤；需要自动发布时另行配置部署流程。

## 可选：Hairline 模型生成 API

静态发布不会启动模型服务，也不会自动提供模型密钥。GitHub Pages 可连接独立 HTTPS API；1Panel 自有服务器可以在现有静态站点旁运行 `server/hairline-server.mjs`，让浏览器通过同域 `/api/hairline/` 访问。生成服务和固定运行时也随 Skill 的 `assets/hairline-service/` 分发。

在网站公开目录之外保存服务源码、环境配置和可写缓存，使用 Node.js 24.x 和自己的进程管理方式持续运行服务。环境文件示例：

```dotenv
NODE_ENV=production
HAIRLINE_HOST=127.0.0.1
HAIRLINE_PORT=4341
HAIRLINE_MODEL_BASE_URL=https://your-model-provider.example/v1
HAIRLINE_MODEL_API_KEY=your-server-side-api-key
HAIRLINE_MODEL=your-model-name
HAIRLINE_ACCESS_TOKEN=your-private-service-access-token
HAIRLINE_ALLOWED_ORIGINS=https://milkstone.dipp.cc,https://thecrookedman.github.io
HAIRLINE_DATA_DIR=/path/outside/public-web-root/hairline-data
```

启动入口为 `node --env-file=/path/to/private-hairline.env server/hairline-server.mjs`；保持固定运行时文件相对位置，确保进程有权限写入缓存目录。不要将模型密钥放入 `VITE_*`，不要把环境文件或服务缓存上传到 `dist/`。页面填写的访问令牌只用于生成 API 的 Bearer 认证，与提供方模型密钥不同。

在 1Panel 的目标网站中添加 `/api/hairline/` 路径反向代理，后端地址为 `http://127.0.0.1:4341`，将请求路径完整传给服务。对应 OpenResty 配置形态为：

```nginx
location /api/hairline/ {
    proxy_pass http://127.0.0.1:4341;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 180s;
}
```

`proxy_pass` 后不附加 URI，避免把 `/api/hairline/` 前缀删掉。使用面板已有的反向代理功能或配置编辑器时，先检查实际生成的配置，测试成功后再重载；静态资源和原有网站入口保持现有规则。模型端点耗时较长时，按提供方与服务超时调整代理读超时。

同域站点使用默认 API 地址；GitHub Pages 在页面中填写独立 API 的 HTTPS 基址，并将 `https://thecrookedman.github.io` 加入允许来源，Origin 不带 `/milkstone/`。跨域请求需要服务正确返回 CORS 响应，API 必须支持 HTTPS。

发布后先访问 `/api/hairline/capabilities` 确认服务可用，再验证未授权生成被拒绝、真实 Prompt 能生成并预览、相同 Prompt 命中缓存、图形保存和导入导出正常。模型未配置或调用失败应如实显示，不能用已有图形冒充新生成。具体变量、静态校验与视觉验收边界见 [Hairline 生成服务](../skills/milk-white-web-design/references/hairline-generation-service.md)。此配置说明不表示公开演示站已配置模型提供方。

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
