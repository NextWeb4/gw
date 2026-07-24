# HxHwang Gw 客户端工程规则

## 1. 项目结构
- `apps/web` 是 GitHub Pages 的静态演示入口；`apps/desktop` 是 Electron 壳。
- `packages/domain` 存放实体和规则；`packages/local-data` 存放本地数据适配；`packages/sync-client` 只提供显式调用的私有同步 HTTP 适配；`packages/documents` 负责 DOCX/PDF；`packages/migration` 只负责历史导入。
- `content` 只存放已授权且可公开的规则、模板和来源元数据。

## 2. 运行命令
- `pnpm dev:web` 启动仅绑定 `127.0.0.1` 的 Vite 演示站。
- `pnpm dev:web:intranet` 启动仅绑定 `127.0.0.1` 的内网模式；该模式才显示私有同步、真实附件和脱敏 AI 入口。
- 私有 API 的开发命令在相邻私有仓库中执行，公开仓库不得读取其环境变量或服务密钥。

## 3. 测试命令
- `pnpm test` 运行领域、迁移、文档和桌面壳测试。
- `pnpm test:content` 单独验证权威来源 URL、逐跳重定向和响应体积策略；`pnpm test` 已包含该命令。
- `pnpm test:workflows` 校验 Pages 与内网工作流上传目录不会互换；`pnpm test` 已包含该命令。
- `pnpm test:e2e` 使用 Playwright 验证离线页面、任务持久化、历史导入和文稿导出。CI 必须先执行 `pnpm exec playwright install --with-deps chromium`。
- `pnpm test:e2e:intranet` 单独验证内网构建的私有控制、附件开关、CSP 和显式连接前零外联。

## 4. 构建命令
- `pnpm build` 构建所有工作区包和 Web。
- `pnpm build:web:intranet` 构建允许显式 HTTPS/本机 API 连接的内网 Web 到 `apps/web/dist-intranet/`；不得把该产物发布到公开 Pages，也不得与 Pages 的 `apps/web/dist/` 共用输出目录。
- `pnpm build:desktop` 打包全部已配置目标；`pnpm build:desktop:win:x64`、`pnpm build:desktop:win:arm64`、`pnpm build:desktop:linux:x64`、`pnpm build:desktop:linux:arm64` 可按目标单独构建。
- Linux 的 AppImage/DEB 命令必须在 Linux 或项目的 Ubuntu Actions 中运行；Windows 只能生成 `linux-unpacked`，缺少 `mksquashfs`/`fpm` 时不得将其标记为安装包。
- 桌面命令必须先运行 Web 的相对路径构建并通过 `pnpm verify:desktop-web`；不得直接用普通 `/assets` Pages 产物打包 Electron。
- `pnpm assets:generate` 只在品牌 SVG 发生变化时运行，使用已安装的 Playwright Chromium 生成 Web PNG 和 Electron ICO/PNG；生成后必须重新构建桌面包。

## 5. 代码风格
- `pnpm lint` 与 `pnpm format:check` 均执行 TypeScript/Node 语法与类型检查；当前未发现独立的自动 format 命令。
- 使用 TypeScript 严格模式、函数式 React 组件和显式导出；禁止 `any` 逃避领域数据校验。

## 6. 模块边界
- React 页面只能调用领域命令和数据适配接口，不得直连 IndexedDB、Electron IPC 或私有 API。
- Electron renderer 必须保持 sandbox；文件和 PDF 操作只能经 preload 的白名单接口。
- Pages 演示模式只能使用本地样例适配器，不能请求私有 API。
- Pages 与内网 E2E 可以并行运行，但必须分别预览 `dist/` 与 `dist-intranet/`；禁止重新合并输出目录。
- `scripts/content-sync-policy.mjs` 是允许清单抓取的安全边界；非政府来源必须精确匹配授权记录中的 `authorizedSourceUrls` 且 `allowAutomatedRetrieval=true`。同步器只能修改 `content/generated/`，不得自动覆盖人工规则、模板或授权资料。
- `assets/brand/app-icon.svg` 是品牌图标唯一源文件；生成产物只能写入 `apps/web/public/icons/` 与 `apps/desktop/build/`。

## 7. 禁止事项
- 禁止提交 API key、GitHub token、真实材料或未授权字体。
- 禁止修改 `legacy/` 中的原型以实现新功能。
- 禁止把抓取的网页内容直接替换人工模板。
- 禁止在内容同步中接受任意工作流 URL、放宽 HTTPS/域名/重定向/类型/2 MB 上限，或把抓取逻辑放入 Pages 运行时。
- 商业参考站只能记录在 `docs/REFERENCE_AUDIT.md`；未取得书面再分发授权前，禁止加入 `content/sources/allowlist.yaml`、知识包、模板或样例数据。`robots.txt` 允许访问不等于取得版权许可。
- `.github/workflows/content-sync.yml` 每周只在 `main` 上更新来源元数据并使用 Actions 内置令牌；启用禁止机器人直推的分支保护前必须先改为自动 PR 流程。

## 8. 完成标准
- 任务、文件、写作、周报、历史档案和关于页均可离线使用。
- DOCX 与 PDF 导出在含中文文本时可读且页面为 A4。
- 两版历史导出可以导入，保留附件与未映射数据。
- 合并前必须依次通过 `pnpm lint`、`pnpm test`、`pnpm test:e2e`、`pnpm build`；桌面包仅在目标平台实机启动后标记为已验证。

## 9. Review 标准
- 必查 CSP、HTML 清洗、离线无意联网、迁移记录数、附件哈希和字体回退提示。
- 必查 Windows/Debian amd64/arm64 打包配置与作者署名。
- 引用外部站点时，必查服务协议、隐私政策、版权声明和 `robots.txt`，并区分“交互借鉴”“允许链接”“允许再分发”。

## 10. 常见风险
- GitHub Pages 是公开静态服务，不能用于私有同步或密钥代理。
- Chromium 与 Word 的中文字体和分页可能不同，必须视觉验证。
- 旧数据包含 localStorage、IndexedDB 和多版 schema，不能仅按 ID 去重。
- 两份历史 HTML 的导出器都写入 `sourceApp=任务管理系统LV08`、`version=X05-v1`，且默认不导出 `wenxi_skills`；迁移器不得伪造精确来源版本，缺失 Skill 必须给出报告警告。
- 历史 IndexedDB 附件使用 Data URL，导入时必须剥离媒体头、按解码字节计算哈希，并汇总任务阶段、配合单位、产出资料和阶段历史中的附件引用。
- `electron-builder` 在 Windows 上交叉执行 Linux 目标会因 `mksquashfs` 或 `fpm` 缺失失败；正式 Linux 产物以 Ubuntu Actions 输出为准。
