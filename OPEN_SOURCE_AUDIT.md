# 开源方案审计

审计日期：2026-07-24。公开客户端为离线演示模式；服务端仅私有部署。

| 方案名称 | 来源 / 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与项目契合度 / 可能冲突 | 是否采用 / 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Electron 43.2.0 | [官方平台支持](https://github.com/electron/electron/blob/v43.2.0/README.md#platform-support) / MIT | Windows、Debian 桌面壳 | 官方列出 Windows 10+、Debian 10+，并提供 Windows x64/arm64 二进制；Chromium 可打印 PDF | 包体、内存占用较大 | 活跃；项目锁定 43.2.0 | 与 Debian 10 兼容目标相容；仍须通过四组合安装启动门，renderer 保持 sandbox | 采用，最小 preload API；打包后禁止开发 URL 覆盖 |
| Debian Electron 运行库 | [Debian Packages](https://packages.debian.org/) / LGPL-2.1+、MPL-2.0、MIT/X11 等各上游许可证 | GTK、NSS、辅助功能、Secret Service、ALSA 与 Mesa GBM 动态运行库 | 由 APT 按 DEB 元数据安装，不把系统库捆绑进应用 | 增加系统安装体积；覆盖依赖数组时必须保留 electron-builder 默认项 | Debian 10/12 稳定仓库提供目标包 | `libasound2` 与 `libgbm1` 是首次四组合 smoke 揭示的缺项；只改测试镜像会让用户安装后仍无法启动 | 采用，在 `build.deb.depends` 声明完整默认集合并补充两项，配置测试锁定 |
| Smoke 脚本额外安装缺失库 | Debian APT / 同上 | 让 CI 容器临时具备 Electron 运行库 | 修改量小 | 掩盖发布包依赖错误，用户仅安装 DEB 时仍失败 | 不适用 | 与“安装包可独立安装启动”的验收不变量冲突 | 不采用；smoke 只安装 DEB、Xvfb 与测试账户工具 |
| CI-only Chromium `--no-sandbox` | [Electron sandbox 文档](https://www.electronjs.org/docs/latest/tutorial/sandbox) / MIT、Chromium BSD-3-Clause | 在受 Docker seccomp/capability 限制的 hosted runner 内启动 Electron | 不提升容器权限，仍可验证架构、安装、动态链接、资源加载和进程存活 | 该次 smoke 不验证 Chromium OS sandbox；必须与生产配置隔离 | Electron 43 支持该 CLI 参数 | 仅适合已有 Docker 隔离的 CI；进入应用或快捷方式会与安全架构冲突 | 有限采用，仅用于 `.github/workflows/desktop.yml` 的 Debian smoke；契约测试禁止生产文件出现该参数 |
| Docker `--privileged` / `SYS_ADMIN` | [Docker Engine](https://docs.docker.com/engine/containers/run/) / Apache-2.0 | 允许容器内 Chromium 创建更多 namespace | 可保留 Chromium sandbox 启动路径 | 显著扩大 hosted runner 容器权限，安全收益与测试价值不成比例 | 活跃 | 与最小权限要求冲突 | 不采用 |
| Wails | [官方](https://wails.io/) / MIT | Go 桌面应用 | 安装包较小 | Debian 10 WebKit 依赖不稳定 | 活跃 | 与 Debian 10 目标冲突 | 不采用 |
| Tauri 2 | [官方](https://v2.tauri.app/) / Apache-2.0 OR MIT | 轻量桌面壳 | 权限模型清晰 | WebKitGTK 4.1 不满足 Debian 10 | 活跃 | 与 Debian 10 目标冲突 | 不采用 |
| RxDB + Dexie | [RxDB](https://rxdb.info/) / Apache-2.0 | 本地优先数据层 | Web/Electron 共用 IndexedDB 模型 | 私有同步端点需额外实现 | 活跃 | 不得让 React 直接访问 IndexedDB | 采用，封装于 `packages/local-data` |
| PouchDB + CouchDB | [PouchDB](https://pouchdb.com/) / Apache-2.0 | 文档复制 | 复制成熟 | 增加 CouchDB 运维，生态更新较慢 | 维护中 | 与现有 Fastify/PostgreSQL 私服设计冲突 | 不采用 |
| Tiptap、docx、Mammoth、PDF.js | MIT、MIT、BSD-2-Clause、Apache-2.0 | 编辑、Word、预览 | 覆盖主要文档流程 | 中文字体和 Word 版式需实机验证 | 活跃 | 不能捆绑未授权字体 | 采用 Tiptap、docx；其余按需引入 |
| Playwright | [官方](https://playwright.dev/) / Apache-2.0 | 浏览器端到端测试 | 覆盖离线、迁移、导出和窄屏流程 | CI 需下载 Chromium | 活跃 | 仅开发依赖，不进入运行包 | 采用为 `test:e2e`，CI 安装 Chromium |
| Vite PWA Plugin + Workbox | [官方](https://vite-pwa-org.netlify.app/) / MIT | 静态资源预缓存 | Pages 首次访问后可离线重开 | 增加 Service Worker 更新边界 | 活跃 | 仅缓存同源构建产物，不增加业务网络请求 | 采用，自动更新并清理旧缓存 |
| Lucide React 0.468.0 | [官方](https://lucide.dev/) / ISC | 统一的 React 线性图标组件 | 图形语言一致、按组件打包、无需图标字体或远程请求 | 大量同时渲染时仍需控制数量 | 活跃；版本已锁定在现有依赖中 | 与离线、CSP 和无公共 CDN 要求相容；不得与表情符号或自绘功能 SVG 混用 | 采用为全部界面功能图标，本次视觉重构未新增依赖 |
| yaml | [npm](https://www.npmjs.com/package/yaml) / ISC | YAML 结构化解析 | 避免正则误解析允许清单 | 增加一个构建工具依赖 | 活跃 | 仅供内容同步脚本使用，不进入运行包 | 采用，解析来源允许清单 |
| Docker Setup QEMU Action | [官方仓库](https://github.com/docker/setup-qemu-action) / Apache-2.0 | 在 GitHub Actions x64 runner 注册 arm64 仿真 | 可对 Debian arm64 `.deb` 执行安装与启动门禁 | 仿真不能替代真实 arm64 设备性能测试 | 活跃，审计时 v3.7.0 | 只用于 CI；固定提交 SHA，避免浮动 tag | 采用，用于 Debian 10/12 arm64 冒烟 |
| Node 24 `fetch`、`crypto`、`node:test` | [Node.js](https://nodejs.org/api/) / MIT | HTTPS 抓取、哈希和策略测试 | 标准运行时内置，不增加供应链或安装体积 | 重定向与体积限制需显式实现 | 随 Node 24 维护 | 只在内容同步脚本和 CI 中使用，不进入浏览器联网路径 | 采用，封装允许清单、逐跳重定向和 2 MB 上限 |
| Got 15.1.0 | [官方仓库](https://github.com/sindresorhus/got) / MIT | HTTP 重试、钩子、重定向 | HTTP 能力成熟 | 当前仅抓取少量权威来源，引入运行依赖收益不足 | 活跃；npm 元数据 2026-07-02 更新 | 会扩大供应链，不能替代本项目域名策略 | 不采用 |
| simple-git 3.36.0 | [官方仓库](https://github.com/steveukx/git-js) / MIT | Git 命令封装 | API 易用 | Actions 仅需 add/commit/push 三步 | 活跃；npm 元数据 2026-04-12 更新 | 增加无必要依赖；runner 已提供 Git | 不采用，工作流直接调用 Git |

## 采用边界

- 直接复用：Electron 打印能力、RxDB/Dexie 本地存储、Tiptap 编辑、docx 导出、Playwright 验证。
- 周报闭环直接复用现有 RxDB 类型记录、schema migration 插件、确定性领域汇总、`docx` 与 Electron/浏览器打印能力；任务协同字段和附件操作复用现有领域模型及本地附件库，本次未新增 npm 依赖或联网行为。新增 `weekly` 类型时将 schema 升至 v1 并执行恒等迁移，保留 v0 全部记录；migration 插件使本地存储 chunk 约增加 40.6 kB（gzip 约 11.8 kB），相对避免现有用户数据库无法打开的风险可接受。
- v0.2.0 视觉系统直接复用现有 React、Lucide 与 CSS 动画能力；指针响应通过本地 CSS 自定义属性驱动，未引入 Motion、WebGL、远程字体、图片 CDN或运行时脚本。`prefers-reduced-motion` 会关闭持续动画，回滚时仅需恢复 `App.tsx` 的展示结构与 `styles.css`，领域数据和 API 不受影响。
- 仅借鉴：PouchDB/CouchDB 的复制冲突思路；实际同步保留在私有 Fastify API。
- 不采用：Wails、Tauri 2，原因是 Debian 10 的 WebKit 依赖冲突。
- 回滚：移除 `test:e2e` 及 Playwright 不影响生产包；本地数据可保留导出快照后替换存储适配器。

## 内容同步冲突审计

- 定时同步只读取 `content/sources/allowlist.yaml` 中经硬策略复核的 HTTPS 权威站点，或授权记录中精确列出且显式允许自动抓取的 URL；逐跳验证重定向、响应类型、结构、体积和 SHA-256，不接受工作流输入 URL。
- 工作流只改写 `content/generated/source-snapshots.json` 与知识包中的来源引用，不修改人工规则、模板或授权资料；来源内容未变化时不产生提交。
- 联网只发生在手动执行 `pnpm content:sync` 或每周 Actions 中，Pages、Electron 和内网 Web 的运行时联网边界不变。
- 工作流仅使用 Actions 内置 `GITHUB_TOKEN` 的 `contents: write`、Pages 与 OIDC 权限；机器人提交不会依赖二次触发 `push`，而是在同一工作流完成验证和 Pages 部署。若未来启用禁止机器人直推的分支保护，应改为自动 PR 后再启用该保护，不能绕过保护规则。

商业产品与设计画廊只做功能或视觉语言参考，不属于开源依赖审计范围；相关版权、联网和数据处理边界单独记录在 [`docs/REFERENCE_AUDIT.md`](./docs/REFERENCE_AUDIT.md)。
