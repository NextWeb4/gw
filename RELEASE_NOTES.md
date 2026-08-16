# HxHwang Gw 发布说明

## v0.7.18

- 跨模块访问轨迹新增“访问轨迹列表”按钮。菜单只从当前 React 会话的最多 20 条 `{tab,id}` 历史派生，可用键盘 Home/End/上下键和触控直接跳转；选中项使用 `aria-selected`，Escape/外侧点击关闭并恢复焦点，移动端菜单与固定底栏保持间距。
- 直接跳转只移动历史 cursor，并沿用 `jumpRecordVisitHistory` 与 `openBusinessRecord(..., false)`；不创建新历史、不截断 forward、不改写 active 记录，也不进入 IndexedDB、local/sessionStorage、快照、同步、AI、API、IPC、URL 或网络。
- 新增领域跳转/失效目标测试、UI 合约和桌面/移动聚焦 E2E。当前本机门禁：客户端测试 34 项、UI 合约 21/21、主 E2E 97 通过/11 条件跳过、互联网/内网构建通过，公开/互联网/内网 Web 构建均成功；聚焦菜单 E2E 桌面/移动 2/2 通过，`git diff --check` 通过。
- 本节记录的是待发布的 `v0.7.18` 变更；Pages、Desktop Actions、Release 与线上入口需在版本提交和 tag 完成后回填，不把本机构建误报为已发布。

## v0.7.17

