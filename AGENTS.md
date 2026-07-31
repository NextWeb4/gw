# HxHwang Gw 客户端工程规则

## 1. 项目结构
- `apps/web` 是 GitHub Pages、互联网 Web、内网 Web 与 Electron renderer 共用入口；`apps/desktop` 是 Electron 壳。
- 根工作区的 `wenxibuddy0724-01.html`、`wenxibuddy0724-02.html`、`wenxibuddy0725.html` 与 `wenxibuddy0726（内测）.html` 仅可用于观察三栏、列表选中和导航折叠交互；禁止复制其中数据、文案、表情图标、配色或源代码。
- `packages/domain` 存放实体和确定性汇总规则；`packages/local-data` 存放任务、会议、文件、外出、用章、物资、文稿、周报和只读档案的本地数据适配；`packages/sync-client` 提供显式私有同步及 OpenAI 兼容直连适配；`packages/documents` 负责 DOCX/PDF；`packages/migration` 只负责历史导入。
- `content` 只存放已授权且可公开的规则、模板和来源元数据。

## 2. 运行命令
- `pnpm dev:web` 启动仅绑定 `127.0.0.1` 的公开 Pages 形态；该形态支持本地业务功能及由用户显式配置的公网 AI，但不得出现私有同步入口。
- `pnpm dev:web:intranet` 启动仅绑定 `127.0.0.1` 的内网模式；该模式显示私有同步和内部 AI 入口。真实附件在所有形态都只按本地记录保存，只有内网主动同步时才可能上传被业务记录引用的附件。
- `pnpm dev:web:internet` 启动仅绑定 `127.0.0.1` 的互联网模式；该模式显示 OpenAI 兼容地址、会话级 API Key、模型发现和逐次确认入口，但不显示私有同步。
- 私有 API 的开发命令在相邻私有仓库中执行，公开仓库不得读取其环境变量或服务密钥。

## 3. 测试命令
- `pnpm test` 运行领域、迁移、文档和桌面壳测试。
- `pnpm test:content` 单独验证权威来源 URL、逐跳重定向和响应体积策略；`pnpm test` 已包含该命令。
- `pnpm test:workflows` 校验 Pages 与内网工作流上传目录不会互换；`pnpm test` 已包含该命令。
- `pnpm test:ui` 校验 Lucide 图标、无表情符号、无远程视觉资源和 reduced-motion 契约；`pnpm test` 已包含该命令。
- `pnpm test:e2e` 使用 Playwright 验证离线页面、任务协同字段、附件暂存/保存/解除关联/引用清理、删除确认、历史导入、文稿导出和周报保存/导出。CI 必须先执行 `pnpm exec playwright install --with-deps chromium`。
- 原生 `input[type=date]` 的分段焦点和物理按键顺序由操作系统决定；逐位改年份用例只在 Windows 执行，Linux CI 继续通过清空、重填、保存和恢复用例验证日期状态不变量，不得用坐标点击结果作为跨平台断言。
- `pnpm test:e2e:intranet` 单独验证内网构建的私有控制、附件开关、CSP 和显式连接前零外联。
- `pnpm test:e2e:internet` 单独验证互联网构建的请求地址、模型发现、API Key 会话边界、脱敏预览和显式发送前零外联。

