# Agent 接入范围

核对日期：2026-10-09。文件安装成功与 Agent 加载／插件启用分别报告。

| Host | CLI 接入 | 范围与确认 |
| --- | --- | --- |
| Claude Code | `install --agent claude-code` | 项目 `.claude/skills`；`--global` 为个人 `~/.claude/skills`。本地文件测试通过，未启动真实 Claude 会话 |
| Codex | `install --agent codex` | 当前文档的 `.agents/skills`，`--global` 为个人目录。旧 `~/.codex/skills` 可通过 `--target` 明确指定；不写宿主配置 |
| ChatGPT 桌面 | `install --agent chatgpt` | 将 portable plugin 与完整技能放入项目 plugins 或个人 `.codex/plugins`，合并 `.agents/plugins/marketplace.json`。随后在应用 Plugins Directory 启用。临时目录注册测试通过，未替用户启用 |
| ChatGPT 网页／手机 | 标准 plugin.json + skills | 通过插件分发及账户启用；npx 的本地文件写入不等于账户安装。此仓库未发布目录条目 |
| OpenDesign | `install --agent opendesign --source <https-tgz-url>` | 对接 nexu-io/open-design 的 `od skill install`；要先发布导出的单技能 tar.gz。委托命令测试通过，未运行真实 od 服务 |
| 其他 SKILL.md Host | `install --target <skills-root>` | 显式确认宿主技能目录；复制保留全部引用与资产。不声称全部宿主都能自动加载 |

OpenDesign 的用户技能目录由 daemon 管理，官方协议要求不硬编码；不是简单复制到 ~/.claude/skills。tar.gz 内只有一个顶层技能文件夹，含 SKILL.md 和其完整附件。可直接在 OpenDesign 使用 `od skill install <https-url>`，无需此包装 CLI。

安装器默认项目作用域，支持 dry run；更新需 --replace，旧内容按时间戳备份。ChatGPT marketplace 的其他插件和字段保留；损坏 JSON 报错，不覆盖修复。拒绝符号链接目标路径，避免写到用户以外的意外位置。所有安装行为仅在用户主动执行 install 时发生，安装 npm 包不会自动改宿主。

## 官方依据

- [OpenAI Skills](https://learn.chatgpt.com/docs/build-skills)：技能格式、本地目录与桌面／插件范围。
- [OpenAI Package your plugin](https://developers.openai.com/plugins/build/plugins)：portable plugin.json 与本地 marketplace。
- [Claude Code Skills](https://code.claude.com/docs/en/skills)：个人／项目路径和调用方式。
- [OpenDesign Skills protocol](https://github.com/nexu-io/open-design/blob/main/docs/skills-protocol.md)：官方 od skill install、URL 格式和 daemon 管理目录。

如果你指的是另一个同名 Open Design 产品，使用 --target 的明确路径方案或提供其仓库后再做适配；本项目不会把同名工具当作同一协议。
