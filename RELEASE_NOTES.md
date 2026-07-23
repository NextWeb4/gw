# HxHwang Gw v0.1.0 发布说明

- 提供 GitHub Pages 本地演示版与 Electron Windows/Debian 打包配置。
- 支持任务、文件、写作、周报、只读历史档案和两版历史 JSON 迁移。
- 支持导出并重新恢复 `hxhwang-gw-local-v1` 本地快照，导入前校验记录类型和负载结构。
- 两版迁移报告区分任务、会议、文件、外出、用章、物资、周报、Skill 和普通配置；Skill 保留原始字段并以只读设置记录落库。
- 支持 DOCX 导出、Web 打印及 Electron PDF 导出。
- 写作中心支持检索已授权模板；商业参考站只记录产品审计，不进入知识包或抓取清单。
- GitHub Pages 不连接私有 API、AI 或公共 CDN，并提供首次访问后的离线缓存。
- 新增独立内网 Web 构建；内网 Web 与桌面端支持显式会话、基于主版本的任务/文件/草稿同步、附件传输及逐次脱敏确认 AI。
- 新增 PWA manifest、原创品牌 SVG、Web PNG 与 Electron ICO/PNG；打包前自动验证尺寸与 ICO 结构。
- 授权资料新增范围、版本、版权归属和证据状态元数据，构建前校验知识包引用。
- 浏览器 CSP 限制脚本、连接、对象和表单来源；正式防嵌入策略需由支持自定义响应头的托管层提供，Pages 仅用于脱敏演示。
- Electron 打包前会校验 Web 资源均使用 `file://` 可加载的相对路径，避免桌面端空白窗口。
- Windows 10/11 x64 与 arm64 安装包已在 Windows 构建并嵌入品牌图标；Debian x64/arm64 已配置为由 Ubuntu CI 构建，并设有 Debian 10/12 四组合安装启动门，实际 CI 尚待远端运行。
- 当前 Windows 安装包未做 Authenticode 签名，只适合内部演示；正式分发前需补充代码签名证书。

## Windows 构建产物

- `HxHwang-Gw-0.1.0-x64-setup.exe`：100,883,179 字节；SHA-256 `C4C39D74911506EFE036025C900F238F893C50D63FC79E1A891F501F58731974`；x64 解包版已在当前 Windows 环境完成启动冒烟。
- `HxHwang-Gw-0.1.0-arm64-setup.exe`：93,553,148 字节；SHA-256 `7E086B0D67AFFCFA77CB94FAFC3CC96771F0EF09367E563FE2126E5BB8EAEC86`；仅完成交叉构建，尚未在 Windows arm64 设备启动。
- 两个安装包的 Authenticode 状态均为 `NotSigned`，不得作为已签名正式发行物分发。

作者：HaoXiangHwang  
邮箱：Rays688888@Gmail.com  
网站：https://nextweb4.github.io/  
版权：Copyright (c) 2026 HaoXiangHwang. All rights reserved.