## 4. 构建命令
- `pnpm build` 构建所有工作区包和 Web。
- `pnpm build:web:intranet` 构建允许显式 HTTPS/本机 API 连接的内网 Web 到 `apps/web/dist-intranet/`；不得把该产物发布到公开 Pages，也不得与 Pages 的 `apps/web/dist/` 共用输出目录。
- `pnpm build:web:internet` 构建互联网 Web 到 `apps/web/dist-internet/`；不得与 Pages 或内网产物共用输出目录。
- 桌面分版命令固定为 `pnpm build:desktop:<win|linux>:<x64|arm64>:<internet|intranet>`；发布资产名必须包含 edition，Release 应包含 12 个安装产物及校验清单。
- `apps/desktop/scripts/edition-config.mjs` 是分版产品名和 Debian 包名的唯一配置源；`productName` 必须为可打印 ASCII，`deb.packageName` 必须满足 Debian 小写包名规则且两版不能相同。
- Windows Defender 等进程可能短暂锁定新建的 `win-unpacked` 文件；打包脚本只允许对 `EBUSY` 做最多三次有界重试，每次仍须清理本次架构的 staging 目录，不得吞掉其他构建错误。
- `pnpm build:desktop` 默认打包 Windows x64 互联网版；不带 edition 的 `pnpm build:desktop:<win|linux>:<x64|arm64>` 别名也默认互联网版。需要内网版时必须使用上一条的完整分版命令。
- Linux 的 AppImage/DEB 命令必须在 Linux 或项目的 Ubuntu Actions 中运行；Windows 只能生成 `linux-unpacked`，缺少 `mksquashfs`/`fpm` 时不得将其标记为安装包。
- `apps/desktop/package.json` 的 `build.deb.depends` 必须保留 electron-builder 26.15.3 的默认 Debian 依赖，并额外声明 Electron 43 启动所需的 `libasound2` 与 `libgbm1`；不得在 smoke 脚本中单独安装这两个库来掩盖包元数据缺失。
- Debian Docker smoke 因 GitHub hosted runner 容器禁止 Chromium zygote namespace，只允许在该 CI 启动命令中使用 `--no-sandbox`；应用源码、package 配置、桌面入口和真实安装快捷方式均不得携带该参数。
- 桌面命令必须先运行 Web 的相对路径构建并通过 `pnpm verify:desktop-web`；不得直接用普通 `/assets` Pages 产物打包 Electron。
- `pnpm assets:generate` 只在品牌 SVG 发生变化时运行，使用已安装的 Playwright Chromium 生成 Web PNG 和 Electron ICO/PNG；生成后必须重新构建桌面包。

## 5. 代码风格
- 根目录 `LICENSE` 是权利与来源声明，并非开源许可证。必须保留不授予许可、第三方材料例外、权利人和准确联系邮箱；未经明确授权不得替换为 SPDX 开源许可证。
- `pnpm lint` 与 `pnpm format:check` 均执行 TypeScript/Node 语法与类型检查；当前未发现独立的自动 format 命令。
- 使用 TypeScript 严格模式、函数式 React 组件和显式导出；禁止 `any` 逃避领域数据校验。
- 界面图标统一使用 `lucide-react`；禁止使用表情符号、Unicode 图形字符或自行绘制的 SVG 冒充功能图标。品牌安装包图标仍以 `assets/brand/app-icon.svg` 为唯一源文件。
- Web 运行时不得加载远程字体、公共 CDN 或外部视觉素材；展示字体必须使用本机字体栈，缺失时保持可读回退。

