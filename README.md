# HxHwang Gw 管理系统

公开客户端工程，包含 GitHub Pages 演示版、内网 Web 构建、Electron 客户端、领域模型、本地优先数据层、显式私有同步适配器、文档导出和历史数据迁移器。公开 Pages 不显示私有控制，也不调用私有 API。

作者：**HaoXiangHwang**  
邮箱：[Rays688888@Gmail.com](mailto:Rays688888@Gmail.com)  
网站：[nextweb4.github.io](https://nextweb4.github.io/)

## 版权

本项目自有代码和内容保留全部权利，未授予未经书面许可的复制、修改或再分发权。第三方依赖按各自许可证使用；授权参考资料的范围记录在 `content/licensed/` 中。

## 当前命令

- `pnpm dev:web`：启动本地 Web 演示版。
- `pnpm test`：运行工作区测试。
- `pnpm test:e2e`：运行 Chromium 桌面与窄屏端到端测试。
- `pnpm test:e2e:intranet`：验证内网 Web 的附件、私有控制、CSP 与显式连接前零外联。
- 首次运行端到端测试前执行 `pnpm exec playwright install chromium`；CI 会自动安装浏览器。
- `pnpm build`：构建 Web 和可复用包。
- `pnpm build:web:intranet`：构建内网 Web；该产物允许用户显式配置 HTTPS 或本机 API，不得部署到公开 Pages。
- `pnpm build:desktop`：构建 Web 后打包 Electron 客户端。
- 桌面构建会自动执行 `pnpm verify:desktop-web`，拒绝 Electron `file://` 无法加载的绝对资源路径。
- `pnpm build:desktop:win:x64` / `pnpm build:desktop:win:arm64`：按 Windows 架构打包。
- `pnpm build:desktop:linux:x64` / `pnpm build:desktop:linux:arm64`：按 Debian/Linux 架构打包；最终兼容性必须在对应 Debian 环境验证。
- Linux 的 AppImage/DEB 打包命令需要 Linux 宿主或项目提供的 Ubuntu Actions；Windows 上产生的 `linux-unpacked` 目录不是可发布安装包。
- `pnpm assets:generate`：品牌 SVG 变化后重新生成 Web PNG 与 Electron PNG/ICO；需要先安装 Playwright Chromium。
- `pnpm assets:verify` 与 `pnpm content:verify`：校验品牌图片/ICO，以及规则、模板、来源和授权元数据的引用完整性。
- 推送 `v*` 标签后，桌面工作流只有在 Windows 构建、Linux 构建和 Debian 10/12 四组合启动门全部通过时才创建 GitHub Release；Release 同时附带六类安装产物和 `SHA256SUMS.txt`，使用 Actions 内置令牌，不需要个人访问令牌。

架构、依赖许可证和未采用方案见 [`OPEN_SOURCE_AUDIT.md`](./OPEN_SOURCE_AUDIT.md)。
商业产品的功能参考、版权与数据边界见 [`docs/REFERENCE_AUDIT.md`](./docs/REFERENCE_AUDIT.md)。
当前验证证据与未完成的平台环境项见 [`docs/VERIFICATION_MATRIX.md`](./docs/VERIFICATION_MATRIX.md)。
使用和数据边界见 [`docs/HELP.md`](./docs/HELP.md)，版本交付状态见 [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)。

当前 Windows x64/arm64 安装包已在本机完成构建，x64 解包版已完成启动冒烟；arm64 实机、Debian 10/12 四组合、真实 PostgreSQL、GitHub Pages 正式部署和 Authenticode 签名仍是明确的外部验证项，不应标记为已完成。

## 托管边界

Pages 的 CSP 元标签限制脚本、连接、对象和表单来源，但 HTML 元标签不能提供 `frame-ancestors`。如需防止第三方页面嵌入，必须在支持自定义响应头的正式 Web 托管层设置 `Content-Security-Policy: frame-ancestors 'none'`；公开 Pages 仅承载脱敏演示数据。
