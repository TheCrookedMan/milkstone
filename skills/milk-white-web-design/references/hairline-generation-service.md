# Hairline Prompt 生成服务

本服务是 Empty 组件的可选扩展。静态站点、附带空托盘和用户已保存的图库无需模型服务；根据新 Prompt 生成图形需要一个真实大模型端点。服务采用 OpenAI 兼容的 `chat/completions` 协议，模型只编写 Hairline figure 源码，固定引擎和页面由本项目组装。默认采用 DeepSeek，用户可自定义端点和模型。

## 本地运行

在 Milkstone 仓库根目录复制配置示例：

```bash
cp server/.env.example .env.hairline
```

编辑根目录 `.env.hairline`，填入自己的模型密钥与单独设置的服务访问令牌：

```dotenv
HAIRLINE_MODEL_BASE_URL=https://api.deepseek.com
HAIRLINE_MODEL_API_KEY=your-deepseek-api-key
HAIRLINE_MODEL=deepseek-flash
HAIRLINE_ACCESS_TOKEN=your-private-service-access-token
```

默认端点和模型依据 [DeepSeek 官方接入文档](https://api-docs.deepseek.com/zh-cn/)；其他 OpenAI 兼容服务按实际端点和模型名修改。项目不附带公共模型密钥，缺少模型密钥或服务访问令牌时保持未配置状态。配置完成后运行下列命令，自动加载根目录 `.env.hairline`：

```bash
pnpm hairline:serve
```

也可使用 Node 的环境文件参数加载由自己保管的配置：

```bash
node --env-file=/path/to/private-hairline.env server/hairline-server.mjs
```

默认监听 `127.0.0.1:4341`。根工程的 Vite 开发服务将 `/api/hairline/` 代理到该地址，开发时分别启动前端和生成服务。仅启动 `pnpm dev` 不会自动启动模型服务。

从 Skill 包复用时，将整个 [hairline-service](../assets/hairline-service/) 复制到工作目录，保持固定运行时资源的相对路径，使用 Node.js 运行复制后的 `hairline-server.mjs`。该服务不要求把模型密钥写入 Vue 工程，也不需要将整个 Milkstone 页面作为后端运行。

| 变量 | 用途 |
| --- | --- |
| `HAIRLINE_MODEL_BASE_URL` | OpenAI 兼容 API 基地址，默认 `https://api.deepseek.com`；服务在此基础上请求 `chat/completions`，其他提供方按实际 API 前缀配置 |
| `HAIRLINE_MODEL_API_KEY` | 模型提供方密钥，仅服务端读取 |
| `HAIRLINE_MODEL` | 提供方实际支持的模型名，默认 `deepseek-flash` |
| `HAIRLINE_ACCESS_TOKEN` | 保护生成 API 的必需访问令牌，本地与生产环境均需设置，与模型密钥分开 |
| `HAIRLINE_ALLOWED_ORIGINS` | 逗号分隔的允许网页来源，按实际协议、域名及端口配置；保留 Host 的同域反向代理无需额外跨域来源 |
| `HAIRLINE_DATA_DIR` | 生成缓存目录；仓库默认 `work/hairline-data`，部署时设置可写且持久的目录 |
| `HAIRLINE_HOST` / `HAIRLINE_PORT` | 服务监听地址和端口，默认 `127.0.0.1` / `4341` |
| `HAIRLINE_JSON_MODE` | 默认请求 JSON 对象输出；提供方不支持 `response_format` 时设为 `false`，返回内容仍须为有效 JSON |

DeepSeek 使用 `response_format: { "type": "json_object" }` 的 [JSON Output](https://api-docs.deepseek.com/zh-cn/guides/json_mode/)；服务提示包含输出结构要求。有效 JSON 仍需继续通过图形静态校验，模型返回空内容或不合格图形时如实反馈失败。此处接入配置不代表已经使用真实 DeepSeek 密钥完成生成测试。

不要将真实密钥或令牌提交到仓库，也不要放入 `VITE_*` 变量、静态构建产物或可公开下载的技能包。访问令牌用于授权使用生成服务；拥有它的人可以消耗对应模型服务额度，应按自己的使用范围分发。

## 接口合同

- `GET /api/hairline/capabilities`：查询服务配置与生成能力。前端据此显示是否可生成；未配置模型时明确提示缺少配置。
- `POST /api/hairline/generate`：JSON 请求体为 `{ "prompt": "物件、空状态与指针回应" }`，成功响应为 `{ "artwork": ..., "reused": false }`；命中已有服务缓存时 `reused` 为 `true`。

生成请求通过 `Authorization: Bearer <服务访问令牌>` 认证，本地开发也需填写。页面的服务 URL 是以 `/api/hairline` 结尾的完整 API 基址，例如开发时 `http://127.0.0.1:4340/api/hairline` 或公开部署的 `https://your-api.example/api/hairline`。模型提供方端点通过服务端 `HAIRLINE_MODEL_BASE_URL` 配置。页面访问令牌只保存在当前会话内存中；刷新后需重新填写，不自动保存到浏览器图库或导出文件。

服务将用户 Prompt 与固定 Hairline 规则发送给配置的模型。模型返回值只作为 figure 文本处理，服务端不通过 `eval`、动态导入或子进程运行它。固定组装器生成自包含 HTML，再由固定静态校验器检查；失败最多请求模型修复一次，仍未通过则返回错误。只有通过校验的结果才能返回给前端并进入服务缓存。

缓存键包含规范化 Prompt、模型与固定运行时版本。它复用生成结果，不是通用图形检索，也不代表某个新 Prompt 已完成新的模型请求。API 认证、网络、模型或校验失败必须反馈真实失败，不能返回空托盘并标记生成成功。

## 预览、图库与导出

前端使用隔离绘制环境渲染返回的图形，生成受控的浅色／暗色 SVG 预览；不在应用文档中执行模型源码，也不将任意 HTML 注入组件。导入的图库使用相同的校验和隔离边界。静态 Empty 展示选择对应主题的 SVG；乳白沿用浅色线稿，周围的材质仍使用乳白令牌。

用户保存的图形进入当前浏览器图库。选择已有图不请求模型，JSON 导出／导入用于跨浏览器或项目复用；交互 HTML 下载保留固定 Hairline bench、kernel 和许可。保存失败应明确说明，不能显示“已保存”。服务端缓存不自动同步为用户收藏，本地图形也不自动上传为公共图库。

生成结果记录 `validation: "static"`。它表示代码通过静态验证，不表示完成原 Hairline Create 的八画面视觉验收。正式采用前检查静止姿态、指针回应、读数、缩略图、强度两端与明暗主题；不能将示例图的已有验收记录套用到新图。

## 生产接入

静态 GitHub Pages 不运行此 Node 服务。可以把生成 API 部署在独立 HTTPS 服务，并在页面中填写包含 `/api/hairline` 的完整服务 URL；配置 `HAIRLINE_ALLOWED_ORIGINS` 为允许的页面来源，例如 `https://thecrookedman.github.io`。来源是 Origin，不包含 `/milkstone/` 路径或 Hash 路由。HTTPS 页面不能调用仅有 HTTP 的外部 API。

1Panel / OpenResty 自有服务器可保留现有静态站点，另行运行 Node 服务并将 `/api/hairline/` 反向代理到 `http://127.0.0.1:4341`，保持完整 API 路径。生产模式配置模型、访问令牌、允许来源、持久缓存及进程重启策略；不要将服务环境文件放进公开网站目录。代理保留网站的 Host，按模型耗时设置读取超时；例如 `location /api/hairline/` 内使用不附加 URI 的 `proxy_pass http://127.0.0.1:4341;`，避免意外删掉 API 路径前缀。

发布静态页面不等于模型服务已经配置。部署后分别核对能力查询、未授权拒绝、真实模型生成、校验失败反馈、缓存复用和浏览器图库保存；仅有预览或缓存命中不能作为本次成功调用模型的证据。