## 6. 模块边界
- React 页面只能调用领域命令和数据适配接口，不得直连 IndexedDB、Electron IPC 或私有 API。
- 文稿导入器只负责 DOCX/HTML/TXT 转换和清洗；Mammoth 输出仍必须经过项目标签/属性允许清单，不得直接写入 Tiptap。
- 四位年份真实日期是领域不变量：所有可编辑日期复用带本地编辑缓冲的 `DateField`，保存每类记录时再次校验；不得在 `onInput` 中把用户正在编辑的年份回滚为旧值。
- 人员/单位目录合并必须集中在领域纯函数中，React 使用同步 ref 与串行持久化队列防止快速点击丢失更新；原生 datalist 只能作输入提示，必须另有显示全部常用项的选择控件。
- 配合单位分组只做追加合并：已存在单位的状态与附件不得被分组应用改写，禁止旧版式的“整组替换名单”；类目配色只能使用设计系统内的固定色板档位，超期/风险语义色不得挪作类目色。
- 新建/编辑抽屉的模式必须由记录是否已持久化决定，不得用用户正在填写的名称、标题或主题推断；切换导航模块必须把页面与移动端主滚动容器复位到顶部。
- 六类业务模块的桌面布局由 `App.tsx` 统一组合为列表和右侧只读详情；列表负责选择，详情只读展示并调用既有编辑抽屉，不得在六个页面各自实现保存、删除或持久化分支。
- 六类业务编辑抽屉必须复用 `useUnsavedChangesGuard`：取消、关闭按钮、外侧点击、Escape 与 `beforeunload` 只能走同一脏状态判断。附件读取开始即计入未保存状态并禁用保存按钮；`clearPendingAttachments` 必须递增编辑会话代次，使确认放弃后完成的旧读取不能调用编辑器更新回调。
- 全局查找只能从 `App` 已加载的十五个导航定义和六类业务数组派生只读结果；不得直接查询 RxDB/IndexedDB、调用 Fetch/Electron IPC、持久化索引或缓存最近搜索。导航结果调用既有 `navigate`，业务结果调用既有导航与 `selectBusinessRecord`，不得新增第二套读取、编辑或保存路径。
- 六类业务在 `max-width: 1279px` 回到纵向内容流后，选择记录必须通过统一滚动入口把详情带入可视区，并保留“返回记录列表”；不得在各业务页面复制滚动状态或依赖固定像素滚动距离。
- 左侧导航折叠为图标模式时必须保留每个按钮的 `aria-label`、原生提示、活动状态和键盘操作；折叠状态只影响桌面宽度，`max-width: 800px` 的固定底栏结构保持不变。
- 新选附件必须先停留在编辑会话，保存业务记录时再持久化；取消编辑不得产生孤立附件。解除关联或删除记录时，只能清理已不被其他业务记录或历史档案引用的候选附件；内网同步只上传同步业务实际引用的附件。
- `docs/HELP.md` 必须与根 `package.json` 版本一致，并覆盖工作台、任务、会议、文件、外出、用章、物资、常用项管理、写作、周报、统计、AI 助手、历史档案、迁移、关于与设置十五个实际导航模块；修改模块名称、入口、保存语义、公开 AI、分版能力或安装资产名时必须同步说明书和文档契约测试。
- 常用项管理只允许改写候选目录，不得级联改写历史业务记录；单位与机关处室、人员必须分区维护，新增、重命名、删除都要经过显式保存并提供 E2E 持久化验证。
- 私有同步客户端必须拒绝 URL 内嵌凭据并禁止自动重定向，避免会话头离开用户明确配置的基址。
- Electron renderer 必须保持 sandbox；文件和 PDF 操作只能经 preload 的白名单接口。
- 互联网桌面版可使用受限 AI IPC；内网桌面包即使 renderer 误调用该 IPC，主进程也必须拒绝公网直连。
- 打包后的 Electron 禁止读取 `HXHWANG_WEB_URL`；未打包开发模式也只允许本机 HTTP 地址。
- Pages 只能使用本地数据适配器，允许本机附件、历史 JSON 和快照，但不得上传或请求私有 API；页面必须标明浏览器数据边界并禁止处理涉密材料。
- Pages 与互联网版复用 `DirectAiClient` 和服务商预设；API Key 只存在组件状态，加载页面、选择预设和填写 Key 均不得联网，只有“获取模型”或脱敏后“确认发送”可发起 HTTPS 请求。
- Pages 与互联网版可额外复用 `RelayAiClient` 连接当前设备 `http://127.0.0.1:8787`。中转密码、session token 和动态站点目录只保留在组件状态；前端只使用 provider ID，绝不接收、缓存或快照化中转站真实地址、API Key 或配置加密密钥。
- Relay 上游鉴权方式只允许在本机服务端管理页配置为 `auto`、`bearer` 或 `x-api-key`；旧配置缺少该字段时按 `auto` 读取。`auto` 只能在 Bearer 收到 401/403 后重试一次 `x-api-key`，不得对网络错误或其他状态无条件重复请求。
- Relay 上游 API 路径只允许本机管理页配置为 `auto`、`openai-v1` 或 `base-url`，不得下发 Pages。`auto` 的模型发现可在 404/405、无效 JSON 或空列表后从 `/v1/models` 切换到 Base URL + `/models`；生成只可在 404/405 后切换，禁止对成功但无效的生成响应重试。
- Pages 发往 `127.0.0.1`/`localhost` 的 Fetch 必须声明 `targetAddressSpace: 'loopback'`，并保持 Chrome Local Network Access 由用户在显式解锁操作后授权；禁止通过浏览器启动参数、扩展或自动导航绕过权限。
- “神秘站点”在未解锁前只能显示一个本机中转入口；用户点击“解锁并刷新站点”后才可请求 provider 元数据。刷新、获取模型和生成必须分别由显式按钮触发，不得轮询或后台自动联系本地服务。
- 本机中转的连接诊断只允许存在于回环服务提供的 `/relay-admin` 管理页；公开 Pages、互联网版和 `RelayAiClient` 不得请求管理测试路由，也不得接收 attempt、鉴权方式、路径模式、延迟或上游错误详情。
- AI 历史使用 `setting` 类型的 `ai-history` 本机记录，最多保留 200 条；只保存已确认脱敏的请求、回答、用途、模型、指引名称和确定性字段差异，不保存 Key、访问码或未脱敏原文，也不进入私有同步。
- 预制写作指引由 `content/licensed/公文写作算法_蒸馏笔记.md` 与 `content/licensed/公文写作算法SKILL.md` 蒸馏到生成 JSON，必须记录来源且保持只读；选择器默认值固定为“无（默认）”，不得暗中附加预制指引。
- 当前页 AI 面板在连接和模型已就绪后应收起高级配置，只保留用途、指引、材料、脱敏预览、逐次确认、结果和字段变化；精简 UI 不得改变 AI 请求协议或安全门。
- 完整 AI 页面必须保留可键盘访问的“本次协作 / 历史回答 / 写作指引”分区导航和“连接 / 材料 / 脱敏 / 结果”四步状态；连接配置自动收起后仍须允许手动展开，不能隐藏服务商、地址、会话级 Key 或访问码的修改入口。
- 互联网直连、Relay 和内网模型发现必须共用“仅最新请求可提交状态”的代次保护；修改服务商、请求地址、API Key、内部会话或 Relay 站点时必须让在途旧请求失效。浏览器模型请求还必须组合调用方 `AbortSignal` 与 60 秒超时，用户“停止等待”或配置变化时主动中止；桌面 IPC 无法中止时仍须忽略迟到结果。
- 互联网直连、Relay、内网网关和桌面 IPC 的 AI 生成必须复用同一套“仅最新请求有效”生命周期：生成中禁用重复提交并提供停止等待，上一条成功结果在新成功响应前继续显示；浏览器生成必须组合调用方 `AbortSignal` 与 60 秒超时，桌面 IPC 至少拒绝迟到结果。只有仍为当前请求的成功响应可原子替换结果并保存一条历史，取消、失败、配置或材料变化后必须重新逐次确认。
- 模型超过 8 项时使用本地关键词筛选并保留当前选择，不得为筛选发起请求、写入 localStorage/IndexedDB 或引入后台刷新。直连和桌面模型解析必须按服务商返回顺序做大小写不敏感去重，不得排序；显式刷新期间继续展示上次成功目录，成功后原子替换并尽量保留当前模型，失败或取消不得清空仍可用目录。
- `__SEED_DEMO_DATA__` 是虚构样例初始化边界：只允许公开 Pages/default 公共构建为 `true`，互联网、内网和两类桌面构建必须为 `false`；不得靠运行时隐藏样例掩盖安装包仍包含初始化调用。
- 互联网、内网和桌面构建不得生成包含公开演示源码的 source map；公开 Pages 可保留 source map 供演示排查。
- 安装包下载链接必须按 `HxHwang-Gw-${version}-${edition}-${arch}` 的 Release 产物命名生成，Windows 使用 `x64/arm64`，Linux DEB 使用 `amd64/arm64`，AppImage 使用 `x86_64/arm64`；不得猜测用户 CPU 架构后自动下载。
- Pages 的新 Service Worker 必须立即激活并接管已有客户端；已被旧 Worker 控制的页面在 `controllerchange` 后只自动刷新一次，首次安装不得刷新，离线启动不得因主动更新检查失败。
- 公开、互联网桌面和内网 AI 的单次已脱敏材料上限统一为 120,000 字符；Web 预览、直连客户端、Electron 主进程和私有 API 任一边界都不得放宽。
- 润色指引（Skill）只保存在本机设置库，作为系统提示随请求发送；单条指引上限 20,000 字符，直连客户端、Electron 主进程和私有网关三边界一致校验，指引不参与内网同步、不覆盖脱敏与逐次确认要求。
- AI provider 响应必须在 Web 直连、Electron 主进程和私有 API 三个边界按流式读取限制为 2,000,000 字节；禁止先无界缓冲完整响应再检查长度。
- Pages 与内网 E2E 可以并行运行，但必须分别预览 `dist/` 与 `dist-intranet/`；禁止重新合并输出目录。
- 新周报是 `weekly` 类型的可编辑本地记录并参与显式私有同步；历史导入的旧周报仍是只读 `archive`，不得在导入时改写为新记录。
- 周报模板只决定章节顺序、标题与数据来源；自动章节必须复用确定性汇总行，`manual` 章节只插入占位提示；默认模板输出必须与既有周报文本逐字节一致，范文结构提取必须纯本机执行。
- `scripts/content-sync-policy.mjs` 是允许清单抓取的安全边界；非政府来源必须精确匹配授权记录中的 `authorizedSourceUrls` 且 `allowAutomatedRetrieval=true`。同步器只能修改 `content/generated/`，不得自动覆盖人工规则、模板或授权资料。
- `assets/brand/app-icon.svg` 是品牌图标唯一源文件；生成产物只能写入 `apps/web/public/icons/` 与 `apps/desktop/build/`。
- `KineticBackdrop` 只负责无障碍树外的装饰动效，必须保持 `pointer-events: none`；不得在该组件加入业务状态、网络请求或持久化逻辑。

