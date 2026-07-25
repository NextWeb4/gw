<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/English-0969da?style=flat-square" alt="English"></a>
  <a href="README.zh-CN.md"><img src="https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-c8102e?style=flat-square" alt="简体中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-8250df?style=flat-square" alt="日本語"></a>
</p>

<p align="center">
  <img src="assets/brand/app-icon.svg" alt="HxHwang Gw 应用图标" width="96">
</p>

# HxHwang Gw

一个本地优先的公文事务、任务与文件跟踪、文稿写作、周报、文档导出和受控私有同步系统。

![版本](https://img.shields.io/badge/version-0.2.1-0969da?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11.9.0-f69220?style=flat-square&logo=pnpm&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript&logoColor=white)
![许可证](https://img.shields.io/badge/license-All_rights_reserved-555?style=flat-square)

## 项目概览

HxHwang Gw 是一个 pnpm monorepo，在公开 GitHub Pages 演示版、内网 Web 构建和 Electron 桌面客户端之间共享同一套领域模型。系统首先把业务数据保存在本地，在构建时隔离公开能力与私有服务能力，并通过显式适配器提供同步和 AI 请求。

公开演示版不显示私有控制，不导入真实业务快照，不调用私有 API，也不启用 AI。可使用内置样例查看界面：[GitHub Pages 演示版](https://nextweb4.github.io/hxhwang-gw/)。

## 核心能力

| 领域 | 已实现内容 |
| --- | --- |
| 事务管理 | 任务、配合单位、阶段/状态跟踪、文件索引、附件和可搜索本地记录 |
| 写作 | 富文本起草、可复用本地知识、确定性周报生成、可编辑周报版本和历史档案 |
| 文档 | DOCX 与 PDF 共用的 A4 导出引擎；Web 使用浏览器打印，桌面端使用 Electron 打印 |
| 迁移 | 兼容两份历史原型导出结构；当共同版本标识无法可靠辨别来源时给出警告 |
| 本地数据 | 基于 IndexedDB 的仓储、快照、附件引用以及显式恢复/导出操作 |
| 私有服务 | 仅在桌面端和内网构建中提供按需同步、附件传输和经确认的脱敏 AI 请求 |

历史 Skill、配置、周报和未映射源字段会以只读纯文本保留，导入的 HTML 或脚本文本不会执行。

## 运行形态

| 形态 | 私有控制 | 适用场景 | 重要边界 |
| --- | --- | --- | --- |
| 公开 Pages | 关闭 | 使用内置样例的产品演示 | 禁止业务 JSON、真实附件、快照恢复、私有 API 和 AI |
| 内网 Web | 开启 | 受控内部来源中的浏览器使用 | 私有服务端必须允许准确的 HTTPS Origin，不支持 CORS 通配符 |
| Electron 桌面端 | 开启 | 本地桌面工作与 A4 PDF 导出 | 访问码只保留在页面内存，不写入 IndexedDB |

所有形态都保持本地优先。只有用户填写服务端地址和访问码后，私有同步才会开始。

## 环境要求

- Node.js `24`，与 GitHub Actions 工具链一致。
- pnpm `11.9.0`，由根目录 `packageManager` 字段声明。
- 端到端测试和品牌资产生成需要 Playwright Chromium。
- NSIS 安装包需要 Windows；AppImage/DEB 打包和最终 Linux 兼容性检查需要 Linux。
- Web 构建需要 Chromium 类浏览器。

仓库版本为 `0.2.1`。依赖由 `pnpm-lock.yaml` 锁定，应使用 frozen lockfile 安装以保证可复现性。

## 安装与运行

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev:web
```

默认开发服务器只监听本地接口。需要测试私有控制时使用内网构建模式：

```bash
pnpm dev:web:intranet
```

不要让公开 Pages 构建连接私有 API。配置、真实附件和业务快照只能进入桌面端或受控内网环境。

## 典型流程

1. 创建或导入任务和文件记录，然后检查迁移报告和只读历史档案。
2. 起草公文内容并维护相关本地知识条目。
3. 按选择的日期范围生成周报，人工编辑、保存版本并导出复核。
4. 清理浏览器数据、更换设备或卸载桌面客户端前，先导出本地快照。
5. 在私有构建中显式连接服务端，先拉取当前主版本，再推送仅在本地更新的记录。
6. 发起任何 AI 请求前，检查并修改脱敏预览，确认材料适合发送。

生成文档只是工作输出，不能替代文字、政策、字体、分页和保密审查。

## 本地数据、隐私与恢复

- 公开和内网 Web 构建把应用记录保存在当前浏览器配置的 IndexedDB 中。
- 桌面构建使用同一套本地模型，并通过受限 Electron bridge 增加原生 PDF 导出。
- 清除站点数据、删除浏览器配置或未备份即卸载，可能导致本地记录不可用。
- 本地脱敏会识别常见手机号、邮箱、身份证号和带标签姓名，但不能证明文档已经匿名。
- 敏感、涉密或其他禁止处理的材料不得进入本应用或公网模型。
- 模型密钥、数据库凭据和 provider 配置只留在私有服务端，不写入客户端存储。

在真实内部材料上使用迁移、同步、附件或 AI 前，请阅读 [`docs/HELP.md`](docs/HELP.md)。

## 内容与联网边界

仓库中的知识包只由已授权材料和显式 HTTPS 来源白名单生成。`pnpm content:sync` 是明确的联网操作：它遵循仓库的重定向和响应体积策略，记录来源元数据，不抓取商业参考产品，也不覆盖人工维护模板。

公开 Pages 使用严格 CSP，且没有私有连接目标。内网/桌面 CSP 允许显式私有操作所需的 HTTPS 和本机 API 端点。由于 HTML CSP meta 元素不能执行 `frame-ancestors`，正式托管需要防嵌入时，必须通过 HTTP 响应头设置 `Content-Security-Policy: frame-ancestors 'none'`。

## 测试与校验

```bash
pnpm lint
pnpm format:check
pnpm test
pnpm content:verify
pnpm assets:verify
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:e2e:intranet
```

`pnpm test` 运行各 package 测试以及内容策略、workflow contract 和 UI contract 检查。Playwright 测试覆盖桌面与窄屏视口、公开/私有能力隔离、迁移、本地流程、文档导出、附件、CSP，以及内网客户端在显式连接前零外联的规则。

`lint` 和 `format:check` 当前在各 workspace 中委托 TypeScript 或 JavaScript 语法/类型检查；尚未配置独立的源码 formatter。

## 构建与发布

```bash
pnpm build
pnpm build:web:intranet
pnpm build:desktop
pnpm build:desktop:win:x64
pnpm build:desktop:win:arm64
pnpm build:desktop:linux:x64
pnpm build:desktop:linux:arm64
```

公开 Web 构建输出到 `apps/web/dist/`，内网构建隔离输出到 `apps/web/dist-intranet/`。桌面打包会先构建兼容 `file://` 的 Web bundle，并拒绝 Electron 无法加载的绝对资源路径。

匹配 `v*` 的标签会触发 Windows 和 Linux 打包。只有 Windows 构建、Linux 构建和 Debian 安装启动门全部通过后才创建 Release。已发布的 `v0.2.1` 包含各平台包与 `SHA256SUMS.txt`：[Release v0.2.1](https://github.com/NextWeb4/hxhwang-gw/releases/tag/v0.2.1)。

## 架构与模块边界

```text
apps/web          React/Vite 界面和构建期公开/私有能力隔离
apps/desktop      Electron 主进程、preload bridge、安全策略和打包
packages/domain   共享实体、校验、周报与历史档案语义
packages/local-data  IndexedDB 仓储、快照、附件和本地持久化
packages/documents   面向 DOCX/PDF 的文档模型与导出帮助器
packages/migration   历史导出识别、映射、警告与档案保留
packages/sync-client 显式私有同步、附件、脱敏和 AI 客户端
content           授权来源、白名单、生成知识包和归属说明
scripts           内容策略、资产生成、构建与 workflow contract 检查
e2e               公开与内网 Playwright 场景
```

UI 组件必须使用 package API，不能直接访问持久化内部实现。联网行为只属于 `packages/sync-client`，本地存储不能获得隐式联网能力。Electron 保持 context isolation 与 sandbox，并只暴露狭窄 preload contract。

## 状态与已知限制

- 公开演示版已经部署，`v0.2.1` 安装包可以获取，但这不代表私有 API 的共享访问码认证已经适合生产。
- 应用面向公开或内部非涉密工作，不适合涉密记录。
- 浏览器数据持久性取决于浏览器配置和用户的快照习惯。
- DOCX/PDF 输出依赖字体和最终编辑器/查看器，正式文件仍需人工复核。
- 历史原型共用一个版本标识，标准导出器还遗漏一个 Skill 集合；歧义导入会明确警告，而不是猜测来源标签。
- Windows 和 Linux 包没有 Authenticode/代码签名。虽然 CI 已有构建和模拟安装门，真实 ARM 设备仍属于外部验证项。

维护中的验证证据见 [`docs/VERIFICATION_MATRIX.md`](docs/VERIFICATION_MATRIX.md)，发布历史见 [`RELEASE_NOTES.md`](RELEASE_NOTES.md)。

## 维护说明

- 保持公开/内网/桌面能力边界及其独立输出目录。
- 修改领域不变量、持久化、迁移、脱敏、同步、Electron IPC、导出行为或 workflow 时增加聚焦测试。
- 修改授权或生成知识文件前运行内容校验；授权元数据和归属说明必须一致。
- 修改 `assets/brand/app-icon.svg` 后重新生成并校验 PNG/ICO 资产。
- 同步维护 package 版本、发布说明、桌面产物名、三份 README 和 workflow 断言。

依赖选型、许可证、未采用方案和回滚边界记录在 [`OPEN_SOURCE_AUDIT.md`](OPEN_SOURCE_AUDIT.md)。视觉与交互规则记录在 [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)。

## 作者与联系

- **HaoXiangHwang**
- [Rays688888@Gmail.com](mailto:Rays688888@Gmail.com)
- <https://nextweb4.github.io/>
- <https://github.com/NextWeb4>

## 版权与许可证

Copyright (c) 2026 HaoXiangHwang. All rights reserved.

仓库声明为 `UNLICENSED`；未经书面授权，不授予复制、修改或再分发项目自有代码与内容的许可。第三方依赖仍遵循各自许可证，授权参考材料的范围记录在 `content/licensed/`。复用或分发前请阅读 [`COPYRIGHT.md`](COPYRIGHT.md) 和 [`content/ATTRIBUTION.md`](content/ATTRIBUTION.md)。