- 六类业务详情新增跨模块记录后退/前进。任务—文件关联、周报来源、事务日历、工作台、星标和全局查找等入口继续复用既有 `openBusinessRecord`；历史按钮只移动游标，并以 `rememberVisit=false` 回到同一记录打开链路，不新增第二套详情、编辑或保存路径。
- 历史是最多 20 条的 React 会话状态，只保存 `{ tab, id }`。连续打开当前记录不重复；后退后打开其他记录会截断 forward 分支，而停留在当前记录不会误删已有 forward；刷新即清空，自动展示的首条详情也不会冒充一次显式访问。
- soft-delete 或 purge 会从历史中裁剪失效目标并保持可用游标；恢复记录不会自动重入历史，只有再次显式打开才会记录。该状态不进入 IndexedDB、`localStorage`、`sessionStorage`、快照、私有同步、AI、API、IPC、URL、日志或网络请求。
- 共享详情栏使用 Lucide 后退/前进图标，禁用态真实反映边界；可用按钮的无障碍名称同时包含目标模块和标题。390px 窄屏下两个按钮均保持至少 44×44px，并继续使用既有固定底栏与详情布局。
- Visual Studio Code `c780ea96132b1cabf170a454aced493d8317eee7`、TriliumNext `589af5ee3a1ff6e07a540afd83df383a39e8ec90` 与 AFFiNE `42322d13fe2063fc0891f986110900a40ac1de29` 仅用于核验历史边界、删除目标裁剪和当前位置同步原则；没有复制外部源码、界面、文案或业务数据，也没有新增依赖。
- 失败优先阶段分别观察到纯函数模块缺失、UI 未接线和 Chromium 找不到控件的预期失败。独立 review 又复现并修复一项 P2：删除当前历史目标后虽然游标已裁剪，但原页面没有打开存活目标，导致详情与历史控件不可达；现在会以 `rememberVisit=false` 通过原 opener 自动打开最近存活记录。删除 forward、快速连续双后退/双前进、自动首条详情隔离和当前目标删除后的 `1 / 1` 边界均已验证。
- 最终 `pnpm lint`、`pnpm format:check`、177 项单元/契约、主 E2E 95 通过/11 条件跳过、互联网 7/7、内网 3/3；历史聚焦桌面/移动 4/4。三类 Web 构建为 25/15/15 文件，分别命中 `0.7.17` 十次且旧版本/秘密模式为 0，公开/互联网/内网 source map 为 10/0/0。Windows x64 互联网/内网安装器为 100,015,919 / 100,015,835 字节，SHA-256 为 `D46CC9E3416B412A26ED83AE6287938A29D3B819D752A27D622D9E73D3725521` / `883F3136B02EB8DCD76C98DA2FCCA49982608661B173A7E40EBB80079F785556`，均未签名且解包主进程持续运行 8 秒。真实 Chromium 151 在 1440×900 与 390×844 完成任务→文件→后退，移动按钮约 47×47 / 44×44px，版本为 `0.7.17`，零动作请求、外联、HTTP/console/page 错误及页面级横向溢出。
- 功能提交 `c73648f862f668bc9a89bbd3bbf7f068f36478ac` 已推送到 `main`，annotated tag `v0.7.17` 的 tag object 为 `1e1507079d7b39e07eb3420cbf5548fd76b1078f`；[Pages run 31933799727](https://github.com/NextWeb4/gw/actions/runs/31933799727) 的 build/deploy 成功，[Desktop run 31933801066](https://github.com/NextWeb4/gw/actions/runs/31933801066) 的 18/18 个 job 成功，含 Debian 10/12 amd64/arm64 八项启动门。[Release v0.7.17](https://github.com/NextWeb4/gw/releases/tag/v0.7.17) 非 draft/prerelease，13 个资产最终均 HTTP 200 且长度匹配；`SHA256SUMS.txt` 为 1,278 字节、12 条唯一记录，SHA-256 为 `bb258b1bad210dce7d37b75caa9f22314d7288e3d42dec748e51b116992d34f4`。
- 无缓存线上复核取得入口 `index-CrAc5XeG.js`（352,171 字节，SHA-256 `9fbfcfe1bfa5b5f572dfff90ab3a2d7926e44dc4493197cc2313877f365385a1`），`0.7.17`/`0.7.16`/`0.3.1` 命中 `10/0/0`，指定密码 `886680` 与 PEM 私钥标记为 0。`/gw/sw.js` 已 activated、无 waiting/installing，预缓存 13 项；离线 reload 仍显示 `0.7.17` 且无 page error。线上同源 localStorage 仅有其他站点遗留键，历史键命中为 0。

## v0.7.16

- 六类业务详情新增统一的本机星标开关，工作台用“星标记录”替代原装饰性写作卡，空查询命令面板在“最近访问”之前显示 active 星标；点击两处入口都复用 `openBusinessRecord`，不改变台账筛选、排序、CSV、业务编辑器或保存路径。
- 星标使用一个固定 `setting` 聚合记录，最多 12 条，只保存 `kind/id/starredAt`。直接写入和快照恢复共用严格规范化，未知模块、空或超长 ID、无效时间、重复项及标题、备注、API Key 等额外字段不会落盘；达到上限明确提示，不静默淘汰。
- 软删除后星标暂时隐藏并随恢复重新出现；永久删除或远端 purge 后清理引用。星标进入 IndexedDB 与本地快照，但不加入私有同步、业务 payload、全局搜索索引、AI 材料、API、IPC 或网络请求。
- 独立 review 发现并修复三项 P2：迟到 `reload()` 覆盖新星标、快照导出抢在排队写入前、损坏 setting 导出回退原 payload。最终 lint/format、171 项单元/契约、主 E2E 90 通过/11 条件跳过、互联网 7/7、内网 3/3；星标生命周期与快照聚焦桌面/移动 4/4、确认框监听修复后聚焦 1/1。三类 Web 构建为 25/15/15 文件，各命中 `0.7.16` 10 次，`0.7.15`、`0.3.1`、指定中转密码、私钥与常见长格式 Key/PAT 模式为 0；互联网/内网 source map 为 0。Windows x64 互联网/内网安装器分别为 100,014,793 / 100,014,852 字节，SHA-256 `B6822678268A1DB87723EBA04A069BE90DC2451722D8AB7185B07E31330403C2` / `35D6854D30E2532598AD3280578E852723B5A2E87EFE429E862C6D6E528BE913`，均未签名。1440×900 / 390×844 Chromium 验收中，移动星标按钮约 47×47px、记录行 64px、命令项 62px，刷新持久化、零 localStorage、零外联/错误/横向溢出全部通过。
- 功能提交 `9978cae3ea7c5b3eccd6e624e884f154931672b5` 与 annotated tag `v0.7.16` 已推送。[Pages run 31181676120](https://github.com/NextWeb4/gw/actions/runs/31181676120) 的 2/2 个 job 成功，[Desktop run 31181699608](https://github.com/NextWeb4/gw/actions/runs/31181699608) 的 18/18 个 job 成功。线上 Pages HTTP 200，入口 `index-DnWHV0uw.js` 为 348,564 字节并命中 `0.7.16` 10 次，`0.7.15`、`0.3.1` 与秘密模式均为 0；service worker 已激活并预缓存当前 bundle，真实 Chromium 离线重载仍显示 `0.7.16`。桌面 1440×900 与移动 390×844 均通过星标、刷新、软删隐藏、恢复重现和 purge 清理，移动按钮 44×44px，零外联、请求/运行错误及横向溢出。[Release v0.7.16](https://github.com/NextWeb4/gw/releases/tag/v0.7.16) 的 12 个安装包与 `SHA256SUMS.txt` 共 13 个地址全部最终 HTTP 200、非空且长度匹配；1,278 字节清单含 12 条唯一记录，精确覆盖安装资产并全部匹配 GitHub SHA-256 digest。

## v0.7.15

- 修复原生“快速记录”和“版本历史”对话框误复用命令面板横向居中动画的问题。命令面板继续使用 `left: 50% + translateX(-50%)`，原生 `<dialog>` 改用独立的纵向位移/缩放动画，打开全过程不再瞬时越出 390px 视口。
- UI 合约新增原生对话框动画边界：两类原生 dialog 必须使用 `native-dialog-in`，禁止重新绑定含 `translateX(-50%)` 的 `command-dialog-in`。本机 lint、format、161 项单元/契约、主 E2E 89 通过/11 条件跳过、互联网 7/7、内网 3/3 与三类 Web 构建全部通过；390×844 版本历史聚焦 E2E 1/1 通过。公开/互联网/内网产物分别为 25/15/15 文件，各命中 `0.7.15` 10 次且旧版本、指定中转密码、私钥和常见长格式 Key/PAT 模式为 0。
- Windows x64 互联网版与内网版安装包已生成：互联网版 100,013,025 字节，SHA-256 `67E64011451805EBC255AD272D90027683DF71F4BCD79F4ACCAF769A245798A3`；内网版 100,013,049 字节，SHA-256 `E3E744395213EF9A290700746158C96A8BEC3C30A42587425D2E9341E97EB9B5`。两者均未做 Authenticode 签名；正式多架构产物由下述 Actions Release 验证。
- 不新增领域字段、持久化、同步、AI、API、IPC、依赖或网络请求；`v0.7.14` 的周报来源、三栏详情、Release 资产与历史证据保持不变。
- 功能提交 `0f3e30a20c5d0dde22631272f93bd3374443aafa` 与 annotated tag `v0.7.15` 已推送。[Pages run 31173295538](https://github.com/NextWeb4/gw/actions/runs/31173295538) 成功；[Desktop run 31173294884](https://github.com/NextWeb4/gw/actions/runs/31173294884) 的 18/18 个 job 全部成功。线上 Pages HTTP 200，内容哈希入口 bundle 为 341,324 字节，命中 `0.7.15` 10 次，`0.7.14` 与 `0.3.1` 均为 0；CSS 明确包含一份 `native-dialog-in`，快速记录/版本历史各绑定一次且该动画无 `translateX`。线上 Chromium 以 1440×900 和 390×844 采样四次 dialog 入场共 416 帧，横向越界为 0；移动左右各保留 10px，版本历史距固定底栏 20px，两端均零动作请求、零外联、零错误。[Release v0.7.15](https://github.com/NextWeb4/gw/releases/tag/v0.7.15) 的 12 个安装包与 `SHA256SUMS.txt` 共 13 个地址全部 HTTP 200 且长度精确匹配元数据；1,278 字节清单含 12 条唯一记录，精确覆盖安装资产并匹配 GitHub digest。

## v0.7.14

- 周报编辑页新增“来源记录”只读面板。它复用周报已有的六类来源 ID，按周报保存顺序解析当前 active 任务、文件、会议、外出、用章和物资；回收站、永久删除、缺失或不在本机的记录只显示不可用数量，不会写回周报或创建关系表。
- 来源按钮复用既有 `openBusinessRecord`，会先清除目标台账的会话筛选/排序，再进入原只读详情；周报存在未保存标题、正文、日期、来源或恢复工作副本时，离开前使用统一确认，取消会保留编辑状态。
- 桌面详情栏可在当前 React 会话内收起为 `54px` 图标轨道，展开后继续显示同一条记录；移动端始终保留完整详情，避免与固定底栏和窄屏返回路径冲突。任务/文件列表摘要同步显示当前 active 关联数量，关系数量由共享领域函数派生，不新增持久化字段。
- 新增周报来源领域测试、active/trash/purged 生命周期断言、UI 合约和 Chromium 1440×900 / 390×844 E2E；本功能未新增 IndexedDB、同步集合、服务端路由、Electron IPC、网络请求、AI 材料或敏感字段路径。
- 本机 `pnpm lint`、`pnpm format:check`、160 项单元/契约、主 E2E 89 通过/11 条件跳过、互联网 7/7、内网 3/3 与三类 Web 构建全部通过；Windows x64 互联网/内网安装包均成功生成。三类 Web 产物分别为 25/15/15 文件，均命中 `0.7.14` 10 次且旧版本、私钥和常见长格式 Key/PAT 模式为 0。私有服务 lint/格式/build 和 34 项集成测试通过，2 项 PostgreSQL 用例因未提供 `DATABASE_URL` 跳过，因此不声称真实 PostgreSQL 已验证。
- 功能提交 `5e112b9b2351ad13fa1f143efc3d9e087d57cd14` 与 annotated tag `v0.7.14` 已推送。[Pages run 31168071623](https://github.com/NextWeb4/gw/actions/runs/31168071623) 成功；[Desktop run 31168073550](https://github.com/NextWeb4/gw/actions/runs/31168073550) 绑定同一功能 SHA，18/18 个 job 全部成功。线上 Pages HTTP 200，内容哈希入口 bundle 为 341,324 字节，命中 `0.7.14` 10 次，`0.7.13` 与 `0.3.1` 均为 0。[Release v0.7.14](https://github.com/NextWeb4/gw/releases/tag/v0.7.14) 的 12 个安装包和 `SHA256SUMS.txt` 共 13 个地址全部 HTTP 200 且非空；1,278 字节校验文件含 12 条唯一记录，并精确覆盖全部安装资产。线上桌面/移动完整流程通过未保存确认取消/接受和原任务详情跳转；桌面详情宽度为 390→54→390px，移动来源按钮为 320×44px 且不显示收起入口，两端均零动作请求、零外联、零错误且无横向溢出。

## v0.7.13

- 公文写作主草稿和每一份已保存周报共用新的 `DocumentRevision` 领域合同。只有点击各页面原“保存版本”才会在主记录成功写入后创建完整历史快照；输入、导入、套用格式、AI 结果、查看历史和恢复均不会自动新增历史或网络请求。
- 历史使用既有本机 `setting` 存储和快照导出/恢复路径，不新增 RxDB schema、`Kind`、依赖、私有 API、同步集合或 Electron IPC。单条完整序列化快照最多 1,000,000 字符，每目标最多 20 条，全局最多 100 条且总内容最多 10,000,000 字符；裁剪按保存时间和 opaque ID 稳定移除最旧记录，不修改输入数组。
- 新的共享原生对话框按新到旧列出历史，并以纯文本并排展示“当前内容 / 该版本内容”。它不使用 `dangerouslySetInnerHTML`，支持键盘选择、Escape、外侧关闭、关闭回焦、删除单条和清空当前目标历史；当前保存版不可单独删除。390×844 下列表与对比区纵向排列，操作目标提高到 46px，并避开固定底栏。
- 恢复是非破坏性的：历史内容只载入原主草稿或周报编辑器，保留当前记录 ID、当前版本号和既有历史，工具栏持续显示“未保存工作副本 · 来自 vN”。刷新会回到恢复前的已保存 head；只有再次点击原“保存版本”才会形成更高版本，没有第二套保存逻辑。
- 主草稿和周报保存新增忙碌态，阻止重复提交并保留上一条已保存状态。保存后只局部更新草稿、周报和历史列表，不再调用会覆盖未保存主草稿的全局 `reload()`；周报删除取消或失败也不会再清空当前编辑态，确认删除时同步清理该 report ID 的本机历史。
- 本地适配器新增 `getRecordOfKind`，draft/weekly 外层 ID 必须与 payload ID 一致；revision 还必须同时满足外层/负载 ID、目标类型、target/snapshot ID、version、时间戳和字段白名单一致。所有写删操作进入同一 mutation 队列，消除不同同步集合首次写入同一裸 ID 的跨 kind TOCTOU；快照导入先预检全部现有 ID 冲突，冲突时零写入，再按共享上限裁剪历史。
- 历史只进入当前设备本地快照，明确排除于私有同步、全局查找、AI 工作区与材料、附件正文、Cookie、localStorage、日志和 URL。历史对话框打开时，全局查找、快速记录和当前页 AI overlay 互斥；保存、查看、恢复和删除历史均保持零外联。
- Joplin Note History（AGPL-3.0-or-later）、BookStack Page Revisions（MIT）和 MediaWiki Page History（GPL）只用于核验“有界保留、只读旧版查看、恢复不抹除后续历史”的成熟逻辑。项目没有复制其源码、界面、文案、视觉、权限模型或业务数据，也没有引入相应依赖。
- 失败优先阶段先观察到领域 3 项、本地数据 1 项和 UI 合约 1 项预期失败。实现后的聚焦证据包括领域 38/38、本地数据 16/16、Web 单测 26/26、UI 合约 18/18，以及 Chromium 草稿完整恢复、周报历史隔离/删除取消、390×844 几何与回焦 3/3；完整发布门禁与线上结果以交付验证矩阵的最终记录为准。
- 功能提交 `c20d6d8` 与 annotated tag `v0.7.13` 已推送。[Pages run 31012942815](https://github.com/NextWeb4/gw/actions/runs/31012942815) 和 [Desktop run 31012983644](https://github.com/NextWeb4/gw/actions/runs/31012983644) 均绑定完整 SHA `c20d6d88e92dbb2efe5b25477311585afee4d35a` 并成功；Windows/Linux 四组分版构建与 Debian 10/12 八项安装启动门全部通过。线上 Pages HTTP 200，入口 `index-Dn0go3Cf.js` 为 336,507 字节并命中 `0.7.13` 10 次，`0.7.12`、`0.3.1` 与秘密模式为 0；桌面/移动真实 Chromium 完整版本历史流程零动作请求、零外联、零控制台/页面错误且无横向溢出。[Release v0.7.13](https://github.com/NextWeb4/gw/releases/tag/v0.7.13) 的 12 个安装包和 `SHA256SUMS.txt` 共 13 个公开地址全部 HTTP 200 且非空；1,278 字节清单含 12 条有效记录，SHA-256 与文件名均唯一并精确覆盖安装资产。

## v0.7.12

- 写作中心的“本机自定义”格式新增行内重命名与确认删除。管理入口只出现在 `CustomWritingTemplate` 行；官方规范、单位模板和授权教材建议等知识包格式继续只读，不允许改名、覆盖或删除。
- 领域层新增 `renameCustomWritingTemplate`：名称先去除首尾空白，不能为空且最多 80 个字符；成功时只更新 `name` 与 `updatedAt`，模板 ID、正文 HTML/纯文本、结构、文种、创建时间和来源字段保持不变。
- 重命名继续覆盖原 `custom-template:${template.id}` setting 记录，删除通过 `removeRecordOfKind('setting', ...)` 核对真实类型后移除同一 setting；快照解析会跳过外层 setting ID 与 payload 模板 ID 不一致的异常记录，避免错配身份跨类型删除。快照因而保留稳定模板身份并反映真实删除，不新增数据库 schema、同步集合、私有 API、Electron IPC、后台任务或网络请求。
- 重命名输入支持 Enter 保存，Escape 在输入框、保存或取消图标聚焦时都能放弃，显式取消同样不写入；取消后焦点返回原铅笔按钮。成功后搜索词切换为新名称，格式不会因旧筛选突然消失。删除必须经过明确确认，取消确认不产生写入；成功后清除失效筛选并把焦点返回模板搜索框。
- 删除当前正在套用的自定义格式时，只清空当前 React 草稿中的弱模板引用；当前标题、正文、文种、版本和已保存文稿均不改变。删除不会进入六类业务回收站，也不会反向修改由该格式创建的既有文稿。
- LibreOffice Template Manager（MPL-2.0）、BookStack Page Templates（MIT）和 Joplin Templates plugin（MIT）仅用于核验“内置模板只读、用户模板使用既有生命周期、套用后文稿不反向联动”的成熟行为；未复制外部源码、界面、文案、模板、视觉或业务数据，也未新增第三方依赖。
- 失败优先阶段先观察到领域 2 项、UI 合约 1 项和聚焦 Chromium 1 项预期失败。独立审查随后复现并修复三项缺陷：全局 `reload()` 覆盖未保存文稿、焦点位于图标时 Escape 无效、错配快照身份可能触发跨类型删除；格式新增、重命名和删除现在只局部更新模板列表，当前未保存标题、正文和版本均保持不变。
- 最终本机 `pnpm lint`、`pnpm format:check`、148 项单元/契约、主 E2E 84 通过/8 条件跳过、互联网 7/7、内网 3/3、`pnpm build`、`pnpm build:web:internet` 与 `pnpm build:web:intranet` 全部通过。独立 Playwright 在 1440×900 与 390×844 验证桌面 222px 模板栏、移动 44×44px 管理按钮、未保存文稿保持、键盘取消、零动作请求、零外联、零控制台/页面错误及无横向溢出；三类构建分别为 25/15/15 个文件，均命中 `0.7.12` 10 次且旧版本、指定六位密码、私钥、常见长格式 Key/PAT 为 0。Pages 与 Release 线上结果以交付验证矩阵的最终记录为准。
- 功能提交 `13593bc` 与 annotated tag `v0.7.12` 已推送。[Pages run 30907443436](https://github.com/NextWeb4/gw/actions/runs/30907443436) 和 [Desktop run 30907478733](https://github.com/NextWeb4/gw/actions/runs/30907478733) 均绑定完整 SHA `13593bc2a01f4b359c9fa78c728e66c413a4b8e4` 并成功；Windows/Linux 四组打包与 Debian 10/12 八项安装启动门禁全部通过。线上 Pages HTTP 200，入口 `index-DCwF7eYM.js` 为 321,440 字节并命中 `0.7.12` 10 次、旧版本与秘密模式 0 次；桌面/移动真实 Chromium 完整管理流程继续零请求、零错误、无溢出。[Release v0.7.12](https://github.com/NextWeb4/gw/releases/tag/v0.7.12) 的 12 个安装包和 `SHA256SUMS.txt` 共 13 个公开地址全部 HTTP 200 且非空；1278 字节校验文件含 12 条有效记录，哈希和文件名均唯一并精确覆盖安装资产。

## v0.7.11

- 文件编辑抽屉新增可折叠“关联任务”。它只消费 App 已加载的 active 任务数组，支持按任务名称、类目、来源、交办人或截止日期做本地筛选，并使用原生复选框选择多个任务。关系变化继续进入既有未保存守卫，取消、关闭、外侧点击、Escape 与离开页面统一保护；只有点击原“保存文件”才持久化，不新增“保存关联”或第二套编辑器。
- 领域模型只在 `OfficialDocument.relatedTaskIds` 保存任务 ID，任务不保存反向字段。`normalizeRelatedRecordIds` 对不可信快照/同步输入过滤非字符串、去空、去重并保持选择顺序；文件详情按保存顺序解析 active 任务，任务详情从当前已加载 active 文件数组反向派生，双向点击复用 `openBusinessRecord` 清理目标台账会话筛选、导航并选中原只读详情。
- 关系采用弱引用生命周期：文件或任务软删除后从 active 详情隐藏，恢复后若 ID 仍存在则重新显示；purged、缺失或其他设备暂不可用的目标只读忽略，不触发扇出写入。文件编辑器明确显示不可用数量，并只在用户点击“清理不可用关联”后移除这些 ID。永久删除文件仍只保留四字段墓碑，不包含关系、标题或附件 ID。
- `duplicateBusinessRecord('document', ...)` 明确把关联任务重置为 `[]`，避免新文件误继承旧业务关系；历史迁移不按标题猜测关系。本地快照和现有 documents 私有同步 payload 原样保留关系数组，不新增数据库 schema、relation 集合、服务端路由或后台同步。
- 文件 CSV 新增“关联任务”，任务 CSV 新增反向“关联文件”；两列只输出当前 active 标题，不输出内部 ID、墓碑、迁移原文或附件内容。导出仍只消费页面已加载数组、保留当前可见顺序、使用本机 Blob 下载且零写库、零联网。
- 桌面详情栏继续保持“收窄列表 / 只读详情”三栏信息架构；关联项使用 Lucide `Link2` 并保留键盘名称。390px 下任务复选项、关系跳转、筛选清除和显式清理按钮均至少 44px，页面不产生横向溢出。
- OpenProject（GPL-3.0）、Vikunja 与 Plane（AGPL-3.0）仅用于核验“在原记录内显式建立关系并跳到既有详情”的成熟行为；未复制任何外部源码、组件、视觉、文案、图标或通用关系数据模型，也未引入父子、阻塞、重复等关系图能力。
- 失败优先阶段先观察到领域 3 项、Web CSV 2 项和 UI 合约 1 项预期失败。实现后客户端 `pnpm lint`、`pnpm format:check`、142 项单元/契约、主 E2E 83 通过/7 条件跳过、互联网 7/7、内网 3/3、`pnpm build`、`pnpm build:web:internet` 与 `pnpm build:web:intranet` 全部通过。私有服务端 lint/格式、34 项集成测试与 build 通过；2 项 PostgreSQL 用例因未提供 `DATABASE_URL` 跳过，因此不声称真实 PostgreSQL 已验证。
- 独立 Python Playwright 在 1440×900 与 390×844 下完成键盘建立/放弃关联、双向详情跳转和几何检查：桌面主列表宽 762px、详情栏 360px、关联按钮约 314×54px；移动内容宽 366px、关联按钮约 320×54px、任务复选项 45px、筛选框 46px，主内容底边 760px、固定底栏顶边 770px。两视口均零动作请求、零外联、零控制台错误、零页面错误和零横向溢出；截图与 `ui-metrics.json` 位于 `cases/gw-task-document-links/evidence/`。
- 八份发布 manifest 均为 `0.7.11`。公开构建 25 个文件、10 个 source map；互联网和内网构建各 15 个文件、0 个 source map。三类构建均命中 `0.7.11` 10 次，`0.7.10`、`0.3.1`、指定六位密码、私钥、常见长格式模型 Key 与 GitHub PAT 模式均为 0；Git 未跟踪 `.env`，`git diff --check` 通过。
- 功能提交 `f6b8a10` 与 annotated tag `v0.7.11` 已推送。[Pages run 30709453193](https://github.com/NextWeb4/gw/actions/runs/30709453193) 和 [Desktop run 30709552249](https://github.com/NextWeb4/gw/actions/runs/30709552249) 均绑定完整 SHA `f6b8a1019a254b2ffa8c9a76321b67bd7b5791b7` 并成功完成。线上 Pages HTTP 200，`Last-Modified` 为 2026-08-01 17:08:35Z，入口为 `index-7uA6mrST.js` 且命中 `0.7.11` 10 次、旧版本 0 次；桌面/移动真实 Chromium 均完成关系双向跳转、编辑后取消回滚及几何检查，零动作请求、零外联、零控制台/页面错误且无横向溢出，线上截图与 `ui-metrics-online.json` 位于 case evidence 目录。[Release v0.7.11](https://github.com/NextWeb4/gw/releases/tag/v0.7.11) 的 12 个安装包与 `SHA256SUMS.txt` 共 13 个公开地址全部 HTTP 200 且非空；1278 字节校验文件含 12 条有效记录，哈希和文件名均唯一并精确覆盖安装资产。

## v0.7.10

- 任务、会议、文件、外出、用章和物资六类台账的统一控制条新增“导出当前结果”。导出范围严格等于当前模块已应用关键词、结构化筛选和排序后的 active 可见数组，文件行顺序与屏幕列表一致；当前结果为 0 时按钮禁用，不生成空报表。文件名使用固定模块名和本机日期，例如 `hxhwang-gw-任务管理-当前结果-2026-08-01.csv`。
- `packages/documents` 新增无依赖 `encodeCsv` 纯函数，统一生成 UTF-8 BOM、CRLF、全字段双引号和双引号转义，并移除 NUL。为降低 CSV/公式注入风险，ASCII `= + - @`、全角 `＝ ＋ － ＠`、Tab/回车/换行，以及前导空白或控制字符后出现的危险前缀会增加文本前缀；编码过程不修改输入数组。
- `apps/web/src/ledger-csv.ts` 为六类台账分别定义固定中文列头和逐字段白名单，禁止 `Object.keys(record)` / `JSON.stringify(record)`。导出不包含 ID、删除/墓碑字段、来源版本、迁移原文、附件 ID/正文/Base64/哈希、API Key、访问码、中转密码或 AI 原文；附件只输出数量。任务配合单位与阶段按原数组顺序确定性展平，状态使用现有中文标签。
- 物资 CSV 的“账面库存”继续调用领域层权威函数，并从全部 active 物资流水计算；即使当前视图只显示“入库”或“领用”，也不会把筛选数组误当库存口径。CSV 只是一次性报表，不是快照、迁移或同步格式；下载只使用现有 `Blob + downloadBlob`，不读取第二份数据库、不写 IndexedDB、不持久化视图状态，也不联网。
- 统一导出按钮使用 Lucide `ArrowDownToLine`，键盘可通过 Tab 聚焦并用 Enter/Space 激活；390px 下导出和清除按钮均不小于 44px，控制条继续换行且不产生横向溢出。成功提示包含模块和导出条数，失败只提示重试，不清空筛选、排序、选中记录或上一条成功详情。
- 两条独立研究路径均选择“导出当前视图 CSV”，而不是继续追加不完整的 Arrow/Home/End 行导航。官方参考包括 GitHub Projects / Grist 的当前 View 导出、OWASP CSV Injection、Microsoft Excel UTF-8 CSV 指南和 W3C APG Grid；只借鉴行为与安全结论，不复制外部源码、文案、界面、品牌或数据模型，也未新增第三方依赖。
- 失败优先阶段中，文档包 3 项 CSV 测试先因 `encodeCsv` 缺失失败，Web 投影测试和 UI 合约先因 `ledger-csv.ts` 不存在失败；实现后聚焦文档测试 6/6、台账 CSV 测试 3/3、UI 合约 15/15 和桌面/移动真实下载 E2E 2/2 通过。E2E 覆盖筛选/排序后的行数和顺序、中文列头、公式型标题中和、空结果禁用、六类下载、状态保持、零动作请求、零 IndexedDB 写入和移动端 44px/无横向溢出。
- 独立 Python Playwright 在 1440×900 与 390×844 下验证控制条几何和真实键盘下载：桌面控制条为 762×97px，移动为 366×161px；移动搜索 45px、两个选择器 46px、导出/清除均 44px，`body.scrollWidth` 分别为 1440/390。两端均为零动作请求、零外部请求、零控制台错误和零页面错误；截图与指标位于 `cases/gw-visible-ledger-csv/evidence/`。
- 八份客户端发布清单已更新为 `0.7.10`。本版不新增依赖、数据库 schema、私有服务端路由、同步协议、附件格式、AI 边界、API Key 行为或自动联网。
- 本机完整验证已通过：`pnpm lint`、`pnpm format:check`、`pnpm test`（138 项）、主 E2E（81 通过、7 条件跳过）、互联网 E2E（7/7）、内网 E2E（3/3）、`pnpm build`、`pnpm build:web:internet` 与 `pnpm build:web:intranet`。主 E2E 首轮发现导出按钮的无障碍名称包含“任务管理”，使旧导航定位产生严格模式歧义；改为不含模块名称的“导出当前台账结果”后，相关桌面/移动用例恢复唯一定位。同轮一条既有外出编辑断言在并行资源压力下未观察到更新，聚焦桌面/移动 4/4 通过后，完整主套件 81/81 有效用例重跑通过。
- 公开构建 25 个文件、10 个 source map；互联网和内网构建各 15 个文件、0 个 source map。三类运行时代码均命中 `0.7.10` 10 次，且不含 `0.7.9` 或 `0.3.1`；私钥、常见长格式模型 Key 与 GitHub PAT 模式均为 0，Git 未跟踪 `.env`。`git diff --check` 通过。
- [Pages run 30693001522](https://github.com/NextWeb4/gw/actions/runs/30693001522) 与 [Desktop run 30693011820](https://github.com/NextWeb4/gw/actions/runs/30693011820) 均成功，对应功能提交 `9647ee5` 和指向该提交的 annotated tag `v0.7.10`。[线上站点](https://nextweb4.github.io/gw/) 返回 HTTP 200，`Last-Modified` 为 2026-08-01 09:09:31Z，并加载入口 `index-BmkOyhDd.js`；真实 Chromium 桌面/移动均显示 0.7.10，按截止日期升序导出 2 条当前任务结果，下载文件名和屏幕顺序正确，移动按钮为 63×44px，两端零动作请求、外部请求、控制台错误、页面错误或横向溢出。线上截图和指标位于 `cases/gw-visible-ledger-csv/evidence/ledger-csv-live-*` 与 `live-metrics.json`。[Release v0.7.10](https://github.com/NextWeb4/gw/releases/tag/v0.7.10) 的 12 个安装包和 `SHA256SUMS.txt` 共 13 个地址均为 HTTP 200 且非空；1278 字节校验文件包含 12 条格式有效记录，SHA-256 与文件名分别唯一，并精确覆盖 12 个安装资产。

## v0.7.9

- 任务、会议、文件、外出、用章和物资六类台账的统一只读详情新增“上一条 / 下一条当前可见记录”。位置显示为 `A / B`，顺序严格来自当前模块已完成关键词、结构化筛选和排序后的可见数组；第一条禁用上一条，最后一条禁用下一条，不循环。
- 一个无依赖 TypeScript 纯函数只接收有序 `{id}` 数组和当前 ID，派生当前位置、总数与前后 ID，不重排或修改输入。六类接线继续复用 `selectBusinessRecord`，因此保留当前筛选/排序、列表选中态、窄屏详情定位和 v0.7.8 会话级最近访问；没有新增游标状态、持久化、数据库读取、写入或网络请求。
- 详情导航使用 Lucide `ChevronUp` / `ChevronDown`，按钮 `aria-label` 与 tooltip 包含目标记录标题，位置使用 `aria-live="polite"`；桌面按钮为 38×38px，390px 窄屏为 44×44px。编辑和复制仍进入原抽屉，返回列表、未保存守卫和固定底栏边界不变。
- 开源审计复核 VS Code Quick Access（MIT）、GitHub 键盘快捷键文档（CC BY 4.0）和 Plane Views（AGPL-3.0）。只借鉴“在当前有序投影中移动选择”“高频上下文操作可键盘访问”和“视图不改底层数据”，不复制外部源码、文案、样式、品牌或资产；没有采用保存视图、Kanban、批量操作、自定义字段或全局单字符快捷键。
- 失败优先测试先分别证明纯函数模块、UI 合约接线和详情导航 DOM 不存在；实现后聚焦纯函数 4/4、UI 合约 14/14、桌面/移动 Playwright 2/2 通过。回归覆盖排序后 `1 / 2 → 2 / 2 → 1 / 2`、单条筛选 `1 / 1`、六类台账接线、MRU 更新、键盘 Enter、首尾禁用、零动作请求、移动 44px、无横向溢出和底栏边界。
- 独立 Python Playwright 在 1440×900 与 390×844 下进一步检查标题、状态、位置导航和操作区无重叠；桌面详情栏宽 360px，移动详情宽 366px，移动按钮均为 44×44px，`body.scrollWidth` 分别为 1440/390。两端均为零动作请求、零外部请求、零控制台错误和零页面错误；截图与指标位于 `test-results/visible-record-navigation-0.7.9/`。
- 八份发布清单均已更新为 `0.7.9`。本版不新增依赖、数据库 schema、私有服务端路由、同步协议、附件格式、AI 边界、API Key 行为或自动联网。
- 本机完整验证已通过：`pnpm lint`、`pnpm format:check`、`pnpm test`（131 项）、主 E2E（79 通过、7 条件跳过）、互联网 E2E（7/7）、内网 E2E（3/3）、`pnpm build`、`pnpm build:web:internet` 与 `pnpm build:web:intranet`。主 E2E 首轮复用了更新版本号前仍在 4193 运行的 v0.7.8 preview，导致关于页桌面/移动版本断言失败；失败快照确认页面实际为 0.7.8，停掉旧进程并由 Playwright 从新源码独占重建后，聚焦版本用例 2/2 和完整主套件 79/79 有效用例均通过。
- 公开构建 25 个文件、10 个 source map；互联网和内网构建各 15 个文件、0 个 source map。三类运行时代码均命中 `0.7.9` 10 次，且不含 `0.7.8` 或 `0.3.1`；私钥、常见长格式模型 Key 与 GitHub PAT 模式均为 0，Git 未跟踪 `.env`。`git diff --check` 通过。
- [Pages run 30689382534](https://github.com/NextWeb4/gw/actions/runs/30689382534) 与 [Desktop run 30689430065](https://github.com/NextWeb4/gw/actions/runs/30689430065) 分别由功能提交 `74d0352` 和指向该提交的 annotated tag `v0.7.9` 触发。[线上站点](https://nextweb4.github.io/gw/) 返回 HTTP 200，`Last-Modified` 为 2026-08-01 07:20:37Z，并加载新入口 `index-BY2dQcva.js`；真实 Chromium 桌面/移动均显示 0.7.9 并完成当前可见 `1 / 2 → 2 / 2`，详情宽 360/366px，移动按钮 44×44px，两端零动作请求、外部请求、控制台错误、页面错误或横向溢出。线上截图为 `test-results/visible-record-navigation-0.7.9/visible-record-navigation-live-{desktop,mobile}-*.png`。[Release v0.7.9](https://github.com/NextWeb4/gw/releases/tag/v0.7.9) 的 12 个安装包和 `SHA256SUMS.txt` 共 13 个地址均为 HTTP 200 且非空；1266 字节校验文件包含 12 条格式有效记录，SHA-256 与文件名分别唯一，并精确覆盖 12 个安装资产。

## v0.7.8

- `Ctrl/Cmd+K` 全局命令面板新增“最近访问”。用户显式打开任务、会议、文件、外出、用章或物资记录后，空查询面板会优先显示最多六条最近记录；重复访问移到首位，同一记录只保留一条。
- 最近状态只保存 `{tab, id}`，位于当前 `App` 的 React state。它不保存标题、正文、备注、附件、查询词、访问时间或业务 payload，不写入 IndexedDB、localStorage、sessionStorage、快照、同步服务、URL 或日志，刷新页面后立即清空。
- 最近项每次渲染都从当前六类 active 数组解析最新标题和描述；软删除、远端 purge 或永久删除会主动裁剪引用，恢复后不会自动重入，只有用户再次显式打开才会重新出现。自动显示的台账首条详情不计入访问历史。
- 输入任意搜索词后“最近访问”整组卸载，普通导航、业务记录和快速新建继续按原 cmdk 逻辑过滤，避免同一记录在最近组和业务组重复出现。最近项使用独立 `id`、`value` 和 `kind`，键盘与鼠标选择仍调用原 `openBusinessRecord`，复用筛选清除、导航、选中态和右侧只读详情。
- 方案审计覆盖 VS Code Quick Access（MIT）、GitHub Command Palette 文档（CC BY 4.0）、cmdk（MIT）和 kbar（MIT）。只借鉴显式访问后更新 MRU、空查询建议和 action 投影，不复制外部源码、文案、布局、品牌或资产，不新增依赖，也不引入 VS Code 持久历史、kbar undo/redo、收藏、频率统计或后退栈。
- 失败优先测试先证明最近记录纯函数、查询期隐藏和 active 裁剪不存在；实现后 3 项最近记录单测、13 项 UI 合约及桌面/移动聚焦 E2E 2/2 通过。浏览器回归覆盖 A→B→A 排序、去重、正常搜索无重复、软删除移除、恢复不复活、再次显式打开重入、刷新清空、零动作请求、移动 44px 和固定底栏边界。
- 本版不新增数据库 schema、私有服务端路由、同步协议、附件格式、AI 请求边界、API Key 行为或自动联网；六类源数组、全局正常搜索、快速新建、编辑抽屉和保存链路保持原职责。
- 本机完整验证已通过：`pnpm lint`、`pnpm format:check`、`pnpm test`（126 项）、主 E2E（84 条中 77 通过、7 条条件跳过）、互联网 E2E（7/7）、内网 E2E（3/3）、`pnpm build`、`pnpm build:web:internet` 与 `pnpm build:web:intranet`。Windows 并行执行 lint/format 时出现一次 pnpm `.bin` 链接创建提示，但实际类型与语法检查均成功，后续测试和构建也正常解析可执行文件。
- 独立 Python Playwright 在 1440×900 与 390×844 下按“会议 → 任务 → 会议”建立 MRU：两视口均显示会议在前、任务在后，桌面/移动最近项高度约 56.6/61.9px；移动面板底边约 742.5px，固定底栏顶边 770px，`body.scrollWidth` 分别为 1440/390。两端操作期零请求、零控制台错误、零页面错误；截图与指标位于 `test-results/recent-records-0.7.8/`。
- 八份发布清单均为 `0.7.8`。公开构建 25 个文件、10 个 source map；互联网和内网构建各 15 个文件、0 个 source map。三类运行时代码均命中 `0.7.8` 且不含 `0.7.7`/`0.3.1`；指定中转密码、私钥和真实长格式 API Key 均为 0，Git 未跟踪 `.env`。初次宽松 Key 正则命中的 `skipSelectionChangeEvent` 等均为依赖标识符，按真实 Key 前缀复核后为 0。
- [Pages run 30685858239](https://github.com/NextWeb4/gw/actions/runs/30685858239) 与 [Desktop run 30685866201](https://github.com/NextWeb4/gw/actions/runs/30685866201) 均成功，分别对应功能提交 `0e953c5` 和 annotated tag `v0.7.8`。[线上站点](https://nextweb4.github.io/gw/) 返回 HTTP 200，功能部署时 `Last-Modified` 为 2026-08-01 05:32:13Z，并加载已验证的内容哈希入口 bundle；真实 Chromium 桌面/移动均显示页脚 `0.7.8` 和会议→任务 MRU，操作期零请求/错误、无横向溢出，移动面板底边约 747px、固定底栏顶边 770px。线上截图位于 `test-results/recent-records-0.7.8/recent-records-live-{desktop,mobile}.png`。[Release v0.7.8](https://github.com/NextWeb4/gw/releases/tag/v0.7.8) 的 12 个安装包和 `SHA256SUMS.txt` 共 13 个地址均为 HTTP 200 且非空；校验清单 12 行格式有效，SHA-256 与文件名分别唯一，并精确覆盖 12 个安装资产。

## v0.7.7

- `Ctrl/Cmd+K` 全局查找升级为“查找与快速新建”命令面板。在原十七个导航结果和六类 active 记录结果之前新增独立“快速新建”组，覆盖新建任务、新建会议、登记文件、新建外出活动、新建用章记录和新建物资记录。
- 六个动作使用稳定 ID、显式 `searchValue` 和中文同义关键词，可用“快速新建、新建、创建、登记、入库、领用、用章”等词筛选；继续使用 cmdk 的组合框、分组、上下键、Enter 与 Escape 语义，不新增命令框架、搜索索引、命令历史或持久化状态。
- 选择动作时先关闭 cmdk 面板、取消把焦点恢复到后台触发器，再在下一帧进入目标模块并调用对应 `empty*()` 与 `open*Editor()`。原抽屉挂载后聚焦第一个可见业务字段，避免搜索框或关闭按钮抢焦点；普通 Escape 关闭命令面板仍回到原触发元素。
- 快速新建不调用保存、IndexedDB、Fetch、Electron IPC、同步或附件持久化，不形成第二套表单、校验、附件会话或保存逻辑。用户修改后继续经过原未保存守卫，取消不创建记录；只有点击对应原保存按钮并通过原校验后才写入本机。
- 编辑抽屉、快速记录或当前页 AI 面板打开时，全局命令面板仍保持禁用，避免模态叠加。移动端继续使用固定底栏，命令项保持至少 44px，长中文说明截断在行内且不扩大页面宽度。
- 开源审计复核 cmdk 1.1.1、kbar 0.1.0-beta.47 与 Radix Dialog/FocusScope。最终继续复用本项目现有、支持 React 19 的 cmdk；只借鉴 kbar 的稳定 action 组织和 Radix 的卸载焦点语义，不新增依赖，也不复制外部源码、示例文案、视觉或资产。
- 失败优先 UI 合约先在缺少 `create` 类型处按预期失败。聚焦 Playwright 随后覆盖桌面与移动六类动作、方向键移动、Enter、首字段焦点、原未保存确认、取消后六类记录数量不变、编辑期命令禁用、零第三方请求和移动端无横向溢出。
- 本版不新增数据库 schema、服务端路由、同步协议、附件格式、AI 请求边界、API Key 行为或自动联网；公开、互联网、内网与桌面构建继续共享同一业务 UI 和既有分版数据边界。
- 本机验证已通过：`pnpm lint`、`pnpm format:check`、`pnpm test`（123 项）、主 E2E（82 条中 75 通过、7 条条件跳过）、互联网 E2E（7/7）、内网 E2E（3/3），以及公开、互联网、内网三类 Web 构建。首次完整主 E2E 复用了上一轮短生命周期 preview，服务退出后产生连续 `ERR_CONNECTION_REFUSED`；改用 `CI=1` 独占服务后，唯一真实回归是旧 placeholder 定位，改为稳定的 dialog/combobox 无障碍定位后完整通过。
- 真实 Chromium 在 1440×900 和 390×844 下验证：命令面板分别为 720×587px 和约 369×601px，移动面板底边约 610px、固定底栏顶边 770px，移动命令项最小约 61px；两视口 `body.scrollWidth` 等于视口宽度，无控制台错误或动作期请求。截图为 `test-results/command-palette-v077-desktop-1440x900.png` 与 `test-results/command-palette-v077-mobile-390x844.png`。
- 公开构建 25 个文件、10 个 source map；互联网和内网构建各 15 个文件、0 个 source map。三类产物各命中 `0.7.7` 10 次，不命中 `0.7.6`、`0.3.1`、六位中转密码、私钥或长格式 API Key；Git 跟踪文件中同类秘密和 `.env` 均为 0。
- [Pages run 30683208784](https://github.com/NextWeb4/gw/actions/runs/30683208784) 与 [Desktop run 30683218107](https://github.com/NextWeb4/gw/actions/runs/30683218107) 均成功。[线上站点](https://nextweb4.github.io/gw/) 返回 HTTP 200，并加载已验证的内容哈希入口 bundle；真实 Chromium 显示页脚 `0.7.7`，桌面和移动端均完成六动作、ArrowDown/Enter、会议主题首字段聚焦与关闭回焦，操作期零请求、零控制台错误、零页面错误且无横向溢出。线上截图为 `test-results/command-palette-v077-live-desktop-1440x900.png` 与 `test-results/command-palette-v077-live-mobile-390x844.png`。[Release v0.7.7](https://github.com/NextWeb4/gw/releases/tag/v0.7.7) 的 12 个安装包和 `SHA256SUMS.txt` 共 13 个地址均 HTTP 200 且非空；清单 12 条记录格式有效，SHA-256 和文件名分别唯一，并完整覆盖安装资产。

## v0.7.6

- 六类业务右侧只读详情统一新增“复制相似记录”。入口使用 Lucide `CopyPlus`，继续打开原任务、会议、文件、外出、用章或物资编辑抽屉，不形成简化表单、详情内编辑或第二套保存逻辑。
- 复制首先在 `packages/domain` 通过逐字段白名单生成未保存草稿：统一创建新 ID、新 `createdAt/updatedAt`，移除 `deletedAt`、`purgedAt`、`sourceVersion` 和 `legacyPayload`，并复制主附件 ID 数组而不是附件二进制。输入记录和嵌套数组保持不变。
- 任务复制保留名称、类目、来源、交办人、业务日期、阶段名称、备注和主附件引用，但状态重置为“未启动”，配合单位与阶段内单位状态重置为“待反馈”，阶段获得新 ID，单位进度附件和工作小结清空。文件登记状态重置为“待登记”；外出活动旧成果清空；会议、用章和物资保留原业务字段供人工调整。
- 六类复制抽屉从打开时即显示“未保存修改”和专用说明，明确字段重置、附件共享和零自动写入。取消、关闭按钮、外侧点击、Escape 与 `beforeunload` 继续复用统一守卫；确认放弃不会创建记录。保存仍使用原必填、日期、日期时间、正整数、附件会话与常用项目录逻辑，成功后清除可能隐藏新记录的会话筛选并选中新详情。
- 历史档案原有“复制为新记录”同步接入立即未保存保护；外出历史复制不再把旧成果当作新活动成果，原始迁移字段仍在只读迁移证据中可见。
- 开源方案审计比较 Vikunja TaskDuplicate（AGPL-3.0-or-later）、Web `structuredClone`、lodash.clonedeep 4.5.0（MIT）和 rfdc 1.4.1（MIT）。最终不新增依赖：只借鉴逐字段白名单、新身份和完成状态重置，不复制外部源码、接口、文案、样式、关系模型或附件实现。
- 本版不新增数据库 schema、私有服务端路由、同步协议、附件格式、持久化配置、API Key 行为或自动联网。复制草稿只有点击原保存按钮后才进入本机 IndexedDB，之后也只会在用户主动执行既有私有同步时传输。
- 本机验证已通过：`pnpm lint`、`pnpm format:check`、`pnpm test`（123 项）、主 E2E（80 条中 73 通过、7 条条件跳过）、互联网 E2E（7/7）、内网 E2E（3/3）、公开/互联网/内网 Web 构建，以及 1440×900/390×844 Python Playwright。真实浏览器验证覆盖桌面复制保存、移动复制取消、移动 44px 触控、零外联、零控制台错误和无横向溢出；截图为 `test-results/copy-record-desktop-1440x900.png` 与 `test-results/copy-record-mobile-390x844.png`。
- [Pages run 30648940120](https://github.com/NextWeb4/gw/actions/runs/30648940120) 与 [Desktop run 30649026582](https://github.com/NextWeb4/gw/actions/runs/30649026582) 均成功。[线上站点](https://nextweb4.github.io/gw/) 返回 HTTP 200，bundle 中 `0.7.6` 命中 10 次，`0.7.5`/`0.7.4`/`0.3.1` 为 0，并包含复制入口和未保存说明；线上真实 Chromium 完成桌面复制保存与移动复制取消，无错误、外联或横向溢出。[Release v0.7.6](https://github.com/NextWeb4/gw/releases/tag/v0.7.6) 的 12 个安装包和 `SHA256SUMS.txt` 共 13 个地址均 HTTP 200 且非空，12 条校验记录格式有效、文件名唯一并完整覆盖安装资产。

## v0.7.5

- 任务、会议、文件、外出、用章和物资六类业务统一改为可恢复软删除。列表删除确认后写入 `deletedAt` 并保留完整业务 payload 与附件引用；台账、工作台、日历、统计、周报、AI 材料、目录派生和全局业务搜索只消费 active 记录，已删除内容不会继续进入正常工作流。
- 新增独立“回收站”导航模块，支持按标题、摘要或附件名搜索，按六类业务筛选，显示删除时间和仍可下载的本机附件，并提供逐条恢复、逐条永久删除和清空回收站。恢复会完整保留字段与附件、移除生命周期标记并刷新更新时间；所有操作均保持本机执行且无新增自动联网。
- 永久删除采用最小同步墓碑而不是物理移除同步行：只保存 `id`、`updatedAt`、`deletedAt`、`purgedAt` 四个字段，不保留标题、备注、业务字段或附件 ID。墓碑继续参加用户显式触发的私有同步，较新的墓碑会压过其他设备的旧 payload，避免记录被重新同步回来。
- 附件生命周期与记录生命周期分离：软删除期间附件继续保留并可下载，恢复后继续可用；永久删除只清理不再被其他 active/trash 业务记录或历史档案引用的附件，共享附件不会误删。收到远端 purge 时也会在写入墓碑后清理本机旧 payload 遗留的无引用附件。
- 私有同步的附件集合改为先按 `updatedAt` 选择每个 ID 的有效 master，再计算附件引用；不再把本机旧 payload 与较新远端墓碑简单合并，避免已经永久删除记录的附件被再次上传。同步协议、服务端路由和 PostgreSQL schema 均未改变。
- 本地快照导出和导入都会再次最小化永久删除 payload，确保快照不保留已永久删除业务正文。RxDB 外层 schema 与 kind 未改变，payload 原本允许扩展，因此 `LOCAL_SCHEMA_VERSION` 保持 2，不制造无必要数据库迁移。
- 移动端进入回收站时会把当前导航图标自动滚动到固定底栏可视范围；搜索、类型筛选、恢复和永久删除控件均保持至少 44px，页面无横向溢出。桌面端延续“工业档案 / 酸性色信号”视觉系统，回收站采用紧凑可扫描列表而不形成第二套详情或编辑器。
- 开源审计比较 Vikunja 的任务复制、Saved Filters 与软删除定时清理，Plane 的 archive/unarchive，以及 AppFlowy Trash。三个参考仓库均为 AGPL，只借鉴生命周期与交互逻辑，不复制源码、文案、样式或资产；复制记录、持久化保存视图、自动 30 天清理、后台任务、服务器新路由和新依赖均未采用。
- 失败优先回归先证明生命周期纯函数、快照最小化、同步墓碑、远端 purge 附件清理和独立回收站界面不存在；实现后新增领域、本地数据、同步、UI 合约、主 E2E 与 Python Playwright 检查，覆盖源对象不变、恢复完整 payload、四字段墓碑、active/trash/purged 分区、附件下载/恢复/共享引用/清理、全局搜索排除、清空和零外联。
- 内网“停止等待生成结果”E2E 原先依赖 450ms 定时响应，在并行资源压力下可能在点击前完成并导致按钮换代。测试改为显式 Promise 闸门，先确认忙碌态和停止按钮，再由测试释放迟到响应；产品 AI 生命周期未修改，测试不再依赖机器速度。
- 本机已通过 `pnpm lint`、`pnpm format:check`、120 项单元/契约测试、主 E2E 71 项通过/7 项条件跳过、互联网 E2E 7 项、内网 E2E 3 项，以及公开/互联网/内网三类构建。内网套件首次与互联网套件并行时旧 450ms 用例发生 DOM 换代超时；改为确定性闸门后独立 3/3 通过。
- Python Playwright 在 1440×900 与 390×844 真实 Chromium 中验证回收站：两视口 `body.scrollWidth` 均不超过视口，移动主内容底边不越过固定底栏，搜索/筛选/操作按钮均至少 44px，当前回收站图标保持可见；截图为 `test-results/recycle-desktop-1440x900.png` 与 `test-results/recycle-mobile-390x844.png`。
- 八份发布清单均为 `0.7.5`。公开构建 25 个文件、10 个 source map；互联网和内网构建各 15 个文件、0 个 source map。三类构建均命中 `0.7.5`，不命中 `0.7.4`、`0.3.1`、用户指定密码、私钥或长格式 API Key。
- [Pages run 30641433505](https://github.com/NextWeb4/gw/actions/runs/30641433505) 的 build 与 deploy 均成功；线上入口和 7 个首屏资产返回 HTTP 200，bundle 中 `0.7.5` 命中 10 次、`0.7.4`/`0.3.1` 为 0，并包含“回收站”和 `purgedAt`。线上真实 Chromium 显示页脚 `0.7.5`，可把演示任务移入回收站并查看恢复/永久删除入口，`body.scrollWidth=1440`，无控制台错误或外部请求，截图为 `test-results/recycle-live-v075.png`。[Desktop run 30641434968](https://github.com/NextWeb4/gw/actions/runs/30641434968) 的 verify、Windows/Linux 双分版双架构、Debian 10/12 双分版双架构启动门和 release 共 18 项全部成功。[v0.7.5 Release](https://github.com/NextWeb4/gw/releases/tag/v0.7.5) 不是草稿或预发布版本，包含 12 个互联网/内网、Windows/Linux、x64/arm64 安装包和 `SHA256SUMS.txt`；13 个直接下载地址均为 HTTP 200 且非空，校验文件 12 条记录格式有效、文件名唯一并与 12 个安装资产完全一致。

## v0.7.4

- 顶栏新增“快速记录”，工作台主按钮进入同一流程，也可按 `Shift+A` 从任意非编辑状态打开。快捷键会忽略 `input`、`textarea`、`select`、可编辑区域、组合键重复事件，以及全局查找、业务抽屉或当前页 AI 面板已经打开的情况。
- 新增原生 `<dialog>` 快速记录面板：粘贴通知、聊天记录或一句交办文字后，复用既有 `extractTaskFromText` 本机确定性规则即时预览任务名称、交办人、交办日期、截止日期和任务来源。非空但未识别的文字仍可继续手工核对，也可直接新建空白任务。
- 快速记录不形成第二套编辑器或保存逻辑。点击“继续核对”只把识别字段应用到 `emptyTask()`，再打开原有 `TaskEditor`；原文字保留在智能识别区域，不写入备注。最终仍须点击原有“保存任务”，预填抽屉从打开起就受未保存确认和 `beforeunload` 保护。
- 新增共享 `applyTaskTextExtraction` 领域函数，快速面板和原任务抽屉的“识别并填入”共用同一字段应用边界。函数只覆盖任务名称、交办人、交办日期、截止日期和来源，保留类目、备注、配合单位、阶段、附件和其他字段，并且不修改输入任务。
- 全流程保持会话级与零外联：打开、输入、预览、取消不会读取或写入第二份数据库，不调用 Fetch、Electron IPC、localStorage、快照、同步或遥测；原文字不会进入设置、搜索索引、日志或构建产物。公开、互联网和内网构建边界均未变化。
- 移动端面板限定在固定底栏上方，输入字号为 16px，关闭、取消、空白任务和继续核对按钮均至少 44px；桌面端采用紧凑的“来源文字 → 识别预览 → 继续核对”双栏流程，并延续现有工业深色/酸性色视觉系统。
- 开源方案审计比较 Super Productivity（MIT）、Vikunja（AGPL-3.0-or-later）和 Google Tasks 官方交互。最终不新增依赖：只借鉴全局快速入口、自动聚焦、快捷键、覆盖层与先捕获后补全的交互，不复制外部代码、短语语法、文案、样式、图标、接口数据或业务模型。
- 失败优先回归先分别证明 `applyTaskTextExtraction` 与 `QuickTaskCapture.tsx` 尚不存在；实现后新增领域单元测试、UI 合约和桌面/移动 E2E，覆盖预览、无匹配继续、原文字保留、即时未保存状态、焦点恢复、快捷键输入保护、模态冲突、原保存按钮、移动触控尺寸和全流程零请求。
- 本机已通过 lint、格式检查、110 项单元/契约测试、主 E2E 69 项通过/7 项条件跳过、互联网 E2E 7 项、内网 E2E 3 项，以及公开/互联网/内网三类构建。聚焦 E2E 首轮唯一失败是测试在台账搜索框验证 `Shift+A` 不拦截输入后留下了字母 `A`，导致新任务被当前会话筛选隐藏；测试显式清空输入后桌面/移动 2/2 与完整套件重新通过，产品保存链路未修改。
- Python Playwright 在 1440×900 与 390×844 真实 Chromium 中完成视觉/几何检查：桌面对话框为 710×490px；移动对话框为 370×740px、底边 750px，固定底栏顶边 770px，四类操作均为 44px，两个视口的 `body.scrollWidth` 分别为 1440 和 390。检查过程无控制台错误或外部请求，截图为 `artifacts/quick-capture-v074-1440x900.png` 与 `artifacts/quick-capture-v074-390x844.png`。
- 八份发布清单均为 `0.7.4`。公开构建含 10 个 source map，互联网/内网构建 source map 为 0；三类构建均命中快速记录功能和当前版本，不命中 `0.7.3`、`0.3.1`、用户给定密码、E2E 秘密标记、私钥或长格式 API Key。
- [Pages run 30633056243](https://github.com/NextWeb4/gw/actions/runs/30633056243) 已成功；线上站点返回 HTTP 200，真实 Chromium 显示页脚 `0.7.4`、快速记录入口和确定性预览，对话框为 710×490px，`body.scrollWidth=1440`，无控制台错误或外部请求，截图为 `artifacts/quick-capture-v074-live.png`。[Desktop run 30633059732](https://github.com/NextWeb4/gw/actions/runs/30633059732) 的 verify、4 个 Linux、4 个 Windows、8 个 Debian 10/12 启动门和 release 共 18 项全部成功。[v0.7.4 Release](https://github.com/NextWeb4/gw/releases/tag/v0.7.4) 不是草稿或预发布版本，包含 12 个互联网/内网、Windows/Linux、x64/arm64 安装包和 `SHA256SUMS.txt`；13 个直接地址均返回 HTTP 200，校验文件含 12 条格式有效、文件名唯一且与安装资产完全一致的记录。

## v0.7.3

- 工作台新增跨模块“工作焦点”，把当前本机已加载的任务、会议、文件、外出、用章和物资分为“今日与逾期 / 未来 7 天 / 未排期”三个会话级行动范围。每个范围最多显示前 8 条，点击记录继续进入原台账和既有只读详情。
- 逾期语义按第一性原理收窄：只有状态不是“已完成”且截止日期早于今天的任务会进入逾期；过去的会议、文件、外出、用章和物资属于历史事实，不会误报为待办。未来范围只含今天之后至第 7 天，第 8 天不提前进入；已完成任务不进入未排期。
- 概览复用 `agenda.ts` 已验证的六类日期映射和领域日期校验，不复制另一套日期来源。无日期、无效日期或非四位年份只进入未排期；派生过程不修改源数组，也不新增 Fetch、IndexedDB 读写、Electron IPC、localStorage、快照、同步、遥测或第二套编辑/完成/改期链路。
- 首页装饰主区和指标卡进一步收紧：1440×900 下主区高度为 342px，工作焦点从 y=604 开始，首屏可以看到范围切换和实际行动项；390×844 下主区保持完整视觉，滚动到概览后范围按钮高 72px、记录行高 68px，主内容底边 760px、固定底栏顶边 770px，页面无横向溢出。
- 开源方案审计比较了 Super Productivity Today View（MIT）、Nextcloud Tasks Dashboard（AGPL-3.0-or-later）、Vikunja Upcoming（AGPL-3.0-or-later）和 Google Tasks / Calendar 官方交互说明。最终不新增依赖；只借鉴时间视图与分类视图分工、有界行动列表、未来范围与无日期分离、日历定位与待处理列表互补，不复制外部代码、文案、样式、图标、接口数据或业务模型。
- 新增 `work-overview.ts`、`WorkOverview.tsx`、两项纯函数单元测试、UI 合约和桌面/移动 E2E。首个单元回归因概览模块尚不存在而按预期失败；完整 E2E 首轮发现“打开事务日历”与导航“事务日历”无障碍名称重叠，改为“查看完整日历”后聚焦 4/4 与完整套件重新通过。
- 本机已通过 lint、格式检查、108 项单元/契约测试、主 E2E 67 项通过/7 项条件跳过、互联网 E2E 7 项、内网 E2E 3 项，以及公开/互联网/内网三类构建。八份发布清单均为 `0.7.3`，互联网/内网构建 source map 为 0；三类构建未命中 `0.7.2`、`0.3.1`、用户给定密码、E2E 秘密标记、私钥或长格式 API Key。双视口检查无控制台错误或外部请求，截图保存为 `artifacts/work-overview-v073-1440x900.png`、`artifacts/work-overview-v073-390x844-top.png` 和 `artifacts/work-overview-v073-390x844.png`。
- [Pages run 30628737861](https://github.com/NextWeb4/gw/actions/runs/30628737861) 已成功；线上入口 bundle 中 `0.7.3` 命中 10 次、`0.7.2` 为 0，并包含“工作焦点 / 今日与逾期”。真实 Chromium 显示三个范围、页脚 `0.7.3`，可从概览进入原任务详情，`body.scrollWidth=1440`，无控制台错误或外部请求，截图为 `artifacts/work-overview-v073-live.png`。[Desktop run 30628740473](https://github.com/NextWeb4/gw/actions/runs/30628740473) 已成功，包含 verify、Linux 4 项、Windows 4 项、Debian 10/12 双分版双架构 8 项和 release。[v0.7.3 Release](https://github.com/NextWeb4/gw/releases/tag/v0.7.3) 包含 12 个互联网/内网、Windows/Linux、x64/arm64 安装包和 `SHA256SUMS.txt`；13 个直接地址均返回 HTTP 200，校验文件含 12 条格式有效且文件名唯一的记录。

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