## 7. 禁止事项
- 禁止提交 API key、GitHub token、真实材料或未授权字体。
- 禁止把 API Key、访问码、中转密码、relay session、未脱敏 AI 原文或附件正文加入全局查找的 `value`、keywords、DOM 文本或测试夹具；任一业务编辑抽屉或当前页 AI `dialog` 打开时不得再打开命令面板。
- 禁止修改 `legacy/` 中的原型以实现新功能。
- 禁止把抓取的网页内容直接替换人工模板。
- 禁止使用 Cookie 或 localStorage 保存 AI 历史、API Key、访问码、中转密码或 relay session；结构化本机历史必须经过 `packages/local-data` 适配层。
- 禁止在公开仓库、Vite define、service worker、provider preset、测试快照或 source map 中出现用户指定的中转密码、中转站真实地址、上游 API Key 或本地配置加密密钥。
- 禁止为了展示本机诊断结果而扩展 Pages provider 目录或模型接口；Pages 仍只能接收 revision、站点 ID、显示名称、默认模型和模型 ID。
- 禁止让拖拽导入绕过 `MigrationView.importFile`、快照格式校验、记录数上限或历史迁移器。
- 禁止从根目录 WenXiBuddy 参考 HTML 复制业务数据、文案、样式代码或图标；本轮仅允许借鉴“左侧导航 / 中间列表 / 右侧详情”的抽象信息架构。
- 禁止在导入 HTML 中保留脚本、事件属性、表单、嵌入对象或未知标签；禁止把 API Key、访问码或会话令牌持久化或加入快照。
- 禁止在内容同步中接受任意工作流 URL、放宽 HTTPS/域名/重定向/类型/2 MB 上限，或把抓取逻辑放入 Pages 运行时。
- 商业参考站只能记录在 `docs/REFERENCE_AUDIT.md`；未取得书面再分发授权前，禁止加入 `content/sources/allowlist.yaml`、知识包、模板或样例数据。`robots.txt` 允许访问不等于取得版权许可。
- `.github/workflows/content-sync.yml` 每周只在 `main` 上更新来源元数据并使用 Actions 内置令牌；启用禁止机器人直推的分支保护前必须先改为自动 PR 流程。

