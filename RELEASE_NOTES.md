# HxHwang Gw 发布说明

## v0.7.2

- 新增独立“事务日历”导航模块，把任务截止日期、会议时间、文件日期、外出日期、用章日期和物资经手日期汇入同一个本机月视图；周一为每周起点，固定显示 6 周、42 个日期格。
- 支持上一个月、下一个月、回到今天，以及“全部 / 任务 / 会议 / 文件 / 外出 / 用章 / 物资”会话级筛选；日期格展示当日事项数和类型色条，所选日期在宽屏右侧、窄屏下方展示议程。
- 议程条目复用既有台账导航、会话筛选清除、记录选择和只读详情。点击事项后进入原模块并显示原记录，编辑继续使用原抽屉，不新增日历写回、拖拽改期或第二套保存逻辑。
- 日期索引严格使用领域校验：空值、无效日历日期和非四位年份不进入月历；会议只使用 `meetingTime`，不会根据通知日期重复生成事项，其他模块也不会用创建/更新时间补齐缺失日期。
- 新增 `agenda.ts` 纯函数、独立 `AgendaView`、单元/UI 合约和桌面/390px E2E。日历只消费 React 已加载数组，不读取第二份 IndexedDB，不调用 Fetch、Electron IPC、localStorage、快照、同步或遥测。
- 已审计 FullCalendar 7.0.2、React Big Calendar 1.20.0、Schedule-X 4.x、Plane Calendar 和 Vikunja Upcoming。最终不新增运行依赖；MIT 日历库只作能力对比，Plane/Vikunja 的 AGPL 源码只作抽象交互与信息架构参考，没有复制代码、文案、样式或资产。
- `AGENTS.md`、详细帮助、三语 README、开源方案审计、工作流/UI 契约和导航总数已同步到十六个模块。本机 lint、格式检查、105 项单元/契约、主 E2E 65 项通过/7 项条件跳过、互联网 7 项、内网 3 项及三类 Web 构建均通过；Pages、桌面矩阵和 Release 结果见本节后续发布记录。
- [Pages run 30623449945](https://github.com/NextWeb4/gw/actions/runs/30623449945) 的 build 与 deploy 均成功；线上真实 Chromium 返回 HTTP 200，页脚为 `0.7.2`，42 个日期格、六类筛选、原会议详情跳转均可用，`body.scrollWidth=1440`，无控制台错误或外部请求。[Desktop run 30623446895](https://github.com/NextWeb4/gw/actions/runs/30623446895) 的 18 个任务全部成功，覆盖 verify、8 个 Windows/Linux × x64/arm64 × internet/intranet 构建、8 个 Debian 10/12 分版启动门和 release。[v0.7.2 Release](https://github.com/NextWeb4/gw/releases/tag/v0.7.2) 不是草稿或预发布版本，12 个安装包与 `SHA256SUMS.txt` 共 13 个直接地址均返回 HTTP 200，校验文件含 12 条格式有效且文件名唯一的记录。

## v0.7.1

- 任务、会议、文件、外出、用章和物资六类台账新增共享的本机视图控制条，可同时使用关键词、模块字段筛选和日期/名称排序，并持续显示“可见数 / 总数”。
- 任务支持状态与动态类目筛选；会议支持已安排/待补会议时间；文件支持类型与登记状态；外出支持活动方向；用章支持动态文件类型；物资支持入库/领用。日期排序把空值放到最后，相同值保留原记录顺序。
- 六个模块的视图状态在当前 React 会话中独立保留，切换模块后返回不会丢失；刷新页面后不持久化。清除按钮恢复关键词、筛选与原始顺序；从全局查找打开业务记录时会清除目标台账视图，确保命中记录进入既有详情。
- 新增类型化纯函数模块，所有筛选和排序都先复制并索引源数组，不修改仓库状态，不调用 Fetch、IndexedDB、Electron IPC、localStorage、快照或同步服务。物资账面库存继续使用全部收发记录，筛选只改变可见列表。
- 依赖、数据库 schema、私有 API、服务端协议、CSP 和联网触发边界均未变化。开源审计比较了 TanStack Table（MIT）、Vikunja（AGPL-3.0）和 Plane（AGPL-3.0-only）；最终未新增依赖，只借鉴不可变行模型、明确清除与活动筛选反馈。
- 本机已通过 lint、格式检查、101 项单元/契约测试、主 E2E 63 项通过/7 项条件跳过、互联网 E2E 7 项、内网 E2E 3 项，以及公开/互联网/内网三类构建。完整 E2E 首轮发现清除按钮的无障碍名称包含“任务管理”，会与导航按钮产生模糊匹配；改为“清除当前台账筛选和排序”后，聚焦回归 4/4 与完整套件均通过。
- 1440×900 与 390×844 真实 Chromium 检查的 `body.scrollWidth` 分别为 1440 和 390；桌面列表与 360px 详情栏并排，移动筛选、排序和清除控件高度均为 44px，固定底栏顶边为 770px。检查过程无控制台错误或外部请求，截图保存为 `artifacts/ledger-view-v071-1440x900.png` 与 `artifacts/ledger-view-v071-390x844.png`；互联网/内网构建 source map 均为 0，八份发布清单版本一致，源码与三类构建未命中已知密码、测试秘密标记、会话 Key 或私钥模式。
- [Pages run 30616709394](https://github.com/NextWeb4/gw/actions/runs/30616709394) 已成功，线上真实 Chromium 显示页脚 `0.7.1`，六类台账视图控制可用且无控制台错误或外部请求。桌面首次 [run 30616712071](https://github.com/NextWeb4/gw/actions/runs/30616712071) 的唯一失败是 Debian 12 arm64 冒烟在 GitHub runner 拉取 Docker Hub 时连接超时（exit 125），删除并重推同一标签后，[run 30617653755](https://github.com/NextWeb4/gw/actions/runs/30617653755) 全部成功。[v0.7.1 Release](https://github.com/NextWeb4/gw/releases/tag/v0.7.1) 包含 12 个互联网/内网、Windows/Linux、x64/arm64 安装包和 `SHA256SUMS.txt`；13 个直接下载地址均为 HTTP 200，校验文件含 12 条格式有效且文件名唯一的记录。

## v0.7.0

- 顶栏新增“全局查找”，点击入口或按 `Ctrl/Cmd+K` 可从任意页面检索十五个导航模块，以及任务、会议、文件、外出、用章、物资六类当前已加载记录。
- 结果按“导航模块”和六类业务台账分组；支持输入筛选、上下键切换活动项、Enter 打开、Escape 关闭和关闭后的焦点恢复。移动端入口保持 44×44px，面板在固定底栏上方使用独立滚动区。
- 选择导航结果继续调用原有 `navigate`；选择业务记录继续调用原有导航、记录选中和只读详情链路。桌面端进入既有右侧详情，窄屏进入既有详情滚动路径，不新增第二套读取、编辑、删除或保存逻辑。
- 全局查找只从 React 已加载状态派生结果，不读取第二份 IndexedDB、不调用 Fetch/Electron IPC、不持久化搜索词、不记录遥测。索引字段与各台账原有搜索边界一致，明确排除 API Key、访问码、中转密码、relay session、未脱敏 AI 原文、备注和附件正文。
- 任一业务编辑抽屉或当前页 AI 对话框打开时，全局查找入口会禁用且快捷键不打开第二个模态层；关闭后恢复可用，不改变未保存保护与 AI 逐次确认边界。
- 开源审计比较 `cmdk@1.1.1`、kbar、Plane Power K 和原生 React/ARIA 自研。采用 MIT 许可的 cmdk 负责 Dialog、combobox、分组、键盘和焦点语义；Plane 仅借鉴分组与模态冲突抑制，未复制 AGPL 源码、文案或样式；kbar 的历史、嵌套动作、Fuse 与虚拟化超过本轮需要，未采用。
- 工作区版本升至 `0.7.0`，私有服务端保持 `0.2.3`。新增一个 MIT 运行依赖，不新增数据库 schema、私有 API、服务端协议、CSP 放宽、持久化秘密、后台索引、自动联网或远程搜索。
- 本机已通过 lint、格式检查、95 项单元/契约测试、主 E2E 61 项通过/7 项条件跳过、互联网 E2E 7 项、内网 E2E 3 项和公开/互联网/内网构建。1440×900 与 390×844 真实浏览器检查中 `body.scrollWidth` 分别为 1440 和 390；对话框分别为 720×303px 和 370×283px，移动入口为 44×44px，底栏上方保留 477px 间距，检查过程无控制台错误或第三方请求。视觉检查发现并修复 cmdk portal 内容类名未落在 Dialog 容器的问题，修复后 UI 合约、双视口聚焦 E2E 与 Web 构建重新通过。截图保存为 `artifacts/global-search-v070-1440x900.png` 与 `artifacts/global-search-v070-390x844.png`，不进入发布产物；互联网/内网构建 source map 均为 0，公开构建只命中 `0.7.0`，不命中 `0.6.9` 或 `0.3.1`。
- [Pages run 30611903426](https://github.com/NextWeb4/gw/actions/runs/30611903426) 与 [desktop run 30611903306](https://github.com/NextWeb4/gw/actions/runs/30611903306) 均已成功。线上真实 Chromium 显示页脚 `0.7.0`，可通过全局查找进入“整理省政府办公厅来文并建立关联”的原详情，全程无控制台错误或外部请求；线上入口 bundle 中 `0.7.0` 命中 10 次，`0.6.9` 与 `0.3.1` 均为 0 次。[v0.7.0 Release](https://github.com/NextWeb4/gw/releases/tag/v0.7.0) 的 12 个安装包和 `SHA256SUMS.txt` 共 13 个地址均返回 HTTP 200，校验文件含 12 条有效且文件名唯一的记录。

## v0.6.9

- 修复任务、会议、文件、外出、用章和物资六类编辑抽屉静默丢弃未保存内容的问题。抽屉打开时记录初始快照，字段、任务智能识别文字或附件处理状态发生变化后显示“未保存修改”。
- 取消按钮、关闭图标、点击抽屉外侧和 Escape 统一走同一个关闭守卫：干净抽屉直接关闭，脏抽屉必须明确确认；选择继续编辑时字段和暂存附件保持不变。
- 脏抽屉按需注册 `beforeunload`，刷新页面、关闭标签页或退出窗口时触发浏览器原生离开保护；干净抽屉不注册监听，不影响正常退出。
- 修复附件读取竞态：选择文件后立即计入未保存状态，读取与 SHA-256 计算完成前六类保存按钮统一显示“正在处理附件”并禁用，避免记录先保存而附件被遗漏。确认放弃会递增附件编辑会话代次并清空暂存区；迟到任务不能重新打开抽屉、改写新编辑器或产生孤立附件。
- 继续保持“附件保存业务记录时才写入 IndexedDB”的边界；本轮未新增数据库 schema、服务端路由、API、依赖、CSP 放宽、持久化秘密、后台刷新或自动联网行为。
- 开源审计比较 React Router navigation blocking、React Hook Form、react-use 与现有 React 受控状态。只借鉴脏状态基线、proceed/reset 和条件式 `beforeunload` 生命周期，采用十余行项目局部 hook 与附件会话代次，不引入新的路由、表单或工具库。
- 工作区版本升至 `0.6.9`，私有服务端保持 `0.2.3`。本机已通过 lint、格式检查、94 项单元/契约测试、主 E2E 59 项通过/7 项条件跳过、互联网 E2E 7 项、内网 E2E 3 项和生产构建。聚焦回归覆盖干净关闭、脏状态、刷新保护、拒绝/接受确认、外侧点击、Escape、暂存附件清理和延迟附件哈希迟到回调。1440×900 与 390×844 实测页面宽度分别保持 1440 和 390，抽屉完整贴合视口，移动关闭按钮为 44×44px，检查过程无第三方请求；截图保存在工作区根目录 `artifacts/unsaved-drawer-v069-1440x900.png` 与 `artifacts/unsaved-drawer-v069-390x844.png`，不进入发布产物。
- [Pages run 30607878047](https://github.com/NextWeb4/gw/actions/runs/30607878047) 与 [desktop run 30607877902](https://github.com/NextWeb4/gw/actions/runs/30607877902) 均已成功。线上入口 bundle 中 `0.6.9` 命中 10 次，`0.6.8` 与 `0.3.1` 均为 0 次，并包含“未保存修改”和六类“正在处理附件”文案；[v0.6.9 Release](https://github.com/NextWeb4/gw/releases/tag/v0.6.9) 包含 12 个安装包和 `SHA256SUMS.txt`，13 个下载地址均返回 HTTP 200，校验文件含 12 条有效且文件名唯一的记录。

## v0.6.8

- 修复 AI 生成请求缺少生命周期保护的问题：互联网直连、本机中转、内网网关和桌面 IPC 统一使用“仅最新请求有效”的请求代次；重复点击不会再产生并行付费请求，迟到响应不能覆盖当前结果。
- 生成按钮新增明确忙碌态和“停止等待生成结果”。生成期间保留上一条成功结果，只有当前请求成功后才原子替换；停止等待、修改服务商/模型/用途/指引/材料、重新建立会话或组件卸载都会使旧请求失效。
- `DirectAiClient`、`RelayAiClient` 和 `PrivateSyncClient` 的生成接口新增可选 `AbortSignal`，并与既有 60 秒超时组合。Electron 不扩展 IPC 或密钥载荷，界面停止等待后通过请求代次拒绝迟到主进程结果。
- AI 历史写入增加当前请求守卫：只有仍有效的成功响应可保存一次；若持久化期间请求失效，会回滚该条候选记录。每次成功、失败、取消或相关输入变化后都撤销逐次确认，下一次发送必须重新确认。
- 回归覆盖浏览器重复提交、停止后保留上一结果、材料/用途变化导致在途请求失效、桌面 IPC 迟到结果、内网迟到结果，以及三类客户端生成 `AbortSignal`。移动端生成与停止按钮继续保持至少 44px 高。
- 开源审计比较 Web 标准、Vercel AI SDK、LobeChat、LibreChat 与 Open WebUI。直接复用浏览器/Node 原生 `AbortController`、`AbortSignal.any` 与 `AbortSignal.timeout`，只借鉴外部项目的请求身份守卫和显式停止反馈；未复制其代码、文案或样式，也未新增依赖。
- 工作区版本升至 `0.6.8`，私有服务端保持 `0.2.3`；未新增数据库 schema、服务端路由、协议字段、CSP 放宽、持久化秘密、后台刷新或自动联网行为。
- 测试先证明旧实现的三个生成客户端无法响应调用方取消，且互联网/桌面 UI 没有生成忙碌态或停止入口。最小修复后，本机已通过 lint、格式检查、93 项单元/契约测试、主 E2E 57 项通过/7 项条件跳过、互联网 E2E 7 项、内网 E2E 3 项和生产构建。1440×900 与 390×844 视觉/几何检查中页面宽度分别保持 1440 和 390，移动端生成与停止按钮均为 44px 高，忙碌按钮禁用且旧提示不会遮挡停止操作；截图保存在工作区根目录 `artifacts/ai-generation-v068-1440x900.png` 与 `artifacts/ai-generation-v068-390x844.png`，不进入发布产物。真实第三方模型上游未在本机验证。
- [Pages run 30558339464](https://github.com/NextWeb4/gw/actions/runs/30558339464) 与 [desktop run 30558345545](https://github.com/NextWeb4/gw/actions/runs/30558345545) 均已成功。线上入口 bundle 中 `0.6.8` 命中 10 次，`0.6.7` 与 `0.3.1` 均为 0 次，并包含“正在生成结果”和“停止等待生成结果”；[v0.6.8 Release](https://github.com/NextWeb4/gw/releases/tag/v0.6.8) 包含 12 个安装包和 `SHA256SUMS.txt`，13 个下载地址均返回 HTTP 200，校验文件含 12 条有效且文件名唯一的记录。

## v0.6.7

- 互联网直连、本机中转和内网模型目录新增显式刷新与“停止等待”。已有目录刷新时不再先清空选择，当前目录继续可用，成功后再原子替换。
- 刷新成功时，当前模型仍存在则继续保留；已被服务商移除时才回退到默认模型或新目录第一项。刷新失败或用户停止等待时保留上次成功目录和当前选择。
- 浏览器直连、Relay 与内网模型请求组合调用方 `AbortSignal` 和既有 60 秒超时；配置变化、重复请求或停止等待会主动中止 Fetch。Electron IPC 继续使用请求代次拒绝迟到结果，不扩展 IPC 密钥载荷。
- 修复直连 Web 与 Electron 模型解析排序问题：模型 ID 现在按服务商原始顺序做大小写不敏感去重，不再按字母排序。
- 大目录筛选在刷新期间保持当前关键词，刷新控件支持窄屏换行、44px 触控高度、可见忙碌态和 reduced-motion；不新增后台刷新、缓存、持久化或自动联网。
- 开源审计比较 Web AbortController、LobeChat、Open WebUI、TanStack Query、SWR 与 Axios。只借鉴取消生命周期和成功前保留旧状态，不复制自定义许可证项目代码，也不引入新的数据请求依赖。
- 工作区版本升至 `0.6.7`，私有服务端保持 `0.2.3`；未新增依赖、数据库 schema、协议字段、CSP 放宽或服务端路由。
- 2026-07-30 本机回归已通过：lint、格式检查、90 项单元/契约测试、主 E2E 57 项通过/7 项条件跳过、互联网 E2E 5 项、内网 E2E 2 项和生产构建。1440×900 与 390×844 浏览器检查的页面宽度分别保持 1440 和 390；移动端刷新与停止按钮均为 44px 高，刷新中 15 项目录、长模型 ID 和筛选词保持可用，停止后迟到结果未覆盖当前状态。真实第三方模型上游未在本机验证。
- [Pages run 30546950074](https://github.com/NextWeb4/gw/actions/runs/30546950074) 与 [desktop run 30547010378](https://github.com/NextWeb4/gw/actions/runs/30547010378) 均已成功。线上入口 bundle 中 `0.6.7` 命中 10 次，`0.6.6` 与 `0.3.1` 均为 0 次；[v0.6.7 Release](https://github.com/NextWeb4/gw/releases/tag/v0.6.7) 包含 12 个安装包和 `SHA256SUMS.txt`，13 个下载地址均返回 HTTP 200，校验文件含 12 条有效且文件名唯一的记录。

## v0.6.6

- 互联网直连、本机中转和内网模型发现统一加入请求代次保护：服务商、地址、会话级 Key、内部会话或 Relay 站点变化时，在途旧请求立即失效，迟到响应不会覆盖当前模型列表或错误状态。
- “获取模型”按钮在请求期间显示明确忙碌态并阻止同一配置重复点击；配置变化后仍可立即发起新请求，不需要等待旧请求结束。
- 模型目录超过 8 项时显示本地关键词筛选、总数和匹配数量。筛选保持上游顺序，当前已选模型即使不匹配也继续可见，无匹配状态提供可访问的清除入口恢复完整列表。
- 筛选词、模型目录、API Key、访问码和 Relay 会话均不新增持久化；页面加载与修改配置仍保持零请求，只有用户点击获取模型或确认生成才联网。
- 开源方案审计比较 Open WebUI、LobeChat、react-select、Headless UI、TanStack Query 与 SWR；只借鉴长目录搜索和当前选择保留，不复制受限项目代码、文案、样式、品牌或模型数据，也不采用缓存、后台刷新、多选或新组件依赖。
- 工作区版本升至 `0.6.6`，私有服务端维持 `0.2.3`。未新增依赖、数据库 schema、协议字段、CSP 放宽或自动联网行为；回滚只需移除模型请求代次、筛选组件和对应样式。
- 2026-07-30 本机回归已通过：lint、格式检查、87 项单元/契约测试、主 E2E 57 项通过/7 项条件跳过、互联网 E2E 4 项、内网 E2E 2 项和生产构建。1440×900 与 390×844 真实浏览器检查均无页面级横向溢出；移动端筛选输入为 16px、清除按钮为 44×44px、选择器高度 44px，长模型 ID 可换行查看，提示条不拦截点击。真实第三方模型上游未在本机验证，不作已验证声明。
- [Pages run 30542197525](https://github.com/NextWeb4/gw/actions/runs/30542197525) 与 [desktop run 30542253012](https://github.com/NextWeb4/gw/actions/runs/30542253012) 均已成功。线上入口 bundle 中 `0.6.6` 命中 10 次，`0.6.5` 与 `0.3.1` 均为 0 次；[v0.6.6 Release](https://github.com/NextWeb4/gw/releases/tag/v0.6.6) 包含 12 个互联网/内网、Windows/Linux、x64/arm64 安装包和 `SHA256SUMS.txt`，13 个下载地址均返回 HTTP 200，校验文件含 12 条有效且文件名唯一的记录。

## v0.6.5

- 本机中转管理页新增“测试已保存配置”：管理员可在 Pages 使用前显式验证模型列表连接，查看总耗时、模型数量与受限模型预览，并确认实际尝试过的 API 路径、鉴权方式、HTTP 状态和稳定结果分类。
- 新增已认证管理接口 `POST /v1/relay/admin/providers/:id/test`。接口只读取加密配置，不接受上游 URL/Key，不发送聊天材料，不持久化诊断结果，也不改变 revision；未启用站点可由管理员测试，但仍不会进入 Pages 目录。
- 诊断链路复用既有禁止重定向、30 秒超时、2 MB 响应上限、Bearer 401/403 后 `x-api-key` 回退，以及 `/v1/models` 到 Base URL `/models` 的有界兼容逻辑。网络失败、无效 JSON、响应超限、空模型和 HTTP 错误均返回稳定脱敏分类，不返回真实 URL、host、Key、原始正文或底层异常。
- 本机管理页重做为响应式站点卡片：配置、保存、测试和结果分区更清楚；编辑字段会立即清除旧诊断并使迟到请求失效，未保存时明确提示“测试仍使用上次保存版本”。1440×900 与 390×844 均无页面级横向溢出。
- Pages AI 面板增加操作提示，引导用户先在本机管理页测试，再回网页刷新站点；`RelayAiClient`、公开 provider 目录、模型与生成协议均未扩展管理诊断字段，页面加载、选择入口和填写密码仍保持零请求。
- 开源审计比较 LiteLLM、New API、Cherry Studio、Open WebUI 与 Portkey Gateway：只借鉴显式健康检查、延迟、模型预览、迟到结果防护和尝试链可观测性；不采用后台轮询、自动模型同步、fallback、负载均衡、缓存或通用代理。AGPL 与自定义许可证项目没有复制代码、文案、组件、预设或数据。
- 工作区版本升至 `0.6.5`，私有服务端升至 `0.2.3`。未新增依赖、数据库 schema、配置文档版本、客户端秘密字段或自动联网行为；回滚只需移除管理测试路由与同源 UI。
- 2026-07-30 本机回归已通过：服务端 lint、格式检查、34 项集成测试（另有 2 项 PostgreSQL 条件测试跳过）和构建；客户端 lint、格式检查、86 项单元/契约测试、主 E2E 57 项通过/7 项条件跳过、互联网 E2E 3 项、内网 E2E 2 项和生产构建。真实 PostgreSQL 与真实第三方上游未在本机验证，不作已验证声明。
- [Pages run 30530132922](https://github.com/NextWeb4/gw/actions/runs/30530132922) 与 [desktop run 30530253737](https://github.com/NextWeb4/gw/actions/runs/30530253737) 均已成功。线上入口 bundle 已核对包含 `0.6.5`，且不含旧版 `0.6.4` 或 `0.3.1`；[v0.6.5 Release](https://github.com/NextWeb4/gw/releases/tag/v0.6.5) 包含 12 个互联网/内网、Windows/Linux、x64/arm64 安装包和 `SHA256SUMS.txt`，校验文件含 12 条有效记录。

## v0.6.4

- 补齐本机中转站的第二种模型发现路径：除标准 OpenAI 风格的 `/v1/models` 外，支持直接在管理员填写的基址后追加 `/models`；例如 `https://host/api` 可依次尝试 `https://host/api/v1/models` 与 `https://host/api/models`。
- 本机管理页新增“API 路径”选择：自动兼容、自动补 `/v1`、直接追加资源。旧加密配置缺少该字段时默认自动兼容，不升级 PostgreSQL 或加密文档版本。
- 自动模式的模型发现只在 404/405、有效响应无模型或无效 JSON 时尝试第二条路径；生成请求只在 404/405 时切换路径，HTTP 成功但返回无效 JSON 时不会重复提交同一份材料。
- 模型 ID 解析保持上游顺序，使用大小写不敏感去重，并继续过滤空值和超过 200 字符的值。默认模型若仅大小写不同，不再重复插入列表。
- 真实上游地址、API Key、鉴权方式和 API 路径仍只存在本机管理接口与 AES-256-GCM 加密配置；Pages 公开目录只返回 provider ID、显示名称、revision 和默认模型。
- 方案复核了 `jlcodes99/cockpit-tools` 提交 `923cc6c` 中 Codex 的 Base URL + `/models` 与 Claude Gateway 的 `/v1/models` 两条链路。该项目采用 `CC BY-NC-SA 4.0`，本项目仅借鉴协议行为，没有复制源码、预设、文案或数据，也没有新增依赖。
- 工作区版本升至 `0.6.4`，私有服务端升至 `0.2.2`。页面加载、选择中转入口和填写密码仍为零请求；只有显式解锁、刷新、获取模型或确认生成才联网。
- 2026-07-29 本机回归已通过：服务端 lint、格式检查、30 项集成测试（另有 2 项 PostgreSQL 条件测试跳过）和构建；客户端 lint、格式检查、全部单元/契约测试、主 E2E 57 项通过/7 项条件跳过、互联网 E2E 3 项、内网 E2E 2 项及生产构建。管理页在 1440×900 与 390×844 下验证三种 API 路径选项和零页面级横向溢出。当前本机没有启用真实第三方 provider，真实站点连通性仍需由用户配置后验证。
- [服务端 run 30468673475](https://github.com/NextWeb4/hxhwang-gw-server/actions/runs/30468673475)、[Pages run 30468731438](https://github.com/NextWeb4/gw/actions/runs/30468731438) 和 [desktop run 30468732985](https://github.com/NextWeb4/gw/actions/runs/30468732985) 均已成功。线上 bundle 已核对为 `0.6.4`；[v0.6.4 Release](https://github.com/NextWeb4/gw/releases/tag/v0.6.4) 包含 12 个互联网/内网、Windows/Linux、x64/arm64 安装包和 `SHA256SUMS.txt`，校验文件含 12 条有效记录。

## v0.6.3

- 修复部分 OpenAI 兼容中转站无法获取模型的问题：本机后端不再固定只发送 `Authorization: Bearer`，每个神秘站点可选择“自动 / Bearer / x-api-key”。
- “自动”模式先使用 Bearer，只在上游明确返回 `401` 或 `403` 时以 `x-api-key` 重试；网络错误、超时、非鉴权 HTTP 错误和无效 JSON 均不盲目重试，避免重复请求扩大故障。
- `/models` 仍按基址自动补齐 `/v1` 且不会产生 `/v1/v1`；模型解析继续兼容 `data`、`models`、字符串、`id` 和 `name`，并保持 200 字符 ID、2 MB 响应和禁止重定向限制。
- 旧版加密 provider 配置无需迁移：缺少鉴权字段时读取为“自动”；管理页不会回显已保存 Key，Pages 目录仍只返回 provider ID、别名、revision 和默认模型。
- 方案参考 `jlcodes99/cockpit-tools` 的端点和双鉴权思路，但该项目默认使用 `CC BY-NC-SA 4.0`，本项目没有复制其源码或引入其依赖，仅基于协议事实独立实现最小兼容层。
- 工作区版本升至 `0.6.3`，私有服务端升至 `0.2.1`。无新依赖、数据库 schema、自动联网或客户端协议变化；脱敏、逐次确认、会话级密码/Key 和显式联网边界保持不变。
- 2026-07-28 本机回归已通过：服务端 lint、格式检查、25 项集成测试（另有 2 项 PostgreSQL 条件测试跳过）和构建；客户端 lint、格式检查、全部单元/契约测试、主 E2E 57 项通过/7 项条件跳过、互联网 E2E 3 项、内网 E2E 2 项及生产构建。管理页在 1440×900 与 390×844 下验证三种鉴权选项和零页面级横向溢出。
- [Pages run 30356986954](https://github.com/NextWeb4/gw/actions/runs/30356986954) 已成功，线上构建已实测显示 `0.6.3`；[desktop run 30356989688](https://github.com/NextWeb4/gw/actions/runs/30356989688) 也已成功，Release 包含 12 个互联网/内网、Windows/Linux、x64/arm64 安装资产和 `SHA256SUMS.txt`。

## v0.6.2

- 修复窄屏台账选择反馈断裂：点击任务、会议、文件、外出、用章或物资记录后，主滚动区会把对应详情定位到可视区域；详情顶部新增“返回记录列表”，宽屏三栏仍保持列表与详情并排。
- 完整 AI 工作台新增固定分区导航，可直接跳转“本次协作 / 历史回答 / 写作指引”，减少桌面与移动端长页面反复滚动。
- AI 请求区新增“连接 / 材料 / 脱敏 / 结果”四步状态；服务会话或模型就绪后，连接配置会自动收起，仍可手动展开修改地址、Key、访问码或中转设置。
- 移动端列表编辑/删除、顶部刷新、抽屉关闭和详情操作统一扩大到至少 44px 触控目标；表格操作列同步扩宽，避免两个图标按钮互相挤压。
- 新增 Playwright 与 UI 契约回归，覆盖窄屏详情往返、AI 分区跳转、互联网模型发现后自动收起配置、内网连接后自动收起配置，以及移动触控尺寸。
- 工作区版本升至 `0.6.2`。本轮只复用现有 React、浏览器滚动 API、CSS sticky/grid 和 Lucide，没有新增依赖、数据库 schema、服务端协议、自动联网行为或许可证风险；脱敏、逐次确认、120,000 字符上限和会话级密钥边界保持不变。
- 2026-07-28 本机完整回归已通过：`pnpm lint`、`pnpm format:check`、`pnpm test`、主 E2E 57 项通过/7 项条件跳过、互联网 E2E 3 项、内网 E2E 2 项及 `pnpm build`。1440×900 与 390×844 真实浏览器均无控制台错误或页面级横向溢出；390px 下详情自动定位、返回列表和 44×44px 操作按钮已实测。

## v0.6.1

- 修复 GitHub Pages 访问 `127.0.0.1` 中转站时仍可能只出现 `Failed to fetch` 的真实浏览器问题。Chrome 142+ 会把公网来源到回环地址的请求交给 Local Network Access 权限控制；这不是模型 ID、密码校验或普通 API 响应错误。
- 回环 AI 请求现显式声明 `targetAddressSpace: "loopback"`。浏览器拒绝或尚未授予权限时，错误信息会引导用户在地址栏的网站设置中允许“本地网络访问”并刷新，不再把权限拒绝笼统归为 CORS。
- 中转配置区在解锁前显示 Chrome 权限提示，并始终提供“打开本机管理页”入口，便于先确认后端是否启动。页面加载、选择中转入口和填写密码仍保持零请求，只有用户点击解锁后才会触发权限与网络访问。
- 第一性原理回归已覆盖：Chrome 151 未授权状态为 `prompt` 且回环请求被拒绝；授予 `local-network-access` 后同一 Pages Origin 可读取本机健康接口并完成密码会话。单元测试同时锁定权限拒绝提示与 `loopback` 请求标注。
- 工作区版本升至 `0.6.1`；本机后端继续使用已发布的 `0.2.0` 协议，无新依赖、无数据库 schema、无许可证变化，也没有把密码、API Key、上游地址或加密密钥加入公开仓库。
- [Pages run 30338701480](https://github.com/NextWeb4/gw/actions/runs/30338701480) 与 [desktop run 30338765244](https://github.com/NextWeb4/gw/actions/runs/30338765244) 已成功；Release 包含 12 个分版/架构安装资产、`SHA256SUMS.txt` 和 GitHub 自动生成的两份源码归档。

## v0.6.0

- 公开 Pages 与互联网版新增可选“神秘站点（本机中转）”：用户显式输入本机密码后，页面获取后端发布的站点别名和 revision，再按 provider ID 获取模型和生成结果；页面加载、选择入口或填写密码均不自动联网。
- 修复中转站直连只显示 `Failed to fetch` 的诊断缺口：浏览器网络/CORS/Private Network Access/证书/地址失败现在会显示可操作提示；原有用户自备 Key 直连模式继续保留。
- 私有服务端新增三份可编辑神秘站点槽位、本机管理页、密码限流会话、精确 GitHub Pages CORS 和 Private Network Access 预检；上游地址和 API Key 永不进入公开 provider 目录。
- 中转配置使用独立随机 256 位 `RELAY_CONFIG_KEY` 和 AES-256-GCM 加密保存到 Git 忽略的 `data/relay-providers.enc`，支持原子写入、重启恢复和 Key 保留/显式清除。六位管理密码仅作为回环服务的便利解锁，不作为文件加密密钥或公网认证。
- 本机管理页提供“保存并发布到网页”，保存后 Pages 点击“刷新站点”即可读取新的 revision，无需修改仓库或重新部署静态站点；根目录新增一键启动脚本 `start-local-relay.cmd`。
- 中转模式仍强制 120,000 字符材料上限、20,000 字符指引上限、2 MB 上游响应限制、禁止重定向、脱敏预览和逐次确认；AI 结果继续只读展示并进入本机历史。
- 工作区版本升至 `0.6.0`，私有服务端升至 `0.2.0`；未新增 npm 依赖或数据库 schema，直连、内网网关、同步、附件和离线数据边界保持兼容。
- 2026-07-28 本机回归已通过：服务端 21 项集成测试通过、2 项 PostgreSQL 条件测试跳过；客户端全套单元/契约测试通过，主 E2E 56 项通过、6 项条件跳过，互联网 E2E 3 项和内网 E2E 2 项通过。真实浏览器在 1440x900 与 390x844 下验证中转解锁、revision 刷新、管理页和零页面级横向溢出。
- Windows x64 双版已本机构建并保持主进程运行 10 秒：互联网版 `HxHwang-Gw-0.6.0-internet-x64-setup.exe` 为 `99,968,574` 字节，SHA-256 `6C4BF536C8308D789B552711E61A37A04DC9B9CA4710F6E91E3E794FA71ED2AC`；内网版为 `99,968,492` 字节，SHA-256 `8E1A9FAB72201710225614008C50BCA29753F9B7E7DEB0D927A1A7EAA13DE1FA`。两版 Authenticode 状态仍为 `NotSigned`。

## v0.5.0

- AI 助手新增本机“历史生成与回答查询”：按用途、模型、指引、请求、回答和字段搜索，展示已确认脱敏的请求、只读回答及字段变化，可逐条删除或清空；最多保留 200 条，随本机快照备份但不进入私有同步。
- 公文写作和周报 AI 结果新增标题/正文字段变化摘要；未提供业务字段快照的普通 AI 请求显示“生成结果”前后摘要。所有结果保持只读，不自动覆盖草稿或台账。
- 从两份已授权公文写作 Markdown 蒸馏三份只读预制指引：“精简润色版”“结构校核版”“总结成稿版”。指引选择默认固定为“无（默认）”，用户本机指引继续独立保存并受 20,000 字符上限约束。
- 当前页 AI 协作面板收窄并精简：连接和模型就绪后折叠高级配置，主要展示用途、指引、当前材料、脱敏预览、逐次确认、字段变化和只读结果；Key、访问码和确认边界不变。
- 数据迁移支持把 JSON/本地快照直接拖到导入区；拖拽与文件选择共用原解析、迁移、记录数上限和快照校验，不新增旁路。
- “关于与设置”新增桌面客户端下载中心，可切换互联网版/内网版，并分别选择 Windows x64/ARM64、Linux DEB amd64/arm64、Linux AppImage x86_64/arm64，同时提供 `SHA256SUMS.txt`。
- 公开 Pages 继续初始化虚构演示数据；互联网 Web、内网 Web及互联网/内网 Electron 安装包首次启动为空业务库，不再内置模拟业务记录。
- 延续 v0.4.2 的宽屏三栏业务台账、右侧只读详情和可折叠图标导航；本轮未引入新依赖、数据库 schema、私有 API 或自动 AI 联网行为。
- Windows x64 本机构建与 8 秒启动冒烟已通过：互联网版 `99,966,947` 字节，SHA-256 `84B61CD4EAA246DD2C9AB3D54A35A062AD9FE078EC9D95AC6C622713FBD92A90`；内网版 `99,966,968` 字节，SHA-256 `280635F62EC2FA354B1FA5FE3344C5B88C5A1ED8C4F962C8F6940EDE331D7559`。两版均观察到 4 个进程并正常结束测试，仍未进行 Authenticode 签名。

## v0.4.2

- 六类业务台账在 1280px 以上桌面宽屏改为“左侧导航 / 中间列表 / 右侧详情”三栏结构；中间列表收窄，点击记录后右侧只读展示完整字段、阶段、配合单位、备注与本机附件。
- 左侧导航新增可折叠图标模式，保留全部 Lucide 图标、活动状态、无障碍名称、键盘操作和悬停提示；移动端仍使用既有固定底栏，不套用桌面折叠状态。
- 右侧详情只调用原有编辑抽屉，不新增保存或持久化路径；窄屏详情回到中心内容流，页面级横向溢出和底栏几何边界继续由 E2E 锁定。
- 交互仅借鉴根目录四份 WenXiBuddy 参考文件的抽象三栏与折叠方式，未复制其中业务数据、文案、配色、图标或源代码。
- 工作区版本统一升至 `0.4.2`；未新增依赖、许可证变化、自动联网行为、数据库 schema 或 API 变化。

## v0.4.1

- 新增独立导航模块“常用项管理”：单位与机关处室、人员分区维护，支持新增、重命名、删除和显式保存；修改候选目录不会级联改写历史业务记录，保存后立即用于各业务表单的完整常用项选择器。
- Web 演示数据统一为虚构省直机关场景；演示文件固定为文号 `闽政〔2026〕1号`、来源单位 `福建省人民政府办公厅`，旧版未改动样例通过 `demo-seed-v3` 原位升级，用户编辑过的同 ID 记录保持不变。
- 公文写作和周报生成的“AI 润色”改为在当前页面打开 AI 协作面板；材料预填、脱敏预览、逐次确认、模型请求和只读结果都在发起页面完成，不再跳转到“AI 助手”。会话级 Key、模型和现有的 120,000 字符限制保持不变。
- 工作区版本统一升至 `0.4.1`；未引入新依赖、许可证变化、自动联网行为或数据库 schema 变更。

## v0.4.0

本版本包含 v0.3.1 之后累积的全部修复与新功能。用户在 v0.3.1 安装包或线上 Pages 中遇到的“交办日期年份无法修改”“交办人加入常用项后覆盖其他人”两个问题的修复都在本版本中；必须重新构建并发布后才会到达安装包和线上演示。

### 本轮新增（AI 助手与审计修复）

- 新增导航模块“统计分析”：按月份和任务类目汇总本机台账——本期任务/新建/已完成/已超期指标卡、单色类目对比条、四状态分段条与图例、同期六类台账计数；全部为确定性本机统计，不引入图表库、不联网，`packages/domain` 提供 `buildWorkStatistics`/`listStatisticsMonths` 纯函数及单元测试。
- 新增“公文写作指引库（Skill）”：可把《公文写作算法》等写作方法论保存为本机润色指引（支持 .md/.txt 批量导入、预览、删除，快照可备份），在 AI 助手选择后作为系统写作指引随请求发送；公开直连、互联网桌面 IPC、私有网关三边界统一 20,000 字符上限并配套单元测试与 E2E，更换指引会撤销确认状态，不改变脱敏与逐次确认边界。
- 新增“周报模板”：章节结构可自定义（增删、排序、改标题、手工占位节），支持 JSON 导入导出与“从范文提取结构”（本机识别“一、……”标题并推断数据来源，零联网）；自动章节仍由确定性汇总生成，默认模板输出与旧版逐字节一致并有回归测试锁定。
- 新增“配合单位分组”：任务（含阶段）配合单位可存为分组并一键“按分组添加”，采用追加合并——已存在单位的状态与附件保持不动、只补缺失项并提示加入/跳过数量，与旧版“整组替换”不同；分组存本机设置库、进快照备份，配套领域单测与 E2E。
- 新增“类目配色”：任务类目按名称确定性分配四档系统色板（荧光黄/草绿/紫色/中性灰，CVD 区分度与对比度经校验），任务列表圆点与统计条同步着色；统计分析页可为单个类目固定颜色或恢复自动，超期语义色不参与类目配色。
- 任务抽屉新增“智能识别填单”：粘贴微信通知、会议布置等文字后，本机规则识别任务名称、交办人、交办/截止日期与任务来源并一键填入（`extractTaskFromText` 纯函数 + 单元测试 + 零外联 E2E）；识别结果仅为预填草稿，保存前需人工核对。
- 新增导航模块“AI 助手”：公开演示版与互联网版内置 OpenAI、DeepSeek、Moonshot/Kimi、智谱 GLM、阿里云百炼/DashScope、SiliconFlow、本机 Ollama 及自定义兼容接口预设，用户填入会话级 API Key 即可获取模型并在脱敏确认后总结、提纲与润色；内网版在同一模块内提供同步连接与内部 AI。桌面客户端复用同一界面。
- 服务商预设补充智谱 GLM（`https://open.bigmodel.cn/api/paas/v4`），与两份历史网页原型的内置服务商保持一致；OpenAI 兼容地址解析支持以 `/v1`、`/v4` 等任意版本号结尾的基址，公开直连、互联网桌面 IPC 与私有网关三个边界同步修复，不再拼出 `/v4/v1/...` 类错误路径。
- 公文写作与周报生成新增“AI 润色”入口：当前标题与正文作为自定义材料自动载入 AI 助手并预选用途；载入过程纯本机，发送仍需脱敏预览与逐次确认。AI 结果新增“复制结果”按钮，输出保持只读、不覆盖原稿。
- AI 助手在模块间切换时保持挂载：会话级 API Key、已获取模型和结果在切换导航后不再丢失（刷新或关闭页面仍会清除）。
- 修复默认日期取 UTC 造成的偏差：新建任务/文件/会议/外出/用章/物资的默认日期与工作台“近七日到期”、快照文件名统一改用本机时区日期（此前在 UTC+8 的 0 点至 8 点之间会填成前一天）。
- 修复提示条连续弹出同文案时被吞掉的问题：toast 改为带自增 key 的状态，连续两次相同操作（如再次建立内网会话、连续导入）也会重新显示提示并重置 3.2 秒展示时长；此前第二次提示会因 React 相同 state 合并而静默丢失。
- 脱敏规则加固：邮箱规则先于手机号执行，形如 `13812345678@example.com` 的地址整体替换为 `[邮箱]`，不再被拆成 `[手机号]@域名` 而暴露域名；手机号匹配增加数字边界，不再误命中更长数字串中的 11 位子串；补充三条回归单测。
- 清理公开演示版遗留死代码：移除恒真的 `enhancedLocalMode` 开关与“公开演示版禁用附件/导入”等不可达文案（与现行“公开 Pages 支持本机附件与导入”的行为矛盾），并移除未被引用的 `__PRIVATE_SERVICES__` 构建常量（分版行为统一由 `__DISTRIBUTION_MODE__` 驱动）。
- E2E 加固：主套件超时上调至 60 秒以消除慢用例贴线抖动；修复因新增“导入 .md / .txt”指引入口与关于页“打开 AI 助手”按钮引入的三处 Playwright 定位器歧义。
- 物资数量输入改用本地编辑缓冲：清空重输过程中不再把数量瞬间写成 0，失焦时无效输入回退为上次有效值并提示。
- 编辑抽屉补充 `role="dialog"`、`aria-modal` 与标题标注；周报删除失败时给出错误提示而不是静默失败。
- 新增回归测试：真实键盘逐位改写交办日期年份（zh-CN 分段输入）、AI 助手跨模块保持 Key、公文写作/周报“AI 润色”预填、智谱 GLM 预设与 `/v4` 端点解析（Web 直连、桌面 IPC、私有网关三处）。
- 界面打磨：按钮按压反馈、下拉框统一箭头、面板滚动条与占位符对比度、AI 结果卡与关于页入口卡样式、移动端底部导航溢出渐隐提示。

### 自 v0.3.1 累积的其他未发布内容

- AI provider 响应改为在公开 Web、互联网桌面主进程和私有网关中按 2 MB 流式有界读取，拒绝超限或无效 JSON，避免先无界缓冲异常响应；模型 ID 同时去空、去重并过滤超长值。
- 私有 AI 网关把上游连接、DNS 和超时异常统一映射为不泄露底层细节的 `502 ai_provider_unreachable`，避免把 provider 故障误报为服务内部错误。
- 修复六类业务新建抽屉在填写标题后误切换为“编辑”以及移动端跨模块保留旧滚动位置的问题；创建/编辑模式改由持久化记录身份决定，导航后统一回到模块顶部。
- 新增会议管理、外出活动、用章管理和物资收发四个独立可编辑模块；与任务、文件共同支持本机 CRUD、搜索、四位真实日期、常用人员/单位、附件和周报汇总。
- 历史会议、外出、用章和物资原件继续只读，可显式“复制为新记录”进入对应模块，保留来源版本、原始字段和附件引用。
- 公开 Pages 开放完整本机台账、附件、历史 JSON/快照恢复，以及用户自备会话级 Key 的 OpenAI 兼容 AI；不连接私有 API，显式获取模型或逐次确认前保持零外联。
- 互联网/公开 AI 增加常用服务商预设、本机素材载入、用途选择、可编辑脱敏预览、可读结果和原始响应；内网 AI 复用同一材料工作台并继续只经私有网关。
- RxDB schema 升至 v2，私有同步允许清单扩展为六类业务台账、主草稿和周报；服务端拒绝任意集合名。
- 修复日期逐位编辑与快速连续添加常用项时的状态覆盖问题（即 v0.3.1 用户反馈的“年份无法修改”“常用项被覆盖”），并补充桌面/移动回归测试。
- 附件改为随编辑会话暂存，保存业务记录时才写入本机；取消编辑不再产生孤立附件，解除关联或删除记录后会安全清理不再被其他记录引用的附件，内网同步也只上传同步业务实际引用的附件。
- 六类业务台账和周报删除前新增不可撤销确认；AI 地址、Key、模型、用途或内网地址变化会撤销旧确认状态，修改内网地址同时断开旧会话，避免把旧确认或旧客户端用于新目标；公开、桌面和内网单次材料统一限制为 120,000 字符。
- 重写中文详细使用说明书，覆盖十四个导航模块、字段、保存/删除、安装、迁移、备份、AI、同步、典型流程和故障排查；同步更新三语 README 与文档契约测试。
- 工作区 manifest 已统一升至 `0.4.0`；本机已完成 `pnpm lint`、`pnpm test`、三套 E2E 与 Web/服务端构建，`v0.4.0` 标签将触发 GitHub Actions 构建分版桌面产物并发布 Release。

## v0.3.1

- 修复 v0.3.0 分版 Linux 构建中中文 `productName` 进入 Debian `Package` 字段的问题：桌面产品名改为可移植 ASCII，互联网版/内网版分别显式使用 `hxhwang-gw-internet` 与 `hxhwang-gw-intranet` 包名。
- 新增桌面分版元数据契约测试，锁定 DEB 包名字符集、两版唯一性及显式 `packageName` 配置，避免安装门在构建完成后才发现非法包名。
- Windows 桌面打包对新建 staging 文件的瞬时 `EBUSY` 锁增加最多三次有界重试；其他错误和 Linux 构建仍立即失败，不会掩盖真实打包问题。
- 周报汇总与保存边界改为复用真实四位 ISO 日期校验，除六位年份外也拒绝 `2026-02-30` 等不存在日期，并新增领域回归测试。
- 使用说明书补充模块总览、Windows/Debian 安装及校验、任务/文件编辑删除、主草稿和周报版本语义、备份恢复、关于与设置及常见故障处理。
- 未新增依赖、运行时联网行为或数据库 schema；公开 Pages、互联网版和内网版的数据与密钥边界保持不变。
- Windows x64 两版已在本机完成构建和 8 秒启动冒烟：互联网版 SHA-256 为 `77D9C0203B94E3A6FEB093FE4200B42B7CAB101A2F098CC2BA972B5DAF2D55DE`，内网版为 `28DB6AA0C422DD81454BB77B1112DD24A46132A8FA2F5BB79ECCEFBDCA08ABF3`；两者仍未签名。

## v0.3.0

- GitHub Pages 部署路径改为 `https://nextweb4.github.io/gw/`，Pages 与定时内容同步工作流统一使用 `/gw/` 基址。
- 所有可编辑日期统一限制为真实的四位年份 ISO 日期，并在任务、文件和周报保存边界再次校验。
- 新增交办人、承办人、来源单位及配合单位常用项；任务支持中文状态和基于已录入事实的一键工作小结。
- 写作中心支持在本机导入 DOCX、HTML 和 TXT，HTML 经过标签/属性允许清单清洗；修改后的文稿可保存为本机自定义格式。
- 桌面安装包分为互联网版和内网版。互联网版支持 OpenAI 兼容地址、会话级 API Key、模型发现和逐次脱敏确认；内网版只通过私有网关获取模型并阻断直连公网 AI IPC。
- OpenAI 兼容地址支持根路径、自定义路径和以 `/v1` 结尾的路径，避免重复拼接 `/v1/v1`。
- Release 矩阵扩展为 Windows/Linux、x64/arm64、互联网/内网两个版本，共 12 个安装产物及 `SHA256SUMS.txt`。
- 新增互联网版、内网版、日期、常用项、工作小结、文档导入和自定义格式回归测试，并将使用说明书扩展到全部业务模块。
- 新增运行依赖 Mammoth 1.12.0（BSD-2-Clause）用于 DOCX 到 HTML 转换；转换只在本机按需加载，不增加自动联网。

## v0.2.1

- 修复 390×844 等移动视口中固定底部导航与正文共用可视区域的问题：应用壳固定为动态视口高度，`.main-area` 在导航上方形成独立滚动容器，指标卡、正文和页脚不再滚入导航下方。
- 新增移动 E2E 几何回归断言，要求正文可视区域底边不得越过导航顶边；同时保留页面级无横向溢出检查。
- 使用 `xbrowser` 复核 1440×900 桌面工作台，以及 390×844 的工作台指标、任务抽屉保存操作、写作中心和页脚；移动实测正文区域为 `0..760`，导航为 `770..834`，页面宽度等于 390。
- 未新增依赖、联网行为、数据库变更或 API 变更；Pages 离线与私有 API 边界保持不变。
- Windows x64 本机构建产物 `HxHwang-Gw-0.2.1-x64-setup.exe` 为 100,950,085 字节，SHA-256 `D80844FE1453F89E35218C789A766839CD82E6788C946FC7759D539B67D2827C`；解包程序启动后观察到 4 个进程并全部退出。
- [Pages Actions run 30147717322](https://github.com/NextWeb4/gw/actions/runs/30147717322) 已完成线上部署；[Release Actions run 30148327399](https://github.com/NextWeb4/gw/actions/runs/30148327399) 已完成正式多架构构建、Debian 10/12 四组合启动门和 Release 发布。

## v0.2.0

- 全面重构为原创“动态档案 / 墨迹信号”视觉系统：近黑本地画布、巨型中文编辑式排版、荧光确定性信号、暖白公文纸张与高密度业务面板形成统一层级。
- 新增无障碍树外的 `KineticBackdrop` 指针光场、环形数据轨道、扫描动效和分层入场；`prefers-reduced-motion` 下关闭持续动画，功能不依赖动效才能理解。
- 界面功能图标统一为既有 `lucide-react` 组件，移除界面图片图标与文本感叹号图形；源码扫描未发现表情符号、自绘功能 SVG、图标字体或远程视觉资源。
- 移动端改为八入口底部图标栏，抽屉层级高于导航；390×844 视口无页面级横向溢出，宽表格仅在自身容器滚动。
- MotionSites AI 仅用于观察高对比、巨型排版和密集模块节奏；未复制其作品、品牌、文案、提示词、CSS、页面结构或视觉素材，也未加入内容抓取允许清单。
- 未新增 npm 依赖、运行时网络请求或数据库变更；任务、文件、写作、周报、迁移、同步和导出契约均保持不变。
- Windows x64 本机构建产物 `HxHwang-Gw-0.2.0-x64-setup.exe` 为 100,950,072 字节，SHA-256 `B88546A7874CAB44650E951DF1267E3F587A69C5B8C305764E4B5AE0D3432445`；解包程序启动后观察到 4 个进程并全部退出。[Actions run 30111552737](https://github.com/NextWeb4/gw/actions/runs/30111552737) 已完成正式多架构构建、Debian 10/12 四组合启动门和 Release 发布。

## v0.1.1

- 周报从临时汇总文本升级为独立 `weekly` 记录：支持日期范围、确定性素材汇总、人工编辑、版本保存、快照恢复、显式私有同步及 DOCX/PDF 导出。
- 任务编辑器补齐配合单位、任务阶段和阶段配合单位状态，保存后可完整恢复，不再只迁移但无法编辑。
- 任务和文件附件支持本机下载与解除当前记录关联；旧版会议、外出、用章、物资和周报仍保持只读档案边界。
- 历史档案新增 Skill、配置及 `legacyPayload` 的纯文本只读详情；React 负责转义，不执行历史内容中的 HTML。
- 公开 Pages 禁用历史业务 JSON、真实附件及快照恢复入口；桌面端和内网 Web 保留完整的本机导入流程。
- 未新增 npm 依赖或运行时联网行为；复用现有 RxDB、领域模型、`docx` 和 Electron/浏览器打印能力。
- 本地数据库 schema 升至 v1，并使用 RxDB migration 保留 v0 的任务、文件、附件、草稿、档案和设置，避免新增周报类型破坏现有浏览器数据。
- Windows x64 本机构建产物 `HxHwang-Gw-0.1.1-x64-setup.exe` 为 100,944,547 字节，SHA-256 `E28CA7739CBC6B209BAD60FAD4F8B5AA7922F49DC93DF55940CF296AFB3F5803`；解包程序启动后观察到 4 个进程并全部退出。[Actions run 30106372149](https://github.com/NextWeb4/gw/actions/runs/30106372149) 已完成正式多架构构建、Debian 10/12 四组合启动门和 Release 发布。

## v0.1.0

- 提供 GitHub Pages 本地演示版与 Electron Windows/Debian 打包配置。
- 支持任务、文件、写作、周报、只读历史档案和两版历史 JSON 迁移。
- 支持导出并重新恢复 `hxhwang-gw-local-v1` 本地快照，导入前校验记录类型和负载结构。
- 本地数据写入和快照恢复会拒绝跨业务类型的同 ID 覆盖，并在迁移报告中披露冲突。
- 迁移报告统计任务、会议、文件、外出、用章、物资、周报、Skill 和普通配置；历史两版导出器使用相同版本标识时不伪造来源，改为报告歧义。原导出器遗漏 Skill 时明确警告，另行补充的 Skill 保留原始字段并以只读设置记录落库。
- 历史 IndexedDB Data URL 附件会转换为统一 Base64，校验内容 SHA-256，并汇总任务阶段、配合单位、产出资料和阶段历史中的附件引用。
- 物资模块内嵌在记录中的 Data URL 附件会生成稳定 ID、计算 SHA-256，并关联回只读物资档案。
- 支持 DOCX 导出、Web 打印及 Electron PDF 导出；标题作为独立字段维护，模板标题或旧草稿重复首行不会再次写入导出正文。
- 已保存草稿在页面重载后会重新同步到 Tiptap，标题、模板正文和版本不会停留在默认初始内容。
- 写作中心支持检索已授权模板；商业参考站只记录产品审计，不进入知识包或抓取清单。
- 公共权威来源及精确授权 URL 支持安全元数据同步：逐跳校验 HTTPS、允许范围、响应类型、2 MB 上限、结构与 SHA-256；每周 Actions 仅在来源变化时提交生成元数据并在同一工作流更新 Pages，不覆盖人工模板。
- GitHub Pages 不连接私有 API、AI 或公共 CDN，并提供首次访问后的离线缓存。
- 新增独立内网 Web 构建；内网 Web 与桌面端支持显式会话、基于主版本的任务/文件/草稿同步、附件传输及逐次脱敏确认 AI。
- 私有同步基址拒绝内嵌凭据，所有请求禁止自动跟随重定向，避免会话头离开用户明确配置的服务。
- 公开 Pages 明示数据仅保存在本机；桌面与内网模式改为明示本机存储和手动同步边界，避免把可选私有同步误写成本机独占。
- Pages 与内网 Web 分别输出到 `dist/` 和 `dist-intranet/`，避免并行构建或测试时互相覆盖运行模式。
- 新增 PWA manifest、原创品牌 SVG、Web PNG 与 Electron ICO/PNG；打包前自动验证尺寸与 ICO 结构。
- 授权资料新增范围、版本、版权归属和证据状态元数据，构建前校验知识包引用。
- 浏览器 CSP 限制脚本、连接、对象和表单来源；正式防嵌入策略需由支持自定义响应头的托管层提供，Pages 仅用于脱敏演示。
- Electron 打包前会校验 Web 资源均使用 `file://` 可加载的相对路径，避免桌面端空白窗口。
- Electron 打包后忽略 `HXHWANG_WEB_URL`，未打包开发模式也只接受本机 HTTP 地址；安全策略模块进入应用包，测试文件不进入运行包。
- Windows 10/11 x64 与 arm64 安装包已在 Windows 构建并嵌入品牌图标；Actions run [`30093256097`](https://github.com/NextWeb4/gw/actions/runs/30093256097) 又构建了 Windows/Linux x64、arm64 四类 artifact，并通过 Debian 10/12 的 x64/arm64 四组合安装启动门。
- DEB 保留 electron-builder 默认运行依赖并补充 `libasound2`、`libgbm1`；Docker smoke 只在 CI 启动命令中使用 `--no-sandbox`，生产 Electron 仍保持 renderer sandbox、context isolation 和禁用 Node integration。
- 当前 Windows 安装包未做 Authenticode 签名，只适合内部演示；正式分发前需补充代码签名证书。

## GitHub Release

### v0.3.1

- [v0.3.1](https://github.com/NextWeb4/gw/releases/tag/v0.3.1) 已正式发布，不是草稿或预发布版本；标签指向提交 `7d0d936a9a8d6b7c8fb812a8b69b9cb9f722372b`。
- [Release Actions run 30165346085](https://github.com/NextWeb4/gw/actions/runs/30165346085) 的 18 个任务全部成功：8 个 Windows/Linux × x64/arm64 × internet/intranet 构建、8 个 Debian 10/12 分版安装启动门、验证和发布任务均通过。
- Release 共包含十三个资产：下列十二个安装文件及 [`SHA256SUMS.txt`](https://github.com/NextWeb4/gw/releases/download/v0.3.1/SHA256SUMS.txt)。十三个下载地址均返回 HTTP 200，清单的十二条 SHA-256 与 GitHub 资产摘要逐项一致。
- [Pages Actions run 30165295284](https://github.com/NextWeb4/gw/actions/runs/30165295284) 已将 v0.3.1 部署到 [https://nextweb4.github.io/gw/](https://nextweb4.github.io/gw/)。

| Release 资产 | SHA-256 |
| --- | --- |
| `HxHwang-Gw-0.3.1-internet-amd64.deb` | `0137dbe8258ad079bf75dac09bc572dc77112dfa2fd7944720f05e26fb79ea18` |
| `HxHwang-Gw-0.3.1-internet-arm64-setup.exe` | `c3737fcb014c6c126401f9c4b79e72167f9949e839a3ca6685b217c746aebfdf` |
| `HxHwang-Gw-0.3.1-internet-arm64.AppImage` | `d44b9828af02e48724cac35d13c4cc6c799ea171b923fe8548116919a9968e43` |
| `HxHwang-Gw-0.3.1-internet-arm64.deb` | `2f42ae3d7be2223693b836255abf654a76fae844a93a0f37450c62a381231b85` |
| `HxHwang-Gw-0.3.1-internet-x64-setup.exe` | `e74da73bc55aaa2db3ab0d61876b71ab01f50288079e666f8284923dd43017f3` |
| `HxHwang-Gw-0.3.1-internet-x86_64.AppImage` | `4f63050f18b792a7e76e283dd2bde2739d2a8cd3ebbe570399b5605fca28f823` |
| `HxHwang-Gw-0.3.1-intranet-amd64.deb` | `24d3ca7a8bfab5b7ded5c99f4f98d6395b0c4f81607353502f590585026d1829` |
| `HxHwang-Gw-0.3.1-intranet-arm64-setup.exe` | `3e4b146fc872826ee97239a3960e237215f9237aa7cd2e9a63e3a7be93a78c86` |
| `HxHwang-Gw-0.3.1-intranet-arm64.AppImage` | `482111dde4bb7f82ad9aa3064826037395d3bdc69a9799f3c5316ba61b842e2a` |
| `HxHwang-Gw-0.3.1-intranet-arm64.deb` | `702ead8236bc260b0c0890129becd309c35e8e1cd2f261cfcd48a0405cf9a2b3` |
| `HxHwang-Gw-0.3.1-intranet-x64-setup.exe` | `1972188cf793fb72d39669934ef4ca49cd7788f9b585396984b9dfb977c298bf` |
| `HxHwang-Gw-0.3.1-intranet-x86_64.AppImage` | `b2bc76992b0ac346ee2d7a4eda5d3d7f5a2d4f77154d1f02842977c656c9cfd5` |

### v0.2.1

- [v0.2.1](https://github.com/NextWeb4/gw/releases/tag/v0.2.1) 已正式发布，不是草稿或预发布版本；标签指向提交 `a46de79a74b0c2b75363e76a1fb20d2457b335f6`。
- [Release Actions run 30148327399](https://github.com/NextWeb4/gw/actions/runs/30148327399) 已成功完成 Windows/Linux x64、arm64 构建、Debian 10/12 四组合启动门、校验清单生成和 Release 发布。
- Release 共包含七个资产：下列六个安装文件及 [`SHA256SUMS.txt`](https://github.com/NextWeb4/gw/releases/download/v0.2.1/SHA256SUMS.txt)。七个下载地址均返回 HTTP 200，清单中的六个 SHA-256 均与 GitHub 对应资产摘要一致。

| Release 资产 | SHA-256 |
| --- | --- |
| `HxHwang-Gw-0.2.1-amd64.deb` | `46cacbfb5a2726e3b82626fb6aced87c5d579ac23a87f89ea81626b98eb8c6d8` |
| `HxHwang-Gw-0.2.1-arm64-setup.exe` | `aa0eceb58fa93221a5cab7303bd82e8ad9695e55b7067ccb7648fa1e00388665` |
| `HxHwang-Gw-0.2.1-arm64.AppImage` | `e05965cbdf28ec79bc9ec42b1e0b6509fbb141b7269f1adb44e216c29d748f87` |
| `HxHwang-Gw-0.2.1-arm64.deb` | `b336398c72c3e65f7d4ce4b7c761898603c3dc76ed3202fee11a9a084007a998` |
| `HxHwang-Gw-0.2.1-x64-setup.exe` | `37ceeb7bc04812000247c484b6a641c9078a68286f1b41596c9b3289f497fcda` |
| `HxHwang-Gw-0.2.1-x86_64.AppImage` | `4e45d286dea733b38a4ed10d6ba9422c696f4f1d07ff562aa59dc1a326c267e9` |

### v0.2.0

- [v0.2.0](https://github.com/NextWeb4/gw/releases/tag/v0.2.0) 已正式发布，不是草稿或预发布版本；标签指向提交 `8c47de23366579b8140b03c63766c24ca1098ed0`。
- [Release Actions run 30111552737](https://github.com/NextWeb4/gw/actions/runs/30111552737) 已成功完成 Windows/Linux x64、arm64 构建、Debian 10/12 四组合启动门、校验清单生成和 Release 发布。
- Release 共包含七个资产：下列六个安装文件及 [`SHA256SUMS.txt`](https://github.com/NextWeb4/gw/releases/download/v0.2.0/SHA256SUMS.txt)。清单中的六个 SHA-256 均与 GitHub 对应资产摘要一致。

| Release 资产 | SHA-256 |
| --- | --- |
| `HxHwang-Gw-0.2.0-amd64.deb` | `dd07fd471c7a5a55b6352b7bacc3c20fb47e0f364ac6a6f2968386300e87ca1f` |
| `HxHwang-Gw-0.2.0-arm64-setup.exe` | `1ff127265218e65ad8802879b666dbacf50237245961232194193423aa66edf7` |
| `HxHwang-Gw-0.2.0-arm64.AppImage` | `435622aede13ba3718a1f0d0c059fd7cf9df2553d9c12e134f4fd8bc79aac5d5` |
| `HxHwang-Gw-0.2.0-arm64.deb` | `c4df9a7765510aee8d7cfa658aac9fd7dd42e42ff9244e307e92f518ac41c08c` |
| `HxHwang-Gw-0.2.0-x64-setup.exe` | `c1a1983de7805df7ec431c6128704fd9da4a39cd14b19f30d583b7e4b13a303e` |
| `HxHwang-Gw-0.2.0-x86_64.AppImage` | `1ad30d39aa9c36480ae9e79524efb29d218731ed30983b57bfb6891af015e13e` |

### v0.1.1

- [v0.1.1](https://github.com/NextWeb4/gw/releases/tag/v0.1.1) 已正式发布，不是草稿或预发布版本；标签指向提交 `bf23352bf632e431ee1c2b9f343eb7310a9509ce`。
- [Release Actions run 30106372149](https://github.com/NextWeb4/gw/actions/runs/30106372149) 已成功完成 Windows/Linux x64、arm64 构建、Debian 10/12 四组合启动门、校验清单生成和 Release 发布。
- Release 共包含七个资产：下列六个安装文件及 [`SHA256SUMS.txt`](https://github.com/NextWeb4/gw/releases/download/v0.1.1/SHA256SUMS.txt)。清单中的六个 SHA-256 均与 GitHub 对应资产摘要一致。

| Release 资产 | SHA-256 |
| --- | --- |
| `HxHwang-Gw-0.1.1-amd64.deb` | `c46dbe26d321af554658c4daaf3d258d3b34b057c219a1e5b15215b4527e1d5d` |
| `HxHwang-Gw-0.1.1-arm64-setup.exe` | `b66f7fc9095d9dc52c4d678683ae59df479b8588205b1932fdb8345035161420` |
| `HxHwang-Gw-0.1.1-arm64.AppImage` | `0af76a4f4d2dcd7a32f520740d74512cc56e3f51558adb30056634d1e3d2a2c8` |
| `HxHwang-Gw-0.1.1-arm64.deb` | `4476d926dc2a9fac65bb7eb848f13d33291f1f19d8d19e6d7bc3c271332ac572` |
| `HxHwang-Gw-0.1.1-x64-setup.exe` | `cd02490d05b41c40679c65a532ebd883a7cd4271215bb09c10fae750f235b671` |
| `HxHwang-Gw-0.1.1-x86_64.AppImage` | `0e42e08f8f62a94915094e08864dd60f99a4fea3bf1aeec74dbbb85872bec461` |

### v0.1.0

- [v0.1.0](https://github.com/NextWeb4/gw/releases/tag/v0.1.0) 已正式发布，不是草稿或预发布版本；标签指向提交 `de69d1bf8dc7c9e9bebbcece8b9950b12483f819`。
- [Release Actions run 30094346043](https://github.com/NextWeb4/gw/actions/runs/30094346043) 已成功完成 Windows/Linux x64、arm64 构建、Debian 10/12 四组合启动门、校验清单生成和 Release 发布。
- Release 共包含七个资产：下列六个安装文件及 [`SHA256SUMS.txt`](https://github.com/NextWeb4/gw/releases/download/v0.1.0/SHA256SUMS.txt)。清单中的六个 SHA-256 均与 GitHub 对应资产摘要一致。

| Release 资产 | SHA-256 |
| --- | --- |
| `HxHwang-Gw-0.1.0-amd64.deb` | `6185b8402c60501bec12efa9413630e4af245fd423aed9974b14736cea62ad70` |
| `HxHwang-Gw-0.1.0-arm64-setup.exe` | `f3a7ee53898f4c902dba8c3233a43c2f23f72eb0b2b6938e73d937b3c0e82528` |
| `HxHwang-Gw-0.1.0-arm64.AppImage` | `1df6fcdf2a33b3f2ba09f1c3d3e82c82c07133a683f4ca9801bf4ed15c6c980a` |
| `HxHwang-Gw-0.1.0-arm64.deb` | `a37d7b1c7ab5d7b9a4df7b721f40b936b9612133e85d0adabb47a9e39b054d88` |
| `HxHwang-Gw-0.1.0-x64-setup.exe` | `ba978a81105602a6a69a59db28871caf340baefba25cb2ace31fc3cd14035af6` |
| `HxHwang-Gw-0.1.0-x86_64.AppImage` | `ed2b18a80b3f6f061a302493f9d53b1fceae96d6bb2e4a6b3c0ce390f77e88f2` |

## 本机 Windows 构建产物（非 Release 资产）

- `HxHwang-Gw-0.1.0-x64-setup.exe`：100,887,834 字节；SHA-256 `B39A27E1370ED82C6BB1FF11D4CA1086DF4104ABDF1593653A55B26769230360`；包含开发地址加固及本次文档/迁移修复，x64 解包版已在当前 Windows 环境完成启动冒烟。
- `HxHwang-Gw-0.1.0-arm64-setup.exe`：93,557,443 字节；SHA-256 `C014513CBB17E5C1D04D849BC8C1974068208F2E36D632B96C6ED8BCC276DC4B`；包含相同修复，尚未在 Windows arm64 设备启动。
- 两个安装包的 Authenticode 状态均为 `NotSigned`，不得作为已签名正式发行物分发。

作者：HaoXiangHwang  
邮箱：Rays688888@Gmail.com  
网站：https://nextweb4.github.io/  
版权：Copyright (c) 2026 HaoXiangHwang. All rights reserved.
