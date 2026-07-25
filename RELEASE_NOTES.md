# HxHwang Gw 发布说明

## v0.2.0

- 全面重构为原创“动态档案 / 墨迹信号”视觉系统：近黑本地画布、巨型中文编辑式排版、荧光确定性信号、暖白公文纸张与高密度业务面板形成统一层级。
- 新增无障碍树外的 `KineticBackdrop` 指针光场、环形数据轨道、扫描动效和分层入场；`prefers-reduced-motion` 下关闭持续动画，功能不依赖动效才能理解。
- 界面功能图标统一为既有 `lucide-react` 组件，移除界面图片图标与文本感叹号图形；源码扫描未发现表情符号、自绘功能 SVG、图标字体或远程视觉资源。
- 移动端改为八入口底部图标栏，抽屉层级高于导航；390×844 视口无页面级横向溢出，宽表格仅在自身容器滚动。
- MotionSites AI 仅用于观察高对比、巨型排版和密集模块节奏；未复制其作品、品牌、文案、提示词、CSS、页面结构或视觉素材，也未加入内容抓取允许清单。
- 未新增 npm 依赖、运行时网络请求或数据库变更；任务、文件、写作、周报、迁移、同步和导出契约均保持不变。
- Windows x64 本机构建产物 `HxHwang-Gw-0.2.0-x64-setup.exe` 为 100,950,072 字节，SHA-256 `B88546A7874CAB44650E951DF1267E3F587A69C5B8C305764E4B5AE0D3432445`；解包程序启动后观察到 4 个进程并全部退出。[Actions run 30111552737](https://github.com/NextWeb4/hxhwang-gw/actions/runs/30111552737) 已完成正式多架构构建、Debian 10/12 四组合启动门和 Release 发布。

## v0.1.1

- 周报从临时汇总文本升级为独立 `weekly` 记录：支持日期范围、确定性素材汇总、人工编辑、版本保存、快照恢复、显式私有同步及 DOCX/PDF 导出。
- 任务编辑器补齐配合单位、任务阶段和阶段配合单位状态，保存后可完整恢复，不再只迁移但无法编辑。
- 任务和文件附件支持本机下载与解除当前记录关联；旧版会议、外出、用章、物资和周报仍保持只读档案边界。
- 历史档案新增 Skill、配置及 `legacyPayload` 的纯文本只读详情；React 负责转义，不执行历史内容中的 HTML。
- 公开 Pages 禁用历史业务 JSON、真实附件及快照恢复入口；桌面端和内网 Web 保留完整的本机导入流程。
- 未新增 npm 依赖或运行时联网行为；复用现有 RxDB、领域模型、`docx` 和 Electron/浏览器打印能力。
- 本地数据库 schema 升至 v1，并使用 RxDB migration 保留 v0 的任务、文件、附件、草稿、档案和设置，避免新增周报类型破坏现有浏览器数据。
- Windows x64 本机构建产物 `HxHwang-Gw-0.1.1-x64-setup.exe` 为 100,944,547 字节，SHA-256 `E28CA7739CBC6B209BAD60FAD4F8B5AA7922F49DC93DF55940CF296AFB3F5803`；解包程序启动后观察到 4 个进程并全部退出。[Actions run 30106372149](https://github.com/NextWeb4/hxhwang-gw/actions/runs/30106372149) 已完成正式多架构构建、Debian 10/12 四组合启动门和 Release 发布。

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
- Windows 10/11 x64 与 arm64 安装包已在 Windows 构建并嵌入品牌图标；Actions run [`30093256097`](https://github.com/NextWeb4/hxhwang-gw/actions/runs/30093256097) 又构建了 Windows/Linux x64、arm64 四类 artifact，并通过 Debian 10/12 的 x64/arm64 四组合安装启动门。
- DEB 保留 electron-builder 默认运行依赖并补充 `libasound2`、`libgbm1`；Docker smoke 只在 CI 启动命令中使用 `--no-sandbox`，生产 Electron 仍保持 renderer sandbox、context isolation 和禁用 Node integration。
- 当前 Windows 安装包未做 Authenticode 签名，只适合内部演示；正式分发前需补充代码签名证书。

## GitHub Release

### v0.2.0

- [v0.2.0](https://github.com/NextWeb4/hxhwang-gw/releases/tag/v0.2.0) 已正式发布，不是草稿或预发布版本；标签指向提交 `8c47de23366579b8140b03c63766c24ca1098ed0`。
- [Release Actions run 30111552737](https://github.com/NextWeb4/hxhwang-gw/actions/runs/30111552737) 已成功完成 Windows/Linux x64、arm64 构建、Debian 10/12 四组合启动门、校验清单生成和 Release 发布。
- Release 共包含七个资产：下列六个安装文件及 [`SHA256SUMS.txt`](https://github.com/NextWeb4/hxhwang-gw/releases/download/v0.2.0/SHA256SUMS.txt)。清单中的六个 SHA-256 均与 GitHub 对应资产摘要一致。

| Release 资产 | SHA-256 |
| --- | --- |
| `HxHwang-Gw-0.2.0-amd64.deb` | `dd07fd471c7a5a55b6352b7bacc3c20fb47e0f364ac6a6f2968386300e87ca1f` |
| `HxHwang-Gw-0.2.0-arm64-setup.exe` | `1ff127265218e65ad8802879b666dbacf50237245961232194193423aa66edf7` |
| `HxHwang-Gw-0.2.0-arm64.AppImage` | `435622aede13ba3718a1f0d0c059fd7cf9df2553d9c12e134f4fd8bc79aac5d5` |
| `HxHwang-Gw-0.2.0-arm64.deb` | `c4df9a7765510aee8d7cfa658aac9fd7dd42e42ff9244e307e92f518ac41c08c` |
| `HxHwang-Gw-0.2.0-x64-setup.exe` | `c1a1983de7805df7ec431c6128704fd9da4a39cd14b19f30d583b7e4b13a303e` |
| `HxHwang-Gw-0.2.0-x86_64.AppImage` | `1ad30d39aa9c36480ae9e79524efb29d218731ed30983b57bfb6891af015e13e` |

### v0.1.1

- [v0.1.1](https://github.com/NextWeb4/hxhwang-gw/releases/tag/v0.1.1) 已正式发布，不是草稿或预发布版本；标签指向提交 `bf23352bf632e431ee1c2b9f343eb7310a9509ce`。
- [Release Actions run 30106372149](https://github.com/NextWeb4/hxhwang-gw/actions/runs/30106372149) 已成功完成 Windows/Linux x64、arm64 构建、Debian 10/12 四组合启动门、校验清单生成和 Release 发布。
- Release 共包含七个资产：下列六个安装文件及 [`SHA256SUMS.txt`](https://github.com/NextWeb4/hxhwang-gw/releases/download/v0.1.1/SHA256SUMS.txt)。清单中的六个 SHA-256 均与 GitHub 对应资产摘要一致。

| Release 资产 | SHA-256 |
| --- | --- |
| `HxHwang-Gw-0.1.1-amd64.deb` | `c46dbe26d321af554658c4daaf3d258d3b34b057c219a1e5b15215b4527e1d5d` |
| `HxHwang-Gw-0.1.1-arm64-setup.exe` | `b66f7fc9095d9dc52c4d678683ae59df479b8588205b1932fdb8345035161420` |
| `HxHwang-Gw-0.1.1-arm64.AppImage` | `0af76a4f4d2dcd7a32f520740d74512cc56e3f51558adb30056634d1e3d2a2c8` |
| `HxHwang-Gw-0.1.1-arm64.deb` | `4476d926dc2a9fac65bb7eb848f13d33291f1f19d8d19e6d7bc3c271332ac572` |
| `HxHwang-Gw-0.1.1-x64-setup.exe` | `cd02490d05b41c40679c65a532ebd883a7cd4271215bb09c10fae750f235b671` |
| `HxHwang-Gw-0.1.1-x86_64.AppImage` | `0e42e08f8f62a94915094e08864dd60f99a4fea3bf1aeec74dbbb85872bec461` |

### v0.1.0

- [v0.1.0](https://github.com/NextWeb4/hxhwang-gw/releases/tag/v0.1.0) 已正式发布，不是草稿或预发布版本；标签指向提交 `de69d1bf8dc7c9e9bebbcece8b9950b12483f819`。
- [Release Actions run 30094346043](https://github.com/NextWeb4/hxhwang-gw/actions/runs/30094346043) 已成功完成 Windows/Linux x64、arm64 构建、Debian 10/12 四组合启动门、校验清单生成和 Release 发布。
- Release 共包含七个资产：下列六个安装文件及 [`SHA256SUMS.txt`](https://github.com/NextWeb4/hxhwang-gw/releases/download/v0.1.0/SHA256SUMS.txt)。清单中的六个 SHA-256 均与 GitHub 对应资产摘要一致。

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