## 8. 完成标准
- 任务、会议、文件、外出、用章、物资、写作、周报、历史档案和关于页均可本地使用；六类业务与周报删除前必须确认；周报需汇总全部可编辑业务模块并覆盖人工编辑、版本保存、快照恢复和 DOCX/PDF 导出；历史 Skill、配置及 `legacyPayload` 必须以纯文本只读显示。
- 任务状态以中文显示；交办人、承办人和单位可跨记录复用；工作小结可从三类确定性模板生成并继续编辑。
- 写作中心可导入 DOCX/HTML/TXT，保存本机自定义格式并在刷新后复用；导入清洗和 10 MB 上限必须有回归测试。
- DOCX 与 PDF 导出在含中文文本时可读且页面为 A4。
- 两版历史导出可以导入，保留附件与未映射数据。
- 合并前必须依次通过 `pnpm lint`、`pnpm test`、`pnpm test:e2e`、`pnpm build`；桌面包仅在目标平台实机启动后标记为已验证。
- 涉及 edition 或 AI 边界时还必须通过公开 Pages AI E2E、`pnpm test:e2e:internet` 与 `pnpm test:e2e:intranet`；三种构建都必须检查显式操作前零外联。
- 视觉迭代必须在 1440×900 与 390×844 视口检查首屏、任务表格、写作中心和抽屉；不得出现页面级横向溢出，并必须支持 `prefers-reduced-motion`。
- 移动端 `.main-area` 的可视区域底边不得越过固定 `.sidebar` 顶边；正文必须在预留底栏空间后的独立滚动容器中滚动，并由移动 E2E 几何断言锁定该不变量。
- 桌面 1440×900 必须同时验证左栏展开与图标模式、业务列表选中态、右侧详情内容及“编辑此记录”仍打开原抽屉；窄屏详情转为中心内容流后不得扩大 `body.scrollWidth`。
- 窄屏台账必须验证：点击非首条记录后详情标题更新且进入主滚动区可视范围，“返回记录列表”后列表重新可见；桌面三栏不得显示该返回按钮。
- 六类业务抽屉必须验证：干净抽屉直接关闭，脏状态可见，取消/关闭按钮/外侧/Escape 都先确认，刷新或关闭窗口触发 `beforeunload`，确认放弃后字段、暂存附件和仍在途附件读取都不能回写；桌面和 390×844 均须通过。
- 全局查找必须验证顶栏 44×44px 入口、`Ctrl/Cmd+K`、十五个导航结果、六类业务分组、关键词筛选、上下键、Enter、Escape、焦点恢复和空状态；选择业务结果后必须进入原模块并选中原记录，桌面显示既有右侧详情，窄屏使用既有详情滚动链路，不得出现页面级横向溢出。
- AI 与发布迭代必须验证：历史查询/删除/快照恢复、字段变化展示、默认无指引和三份只读预制指引、连接就绪后的精简协作面板、拖拽 JSON、下载链接矩阵，以及互联网/内网桌面构建中不存在自动演示数据。
- 完整 AI 长页还必须验证分区导航可达、四步状态不跳过脱敏确认、互联网获取模型与内网建立会话后连接详情自动收起且可再次展开。
- 模型发现回归必须验证按钮忙碌态会阻止同配置重复点击、配置变化后可立即发起新请求、迟到旧响应被忽略，以及超过 8 项的直连/Relay/内网模型目录可搜索、无匹配时保留当前模型并可清除筛选。显式刷新还必须验证刷新中目录仍可用、停止等待后迟到结果被忽略、成功刷新保留仍存在的当前模型、失败刷新保留上次目录，以及直连/桌面解析不改变上游顺序。
- 生成回归必须验证：同一次逐次确认只产生一个请求，生成中按钮忙碌且可停止，浏览器取消会向三类客户端传递 `AbortSignal`，桌面 IPC 迟到结果被忽略，材料/用途/模型/指引/连接变化使旧请求失效，上一条成功结果在新成功前保留，历史只写一次，成功/失败/取消后确认状态复位。
- 本机中转迭代必须通过单元测试和互联网 E2E 验证：解锁前零请求、错误密码、站点刷新、模型发现、生成时只发送已确认脱敏材料、上游元数据不泄漏、`Failed to fetch` 被转换为可操作诊断、回环请求标记为 `loopback`，以及直连模式仍可独立使用；发布前还要用真实 Chrome 分别验证 Local Network Access 拒绝与授予状态。
- 修改中转 provider 兼容层时还必须用隔离上游覆盖标准 `/v1/...` 与 Base URL + 资源两种路径，验证模型顺序/去重、404/405 路径回退、生成解析失败不重试，并检查公开 provider 响应不含 `apiPath`、真实地址或 Key。
- 若服务端新增管理诊断，客户端回归必须证明 Pages 协议和零联网边界未变化，构建产物不包含管理 attempt 字段、真实地址或 Key。

