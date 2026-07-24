# HxHwang Gw v0.1.0 发布说明

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
- Windows 10/11 x64 与 arm64 安装包已在 Windows 构建并嵌入品牌图标；Debian x64/arm64 已配置为由 Ubuntu CI 构建，并设有 Debian 10/12 四组合安装启动门，实际 CI 尚待远端运行。
- 当前 Windows 安装包未做 Authenticode 签名，只适合内部演示；正式分发前需补充代码签名证书。

## Windows 构建产物

- `HxHwang-Gw-0.1.0-x64-setup.exe`：100,887,834 字节；SHA-256 `B39A27E1370ED82C6BB1FF11D4CA1086DF4104ABDF1593653A55B26769230360`；包含开发地址加固及本次文档/迁移修复，x64 解包版已在当前 Windows 环境完成启动冒烟。
- `HxHwang-Gw-0.1.0-arm64-setup.exe`：93,557,443 字节；SHA-256 `C014513CBB17E5C1D04D849BC8C1974068208F2E36D632B96C6ED8BCC276DC4B`；包含相同修复，尚未在 Windows arm64 设备启动。
- 两个安装包的 Authenticode 状态均为 `NotSigned`，不得作为已签名正式发行物分发。

作者：HaoXiangHwang  
邮箱：Rays688888@Gmail.com  
网站：https://nextweb4.github.io/  
版权：Copyright (c) 2026 HaoXiangHwang. All rights reserved.
