# HxHwang Gw 客户端工程规则

## 1. 项目结构
- `apps/web` 是 GitHub Pages、互联网 Web、内网 Web 与 Electron renderer 共用入口；`apps/desktop` 是 Electron 壳。
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
- 新选附件必须先停留在编辑会话，保存业务记录时再持久化；取消编辑不得产生孤立附件。解除关联或删除记录时，只能清理已不被其他业务记录或历史档案引用的候选附件；内网同步只上传同步业务实际引用的附件。
- `docs/HELP.md` 必须与根 `package.json` 版本一致，并覆盖工作台、任务、会议、文件、外出、用章、物资、常用项管理、写作、周报、统计、AI 助手、历史档案、迁移、关于与设置十五个实际导航模块；修改模块名称、入口、保存语义、公开 AI、分版能力或安装资产名时必须同步说明书和文档契约测试。
- 常用项管理只允许改写候选目录，不得级联改写历史业务记录；单位与机关处室、人员必须分区维护，新增、重命名、删除都要经过显式保存并提供 E2E 持久化验证。
- 私有同步客户端必须拒绝 URL 内嵌凭据并禁止自动重定向，避免会话头离开用户明确配置的基址。
- Electron renderer 必须保持 sandbox；文件和 PDF 操作只能经 preload 的白名单接口。
- 互联网桌面版可使用受限 AI IPC；内网桌面包即使 renderer 误调用该 IPC，主进程也必须拒绝公网直连。
- 打包后的 Electron 禁止读取 `HXHWANG_WEB_URL`；未打包开发模式也只允许本机 HTTP 地址。
- Pages 只能使用本地数据适配器，允许本机附件、历史 JSON 和快照，但不得上传或请求私有 API；页面必须标明浏览器数据边界并禁止处理涉密材料。
- Pages 与互联网版复用 `DirectAiClient` 和服务商预设；API Key 只存在组件状态，加载页面、选择预设和填写 Key 均不得联网，只有“获取模型”或脱敏后“确认发送”可发起 HTTPS 请求。
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
- 禁止修改 `legacy/` 中的原型以实现新功能。
- 禁止把抓取的网页内容直接替换人工模板。
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

## 10. 常见风险
- GitHub Pages 是公开静态服务，不能用于私有同步或密钥代理；直连 AI 取决于服务商 CORS，不能保证所有兼容地址在浏览器可用。
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
