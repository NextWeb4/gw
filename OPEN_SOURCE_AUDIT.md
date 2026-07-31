# 开源方案审计

审计日期：2026-07-25；v0.4.1 补充审计：2026-07-27；v0.6.6、v0.6.7、v0.6.8 补充审计：2026-07-30；v0.6.9、v0.7.0、v0.7.1、v0.7.2、v0.7.3、v0.7.4 补充审计：2026-07-31。公开客户端为本地优先演示模式；服务端仅私有部署。

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
| Tiptap 2.11.7、docx 9.7.1 | [Tiptap](https://github.com/ueberdosis/tiptap)、[docx](https://github.com/dolanmiu/docx) / MIT | 结构化编辑、DOCX 生成 | 已与 React 19 和当前领域模型集成 | 中文字体和 Word 版式需实机验证 | 活跃 | 不能捆绑未授权字体 | 继续采用；保留现有编辑与导出职责 |
| Mammoth 1.12.0 | [官方仓库](https://github.com/mwilliamson/mammoth.js) / BSD-2-Clause | DOCX 转换为语义 HTML | 成熟、无服务端依赖，适合本机导入；不追求复制 Word 样式 | 不保留复杂分页、页眉页脚、文本框和精确版式；转换结果仍需清洗 | 活跃；仓库未归档，npm 1.12.0 | 与 Vite/浏览器兼容；只负责 DOCX 解析，不能替代 HTML 注入防护 | 采用；按需动态导入，随后使用项目标签/属性允许清单清洗，回滚可移除 DOCX 入口而不影响 TXT/HTML 导入 |
| PDF.js | [官方仓库](https://github.com/mozilla/pdf.js) / Apache-2.0 | PDF 渲染与文本提取 | PDF 生态成熟 | 当前需求只要求 DOCX/HTML/TXT 导入；增加体积但不能可靠恢复公文结构 | 活跃 | 超出本次真实需求，且会扩大浏览器包 | 不采用 |
| Playwright | [官方](https://playwright.dev/) / Apache-2.0 | 浏览器端到端测试 | 覆盖离线、迁移、导出和窄屏流程 | CI 需下载 Chromium | 活跃 | 仅开发依赖，不进入运行包 | 采用为 `test:e2e`，CI 安装 Chromium |
| Vite PWA Plugin + Workbox | [官方](https://vite-pwa-org.netlify.app/) / MIT | 静态资源预缓存 | Pages 首次访问后可离线重开 | 增加 Service Worker 更新边界 | 活跃 | 仅缓存同源构建产物，不增加业务网络请求 | 采用，自动更新并清理旧缓存 |
| Lucide React 0.468.0 | [官方](https://lucide.dev/) / ISC | 统一的 React 线性图标组件 | 图形语言一致、按组件打包、无需图标字体或远程请求 | 大量同时渲染时仍需控制数量 | 活跃；版本已锁定在现有依赖中 | 与离线、CSP 和无公共 CDN 要求相容；不得与表情符号或自绘功能 SVG 混用 | 采用为全部界面功能图标，本次视觉重构未新增依赖 |
| yaml | [npm](https://www.npmjs.com/package/yaml) / ISC | YAML 结构化解析 | 避免正则误解析允许清单 | 增加一个构建工具依赖 | 活跃 | 仅供内容同步脚本使用，不进入运行包 | 采用，解析来源允许清单 |
| Docker Setup QEMU Action | [官方仓库](https://github.com/docker/setup-qemu-action) / Apache-2.0 | 在 GitHub Actions x64 runner 注册 arm64 仿真 | 可对 Debian arm64 `.deb` 执行安装与启动门禁 | 仿真不能替代真实 arm64 设备性能测试 | 活跃，审计时 v3.7.0 | 只用于 CI；固定提交 SHA，避免浮动 tag | 采用，用于 Debian 10/12 arm64 冒烟 |
| Node 24 `fetch`、`crypto`、`node:test` | [Node.js](https://nodejs.org/api/) / MIT | HTTPS 抓取、哈希和策略测试 | 标准运行时内置，不增加供应链或安装体积 | 重定向与体积限制需显式实现 | 随 Node 24 维护 | 只在内容同步脚本和 CI 中使用，不进入浏览器联网路径 | 采用，封装允许清单、逐跳重定向和 2 MB 上限 |
| Got 15.1.0 | [官方仓库](https://github.com/sindresorhus/got) / MIT | HTTP 重试、钩子、重定向 | HTTP 能力成熟 | 当前仅抓取少量权威来源，引入运行依赖收益不足 | 活跃；npm 元数据 2026-07-02 更新 | 会扩大供应链，不能替代本项目域名策略 | 不采用 |
| simple-git 3.36.0 | [官方仓库](https://github.com/steveukx/git-js) / MIT | Git 命令封装 | API 易用 | Actions 仅需 add/commit/push 三步 | 活跃；npm 元数据 2026-04-12 更新 | 增加无必要依赖；runner 已提供 Git | 不采用，工作流直接调用 Git |

## v0.7.4 全局快速记录与确定性任务预填方案审计

问题本质：项目已经有 `extractTaskFromText`，能在本机从微信通知、会议布置、来文或口头记录中识别任务名称、交办人、交办日期、截止日期和来源，但入口藏在任务抽屉的折叠区。当前工作台“新建任务”只导航到任务页，用户还要再次点击“新建任务”并展开识别区；在写作、周报或其他台账中临时收到事项时也必须离开当前页面。这个缺口属于全局捕获、焦点和既有编辑器预填，不需要新任务模型、自动保存、云收件箱、后台服务、AI、持久化草稿或第二套表单。

第一性原理不变量：输入只能是当前会话中的用户文本；识别必须调用既有确定性提取器，字段应用必须由一个共享纯函数完成；快速记录只展示识别预览并把预填草稿交给原 `TaskEditor`，不得直接调用 `putRecord`、`saveTask`、Fetch、IPC、同步或遥测；即使识别无命中，也只能进入原抽屉手工核对；原始文本必须在任务抽屉中可见并从打开时即属于未保存状态；最终只有用户点击“保存任务”才能持久化；取消或保存后原文必须清空；`Shift+A` 只能在非编辑目标且没有全局查找、AI 面板或业务抽屉时触发；顶栏和工作台必须复用同一入口；移动端继续保留固定底栏和 44px 触控边界。

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| React 19 + 原生 `dialog` + 现有任务提取器与 `TaskEditor` | 当前锁定依赖、Web 标准和项目自有代码 | React MIT / Web 标准 / 项目 UNLICENSED | 顶栏与工作台入口、会话文本、实时确定性预览、原生焦点陷阱、原任务抽屉核对和显式保存 | 零新增依赖；复用现有中文识别、数据校验、目录、附件和未保存保护；能在任何模块捕获任务而不离开上下文 | 需要项目维护少量模态互斥、焦点恢复和预填原文状态 | React 19 与目标 Chromium 持续维护；提取器已有单元/E2E | 高 | 快速入口若直接保存或复制字段映射会形成第二套任务链路；原生 dialog 必须避开移动底栏 | 采用 | 新增轻量快速记录组件；共享纯函数应用识别结果；继续打开现有任务抽屉并显式保存 |
| Super Productivity Add Task Bar `3d41424f` | [官方说明](https://github.com/johannesjo/super-productivity/blob/3d41424fb9726eaed70a696bef3a4909562ca761/docs/wiki/2.03-Add-Tasks.md) / [实现目录](https://github.com/johannesjo/super-productivity/tree/3d41424fb9726eaed70a696bef3a4909562ca761/src/app/features/tasks/add-task-bar) / [MIT](https://github.com/johannesjo/super-productivity/blob/3d41424fb9726eaed70a696bef3a4909562ca761/LICENSE) | MIT | 顶栏加号、`Shift+A`、自动聚焦、短语法解析和属性操作 | 入口高频可达，键盘与鼠标一致；证明“捕获”和完整详情可以分层 | Angular 状态、直接创建、标签/时间/重复/Issue 搜索远超当前模型；其短语法不适合直接复制到中文通知识别 | 2026-07-31 主分支提交；package 18.16.0 | 交互契合高，源码复用低 | 直接 Enter 保存会绕过本项目人工核对、未保存守卫与任务必填校验 | 只借鉴设计 | 借鉴顶栏入口、自动聚焦和 `Shift+A`；不复制代码、短语法、样式或直接保存行为 |
| Vikunja Quick Add `506dbd7b` | [QuickAddOverlay](https://github.com/go-vikunja/vikunja/blob/506dbd7b0483c626295081fd9dd5beef3df8def7/frontend/src/components/quick-actions/QuickAddOverlay.vue) / [AddTask](https://github.com/go-vikunja/vikunja/blob/506dbd7b0483c626295081fd9dd5beef3df8def7/frontend/src/components/tasks/AddTask.vue) / [Quick Add Magic](https://github.com/go-vikunja/vikunja/tree/506dbd7b0483c626295081fd9dd5beef3df8def7/frontend/src/modules/quickAddMagic) / [AGPL-3.0-or-later](https://github.com/go-vikunja/vikunja/blob/506dbd7b0483c626295081fd9dd5beef3df8def7/LICENSE) | AGPL-3.0-or-later | 独立快速录入覆盖层、自动高度输入、Enter/Escape、日期/标签/优先级等文本解析 | 覆盖层可在当前上下文捕获，解析提示与输入状态分离 | Vue、服务端创建、多任务缩进、标签和项目解析超出当前需求；AGPL 不适合复制 | 2026-07-30 主分支提交 | 交互参考高，源码复用低 | 复制实现会产生 AGPL 风险并引入服务端/多任务语义；直接创建违背显式保存 | 只借鉴设计 | 借鉴独立覆盖层、Escape 和解析预览；不复制源码、语法、文案、样式或数据模型 |
| Google Tasks / Calendar / Workspace side panel | [Tasks 概览](https://support.google.com/tasks/answer/7675772?hl=en) / [新增与编辑任务](https://support.google.com/tasks/answer/7675838?hl=en&ref_topic=7675628) | Google 服务条款；非开源、无再分发授权 | 从 Calendar、Gmail 和 Workspace 侧栏创建任务，先捕获再补日期、截止时间和详情 | 证明任务捕获应在当前工作上下文可达，不必先跳转到完整任务页 | 云服务、同步、侧栏资产与接口不可复制；部分能力依赖 Workspace | 2026-07-31 官方帮助页可访问 | 概念参考高，运行时契合低 | 不得复制界面、文案、图标、接口数据或引入 Google 联网依赖 | 只借鉴概念 | 借鉴“当前上下文捕获，再补充详情”；不复制任何产品内容或服务能力 |

- 直接复用：现有 `extractTaskFromText`、新增的共享字段应用纯函数、`emptyTask`、原 `TaskEditor`、任务保存校验、目录、附件、未保存守卫、React 状态和 Lucide。
- 只借鉴设计：Super Productivity 的顶栏入口/自动聚焦/`Shift+A`；Vikunja 的快速覆盖层与解析提示；Google Tasks 的当前 Workspace 上下文捕获。外部项目不复制代码、语法、文案、样式、图标、接口数据或任务模型。
- 不采用：直接 Enter 自动保存、云收件箱、标签/项目/优先级/重复短语法、多任务缩进、邮件拖拽、后台同步、持久化快速草稿、提醒推送和新运行依赖。
- 适配与保留：只新增 Web 快速记录组件、共享领域纯函数和少量 App 模态状态；保留十六模块导航、六类 CRUD、任务抽屉、附件会话、快照、同步、AI 和工作台概览。
- 冲突审计：方案与 React/Vite、目录、构建、数据 schema、同步协议、权限、离线/联网和许可证均无冲突。回收站/撤销删除虽有数据安全价值，但当前硬删除会立即清理无引用附件，私有同步也需要明确 tombstone/恢复语义；本轮强行并入会与附件和同步边界冲突，因此阻塞该方案并留待独立设计。若快速记录需要直接持久化、保存原文、复制 AGPL/Google 内容或放宽模态互斥，则停止集成。
- 许可证风险：无新增依赖；MIT 项目只作能力与交互审计，AGPL 与 Google 产品只作不可复制的抽象参考。
- 联网变化：无。打开、输入、识别、预填和取消均只改变当前 React 会话；保存仍使用原本机数据适配层。
- 回滚方式：移除快速记录组件、入口、快捷键、共享字段应用函数及对应样式/测试即可恢复 v0.7.3；不涉及数据、配置、服务端或安装包迁移。

## v0.7.3 跨模块今日、近期与未排期工作概览方案审计

问题本质：当前工作台首屏的视觉主区超过 600px，真正可操作的“任务队列”只取任务数组前五条，既不按日期优先级排序，也不包含会议、文件、外出、用章和物资。事务日历已经解决按月查找某一天记录的问题，但用户每天打开工作台时仍无法立即回答“今天与逾期有哪些事、未来七天有什么、哪些记录还没排日期”。这个缺口属于现有六类本地数组的行动视图派生，不需要新的数据库、任务服务、完成状态、提醒、通知、拖拽、路由或网络请求。

第一性原理不变量：输入只能是 `App` 已加载的六类数组，并复用事务日历已验证的日期映射；逾期只适用于 `status !== 'done'` 且截止日期早于今天的任务，过去的会议、文件、外出、用章和物资是历史事实，不得回流为逾期待办；当天桶包含逾期未完成任务和日期等于今天的有效记录；未来桶只包含今天之后至第 7 天的有效记录，第 8 天不得进入；未排期只包含日期为空或无效的未完成任务与其他业务记录，已完成任务全部排除；派生不得修改源数组；切换状态只保留在当前 React 会话；点击记录必须复用 `resetLedgerView`、`navigate`、`selectBusinessRecord` 和右侧详情；工作台不得直接完成、编辑、改期、读写 IndexedDB、调用 Fetch/IPC 或产生遥测。

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 现有 React 19 + TypeScript 纯函数 + `agenda.ts` 规范化事件 | 当前锁定依赖与项目自有代码 | React MIT / 项目 UNLICENSED / Web 标准 | 复用六类日期映射，派生今日与逾期、未来 7 天、未排期三个行动桶，并打开既有详情 | 零新增依赖；不复制日期语义；最容易保持本地只读、稳定排序、中文高信息密度和现有详情链路 | 需要项目明确区分“截止日期”与“发生日期”，并维护少量无日期元数据 | React 19 与目标 Chromium持续维护；`agenda.ts` 已有单元与 E2E | 高 | 若把过去非任务记录当逾期会制造错误行动信号；若直接在工作台保存会形成第二套业务链路 | 采用 | 新增纯函数概览模块和轻量视图；工作台缩短装饰主区，把首屏重心移到三个本地行动桶 |
| Super Productivity Today View `3d41424f` | [官方 Today View 文档](https://github.com/johannesjo/super-productivity/blob/3d41424fb9726eaed70a696bef3a4909562ca761/docs/wiki/4.01-The-Today-View.md) / [MIT](https://github.com/johannesjo/super-productivity/blob/3d41424fb9726eaed70a696bef3a4909562ca761/LICENSE) | MIT | 把 Today 明确定义为按时间组织的日常工作入口，与项目/标签的分类视图区分 | 说明“日常行动视图”和“分类台账”应职责分离；逻辑日边界和明确空状态值得参考 | 面向单一任务模型，支持手工排序、计划迁移和大量本项目不需要的完成/调度行为 | 2026-07-31 主分支提交；package 18.16.0 | 交互概念高，源码复用低 | 复制 Angular 状态、拖拽或保存排序会引入持久化和第二套任务语义 | 只借鉴设计 | 借鉴“时间视图与分类视图分离、今天是主要工作入口”；不复制源码、文案、样式或排序状态 |
| Nextcloud Tasks Dashboard `2fa8faca` | [Dashboard.vue](https://github.com/nextcloud/tasks/blob/2fa8faca5f1cbbb339dfe46b4ce696f61d8883e4/src/views/Dashboard.vue) / [Widget](https://github.com/nextcloud/tasks/blob/2fa8faca5f1cbbb339dfe46b4ce696f61d8883e4/lib/Dashboard/TasksWidget.php) / [AGPL-3.0-or-later](https://github.com/nextcloud/tasks/blob/2fa8faca5f1cbbb339dfe46b4ce696f61d8883e4/LICENSE) | AGPL-3.0-or-later | 仪表板显示有限数量的未完成近期任务，区分“今天无任务”和“无近期任务”，并提供进入完整任务应用的路径 | 有界列表、日期副文案、半空状态和“查看更多”降低首页噪声 | 依赖 CalDAV、Vuex、Nextcloud Dashboard 与直接完成动作；只覆盖任务 | 2026-07-30 主分支提交 | 信息架构高，源码复用低 | 复制代码会产生 AGPL 风险；直接完成会绕过本项目编辑抽屉和六类模型边界 | 只借鉴设计 | 借鉴“首页只显示有界行动项、空状态区分、记录可回到原应用”；不复制实现、样式、文案或图标 |
| Vikunja Upcoming `506dbd7b` | [导航](https://github.com/go-vikunja/vikunja/blob/506dbd7b0483c626295081fd9dd5beef3df8def7/frontend/src/components/home/Navigation.vue) / [日期范围路由](https://github.com/go-vikunja/vikunja/blob/506dbd7b0483c626295081fd9dd5beef3df8def7/frontend/src/router/index.ts) / [AGPL-3.0-or-later](https://github.com/go-vikunja/vikunja/blob/506dbd7b0483c626295081fd9dd5beef3df8def7/LICENSE) | AGPL-3.0-or-later | 通过明确日期范围展示 upcoming，并可选择是否包含无日期任务 | 日期范围与无日期项是两个显式维度，避免把未排期混入普通时间顺序 | 服务端过滤、路由查询和单一任务模型与本项目不同 | 2026-07-30 主分支提交 | 交互参考中高，源码复用低 | 复制 Vue/服务端筛选会破坏已加载数组边界并产生 AGPL 风险 | 只借鉴设计 | 借鉴“未来范围与无日期项分开表达”；不复制源码、查询参数、文案或数据模型 |
| Google Tasks / Calendar | [Google Tasks 官方说明](https://support.google.com/tasks/answer/7675772?hl=en) / [Calendar 任务说明](https://support.google.com/calendar/answer/9901136?hl=en) | Google 服务条款；非开源、无再分发授权 | 快速记录任务、用截止日期和通知跟进，在 Calendar 网格与 Pending tasks 列表之间切换 | 证明“时间网格用于日期定位、待处理列表用于行动”应互补；开始时间、截止日期和待处理列表语义清晰 | 商业服务、数据模型与界面资产不可复制；部分能力依赖 Workspace 账户与云端 | 2026-07-31 官方帮助页可访问 | 仅作交互概念参考 | 不得抓取界面、文案、图标、模板或接口数据，也不得引入 Google 联网依赖 | 只借鉴概念 | 只借鉴“日历定位 + 待处理列表”的职责拆分；不复制任何产品内容或运行时能力 |

- 直接复用：现有 React state、`buildAgendaEvents`、领域严格日期校验、Lucide、六类已加载数组、台账视图清除、导航、选择和只读详情。
- 只借鉴设计：Super Productivity 的时间视图/分类视图分工；Nextcloud 的有界行动列表和差异化空状态；Vikunja 的未来范围/无日期分离；Google Tasks 与 Calendar 的网格定位/待处理列表互补。所有外部项目都不复制代码、文案、样式、图标、接口数据或业务模型。
- 不采用：新的 npm 依赖、CalDAV、云端任务服务、提醒/推送、拖拽排序、工作台直接完成或改期、服务端日期过滤、持久化视图状态、后台刷新和自动联网。
- 适配与保留：只新增 Web 纯函数和工作台展示组件，`App.tsx` 继续持有已加载数组与既有记录打开回调；保留十六模块导航、事务日历、六类 CRUD、三栏详情、抽屉守卫、IndexedDB 适配层、同步、附件和 AI 边界。
- 冲突审计：方案与 React/Vite、目录、构建、数据库、配置、权限、离线/联网和保留全部权利许可证均无冲突。若实现需要复制 AGPL/Google 内容、新增网络请求、增加完成状态或绕过原台账保存链路，则阻塞部署并停止集成。
- 许可证风险：无新增依赖；MIT 项目只作设计审计，AGPL 与 Google 商业产品只作不可复制的抽象交互参考。
- 联网变化：无。加载、切换概览和点击本机记录均不发起网络请求。
- 回滚方式：恢复旧 `Dashboard` 结构并移除概览纯函数、样式、测试和文档即可；不涉及数据、配置、服务端协议或安装包兼容迁移。

## v0.7.2 六类台账统一日历与当日议程方案审计

问题本质：任务、会议、文件、外出、用章和物资都已经保存独立日期字段，但当前工作台只统计任务到期数量并列出前五条任务，六个台账也只能逐个打开。用户无法回答“某一天有哪些事情”“本月哪些日期有记录”，更不能从跨模块时间视图直接进入既有记录详情。这个缺口属于已加载业务数组的只读时间索引与导航，不需要日历服务、数据库 schema、拖拽改期、重复事件、时区转换或后台同步。

第一性原理不变量：输入只能是 `App` 已加载的六类业务数组；日期来源固定为任务 `deadline`、会议 `meetingTime`、文件 `docDate`、外出 `researchTime`、用章 `sealTime`、物资 `handlerTime`，空值、无效日期和非四位年份必须排除；输出必须是新数组且不得修改业务记录；月视图、类型筛选和选中日期只保留在当前 React 会话；点击议程必须复用既有 `resetLedgerView`、`navigate`、`selectBusinessRecord` 和右侧详情链路；本功能不得新增 Fetch、IndexedDB 访问、Electron IPC、遥测、自动联网或第二套编辑保存逻辑。工作台已有长首屏和任务队列，继续叠加月历会让页面更长且入口不易发现，因此采用独立“事务日历”导航模块，并同步把导航总数从十五个调整为十六个。

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 现有 React 19 + TypeScript 纯函数 + 原生 `Date` / 字符串日期 | 当前锁定依赖与 ECMAScript 标准 | React MIT / Web 标准 | 六类记录规范化、周一起始 42 日月网格、类型筛选、当日议程、键盘按钮和既有详情跳转 | 零新增依赖；可精确约束日期来源和无效日期；最容易保持离线、只读、中文信息密度和既有三栏链路 | 需要项目维护少量日期网格、排序和可访问标签逻辑 | React 19 与目标 Chromium 当前持续维护 | 高 | 必须避免 UTC 解析导致日期偏移；不得把月历变成第二套编辑器；移动端不能直接压缩桌面事件卡 | 采用 | 新增 Web 纯函数模块与独立 `AgendaView`；桌面为月历加当日议程，移动端为紧凑日期网格加所选日期列表；只使用本地状态和 Lucide |
| FullCalendar 7.0.2 `b5e3796a` | [官方仓库](https://github.com/fullcalendar/fullcalendar/tree/b5e3796ad73982eae08c1b4d17c957d803cd76dc) / [MIT](https://github.com/fullcalendar/fullcalendar/blob/b5e3796ad73982eae08c1b4d17c957d803cd76dc/LICENSE.md) | MIT | 月/周/日视图、事件渲染、拖拽、插件体系和 React 适配 | 功能成熟；日期布局和跨月网格完整；React 17-19 可用 | `fullcalendar` npm 解包约 2.17 MB，React 包约 1.12 MB，并引入 Preact、headless calendar 与 Temporal；大量能力超出只读本地议程 | 2026-07-24 主分支仍有提交；仓库版本 7.0.2 | 中低 | 拖拽、插件状态、时区/Temporal 和样式体系会扩大包体及测试面，并容易形成未授权的改期入口 | 不采用 | 只核对其“前后月、今天、月网格、事件摘要”通用能力，不复制源码、样式或默认文案 |
| React Big Calendar 1.20.0 `183783ad` | [官方仓库](https://github.com/bigcalendar/react-big-calendar/tree/183783ad45c8b845c2f57c46711c1c4c85047843) / [MIT](https://github.com/bigcalendar/react-big-calendar/blob/183783ad45c8b845c2f57c46711c1c4c85047843/LICENSE) | MIT | React 月/周/日/议程视图和事件布局 | React 原生；传统日历视图完整；React 19 peer 范围已声明 | npm 解包约 1.77 MB，依赖多套日期本地化库、lodash、overlays 等；需要固定容器高度和额外 CSS | 2026-06-01 发布 1.20.0 | 低 | 同时引入 Moment、Day.js、Luxon、Globalize 等当前项目不需要的运行依赖，违背小而稳与离线包体约束 | 不采用 | 不引入包；仅确认“月视图与议程视图应当互补”的通用信息架构 |
| Schedule-X 4.x `e1901983` | [官方仓库](https://github.com/schedule-x/schedule-x/tree/e1901983a26d92073a4ccb39e65495d431a594e2) / [MIT](https://github.com/schedule-x/schedule-x/blob/e1901983a26d92073a4ccb39e65495d431a594e2/LICENSE) | MIT | 响应式事件日历、月/周/日视图、插件和 React 适配 | 响应式设计较新；核心日历与框架适配拆分 | `@schedule-x/calendar` npm 解包约 1.02 MB，并要求 Preact Signals 与固定 Temporal polyfill；部分高级能力位于商业扩展 | 2026-07-15 主分支仍有提交；核心包 4.6.1 | 中低 | 会在 React 应用中再引入 Preact Signals 状态体系和另一套样式/插件边界，收益低于集成成本 | 不采用 | 不引入包；只参考移动端应把日期选择与当日记录拆开的抽象原则 |
| Plane Calendar `39856932` | [Header](https://github.com/makeplane/plane/blob/39856932cd6b9bd17eab0920506d628190b47af2/apps/web/core/components/issues/issue-layouts/calendar/header.tsx) / [Calendar](https://github.com/makeplane/plane/blob/39856932cd6b9bd17eab0920506d628190b47af2/apps/web/core/components/issues/issue-layouts/calendar/calendar.tsx) / [AGPL-3.0-only](https://github.com/makeplane/plane/blob/39856932cd6b9bd17eab0920506d628190b47af2/LICENSE.txt) | AGPL-3.0-only | 月/周切换、前后周期、今天、选中日期和移动端当日工作项列表 | 桌面网格与移动端议程分工明确；选中日期是导航状态而非第二份数据 | Next.js、MobX、拖拽、服务端分页与工作项模型远超当前需求 | 2026-07-30 `preview` 分支快照 | 交互参考高，源码复用低 | 复制代码/样式会产生 AGPL 与架构冲突；拖拽改期会绕过六类编辑抽屉 | 只借鉴设计 | 只借鉴“前后月/今天 + 选中日 + 移动端当日列表”的交互骨架，不复制代码、文案、样式或资产 |
| Vikunja Upcoming `506dbd7b` | [导航](https://github.com/go-vikunja/vikunja/blob/506dbd7b0483c626295081fd9dd5beef3df8def7/frontend/src/components/home/Navigation.vue) / [路由](https://github.com/go-vikunja/vikunja/blob/506dbd7b0483c626295081fd9dd5beef3df8def7/frontend/src/router/index.ts) / [AGPL-3.0-or-later](https://github.com/go-vikunja/vikunja/blob/506dbd7b0483c626295081fd9dd5beef3df8def7/LICENSE) | AGPL-3.0-or-later | 把 upcoming 作为独立一级入口，以明确日期范围查看任务 | 证明跨日期工作视图具有独立导航价值；入口可发现、可用键盘快捷访问 | 当前实现面向单一任务模型和服务端过滤，不提供本项目所需六类月网格 | 2026-07-30 主分支快照 | 信息架构参考中高，源码复用低 | 复制 Vue/服务端过滤会破坏本地数组边界并产生 AGPL 风险 | 只借鉴设计 | 只借鉴“日期工作视图应有独立入口”，不复制源码、文案、样式或数据模型 |

- 直接复用：现有 React 状态、TypeScript 严格类型、领域日期校验、Lucide、六类已加载数组、台账视图清除函数、导航、记录选择和只读详情面板。
- 只借鉴设计：Plane 的桌面月网格/移动端当日列表分工；Vikunja 的独立 upcoming 入口；MIT 日历库的前后月、今天和议程互补原则。外部项目不复制代码、文案、样式或视觉资产。
- 不采用：FullCalendar、React Big Calendar、Schedule-X 运行依赖；周/日时间轴、拖拽改期、重复事件、时区服务、日历订阅、远程同步、提醒推送、持久化筛选和后台缓存。
- 适配范围：新增纯函数时间索引和独立 React 视图；`App.tsx` 只增加导航、数据传递和既有记录打开回调。领域 schema、RxDB、快照、同步、附件、编辑抽屉、删除和 AI 路径全部保留。
- 冲突审计：方案与 React 19、Vite、现有目录、构建、配置、权限、离线/联网和保留全部权利许可证不冲突；新增一级导航会把文档与全局查找中的导航总数由十五调整为十六，必须同步 HELP、README、契约和 E2E。若实现需要任何新增持久化、自动联网、日历写回或 AGPL 代码复制，则立即阻塞并停止落地。
- 许可证风险：最终不新增依赖；只使用 Web 标准和项目自有实现。MIT 候选只作能力审计，AGPL 项目只作抽象交互参考。
- 回滚方式：移除 `agenda` 纯函数/视图、导航项、样式和对应文档/测试即可恢复 v0.7.1；无数据迁移、配置迁移、服务端回滚或 Release 资产兼容问题。

## v0.7.1 六类台账统一本地筛选与排序方案审计

问题本质：六类业务台账当前只有一个跨模块复用、切换导航即清空的关键词状态，列表只能按数据适配层返回顺序展示。用户无法按任务状态、文件类型、活动方向、物资收发等结构化字段收窄结果，也不能把最近日期或标题顺序稳定地放到前面。这个缺口属于已加载数组的本地视图转换和会话操作状态，不需要新的数据读取、持久化、表格引擎或网络请求。

第一性原理不变量：输入只能是 `App` 已加载的六类业务数组与当前模块的会话级查询、筛选、排序状态；输出必须是新数组，禁止原地修改仓库状态；查询、筛选和排序只能改变可见集合，不能修改、删除或重写业务记录；记录选中、详情与编辑必须继续复用既有路径；物资账面库存必须始终用全部物资记录计算，不能随可见筛选变化；清除视图后必须恢复完整集合；导航切换只保留当前浏览器会话内的各模块视图状态，不写入 IndexedDB、localStorage、快照或同步服务。

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 现有 React 19 + TypeScript 纯函数 + `Array.filter` / 复制后 `sort` | 当前锁定依赖与 ECMAScript 标准 | React MIT / Web 标准 | 模块化查询、单值字段筛选、稳定比较器、会话状态与派生计数 | 零新增依赖；能直接复用现有六类数组、详情选择和暗色工业设计系统；转换边界可用单元测试穷举 | 需要项目维护少量字段配置、日期空值顺序和中文比较规则 | React 19 与目标 Chromium 当前持续维护 | 高 | 必须集中定义字段和默认排序，避免六个页面各写一套；必须复制数组后排序 | 采用 | 新增类型化本地视图模块和共享 `LedgerViewControls`；各模块仅提供筛选/排序选项与状态，列表消费统一派生结果 |
| TanStack Table `d66b39f0` | [官方仓库](https://github.com/TanStack/table/tree/d66b39f01e23eeb4e2befc7777194104967212d3/packages/table-core/src/features) | MIT | 列筛选、全局筛选、多列排序、行模型、分页与扩展状态 | API 成熟、类型完整、排序前复制行模型并保留原索引稳定性 | 当前页面不是通用列定义表格；引入后要把六个专用卡片列表改造成列模型，增加状态层、适配和包体 | 2026-07-30 主分支发布提交 | 中低 | 与现有专用三栏列表、详情选择、移动横向表格和最小依赖原则冲突；分页/分面/多列排序均无真实需求 | 不采用 | 只借鉴“筛选状态独立、先筛选后排序、排序不得破坏源模型、相等项保持原顺序”的设计原则 |
| Vikunja Filters / SortPopup `506dbd7b` | [筛选](https://github.com/go-vikunja/vikunja/blob/506dbd7b0483c626295081fd9dd5beef3df8def7/frontend/src/components/project/partials/Filters.vue) / [排序](https://github.com/go-vikunja/vikunja/blob/506dbd7b0483c626295081fd9dd5beef3df8def7/frontend/src/components/project/partials/SortPopup.vue) | AGPL-3.0 | 独立筛选与排序入口、明确应用/清除、视图级状态保留 | 操作分区清楚，清除动作和当前视图状态反馈适合借鉴 | Vue、路由查询和服务端任务过滤与当前 React 本地数组不同；AGPL 不适合复制进本项目 | 2026-07-30 主分支快照 | 交互参考高，源码复用低 | 复制组件会产生许可证和架构冲突；提交式弹窗对本项目少量即时本地选项过重 | 只借鉴设计 | 借鉴“筛选与排序分工、显式清除、返回视图仍保留状态”，不复制代码、文案或样式 |
| Plane applied/display filters `39856932` | [官方仓库](https://github.com/makeplane/plane/tree/39856932cd6b9bd17eab0920506d628190b47af2/apps/web/core/components/issues/issue-layouts/filters) | AGPL-3.0-only | 已应用筛选摘要、Order by 选项、显示属性和复杂工作项视图 | 活跃筛选可见、排序选择明确，适合作为高密度工作台的信息层级参考 | Next.js、MobX、服务端工作项模型和复杂筛选树远超六个本地列表 | 2026-07-30 主分支快照 | 交互参考中高，源码复用低 | 复制代码/样式会产生 AGPL 风险；复杂多选筛选会挤压已收窄的中间栏并增加移动端负担 | 只借鉴设计 | 只借鉴“活动状态一眼可见、排序标签明确、清除入口靠近结果计数”，不复制实现、文案或视觉资产 |

- 直接复用：现有 React 状态、TypeScript 严格类型、Lucide 图标、原生 input/select、业务详情选择链路与 `calculateMaterialStock`。
- 只借鉴设计：TanStack Table 的不可变行模型与稳定顺序；Vikunja 的筛选/排序分工和清除动作；Plane 的活动筛选反馈。AGPL 项目不复制代码、文案、样式或数据。
- 不采用：TanStack Table 运行依赖、路由查询、服务端过滤、分页、分面统计、多列排序、拖拽排序、筛选持久化和后台缓存；这些能力会增加当前六个小型本地数组不需要的复杂度。
- 适配范围：新增一个 Web 纯函数模块和一个共享控制条；`App.tsx` 维护六个模块的会话状态并把派生数组继续传给原视图。数据适配器、领域 schema、详情、编辑抽屉、附件和删除路径全部保留。
- 冲突审计：不新增依赖、数据库字段、配置文件、API、Fetch、IPC、持久化或自动联网。移动端控件必须换行且保持 44px 触控目标；桌面三栏与窄屏详情滚动规则不变。
- 许可证风险：无新增运行依赖；MIT 方案仅借鉴通用状态原则，AGPL 方案只作为信息架构参考，没有复制受保护表达。
- 回滚方式：移除本地视图模块、共享控制条、六模块状态与对应测试即可恢复 v0.7.0；业务记录、快照、IndexedDB、私有 API 与 Release 资产无需迁移或回滚。

## v0.7.0 本地全局查找与命令面板方案审计

问题本质：当前六类业务搜索只过滤正在浏览的台账，切换导航还会清空搜索词；用户无法从任意页面快速定位十五个导航模块或已加载的业务记录。这个缺口属于本地导航、结果分组、键盘焦点和可访问组合框能力，不需要新的数据读取、持久化、网络搜索或第二套业务保存逻辑。

第一性原理不变量：面板只能搜索当前 React 状态中已经加载且允许展示的数据；导航结果必须调用既有 `navigate`，业务结果必须复用既有导航、记录选择和只读详情链路；关闭面板不得修改页面搜索词；API Key、访问码、中转密码、relay session、未脱敏原文和附件正文永远不能进入索引或结果；业务编辑抽屉、当前页 AI 对话框打开时不得叠加第二个模态层。

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cmdk 1.1.1 `dd2250ed` | [官方仓库](https://github.com/pacocoursey/cmdk) / npm | MIT | 可访问 Dialog/combobox、分组、筛选、键盘导航和焦点管理 | React 18/19 兼容；npm 解包约 82 KB；直接补齐最容易出错的无障碍交互 | 依赖四个 Radix primitive；仍需项目定义结果模型、关闭条件和业务选择动作 | 2026-07-31 审计快照，稳定版 1.1.1 | 高 | 默认筛选必须限定在项目提供的本地结果；Dialog 不能与现有编辑器或 AI overlay 叠加 | 采用 | 只复用命令容器、筛选、分组、选中态、键盘和焦点能力；结果数据及动作由 `App.tsx` 明确提供，不使用远程搜索 |
| kbar 0.1.0-beta.48 `7a9af307` | [官方仓库](https://github.com/timc1/kbar) / npm | MIT | 命令注册、Fuse 搜索、虚拟列表、历史和嵌套动作 | 功能完整，适合大型命令系统 | 仍为 beta；npm 解包约 601 KB；Fuse、虚拟化、历史和嵌套动作超过本轮需要 | 2026-07-31 审计快照，仓库仍维护 beta | 中低 | 会引入第二套命令注册/历史状态，且更容易把业务动作扩张为不可审计的全局命令 | 不采用 | 当前只需要导航与记录查找，不引入历史、嵌套动作或虚拟化 |
| Plane Power K `39856932` | [官方仓库](https://github.com/makeplane/plane/tree/39856932cd6b9bd17eab0920506d628190b47af2/apps/web/core/components/power-k) | AGPL-3.0-only | 分组命令、快捷键、上下文动作、冲突模态抑制和空状态 | 产品级交互覆盖完整，适合作为信息架构参考 | Next.js/MobX/服务端搜索与当前本地单页架构不兼容；AGPL 不适合复制到本项目 | 2026-07-31 主分支快照 | 交互参考高，源码复用低 | 复制代码会产生许可证与架构冲突；服务端搜索会破坏离线和零联网边界 | 只借鉴设计 | 只借鉴分组、`Ctrl/Cmd+K`、显式空状态和禁止冲突模态叠加，不复制代码、文案或样式 |
| 原生 React + ARIA 自研 | 当前技术栈与 Web 标准 | React MIT / Web 标准 | 自行实现 dialog、combobox、listbox、焦点循环和键盘状态机 | 零新增依赖、体积最小 | 需要自行处理组合输入、焦点恢复、活动项、读屏语义和边界键，回归面大 | 稳定标准但实现由项目独自维护 | 中 | 容易重复造轮子并产生键盘/读屏缺陷；后续修复成本高于依赖收益 | 不采用 | 仅当 cmdk 与现有 React/CSS/构建发生真实冲突时回退，并先补齐等价无障碍测试 |

- 直接复用：`cmdk@1.1.1` 的 Dialog、Input、List、Group、Item、Empty 与键盘/焦点语义；现有 Lucide 图标、React 状态、导航和业务记录选择函数。
- 只借鉴：Plane 的分组信息架构、快捷键和模态冲突抑制；不复制 AGPL 源码、文案、样式或服务端搜索行为。
- 不采用：kbar、Fuse、虚拟化、命令历史、远程搜索、后台索引、最近访问持久化和第二套全局状态库。
- 适配范围：新增一个只读派生结果组件及顶栏入口；业务数据仍从 `App` 已加载的六类数组派生，选中结果只调用现有 `navigate` 与 `selectBusinessRecord`。
- 联网与隐私变化：无。打开、输入、筛选和选择均不得调用 Fetch、IndexedDB、Electron IPC 或遥测；索引字段使用业务列表已经允许展示的标题与摘要字段，明确排除所有会话秘密和未脱敏 AI 内容。
- 冲突审计：cmdk 与 React 19、Vite 和现有单页状态兼容；MIT 可用于当前保留全部权利项目。Dialog portal 需要补充现有层级样式，并在任一业务编辑器或 AI overlay 打开时拒绝开启，避免与未保存守卫或 AI 确认层互斥。
- 回滚：移除顶栏入口、快捷键 effect、派生结果组件、样式和 `cmdk` 依赖即可；不涉及数据库 schema、快照、业务记录、私有 API 或服务端配置。

## v0.6.9 业务抽屉未保存保护方案审计

第一性原理分析：编辑抽屉打开时的记录、智能识别文字和附件处理状态共同构成初始快照。只要当前状态与该快照不同，任何关闭路径都不能静默丢弃；确认放弃后，字段与暂存附件必须一起清理，仍在读取或计算哈希的旧附件任务也不能在迟到后重新写回。旧实现的问题不是缺少路由、表单框架或持久化能力，而是六个受控编辑器没有共享脏状态基线、统一关闭守卫、条件式 `beforeunload` 和附件会话失效机制。

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 现有 React 受控状态 + 项目局部 `useUnsavedChangesGuard` + Web `beforeunload` | 当前锁定的 React 与浏览器标准 | React MIT / Web 标准 | 初始值快照、脏状态、统一关闭确认、条件式离开保护、附件任务代次失效 | 零新增依赖；可覆盖六类现有受控编辑器、智能识别文字和暂存附件；不改变路由、数据层或保存协议 | 深比较与确认文案由项目维护；浏览器离开提示内容由浏览器决定 | React 19 已锁定，目标 Chromium 原生支持 | 高 | 必须避免附件处理完成前保存记录，也不能让迟到附件回调重开已关闭编辑器 | 采用 | 在 `App.tsx` 增加一个共享 hook、抽屉 Escape/脏状态展示、处理期间保存禁用和附件会话代次；所有关闭入口复用同一 `requestClose` |
| React Router navigation blocking `8bc59bc7` | [官方指南](https://github.com/remix-run/react-router/blob/8bc59bc7b027d5f2aba15a6dd72f44e757dbd8f9/docs/how-to/navigation-blocking.md) | MIT | `useBlocker`、脏状态导航阻断、`proceed/reset` 确认流程 | 明确区分继续离开与留在当前表单，路由导航状态完整 | 当前应用没有 React Router；抽屉关闭和浏览器退出不是路由跳转，引入后仍要自写附件失效与 `beforeunload` | 2026-07-22 快照，官方仓库持续维护 | 设计参考高，依赖契合度低 | 会为了一个局部抽屉守卫引入第二导航体系，与现有 `Tab` 会话状态重叠 | 只借鉴设计 | 借鉴“脏状态才阻断、明确 proceed/reset、保存后解除阻断”，不引入路由依赖 |
| React Hook Form `41f32af3` | [官方仓库](https://github.com/react-hook-form/react-hook-form/tree/41f32af3e3ea90a16e8e61d30f285d152e7ccd4b) | MIT | `defaultValues`、`isDirty`、`dirtyFields`、表单注册与校验 | 大型嵌套表单脏状态成熟，字段级信息丰富 | 六类编辑器已使用领域对象受控更新；引入后会形成第二套字段状态，并不能处理附件哈希任务或浏览器离开 | 2026-07-30 快照，活跃 | 中 | 与现有 `onChange(record)`、日期编辑缓冲和领域校验职责重复，迁移范围超过收益 | 不采用 | 只借鉴“用打开时默认值比较当前值”的基线语义，不迁移现有表单 |
| react-use `useBeforeUnload` `fbe99c63` | [官方实现](https://github.com/streamich/react-use/blob/fbe99c6327e6af94df03bc8bd6ecc5e3ff04fbcc/src/useBeforeUnload.ts) | Unlicense | 按条件注册/移除 `beforeunload` 监听 | 实现小，生命周期清晰，能避免干净页面始终触发离开提示 | 为一个十余行 hook 引入完整工具包收益不足；仍不包含抽屉确认和附件会话清理 | 17.6.1，2026-06-10 发布快照 | 设计参考高，依赖契合度低 | 新依赖会扩大供应链与浏览器包，但不能替代项目守卫 | 只借鉴设计 | 借鉴“仅 dirty 时监听、cleanup 时移除”，使用项目局部实现 |

采用结果：

- 直接复用：现有 React 受控领域对象、原生 `window.confirm`、`beforeunload`、现有暂存附件内存边界和保存时持久化流程。
- 只借鉴设计：React Router 的 proceed/reset 语义、React Hook Form 的默认值比较、react-use 的条件式离开监听；未复制外部实现、文案或样式。
- 不采用：React Router、React Hook Form、react-use 运行依赖，以及新的全局表单/路由状态；它们会与当前单页 `Tab`、受控领域对象和附件生命周期形成重复职责。
- 适配与保留：只修改 `App.tsx` 的六个编辑器、共享 `Drawer`、附件读取会话和局部样式；保留现有保存函数、IndexedDB 适配层、附件引用清理、移动底栏和三栏详情结构。
- 替换范围：把六个编辑器各自直接调用 `onClose` 的取消/关闭行为替换为一个 `requestClose`；不替换任何业务模型、数据 schema、API 或编辑控件。
- 许可证风险：无新增依赖；MIT 与 Unlicense 项目仅作设计审计，未复制代码。
- 联网与离线：没有新增端点、自动请求、远程资源或持久化秘密；`beforeunload` 只在当前浏览器会话的脏抽屉中注册。
- 回滚方式：移除共享 guard、附件任务代次和对应 E2E 即可恢复旧关闭行为；不需要迁移或回滚本机数据。

## v0.6.8 AI 生成取消、竞态与历史原子性方案审计

第一性原理分析：一次生成的输入是不变快照，输出只能由仍处于当前代次的同一请求提交；否则重复点击会产生多个付费请求，旧响应会覆盖新状态，并可能重复保存历史。当前项目缺少的是局部请求身份、浏览器取消信号、明确忙碌/停止反馈和历史写入守卫，不缺少聊天 SDK、缓存层、流式协议或后台任务系统。

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Web `AbortController`、`AbortSignal.any`、`AbortSignal.timeout` | [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) / Web 标准 | Web 标准文档 | 调用方取消、组合 60 秒超时、向 Fetch 传播取消 | 零依赖；与当前原生 Fetch、PNA、禁止重定向和 2 MB 流式限制完全兼容 | 不能直接中止已经通过 Electron `ipcRenderer.invoke` 发出的主进程调用 | 当前浏览器与 Node/Electron 运行时原生支持 | 高 | 必须保留请求代次，不能把“能 abort”误当成“迟到状态一定安全” | 采用 | 三类浏览器生成客户端接收调用方 signal，并与既有超时组合；桌面继续使用代次拒绝迟到结果 |
| Vercel AI SDK `ebd31b80` | [官方仓库](https://github.com/vercel/ai/tree/ebd31b80879a556e42469b3537ac122e40c869d0/packages/ai/src/generate-text) | Apache-2.0 | `abortSignal`、多级 timeout 合并、流式 `onAbort` 生命周期 | 取消和超时语义完整，许可证宽松，测试与文档成熟 | 会引入完整模型抽象、流式协议、重试与 provider 层；替换现有兼容请求会扩大协议和包体 | 2026-07-30 主分支更新 | 设计参考高，依赖契合度低 | 与现有确定性 OpenAI 兼容请求、显式联网和最小依赖边界重叠 | 只借鉴设计 | 借鉴“调用方 signal 与超时分离后合并”的生命周期，不引入 SDK |
| LobeChat `abortableRequest` `f29cc947` | [官方仓库](https://github.com/lobehub/lobe-chat/blob/f29cc947f3d378315a546af23884dd3c50d45096/src/services/utils/abortableRequest.ts) | LobeHub Community License | 同 key 新请求取消旧请求、手动取消、仅当前 controller 完成清理 | 请求身份和 finally 清理边界清楚，直接覆盖迟到请求竞态 | 全局 key manager 超过本项目两个局部 AI 面板需求；自定义许可证不适合复制实现 | 2026-07-30 主分支快照 | 生命周期参考高，源码复用低 | 不能复制受限实现；全局管理器会扩大模块职责 | 只借鉴设计 | 独立实现局部 React hook，以递增代次和 controller identity 保护模型与生成请求 |
| LibreChat `useAbortCleanup` / StopButton `f7bc50ae` | [官方仓库](https://github.com/danny-avila/LibreChat/tree/f7bc50ae5b752e50fab7f97ee00531ca1264ea05/client/src) | MIT | 显式停止按钮、捕获提交身份、异步中止返回后只清理仍相同的提交 | 直接说明“中止响应晚于下一提交”这一竞态，并用身份守卫避免误清理新请求 | 依赖 Recoil、SSE、服务端中止和多会话提交状态，远超本项目单次生成 | 2026-07-28 主分支更新 | 原理契合度高，架构复用低 | 引入其状态层会与当前本地单页 AI 工作流冲突 | 只借鉴设计 | 借鉴异步清理前再次核对当前请求身份和显式停止反馈，不复制组件 |
| Open WebUI `stopResponse` `01f4282f` | [官方仓库](https://github.com/open-webui/open-webui/blob/01f4282f1ffe0d6212f58d3afbeae21fffd0c4be/src/lib/components/chat/Chat.svelte) | Open WebUI 自定义许可证 | 停止当前生成、AbortController、队列切换和可见 Stop 控件 | 停止入口明确，生成中状态可感知 | Svelte、流式消息树、任务队列和服务端取消均超出需求；自定义许可证限制复制 | 2026-07-27 主分支更新 | 交互参考中高，代码复用低 | 不得复制组件、文案、样式或队列逻辑 | 只借鉴设计 | 仅借鉴“生成按钮切换为忙碌态并提供独立停止操作” |

采用结果：

- 直接复用：标准运行时的 `AbortController`、`AbortSignal.any` 和 `AbortSignal.timeout`，继续复用当前原生 Fetch、2 MB 有界读取、禁止重定向和回环 PNA 标记。
- 只借鉴设计：Vercel AI SDK 的 signal/timeout 合并，LobeChat 与 LibreChat 的请求身份守卫，Open WebUI 的显式停止反馈。
- 不采用：聊天 SDK、TanStack Query/SWR 缓存、流式消息树、服务端任务队列、自动重试和后台刷新；这些能力会增加自动联网、协议、包体与状态复杂度，却不能更小地解决当前竞态。
- 适配范围：只修改 `packages/sync-client` 生成方法、`apps/web` 的共享请求 hook/生成控件及回归测试；保留现有服务端协议、Electron IPC 载荷、脱敏、逐次确认和本机历史 schema。
- 许可证风险：无新增依赖；Apache-2.0 与 MIT 项目未复制代码，自定义许可证项目只作设计参考。
- 回滚方式：移除生成 signal 参数、生成请求 hook/控件和对应测试即可；不涉及数据迁移、服务端回滚或秘密轮换。

## v0.6.7 模型刷新、取消与状态保留方案审计

问题本质：模型目录是用户显式触发的会话状态。刷新操作不应在新结果成功前破坏上次已验证目录；短暂失败不能把仍可用的模型选择清空；停止等待或切换配置后，浏览器应尽早中止请求，桌面 IPC 至少必须拒绝迟到结果。审计同时发现直连 Web 与 Electron 对模型 ID 调用了排序，违反项目“保持上游顺序”的既有规则。

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Web `AbortController` / `AbortSignal.any` | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) / Web 标准 | Web 标准文档 | 主动中止 Fetch、组合调用方取消与超时 | 零依赖；能直接接入现有 Fetch；不引入缓存或后台请求 | Electron `ipcRenderer.invoke` 本身不能把同一信号传到主进程 | 浏览器与 Node/Electron 当前运行时均原生支持 | 高 | 必须保留“仅最新请求可提交状态”，不能把取消错误误报成超时 | 采用 | 浏览器直连、Relay、内网模型发现组合调用方 signal 与 60 秒超时；配置变化、重复请求或用户停止等待时 abort |
| LobeChat `abortableRequest` `f29cc947` | [官方仓库](https://github.com/lobehub/lobe-chat/blob/f29cc947f3d378315a546af23884dd3c50d45096/src/services/utils/abortableRequest.ts) | LobeHub Community License | 按请求 key 取消上一请求、手动取消、完成后清理 controller | 请求代次与 controller 生命周期清楚，并有取消/并发/清理测试 | 自定义许可证限制衍生分发；其全局 manager 超过本项目局部模型请求需求 | 2026-07-30 主分支更新 | 设计参考高，代码复用低 | 不得复制实现；全局 key manager 会扩大职责 | 只借鉴设计 | 借鉴“新请求取消旧请求、仅当前 controller 完成清理”的生命周期，不复制代码 |
| Open WebUI ModelSelector `01f4282f` | [官方仓库](https://github.com/open-webui/open-webui/tree/01f4282f1ffe0d6212f58d3afbeae21fffd0c4be/src/lib/components/chat/ModelSelector) | Open WebUI 自定义许可证 | 搜索、当前模型定位、可取消模型下载、视口约束 | 长列表和取消反馈成熟，当前选择具有明确视觉锚点 | Svelte、全局 store 与下载队列远超模型目录刷新；品牌条款限制复制 | 2026-07-27 主分支更新 | 交互参考中高，源码复用低 | 不得复制组件、品牌、文案、样式或模型数据 | 只借鉴设计 | 借鉴“操作可取消且当前选择持续可见”，不引入下载、置顶、多选或其代码 |
| TanStack Query 5.101.4 | [取消文档](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation) / MIT | MIT | AbortSignal、`keepPreviousData`、缓存和请求状态 | 取消与保留旧数据语义完整 | npm 解包约 859 KB；query cache、失效与自动重新获取心智超过当前需求 | 2026-07-29 npm 元数据 | 中 | 与模型发现必须按钮显式触发、不得后台联网的边界冲突 | 不采用 | 仅借鉴“成功前保留旧状态”和 signal 取消语义 |
| SWR 2.4.2 | [状态理解文档](https://swr.vercel.app/docs/advanced/understanding) / MIT | MIT | `keepPreviousData`、重新验证和缓存 | API 小，保留旧数据体验成熟 | npm 解包约 311 KB、2 个依赖；默认重新验证语义不适合模型目录 | 2026-07-27 npm 元数据 | 中低 | 容易引入页面聚焦/网络恢复时自动刷新 | 不采用 | 不引入 SWR，只在用户显式刷新期间保留当前会话目录 |
| Axios 1.19.0 | [取消文档](https://axios-http.com/docs/cancellation) / MIT | MIT | AbortController、超时、HTTP 封装 | 取消 API 成熟 | npm 解包约 1.87 MB、4 个依赖；会与现有原生 Fetch 和流式 2 MB 限制形成第二套传输层 | 2026-07-28 npm 元数据 | 低 | 重写 Fetch 边界会增加重定向、PNA 与限流回归面 | 不采用 | 继续使用原生 Fetch 与现有有限读取器 |
| 现有 React 会话状态 + 原生 Fetch | 当前锁定依赖 | React MIT、Web 标准 | 保留最后成功目录、原子提交、当前选择保持、显式停止等待 | 零新增依赖；不改变协议、持久化、CSP 或联网触发点 | Electron 只能停止 UI 等待并忽略迟到 IPC，不能强制中断主进程 Fetch | 当前持续维护 | 高 | 必须同时覆盖 Web、Relay、内网和桌面顺序解析 | 采用 | 扩展局部请求 hook 和三个客户端的可选 signal；刷新不先清空，失败保留旧目录，成功按上游顺序原子替换 |

- 直接复用：浏览器 `AbortController`、`AbortSignal.any`、现有 60 秒超时、请求代次、原生按钮/select 和当前暗色工业设计系统。
- 只借鉴：LobeChat 的 controller 生命周期、TanStack Query/SWR 的“成功前保留旧状态”、Open WebUI 的显式取消反馈；未复制任何外部代码、文案、样式或数据。
- 不采用：全局请求缓存、焦点/网络恢复自动刷新、后台重新验证、Axios、TanStack Query、SWR、模型下载队列、置顶和多选。
- 适配范围：`packages/sync-client` 的模型发现可选 signal，Electron 模型顺序解析，`apps/web` 的局部刷新控制与 E2E；不改生成协议、AI 历史、服务端路由、数据库 schema、API Key 生命周期或模型目录持久化。
- 回滚：恢复模型解析的旧返回逻辑并移除局部刷新控件/signal 参数即可；业务数据和 AI 历史无需迁移。

## v0.6.6 模型目录筛选与异步竞态方案审计

问题本质：模型发现是用户显式触发的异步操作。当前实现没有给请求绑定配置代次，若用户在慢请求返回前切换服务商、地址、会话或本机站点，旧响应仍可能覆盖新配置的模型状态；同时部分兼容服务会返回几十至数百个模型，原生长下拉缺少快速筛选。必须保持“不自动联网、上游顺序不被 UI 重排、会话秘密不持久化”三个既有边界。

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Open WebUI ModelSelector `01f4282f` | [官方仓库](https://github.com/open-webui/open-webui/tree/01f4282f1ffe0d6212f58d3afbeae21fffd0c4be/src/lib/components/chat/ModelSelector) | Open WebUI 自定义许可证 | 模型搜索、标签/连接类型筛选、置顶和多模型选择 | 大目录操作成熟，搜索入口与模型状态集中 | Svelte 架构和复杂模型元数据远超本项目；品牌条款限制复制 | 2026-07-27 主分支更新 | 交互参考高，源码复用低 | 不得复制代码、文案、样式、品牌或模型元数据；多选会改变生成协议 | 只借鉴设计 | 借鉴“显式搜索 + 当前选择保留”，不引入标签、置顶、多选或其代码 |
| LobeChat ModelSwitchPanel `a5769c22` | [官方仓库](https://github.com/lobehub/lobe-chat/tree/a5769c22b6a80945c671130e42cde45a2e84fe61/src/features/ModelSwitchPanel) | LobeHub Community License | 搜索关键词、按模型/服务商分组、短视口面板约束 | 对长模型目录和窄视口均有明确状态 | 依赖 Lobe UI、全局 store、价格与 provider 元数据 | 2026-07-28 `main` 更新 | 搜索与视口思路契合，架构复用低 | 商业衍生需额外许可；不能复制组件或引入其 provider 数据 | 只借鉴设计 | 借鉴搜索状态与窄视口可读性，不复制代码或分组数据 |
| react-select 5.10.2 `4b694807` | [官方仓库](https://github.com/JedWatson/react-select/tree/4b6948078684bee394e09dd8e7cdc2d7f89e0fad) / [npm](https://www.npmjs.com/package/react-select) | MIT | 可搜索、异步、可创建和多选 Select | 成熟、TypeScript、功能完整 | npm 解包约 725 KB、9 个依赖；需要重做现有暗色样式与原生 select E2E | 2026-07-16 更新 | 中 | 会形成第二套选择器语义并扩大运行包，收益不足 | 不采用 | 继续使用原生 input/select；未来需要虚拟化或多选再审计 |
| Headless UI React 2.2.10 `eea57cf4` | [官方仓库](https://github.com/tailwindlabs/headlessui/tree/eea57cf46fd6767ed1059012f7073b88eb159fba) / [npm](https://www.npmjs.com/package/@headlessui/react) | MIT | 无样式可访问 Combobox | 键盘与焦点语义成熟，可完全自定义 | npm 解包约 1.0 MB、5 个依赖；本项目目前没有 Headless UI 组件体系 | 2026-04-13 更新 | 中 | 为单个筛选器引入新组件基础设施，复杂度超过收益 | 不采用 | 保留原生输入和选择器的可访问名称、焦点环与键盘行为 |
| TanStack Query 5.101.4 `9d24c455` | [官方仓库](https://github.com/TanStack/query/tree/9d24c455453b965511472a8251d68e2ae02c96e0) / [npm](https://www.npmjs.com/package/@tanstack/react-query) | MIT | query key、取消、缓存、去重和请求状态 | 能系统处理异步服务状态 | 会增加缓存与自动刷新语义；npm 解包约 859 KB | 2026-07-29 更新 | 低 | 与模型发现必须显式点击、不得后台联网的边界冲突 | 不采用 | 不新增服务状态层，只用请求代次拒绝迟到结果 |
| SWR 2.4.2 `6e68cdce` | [官方仓库](https://github.com/vercel/swr/tree/6e68cdce11ba222e08b609b004967053fd8ea602) / [npm](https://www.npmjs.com/package/swr) | MIT | 缓存、重新验证、请求去重 | API 小，适合普通远端资源 | 默认心智是可缓存与重新验证；npm 解包约 311 KB | 2026-07-27 更新 | 低 | 模型目录不能在页面加载或配置变化时自动刷新 | 不采用 | 保持每次模型发现由按钮显式触发 |
| 现有 React `useRef`/`useState` + 原生 input/select + Lucide | 当前锁定依赖 | React MIT、Lucide ISC、Web 标准 | 请求代次、忙碌态、模型计数、关键词筛选和当前选择保留 | 零新增依赖；不改变协议、持久化、CSP 或联网触发点；可复用现有 E2E | 需要项目自行维护少量状态和样式 | 当前持续维护 | 高 | 必须在地址/服务商/会话变化时失效旧请求，并保留键盘名称 | 采用 | `useLatestModelRequest` 统一拒绝迟到结果；`ModelCatalogField` 仅在模型超过 8 个时显示筛选器 |

- 直接复用：React 会话状态、现有 `DirectAiClient`/`PrivateSyncClient`/`RelayAiClient`、原生 select、Lucide、暗色“动态档案 / 墨迹信号”设计系统和显式模型按钮。
- 只借鉴：Open WebUI 与 LobeChat 的模型搜索、当前选择保留和窄视口信息密度；未复制其源代码、文案、样式、服务商数据或品牌。
- 不采用：模型置顶、多选、价格/能力标签、后台刷新、缓存、自动重试、react-select、Headless UI、TanStack Query 与 SWR；这些能力会引入无需求依赖或改变当前单模型/显式联网边界。
- 适配范围：只修改 `apps/web` 的请求状态和模型目录展示，补互联网竞态 E2E 与 UI 契约；不改同步客户端协议、服务端路由、数据库 schema、API Key 生命周期或模型返回顺序。
- 回滚：删除请求代次 hook、模型筛选组件和对应 CSS 即可恢复原下拉；业务数据与 AI 历史无需迁移。

## v0.4.1 常用项与当前页 AI 方案审计

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 现有 React 受控状态 + 领域纯函数 + RxDB 设置记录 + 已挂载 `AiHub` | 当前锁定的 React、RxDB、Lucide | MIT / Apache-2.0 / ISC | 候选目录编辑、串行持久化、会话态 AI 面板 | 不新增依赖；复用已有数据边界和 AI 会话；可精确控制“候选项变化不改历史记录” | 表单校验和对话框状态需由项目维护 | 已在项目持续使用并由现有单测/E2E覆盖 | 高；职责分别落在 domain、local-data、App UI | 必须避免 React 直接访问 IndexedDB，必须保留 AI 脱敏与逐次确认 | 采用 | 直接复用 `mergeContactDirectory`、设置记录写队列和同一个 `AiHub` 实例；新增目录页面与当前页抽屉样式 |
| React Hook Form | [官方仓库](https://github.com/react-hook-form/react-hook-form) | MIT | 大型表单注册、校验和脏状态 | 表单生态成熟，复杂嵌套字段性能好 | 本轮只有两个短列表；引入后仍需自写目录去重、排序和 RxDB 适配 | 活跃；本项目未锁定 | 中 | 与现有受控表单模式并存会增加两套状态语义 | 不采用 | 只保留为未来复杂组织树或批量校验的候选，本轮不引入 |
| Zustand | [官方仓库](https://github.com/pmndrs/zustand) | MIT | 跨组件客户端状态 | API 小，适合共享会话状态 | 不能替代持久化适配器、领域不变量或 AI 安全边界；当前 `AiHub` 保持挂载已解决会话保持 | 活跃；本项目未锁定 | 低 | 新增全局 store 会与 App 现有状态和 RxDB 记录形成重复事实源 | 不采用 | 不新增全局状态层；AI 配置和结果继续由已挂载组件持有 |

- 直接复用：React 受控输入、Lucide 图标、`mergeContactDirectory` 去重排序、RxDB `setting` 记录、串行写队列、已挂载 `AiHub`、现有脱敏和确认流程。
- 只借鉴：成熟表单库的“脏状态 + 显式提交”交互；实现仍使用项目现有受控状态，避免为两个列表引入新运行依赖。
- 不采用：新增表单库、全局状态库或第二套 AI 客户端；它们不能减少本轮领域校验和安全边界，反而会增加体积与重复事实源。
- 保留：六类业务记录、历史迁移记录、AI provider 适配器、120,000 字符上限、会话级 Key、脱敏和逐次确认逻辑均不替换。
- 适配范围：`packages/domain` 只提供默认目录和纯函数；`packages/local-data` 负责旧样例升级与目录种子；`apps/web` 负责目录编辑和当前页 AI 展示。
- 回滚：移除目录导航/样式并恢复 `demo-seed-v2` 前必须先保留用户目录设置；当前页 AI 可退回独立模块入口而不改变 provider、密钥或请求协议。

## v0.4.2 三栏布局与导航折叠方案审计

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 现有 React 状态 + CSS Grid + Lucide | 当前已锁定依赖 | MIT / ISC | 左栏折叠、列表选中、右侧详情和响应式布局 | 不新增依赖；可复用现有抽屉、领域类型和移动底栏；不增加网络行为 | 折叠与选中状态由 `App` 维护，需要项目自行覆盖无障碍和响应式测试 | 已在项目持续使用 | 高；只改变展示组合，不产生第二事实源 | 必须阻止详情栏复制保存逻辑，桌面规则不能破坏移动底栏 | 采用 | `App.tsx` 维护会话级 UI 状态，CSS Grid 在宽屏并排、窄屏回到内容流，Lucide 提供折叠图标 |
| react-resizable-panels | [GitHub](https://github.com/bvaughn/react-resizable-panels) | MIT | 可拖动、可折叠、可持久化的面板尺寸 | 键盘与拖动体验成熟，适合用户自定义多面板工作台 | 本轮没有拖动宽度需求；引入运行依赖、尺寸持久化和额外状态语义 | 活跃 | 中 | 与现有固定移动底栏和简单 CSS 断点相比复杂度超过收益 | 不采用 | 若后续明确要求拖动调整宽度，再单独审计并集成 |
| Zustand | [GitHub](https://github.com/pmndrs/zustand) | MIT | 跨组件 UI 状态 | API 小，可共享折叠与选中状态 | 当前状态只在 `App` 与直接子组件间流动；不能替代 RxDB、领域规则或编辑抽屉 | 活跃 | 低 | 会与现有 `App` 状态及本地数据适配形成不必要的第二层状态管理 | 不采用 | 保持 React 本地状态；刷新后恢复默认展开即可 |

- 直接复用：React 受控状态、现有六类领域类型、既有编辑抽屉、Lucide 图标和 CSS 响应式断点。
- 只借鉴：四份 WenXiBuddy 参考文件的三栏信息层级、列表选中和左栏收起交互；不复制其数据、文案、配色、图标或代码。
- 不采用：面板拖动库和全局状态库；当前需求没有可调宽度或跨页面持久化状态，新增依赖会扩大复杂度但不会改善数据边界。
- 保留：六类业务 CRUD、附件暂存、本机持久化、移动底栏、AI 当前页面板及全部联网边界。
- 回滚：移除 `sidebarCollapsed`、业务选中状态、右侧详情组件与对应 CSS 后即可恢复 v0.4.1 单内容区；领域数据、数据库 schema 和 API 无需迁移。

## v0.5.0 AI 历史、拖拽导入与安装入口方案审计

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 现有 RxDB/Dexie `setting` 记录 | 当前已锁定依赖 | Apache-2.0 | 结构化本机 AI 历史、搜索、删除和快照备份 | 复用适配层；容量与查询能力适合回答正文；Web/Electron 一致 | 需限制条数和单条正文，避免本机库无限增长 | 已在项目持续使用 | 高 | 历史不得进入同步或混入会话密钥 | 采用 | 新增 `ai-history` payload，最多 200 条，只保存已脱敏输入和文本结果 |
| Cookie / localStorage | 浏览器标准 | 标准能力 | 简单键值持久化 | 无依赖、接入快 | Cookie 约 4 KB 且会随请求；localStorage 同步阻塞、结构和容量不适合长回答 | 稳定 | 低 | 与 Key 非持久化和数据适配层边界冲突 | 不采用 | Cookie 不保存业务数据；localStorage 继续只用于既有 E2E 探针 |
| jsdiff | [GitHub](https://github.com/kpdecker/jsdiff) | BSD-3-Clause | 字符/词/行级差异 | 通用 diff 成熟 | 用户要求的是“字段变化”，字符级高亮不能推断业务字段；会新增依赖 | 活跃 | 中 | 容易把生成型回答误写成字段级自动更新 | 不采用 | 使用调用方提供的字段快照与确定性前后摘要，不自动写回业务记录 |
| 原生 Drag and Drop API | 浏览器标准 | 标准能力 | 文件拖拽、类型筛选 | 零依赖；可与现有文件 input 共用导入函数 | 需自行处理拖入状态和无障碍回退 | 稳定 | 高 | 若另写解析入口会放宽快照校验 | 采用 | `drop` 只提取首个文件并调用既有 `importFile`；文件选择始终保留 |
| react-dropzone | [GitHub](https://github.com/react-dropzone/react-dropzone) | MIT | 拖拽文件组件和验证 | 交互封装成熟 | 本轮只有单一 JSON 区域，引入运行依赖收益不足 | 活跃 | 中 | 与现有 label/input 样式和解析入口重复 | 不采用 | 未来出现多区批量上传再重新审计 |
| UA/Client Hints 自动选择架构 | 浏览器 API | 标准能力 | 自动推荐下载架构 | 减少一次选择 | 浏览器通常不能可靠提供 CPU 架构，兼容层和 ARM Windows 判断易错 | 不稳定/覆盖有限 | 低 | 错包会直接阻塞安装 | 不采用 | 明确显示 x64/arm64 与 amd64/arm64，由用户选择 |

- 直接复用：RxDB 设置记录、现有快照导入导出、Lucide、浏览器 Drag and Drop、Release 资产命名和分版打包矩阵。
- 只借鉴：成熟对话产品的可搜索历史列表和字段级变更摘要；不引入对话云同步、自动写回或新的全局状态库。
- 不采用：Cookie/localStorage 历史、jsdiff、react-dropzone、自动 CPU 架构下载；这些方案分别与容量、字段语义、依赖收益或安装正确性冲突。
- 内容来源：预制指引只从 `content/licensed/` 两份已登记 Markdown 蒸馏，保留 `licensed-writing-algorithm` 来源 ID，不扩展到未授权材料。
- 联网变化：仅新增用户主动点击 GitHub Release 下载链接；AI、同步和页面加载的自动联网边界不变。
- 回滚：删除 `ai-history` UI/设置记录、预制 JSON、拖拽事件与下载中心即可回退；历史为普通本机设置记录，不需要数据库 schema 回滚。

## v0.6.1 Chrome Local Network Access 兼容审计

问题本质：公开 Pages 是公网安全上下文，`127.0.0.1` 是回环地址。Chrome 142+ 在 Fetch 真正到达 Fastify/CORS/密码路由前先检查 Local Network Access；因此权限拒绝会表现为网络级 `TypeError: Failed to fetch`，后端无法通过修改模型解析或密码逻辑修复。

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fetch `targetAddressSpace: 'loopback'` | [WICG Local Network Access](https://wicg.github.io/local-network-access/) | W3C 文档许可 / Web 标准 | 明确声明请求目标为回环地址空间 | 无依赖、旧浏览器忽略未知字典项、符合 Chrome 新权限模型 | 仍必须由用户授权 | 2026-07-06 草案持续更新 | 高 | 不能误写为 `local`，否则 Chrome 会因实际地址为 `loopback` 拒绝 | 采用 | 只对 `127.0.0.1`/`localhost` 的 AI Fetch 增加标注 |
| Permissions API 读取权限状态 | Web Permissions API / Chromium 兼容别名 | Web 标准 | 在网络失败后区分 `denied`、`prompt` 与其他故障 | 可给出准确恢复步骤；不主动联网 | 权限名称仍处于细化迁移期 | Chrome 同时支持细粒度名称与旧别名 | 高 | 不得在页面加载时主动请求权限 | 采用 | 失败后先查 `loopback-network`，不支持时回退 `local-network-access` |
| 浏览器扩展、启动参数或企业策略预授权 | Chrome 管理能力 | 浏览器/管理员配置 | 跳过普通用户提示 | 自动化环境方便 | 普通 Pages 无权配置；会绕过用户安全决策 | 浏览器外部能力 | 低 | 与显式授权和公开部署边界冲突 | 不采用 | 仅测试通过 Playwright 临时授予权限，不进入产品 |
| 为回环服务部署自签 HTTPS | 本机证书方案 | 取决于证书工具 | 让本机服务使用 TLS | 可用于受管设备 | 证书安装、信任与轮换成本高；LNA 权限仍存在 | 成熟但运维复杂 | 低 | 超出本机一键启动目标，易制造证书告警 | 不采用 | 保留回环 HTTP；桌面版作为浏览器限制下的替代路径 |

- 直接复用：浏览器 Fetch 与 Permissions API；没有新增 npm 包。
- 只借鉴：Chrome 官方权限恢复文案；产品不尝试操控浏览器权限 UI。
- 保留：Fastify 精确 Origin CORS、临时 relay session、AES-256-GCM 配置、逐次脱敏确认和显式联网按钮。
- 回滚：移除请求标注与权限诊断即可回到 v0.6.0；不涉及业务数据或后端协议迁移。

## v0.6.2 窄屏详情与 AI 长页导航方案审计

问题本质：窄屏业务详情已经存在，但位于列表下方，选择状态更新后缺少视口反馈；AI 完整页包含连接、协作、历史和指引，缺少分区定位与请求阶段提示。这是视口导航和状态表达缺口，不需要新的数据层、路由或请求库。

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 现有 React 19 + DOM `scrollIntoView` + CSS sticky/grid + Lucide | 当前锁定依赖与浏览器标准 | React MIT、Lucide ISC、Web 标准 | 选择后定位详情、锚点分区导航、流程状态和响应式触控尺寸 | 零新增依赖；直接复用现有状态、滚动容器、设计系统和 reduced-motion；不改变联网或持久化 | 需要项目自行覆盖桌面窗口滚动与移动 `.main-area` 滚动 | React/Lucide 已在项目持续使用；Lucide npm 元数据 2026-07-25 仍更新 | 高 | 必须避免固定像素滚动、隐藏焦点名称或把移动底栏纳入桌面折叠逻辑 | 采用 | `App.tsx` 集中维护详情 ref 和 AI 状态；CSS 提供 sticky 分区导航、四步状态和 44px 触控目标 |
| react-scroll 1.9.3 | [GitHub](https://github.com/fisshy/react-scroll) / npm | MIT | 平滑滚动、锚点和 scroll spy | API 成熟，可管理活动分区 | 本轮只有三个静态锚点和一个详情往返；会新增运行依赖、活动状态和滚动容器适配 | npm 元数据最近更新于 2025-02-19 | 中 | 需额外配置移动端自定义滚动容器，复杂度超过收益 | 不采用 | 使用原生锚点与 `scrollIntoView`；未来若明确要求 scroll spy 再重新审计 |
| 新增路由子页面或全局状态库 | React Router / Zustand 等 | 取决于具体库 | 把 AI 分区拆成页面或全局保存导航状态 | 可扩展复杂多页工作流 | 会改变现有单页信息架构，形成第二套导航/状态语义 | 主流方案活跃 | 低 | 与当前保持挂载的 `AiHub` 会话状态、当前页 AI 面板和十五模块导航冲突 | 不采用 | 保留一个 AI 页面和一个组件状态源 |

- 直接复用：React ref/state、浏览器原生锚点和 `scrollIntoView`、CSS `position: sticky`/Grid、现有 Lucide 图标与 `prefers-reduced-motion`。
- 只借鉴：成熟长表单的分区导航和步骤指示表达；不引入 scroll spy、路由拆分或新的全局状态。
- 保留：六类业务 CRUD、右侧只读详情、既有编辑抽屉、AI provider、脱敏、逐次确认、120,000 字符上限、会话级秘密和显式联网按钮。
- 联网变化：无。点击分区导航和详情往返只改变本地滚动位置；连接配置自动收起只改变展示状态，不发起请求。
- 回滚：移除详情 refs、AI 分区/步骤组件和对应 CSS 即可恢复 v0.6.1；不涉及本机数据、数据库 schema、私有 API 或服务端配置。

## v0.6.4 中转站 API 路径兼容审计

问题本质：v0.6.3 已解决 Bearer 与 `x-api-key` 的鉴权差异，但把模型端点统一理解为 `/v1/models`。完成性复核确认参考仓库实际存在两条不同链路：Codex provider 直接在用户基址后追加 `/models`，Claude Desktop Gateway 则对非版本基址补 `/v1/models`。因此 `https://host/api/models` 型上游仍可能失败，这与 Pages CORS 或 Local Network Access 无关。

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cockpit-tools `923cc6c` Codex/Claude 链路 | [GitHub](https://github.com/jlcodes99/cockpit-tools) | CC BY-NC-SA 4.0 | Base URL + `/models`、非版本基址 + `/v1/models`、Bearer/`x-api-key` | 协议行为来自真实 provider 适配 | 许可证不适合复制进保留全部权利项目；Tauri/Rust 架构不同 | 活跃，2026-07-28 审计 | 协议设计高、源码复用低 | 不得复制代码、商业预设、站点数据或文案 | 只借鉴协议行为 | 独立实现两种路径候选与受限回退 |
| 固定 OpenAI `/v1` | v0.6.3 项目实现 / UNLICENSED | 保留全部权利 | 根/自定义基址自动补 `/v1` | 标准、单请求、无歧义 | 不支持 Base URL + 资源型站点 | 当前维护 | 中 | 继续遗漏用户遇到的模型发现差异 | 保留为显式模式 | 管理员可固定“自动补 `/v1`” |
| 固定 Base URL + 资源 | 项目自研候选 / UNLICENSED | 保留全部权利 | 直接追加 `/models` 与 `/chat/completions` | 适配 Codex 类基址 | 可能破坏标准 OpenAI 根基址 | 当前维护 | 中 | 不能作为全部旧配置默认 | 保留为显式模式 | 管理员可固定“直接追加资源” |
| 两候选受限自动兼容 | 项目自研 / UNLICENSED | 保留全部权利 | 模型发现与生成使用不同的重试条件 | 旧配置自动兼容、无需依赖或迁移 | 明确失败时多一次上游请求 | 当前维护 | 高 | 成功生成不得因解析问题重复提交 | 采用 | 模型允许 404/405、无效 JSON、空列表切换；生成只允许 404/405 切换 |

- 直接复用：现有 Node Fetch/URL、禁止重定向、AbortSignal timeout、2 MB 有界 JSON、模型 ID 校验、鉴权回退和 AES-256-GCM 配置。
- 只借鉴：参考仓库两条端点组合的协议事实；未复制其 Rust/Tauri 源码、预设、文案、样式或数据。
- 不采用：新依赖、请求所有可能端点、对生成响应解析失败后重试、把 `apiPath` 或真实 URL 下发 Pages。
- 适配范围：只修改私有服务端 provider 适配器、加密 provider 可选字段和本机管理页；客户端公开协议与 UI 不增加秘密字段。
- 联网变化：无自动联网变化。额外候选请求只可能发生在用户显式获取模型或确认生成后的同一操作中。
- 冲突与回滚：旧文档缺少字段时按 `auto` 读取，文档版本和 PostgreSQL schema 不变；固定 `openai-v1` 即可恢复 v0.6.3 路径行为。
- 许可证风险：没有引入参考项目代码或依赖；CC BY-NC-SA 4.0 仅作为不可复制设计来源记录。

## v0.6.3 中转站模型发现兼容审计

问题本质：当前服务端已正确将无版本基址补为 `/v1/models`，也能解析常见模型列表；失败差异在请求鉴权固定为 Bearer，无法兼容只接受 `x-api-key` 的上游。浏览器 CORS 与 Local Network Access 发生在 Pages 到本机 relay 这一段，不是此次上游 401/403 的根因。

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 当前服务端实现 | 项目自有 / UNLICENSED | 保留全部权利 | `/v1/models`、Bearer、响应限流与模型解析 | 安全边界完整、无客户端秘密 | 固定 Bearer，部分兼容站返回 401/403 | 当前维护 | 高 | 不能把鉴权选择放到 Pages | 保留并扩展 | 仅在加密 provider 配置增加鉴权方式 |
| cockpit-tools `923cc6c` | [GitHub](https://github.com/jlcodes99/cockpit-tools) | CC BY-NC-SA 4.0 | 自动补 `/v1/models`、Bearer / `x-api-key` 自动回退 | 证明双鉴权是现实兼容需求 | 默认许可证禁止未授权商业集成；源码结构为 Tauri/Rust | 活跃，2026-07-28 审计 | 设计契合、许可证不契合 | 不能复制源码、预设或商业站点数据 | 只借鉴协议设计 | 独立实现 401/403 条件回退，不复制代码 |
| OpenAI 标准 `/v1/models` | OpenAI API 约定 | 文档/协议 | Bearer 模型发现 | 标准路径明确、当前已支持 | 无法覆盖偏离标准的中转站 | 稳定 | 高 | 只支持标准会继续遗漏特定站点 | 继续作为首选 | `auto` 首次请求仍为 Bearer |
| 无条件发送两套鉴权头 | 自研候选 | 无 | 同时发送 Authorization 和 `x-api-key` | 单次请求 | 扩大凭据暴露面，部分网关会拒绝冲突头 | 不适用 | 低 | 与最小披露和可诊断行为冲突 | 不采用 | 每次只发送一种鉴权头 |

- 直接复用：现有安全 URL、禁止重定向、2 MB 有界读取、模型 ID 过滤、AES-256-GCM provider 配置与显式 Pages 操作。
- 只借鉴：`cockpit-tools` 的 `/v1/models` 归一化和 401/403 后切换鉴权的协议思路；未复制其实现、预设、文案或站点数据。
- 不采用：无条件双头、聊天接口探测、后台轮询、客户端读取上游配置或新增第三方依赖。
- 冲突审计：字段只存在服务端加密配置和本机管理页；公开目录/API 协议不变，旧加密文档缺少字段时默认 `auto`，不需要数据库或文件格式升级。
- 联网变化：没有新增自动联网；用户显式获取模型/生成时，只有首次 Bearer 收到 401/403 才会进行一次 `x-api-key` 重试。
- 回滚：删除 `authScheme` 管理字段和条件回退即可恢复固定 Bearer；既有加密配置仍可读取。

## v0.6.0 本机中转站与神秘站点方案审计

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 现有 `PrivateSyncClient` 模式派生 `RelayAiClient` | 当前 `packages/sync-client` | 项目自有 / UNLICENSED | 会话、provider 目录、模型发现、生成代理 | 复用安全 URL、响应上限和逐次确认；不增加依赖 | 需维护一套 relay 路由类型 | 高 | 不能把 upstream URL/Key 下发前端 | 采用 | 新客户端只持有回环基址、临时 session 和 provider ID |
| 浏览器直接调用中转站 | Fetch 标准 | Web 标准 | 直接访问 OpenAI 兼容接口 | 无需本地服务 | 受 CORS、证书、DNS、Private Network Access 影响；Key 暴露给页面 | 规范稳定但服务端支持不一 | 低 | 与“防逆向”和 Key 不持久化边界冲突 | 保留为现有用户自备 Key 模式，不用于神秘站点 | `Failed to fetch` 转换为明确诊断并推荐本机 relay |
| 前端 AES/Web Crypto 加密密码与站点 | Web Crypto API | Web 标准 | 对构建常量做加密/混淆 | 表面上不显示明文 | 解密材料必须随页面交付，攻击者可复现；不能保护公开部署秘密 | 稳定 | 低 | 与真实保密目标直接冲突 | 不采用 | 密码、地址、Key 和加密密钥均不进入前端 |
| TanStack Query / SWR 自动刷新 | TanStack / Vercel | MIT | 缓存、轮询、请求状态 | 数据同步体验成熟 | 会引入自动请求与新状态层；本需求要求显式解锁和刷新 | 活跃 | 低 | 可能破坏页面加载与填写密码时零外联 | 不采用 | 使用现有 React 状态和显式按钮 |
| 原生 React 状态 + 现有 Lucide | 当前锁定依赖 | MIT / ISC | 动态 provider 选项、密码输入、刷新与错误状态 | 不新增依赖，能锁定显式联网边界 | 需自行维护少量状态转换 | 活跃 | 高 | session 不得持久化 | 采用 | 中转密码、token、provider revision 仅保留在组件内存 |

- 直接复用：`AI_MAX_CONTENT_LENGTH`、`AI_MAX_GUIDANCE_LENGTH`、响应体积限制、脱敏、逐次确认、AI 历史与现有 provider UI。
- 只借鉴：成熟代理控制台的“公开别名 + 服务端私密配置”设计；前端不获得真实上游地址。
- 不采用：前端密码加密、Cookie/localStorage session、后台轮询、自动架构探测或第二套 AI 结果组件。
- 适配范围：`packages/sync-client` 新增 relay 客户端；`apps/web` 增加动态神秘站点选择、解锁、刷新和可操作网络错误；直连与内网模式继续保留。
- 联网变化：只有用户点击“解锁并刷新站点”“获取模型”或确认生成后才请求回环服务；页面加载、选择入口和填写密码保持零请求。
- 回滚：移除 `RelayAiClient` 与中转 UI 即可恢复 v0.5.0 直连行为，不涉及本地业务数据库 schema。

## v0.7.5 六类业务回收站与同步墓碑方案审计

问题本质：六类业务当前执行物理删除，记录正文与独占附件立即消失；在启用私有同步后，若只在本机移除行而不传播删除状态，其他设备上的旧记录还可能重新同步回来。系统需要同时满足“日常误删可恢复”“永久删除不保留业务正文”“附件不提前丢失”“远端旧数据不能复活”四个不变量。先比较复制记录、保存视图和回收站后，复制记录并不解决误删与同步复活，保存视图又与当前会话级台账视图规则冲突，因此本轮只采用回收站生命周期。

| 方案名称 | 来源 | 许可证 | 核心能力 | 优点 | 缺点 | 维护状态 | 与当前项目的契合度 | 可能冲突点 | 是否采用 | 采用方式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vikunja 任务复制 | [官方源码 `task_duplicate.go`](https://github.com/go-vikunja/vikunja/blob/506dbd7b0483c626295081fd9dd5beef3df8def7/pkg/models/task_duplicate.go) | AGPL-3.0-or-later | 复制属性、附件和关联 | 适合快速创建相似任务，关联语义完整 | 不解决误删、附件保留或多设备复活；源码许可证与本项目不兼容 | GitHub API 显示 2026-07-31 仍有提交，仓库未归档 | 中 | 复制附件引用需要另行定义共享/克隆语义，容易扩大当前迭代 | 不采用 | 仅保留为后续独立候选，不复制源码或数据模型 |
| Vikunja Saved Filters | [官方源码 `saved_filters.go`](https://github.com/go-vikunja/vikunja/blob/506dbd7b0483c626295081fd9dd5beef3df8def7/pkg/models/saved_filters.go) | AGPL-3.0-or-later | 服务端持久化筛选与收藏 | 适合复杂多人任务视图 | 当前六类台账视图明确只保留 React 会话，不进入 IndexedDB/同步；引入会形成第二套持久化规则 | GitHub API 显示 2026-07-31 仍有提交，仓库未归档 | 低 | 与会话级视图、不新增服务端路由和显式同步边界直接冲突 | 不采用 | 保留现有会话级筛选、排序与清除控件 |
| Vikunja 软删除定时清理 | [官方源码 `task_delete_cron.go`](https://github.com/go-vikunja/vikunja/blob/506dbd7b0483c626295081fd9dd5beef3df8def7/pkg/models/task_delete_cron.go) | AGPL-3.0-or-later | 软删除后保留 30 天，再清理关联数据 | 生命周期和关联清理边界清晰 | 自动到期销毁不适合当前本机优先产品；用户可能长期离线，后台清理会产生不可见的数据损失 | GitHub API 显示 2026-07-31 仍有提交，仓库未归档 | 生命周期参考高，源码复用低 | 不得复制 AGPL 源码；不得引入定时后台任务或自动联网 | 只借鉴设计 | 借鉴“先软删除、再清理关联”的顺序，改为用户显式永久删除/清空 |
| Plane archive/unarchive | [官方源码 `archive.py`](https://github.com/makeplane/plane/blob/master/apps/api/plane/app/views/issue/archive.py) | AGPL-3.0-only | 已完成/取消事项归档与恢复 | 恢复路径明确，适合工作项生命周期 | “归档”偏向业务状态而非误删；限制完成状态与六类通用业务不匹配 | GitHub API 显示 2026-07-31 仍有提交，仓库未归档 | 中 | 若复用“归档”会与已有只读历史档案模块混淆 | 只借鉴设计 | 只借鉴显式恢复；产品名称固定为“回收站”，不改变历史档案语义 |
| AppFlowy Trash | [官方 Trash 模块](https://github.com/AppFlowy-IO/AppFlowy/tree/main/frontend/appflowy_flutter/lib/plugins/trash) | AGPL-3.0 | 独立回收站、恢复和永久删除 | 用户心智成熟，操作入口清楚 | Flutter/Bloc 架构不同，完整实现和视觉资产不可复制 | GitHub API 显示 2026-07-24 仍有提交，仓库未归档 | 交互参考高，源码复用低 | 不得复制 AGPL 代码、文案、样式或资产 | 只借鉴设计 | 借鉴独立入口、类型筛选、恢复、永久删除与清空操作 |
| 现有领域纯函数 + RxDB payload + 私有同步透传 | 当前锁定架构 | 项目自有 / UNLICENSED，RxDB Apache-2.0 | `deletedAt` 软删除、最小 tombstone、附件引用清理、显式同步 | 零新增依赖和路由；保留现有本机数据适配、附件库、快照与显式同步；能用同一 `updatedAt` 冲突规则阻止旧记录复活 | 需要项目自行覆盖六类派生数据、附件和同步回归 | 当前持续维护 | 高 | 必须保证所有业务派生只消费 active，私有同步仍消费 active/trash/purged 全量 | 采用 | 领域层集中分区/恢复/永久删除；App 只展示 active 与 trash；purged 只保存四字段墓碑并参与同步 |

- 直接复用：React 会话状态、RxDB 单表、现有 `putRecord`/附件引用扫描、私有同步的 `id + updatedAt` 主版本规则、Lucide 和现有暗色工业设计系统。
- 只借鉴：Vikunja 的删除后关联清理顺序、Plane 的恢复生命周期、AppFlowy 的独立回收站交互；未复制任何外部代码、文案、样式、资产或测试数据。
- 不采用：复制相似记录、持久化保存视图、自动 30 天清理、后台定时任务、服务器新路由、第三方回收站依赖和物理删除同步行。
- 最小集成：六类 payload 增加可选 `deletedAt/purgedAt`；软删除保留完整 payload 和附件引用，恢复移除生命周期字段，永久删除覆盖为 `id/updatedAt/deletedAt/purgedAt` 四字段墓碑并清理无引用附件。
- 冲突结论：RxDB 外层 schema 未增加字段或 kind，payload 仍允许扩展，因此无需提升本地 schema version；服务端同步 schema 已透传 `id/updatedAt` payload，因此无需新增 API/数据库迁移。若部署时发现服务端拒绝墓碑字段，应停止发布而不是改为本机物理删除。
- 联网变化：无。回收站操作均为本机操作；墓碑只在用户点击既有“同步”后与普通记录一起传输。
- 许可证风险：三项参考仓库均为 AGPL，全部只作设计研究；最终实现不引入其代码或依赖。
- 回滚：发布后若要移除 UI，可继续保留 `deletedAt/purgedAt` 解析和同步，避免旧墓碑被当作业务记录；不得直接回退为物理删除，否则多设备旧记录会复活。

## 采用边界

- 直接复用：Electron 打印能力、RxDB/Dexie 本地存储、Tiptap 编辑、docx 导出、Mammoth DOCX 转换、Playwright 验证。
- Mammoth 只替代 DOCX 压缩包和 WordprocessingML 的自研解析；TXT 转段落、HTML 标签/属性清洗、10 MB 体积边界和导入后的人工复核提示仍由项目负责。该依赖只在用户选择 DOCX 后动态加载，不引入自动网络请求。
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