## 9. Review 标准
- 必查 CSP、HTML 清洗、显式 AI 操作前零外联、迁移记录数、附件哈希和字体回退提示。
- 必查日期年份能从既有值正常改成另一个四位年份；必查连续添加至少三个人员/单位后旧值仍存在且可从完整列表切换。
- 必查以 `/v1` 结尾的模型地址不会变成 `/v1/v1`，内网包无法通过 preload 绕过内部网关直连公网模型。
- 历史 Skill、配置和 `legacyPayload` 只能通过 React 文本节点或 JSON 序列化展示，禁止作为 HTML 注入页面。
- 必查 Windows/Debian amd64/arm64 打包配置与作者署名。
- 必查生成的 DEB 能仅靠自身依赖在 Debian 10/12 安装并启动；出现缺失共享库时先修复 `build.deb.depends`，不得放宽启动门。
- 必查分版 DEB 的 `Package` 字段仅含 Debian 允许字符；不得把“互联网版/内网版”等中文展示标签复用为包管理器标识。
- 必查 `--no-sandbox` 只存在于隔离的 Debian smoke 命令，生产 Electron 仍保持 `sandbox: true`、`contextIsolation: true` 和 `nodeIntegration: false`。
- 引用外部站点时，必查服务协议、隐私政策、版权声明和 `robots.txt`，并区分“交互借鉴”“允许链接”“允许再分发”。
- UI Review 必查所有功能性图标来自 Lucide、页面无表情符号、键盘焦点可见、移动底栏不遮挡正文、动效不阻塞点击或滚动。
- UI Review 必查移动端高频图标按钮至少 44×44px，AI 固定分区导航不遮挡目标标题，窄屏详情自动滚动遵守 `prefers-reduced-motion`。
- AI 模型选择 Review 必查长 ID 不撑破容器、筛选输入与清除/停止按钮有无障碍名称、焦点环可见、当前选项在筛选外仍可见，并使用乱序网络响应证明旧请求不能覆盖新配置。刷新控件必须在 390px 下保持 44px 触控高度并换行，不得因加载或错误让选择器闪退、跳空或扩大页面宽度。
- AI 生成 Review 必查生成/停止按钮的可访问名称、忙碌态和 390px 下至少 44px 触控高度；停止、输入变化、导航或卸载后不得接纳迟到结果或重复历史，Electron 不得为取消功能扩展 API Key 等 IPC 载荷。
- 业务抽屉 Review 必查所有关闭入口共用同一守卫，确认框取消后值与附件仍在，确认放弃后编辑会话清空；必须延迟附件哈希并证明迟到任务不会重新打开抽屉或写入 `pendingAttachments`。
- 全局查找 Review 必查 cmdk 只承载可访问组合框/列表语义，结果模型仍由项目明确提供；检查敏感字段排除、活动项和焦点环、打开前后焦点恢复、长中文文本、无结果状态，以及编辑抽屉/AI overlay 打开时不会叠加模态层。

