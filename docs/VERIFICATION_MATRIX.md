# 交付验证矩阵

验证日期：2026-07-23。状态只代表当前工作区和本机环境，不代表已完成生产合规或目标系统兼容认证。

| 交付项 | 验证方式 | 当前状态 | 证据 / 限制 |
| --- | --- | --- | --- |
| 根目录、公开客户端、私有服务端 `AGENTS.md` | 检查目录结构、脚本、边界和风险规则 | 已完成 | [根工作区](../../AGENTS.md)、[客户端](../AGENTS.md) 和 [服务端](../../hxhwang-gw-server/AGENTS.md) |
| 客户端 lint / 单元测试 / format | `pnpm lint`、`pnpm test`、`pnpm format:check` | 已通过 | 2026-07-23 最终回归通过；覆盖领域、同步客户端、同步合并、迁移、文档、本地数据和桌面语法；同步客户端 6 项、Web 服务层 2 项均通过 |
| 客户端构建 | `pnpm build`、`pnpm content:verify`、`pnpm assets:verify` | 已通过 | Web、领域包、迁移、文档、桌面壳构建通过；3 条规则、11 个模板、1 条授权记录及 Web/Electron 品牌资产校验通过 |
| 历史 HTML 原件 | 对根目录与 `legacy/` 执行 SHA-256 对比 | 已通过 | `升级版04.html` 与 `wenxibuddy0722.html` 均逐字节一致；0722 仍是需求基线，0723 与 UI glossary 只作补充参考；正式功能未写回历史原型 |
| Pages 端到端与离线演示 | `pnpm test:e2e` | 已通过 | 最终回归为 17 passed、3 条件跳过；覆盖零外联、离线重开、Pages 私有控制隐藏、桌面显式会话/同步/脱敏确认契约、任务、双版本迁移、快照、DOCX/PDF 和窄屏 |
| 内网 Web | `pnpm test:e2e:intranet`、`pnpm build:web:intranet` | 已通过本机构建与 E2E | 1 passed；验证内网模式、真实附件开关、同步/AI 控制、私有 CSP，以及建立连接前无外部请求；尚未部署到实际内网服务器 |
| GitHub Pages 子路径 | `VITE_BASE_PATH=/hxhwang-gw/ pnpm --filter @hxhwang/web build` + 本地预览访问 `/hxhwang-gw/` | 已通过 | 入口 JS、PWA manifest 与品牌图标均使用 `/hxhwang-gw/` 前缀并返回 HTTP 200；未发现私有 API、模型密钥或 GitHub token |
| Electron `file://` 资源 | `pnpm build:desktop:win:x64`、`pnpm build:desktop:win:arm64`；`pnpm verify:desktop-web` | 已通过 | 打包前校验 9 个资源均为相对路径，并验证桌面 CSP 仅允许 HTTPS、本机 API且禁止表单提交 |
| Windows 安装包 | Windows 本机 x64/arm64 electron-builder | 已通过构建 | 最终 x64 安装包 100,883,179 字节，SHA-256 `C4C39D74911506EFE036025C900F238F893C50D63FC79E1A891F501F58731974`；arm64 安装包 93,553,148 字节，SHA-256 `7E086B0D67AFFCFA77CB94FAFC3CC96771F0EF09367E563FE2126E5BB8EAEC86`；x64 解包程序启动后观察到 4 个进程并全部退出；arm64 未在本机启动 |
| Windows 签名与品牌图标 | 资产结构校验、可执行文件图标提取、`Get-AuthenticodeSignature` | 图标已完成，签名未完成 | 原创 SVG 已生成 192/512 PNG 与 256 PNG-ICO，x64 可执行文件成功提取品牌图标；x64/arm64 安装包仍为 `NotSigned`，正式分发前需要代码签名证书 |
| 本机 Web 预览 | 普通 Web build 后访问 `http://127.0.0.1:4175/` | 已通过 | 最终普通 Web 构建入口、7 个带哈希的 JS/CSS 资源、manifest 和 192 px 图标均返回 HTTP 200；原生 Playwright 交互检查确认关于页署名、任务入口、控制台、失败请求及外部请求均正常；预览进程仅绑定 `127.0.0.1` |
| 浏览器安全策略 | 检查 Pages/内网/桌面 CSP 并监听浏览器控制台 | 已通过并记录托管限制 | Pages 仅允许同源连接；内网/桌面允许用户显式 HTTPS 或本机 API；Electron 阻止任意新窗口、导航、webview 和非剪贴板权限；正式防嵌入仍须由 Web 响应头提供 |
| 私有同步与 AI | 单元测试、Pages/内网 E2E、服务端集成测试 | 已通过演示契约 | 访问码仅在内存；同步先拉取主版本并带假定主版本推送任务/文件/草稿，附件走哈希接口；AI 必须先本地脱敏预览并逐次确认，结果不覆盖原稿或确定性规则 |
| 授权资料元数据 | `pnpm content:verify` | 结构已完成，凭证编号待补 | 已记录来源文件、版本、授权范围、版权归属状态与限制；当前依据用户确认，正式公开前仍应补入授权书归档位置或凭证编号 |
| 服务端静态检查、集成测试、构建 | `pnpm lint`、`pnpm test:integration`、`pnpm build`、`pnpm format:check` | 已通过 | 4 项内存 Store 测试通过、2 项 PostgreSQL 测试按环境跳过；覆盖会话、同步冲突、附件哈希、未确认 AI、桌面 `null` Origin 和未配置公网 Origin |
| 真实 PostgreSQL | `DATABASE_URL=... pnpm test:postgres`；CI 提供 PostgreSQL 16 服务 | 已加入强制验证门，当前本机未执行 | 缺少 `DATABASE_URL` 会快速失败；契约测试覆盖迁移、同步 checkpoint、冲突保留和附件往返；当前环境未提供实例，不能把内存 Store 测试当作真实数据库验证 |
| Debian 10/12 amd64/arm64 | `.github/workflows/desktop.yml` 四组合 `.deb` 安装与 xvfb 启动门 | 已配置，尚未实际运行 | CI 使用固定 SHA 的 Docker QEMU Action，对 Debian 10/12 的 amd64/arm64 安装并要求程序持续运行 20 秒；Windows 本机交叉尝试只能生成 `linux-unpacked`，AppImage 和 DEB 分别因缺少 Linux `mksquashfs`/`fpm` 失败，且当前无 Docker 或 WSL 发行版，因此没有伪报 Linux 安装包；真实 arm64 设备测试仍保留 |
| 外部商业参考站 | 浏览器审查页面、用户协议、隐私政策和 robots | 已完成 | 仅记录 `docs/REFERENCE_AUDIT.md`；未加入 `content/sources/allowlist.yaml`，未复制其内容 |
| GitHub Pages 正式部署 | GitHub Actions / Pages 实际发布 | 未执行 | 两个仓库均无远端，当前环境也没有 `gh` CLI；对话中暴露的 token 不得使用，需撤销后用受信任登录配置远端，Pages 部署继续使用 Actions 内置权限 |
