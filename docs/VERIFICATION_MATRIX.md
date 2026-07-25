# 交付验证矩阵

验证日期：2026-07-25。状态只代表当前工作区和本机环境，不代表已完成生产合规或目标系统兼容认证。

| 交付项 | 验证方式 | 当前状态 | 证据 / 限制 |
| --- | --- | --- | --- |
| 根目录、公开客户端、私有服务端 `AGENTS.md` | 检查目录结构、脚本、边界和风险规则 | 已完成 | [根工作区](../../AGENTS.md)、[客户端](../AGENTS.md) 和 [服务端](../../hxhwang-gw-server/AGENTS.md) |
| 客户端 lint / 单元测试 / format | `pnpm lint`、`pnpm test`、`pnpm format:check` | 已通过 | 2026-07-25 回归通过；领域测试 4 项覆盖周报日期边界与事实汇总，同步客户端 6 项、Web 服务层 2 项（含周报同步）、迁移 focused 回归 5 项、文档导出 3 项、本地数据/快照 3 项、Electron 安全/依赖 3 项、来源策略 5 项、工作流/版本契约 4 项和 UI 契约 2 项均通过 |
| 客户端构建 | `pnpm build`、`pnpm content:verify`、`pnpm assets:verify` | 已通过 | Web、领域包、迁移、文档、桌面壳构建通过；3 条规则、11 个模板、1 条授权记录及 Web/Electron 品牌资产校验通过 |
| 历史 HTML 原件 | 对根目录与 `legacy/` 执行 SHA-256 对比并核对真实存储键 | 已通过 | `升级版04.html` 与 `wenxibuddy0722.html` 均逐字节一致；0722 仍是需求基线，0723 与 UI glossary 只作补充参考；正式功能未写回历史原型。审计确认两版导出器都写入相同 `sourceApp/version` 且默认只收集 `work_/attach_`，因此迁移报告会披露来源歧义和缺失 Skill；物资 `attachments` 为记录内 Data URL，迁移器会另行生成稳定 ID、哈希和只读档案下载引用 |
| 历史 Skill / 配置 / 未映射字段 | 两版夹具、补充 Skill 输入、只读详情 E2E | 已通过 | 任务、文件和档案保留的 `legacyPayload` 可展开查看；普通配置与补充 Skill 进入独立只读列表，Skill 正文和额外原始字段均可见。所有内容经 React 文本节点/JSON 序列化显示，不使用 `dangerouslySetInnerHTML` |
| Pages 端到端与离线演示 | `pnpm test:e2e` | 已通过 | 2026-07-25 最终回归为 18 passed、4 条件跳过；覆盖零外联、离线重开、Pages 私有控制及真实附件/业务导入隐藏、桌面显式会话/同步/脱敏确认契约、任务协同阶段、附件下载/解除关联、双版本迁移、Skill/原始字段只读展示、快照、写作与周报 DOCX/PDF、周报持久化、移动抽屉保存和窄屏 |
| v0.2.0 视觉系统 | `xbrowser` 真实浏览器、源码规则扫描、1440×900 与 390×844 截图 | 已通过本机验收 | 工作台、任务列表和写作中心采用原创“动态档案 / 墨迹信号”界面；功能图标全部来自 Lucide，源码无表情符号、自绘功能 SVG、图标字体、远程字体或外部视觉资源。桌面与移动视口无页面级横向溢出、JS 错误或面板遮挡，移动八入口底栏不再拦截抽屉操作；持续动效支持 `prefers-reduced-motion` |
| 首版周报闭环 | 领域测试、RxDB schema v1 迁移/快照、私有同步测试、Playwright 保存/重载/导出 | 已通过 | 新周报按日期范围从已有任务、工作小结和文件字段确定性汇总，可人工编辑、保存版本、恢复快照、显式同步并导出 A4 DOCX/PDF；使用 `v0.1.0` 标签构建并在持久浏览器 profile 写入任务后，v0.1.1 成功建立 v1 数据库、保留旧任务并写入新周报，控制台无错误；旧版周报继续作为 `archive` 只读保留 |
| 内网 Web | `pnpm test:e2e:intranet`、`pnpm build:web:intranet`、`pnpm test:workflows` | 已通过本机构建与 E2E | 与 Pages E2E 并行回归为 1 passed；验证内网模式、真实附件开关、同步/AI 控制、私有 CSP，以及建立连接前无外部请求；产物固定到独立 `dist-intranet/`，工作流上传路径已由契约测试锁定，避免误传 Pages 的 `dist/`；尚未部署到实际内网服务器 |
| GitHub Pages 子路径 | `VITE_BASE_PATH=/hxhwang-gw/ pnpm --filter @hxhwang/web build` + 本地预览访问 `/hxhwang-gw/` | 已通过 | 入口 JS、PWA manifest 与品牌图标均使用 `/hxhwang-gw/` 前缀并返回 HTTP 200；未发现私有 API、模型密钥或 GitHub token |
| 发布前仓库敏感信息扫描 | 对两个仓库全部 Git 历史执行 PAT、模型密钥、Bearer 凭据、API key 和含密码数据库 URL 模式扫描 | 已通过 | 公开客户端 86 个跟踪文件无匹配；私有服务端无 PAT、模型密钥、Bearer 凭据或 API key，含密码数据库 URL 仅存在于 `.env.example` 与 CI 的显式测试凭据；两个工作区均无未提交文件，未发现超过 GitHub 100 MB 单文件限制的对象 |
| Electron `file://` 资源 | `pnpm build:desktop:win:x64`、`pnpm build:desktop:win:arm64`；`pnpm verify:desktop-web` | 已通过 | 打包前校验 9 个资源均为相对路径，并验证桌面 CSP 仅允许 HTTPS、本机 API且禁止表单提交；ASAR 包含开发地址策略模块且不包含对应测试文件 |
| Windows 安装包 | Windows 本机 x64/arm64 electron-builder | 已通过构建 | x64 安装包 100,887,834 字节，SHA-256 `B39A27E1370ED82C6BB1FF11D4CA1086DF4104ABDF1593653A55B26769230360`；arm64 安装包 93,557,443 字节，SHA-256 `C014513CBB17E5C1D04D849BC8C1974068208F2E36D632B96C6ED8BCC276DC4B`；x64 解包程序启动后观察到 4 个进程并全部退出；arm64 未在本机启动 |
| Windows v0.1.1 本机构建 | `pnpm build:desktop:win:x64`、解包程序启动冒烟 | x64 已通过 | `HxHwang-Gw-0.1.1-x64-setup.exe` 为 100,944,547 字节，SHA-256 `E28CA7739CBC6B209BAD60FAD4F8B5AA7922F49DC93DF55940CF296AFB3F5803`；新解包程序启动后观察到 4 个进程并全部退出。正式多架构产物另由 Release Actions 验证并发布 |
| Windows v0.2.0 本机构建 | `pnpm build:desktop:win:x64`、解包程序启动冒烟 | x64 已通过 | `HxHwang-Gw-0.2.0-x64-setup.exe` 为 100,950,072 字节，SHA-256 `B88546A7874CAB44650E951DF1267E3F587A69C5B8C305764E4B5AE0D3432445`；解包程序启动后观察到 4 个进程并全部退出。正式多架构产物另由 Release Actions 验证并发布 |
| Windows 签名与品牌图标 | 资产结构校验、可执行文件图标提取、`Get-AuthenticodeSignature` | 图标已完成，签名未完成 | 原创 SVG 已生成 192/512 PNG 与 256 PNG-ICO，x64 可执行文件成功提取品牌图标；x64/arm64 安装包仍为 `NotSigned`，正式分发前需要代码签名证书 |
| 本机 Web 预览 | 普通 Web build、Playwright 与 `xbrowser` 可视化检查 | 已通过 | v0.2.0 普通 Web 构建入口、带哈希的 JS/CSS 资源、manifest 和品牌图标均可加载；1440×900 桌面任务/写作工作区与 390×844 移动工作台/任务页无页面级横向溢出、JS 错误或面板重叠；验证服务器仅绑定 `127.0.0.1` |
| 浏览器安全策略 | 检查 Pages/内网/桌面 CSP、Electron 开发地址策略并监听浏览器控制台 | 已通过并记录托管限制 | Pages 仅允许同源连接；内网/桌面允许用户显式 HTTPS 或本机 API；Electron 阻止任意新窗口、导航、webview 和非剪贴板权限，打包后忽略开发地址覆盖，未打包时只允许本机 HTTP；正式防嵌入仍须由 Web 响应头提供 |
| 私有同步与 AI | 单元测试、Pages/内网 E2E、服务端集成测试 | 已通过演示契约 | 访问码仅在内存；同步先拉取主版本并带假定主版本推送任务/文件/草稿/周报，附件走哈希接口；AI 必须先本地脱敏预览并逐次确认，结果不覆盖原稿或确定性规则 |
| 授权资料元数据 | `pnpm content:verify` | 结构已完成，凭证编号待补 | 已记录来源文件、版本、授权范围、版权归属状态与限制；当前依据用户确认，正式公开前仍应补入授权书归档位置或凭证编号 |
| 公共权威与授权来源同步 | `pnpm test:content`、`pnpm content:sync`、`pnpm content:verify`；`.github/workflows/content-sync.yml` | 本地已通过，远端待运行 | 政府来源必须使用明确列出的 HTTPS 主机，其他来源必须精确匹配显式允许自动抓取的授权 URL；逐跳校验重定向并限制为 HTML、2 MB 和必含结构。2026-07-24 实际检查 1 个国家标准来源且哈希未变化；每周工作流仅在变化时提交生成元数据并在同一工作流部署 Pages，不改人工模板 |
| 服务端静态检查、集成测试、构建 | `pnpm lint`、`pnpm test:integration`、`pnpm build`、`pnpm format:check` | 已通过 | 2026-07-24 回归为 7 项内存/配置/API 测试通过、2 项 PostgreSQL 测试按环境跳过；新增 `weekly-reports` push/pull 往返，并继续覆盖非回环默认码阻断、会话、ISO 时间、同步冲突、严格 Base64/大小/哈希、AI 重定向阻断、未确认 AI、桌面 `null` Origin 和未配置公网 Origin；构建会验证 `pnpm start` 入口 |
| 真实 PostgreSQL | `DATABASE_URL=... pnpm test:postgres`；CI 提供 PostgreSQL 16 服务 | 远端 CI 已通过，本机未执行 | 私有服务端 Actions run `30090037370` 在 PostgreSQL 16 服务上执行迁移、同步 checkpoint、冲突保留和附件往返测试并成功；缺少 `DATABASE_URL` 仍会快速失败，不能把内存 Store 测试当作真实数据库验证 |
| Debian 10/12 amd64/arm64 | `.github/workflows/desktop.yml` 四组合 `.deb` 安装与 xvfb 启动门 | Actions 四组合已通过 | v0.2.0 run [`30111552737`](https://github.com/NextWeb4/hxhwang-gw/actions/runs/30111552737) 构建 Windows/Linux x64、arm64 四类 artifact，并在 Debian 10/12 的 amd64/arm64 容器中仅通过 DEB 元数据安装运行库后持续启动 20 秒。仅在 CI 容器启动参数使用 `--no-sandbox`，生产客户端未改变；QEMU 验证不能替代真实 arm64 设备测试 |
| GitHub Release | `v*` 标签触发桌面矩阵、Debian 门禁、校验清单和发布任务 | v0.2.0 已正式发布 | [Release](https://github.com/NextWeb4/hxhwang-gw/releases/tag/v0.2.0) 不是草稿或预发布版本，标签指向 `8c47de23366579b8140b03c63766c24ca1098ed0`；[run 30111552737](https://github.com/NextWeb4/hxhwang-gw/actions/runs/30111552737) 已成功完成并发布六个安装文件及 `SHA256SUMS.txt`，清单中的六个 SHA-256 均与 GitHub 资产摘要一致；具体校验值见 `RELEASE_NOTES.md` |
| 外部商业与设计参考站 | 浏览器审查首页、可发现条款/隐私链接和 robots | 已完成 | 公文宝与 MotionSites AI 仅记录在 `docs/REFERENCE_AUDIT.md`；均未加入 `content/sources/allowlist.yaml`，未复制页面、提示词、模板、代码或视觉资产。MotionSites 首页未链接条款或隐私政策，常见路径返回站内 404，按未授权处理；robots 允许访问不等于允许再分发 |
| GitHub Pages 正式部署 | GitHub Actions / Pages 实际发布 | 已上线 | v0.2.0 视觉系统提交的 Pages Actions run [`30111303251`](https://github.com/NextWeb4/hxhwang-gw/actions/runs/30111303251) 已成功完成。[线上站点](https://nextweb4.github.io/hxhwang-gw/) 返回 HTTP 200；桌面 1440×900 与移动 390×844 实际浏览器验收均显示署名，无页面级横向溢出、控制台错误、页面错误或第三方请求，构建资源未发现 PAT、模型密钥、私有 API 地址或嵌入凭据 |