## 10. 常见风险
- GitHub Pages 是公开静态服务，不能用于私有同步或密钥代理；直连 AI 取决于服务商 CORS，不能保证所有兼容地址在浏览器可用。
- 中转 `auto` 路径会在明确兼容失败后尝试第二个端点；若已知 provider 的不存在路径可能执行副作用却返回 404/405，应在本机管理页固定路径，避免生成重复提交风险。
- `scrollIntoView` 会作用于最近的可滚动祖先；台账详情定位和 AI 分区锚点必须同时在桌面窗口滚动与移动端 `.main-area` 独立滚动容器中验证，不能只测其中一种。
- 原生 `input[type=date]` 接受扩展年份；控件事件和保存边界都必须拒绝四位以外年份，并由全部五个日期字段的浏览器回归锁定。
- Mammoth 只恢复 DOCX 语义结构，不保留复杂 Word 版式；导入后必须提示人工复核，不能宣称无损转换。
- Chromium 与 Word 的中文字体和分页可能不同，必须视觉验证。
- 旧数据包含 localStorage、IndexedDB 和多版 schema，不能仅按 ID 去重。
- 周报日期汇总只能使用任务和文件中的已有字段，不得补写未记录的事实；保存后的周报与旧版只读周报必须保持不同记录类型。
- 两份历史 HTML 的导出器都写入 `sourceApp=任务管理系统LV08`、`version=X05-v1`，且默认不导出 `wenxi_skills`；迁移器不得伪造精确来源版本，缺失 Skill 必须给出报告警告。
- 历史 IndexedDB 附件使用 Data URL，导入时必须剥离媒体头、按解码字节计算哈希，并汇总任务阶段、配合单位、产出资料和阶段历史中的附件引用。
- 物资历史记录的 `attachments` 是内嵌 Data URL，不在 IndexedDB；迁移时必须生成稳定附件 ID、计算哈希并回填只读档案引用。
- 迁移报告必须披露重复附件 ID 和悬空附件引用；附件统计使用去重后的实际记录数。
- RxDB 单表以原始 `id` 为主键；跨业务类型同 ID 必须在写入或快照解析阶段明确拒绝，禁止通过 `upsert` 静默改写记录类型。
- 修改 RxDB schema 字段或枚举时必须递增 schema version 并提供保留旧记录的迁移策略；禁止在同一版本下改 schema 导致现有浏览器数据库无法打开。
- `electron-builder` 在 Windows 上交叉执行 Linux 目标会因 `mksquashfs` 或 `fpm` 缺失失败；正式 Linux 产物以 Ubuntu Actions 输出为准。
- electron-builder 的默认 DEB 依赖不含 `libasound2` 与 `libgbm1`；覆盖 `build.deb.depends` 时又会替换整份默认列表，因此配置测试必须锁定完整依赖集合。
- GitHub hosted runner 的 Docker 默认 seccomp/capability 会阻止 Chromium zygote namespace；给容器增加 `SYS_ADMIN`/`--privileged` 风险更高，smoke 仅以 CI 参数关闭 Chromium sandbox，不能把该参数带入真实客户端。
