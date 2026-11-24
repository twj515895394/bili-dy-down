# 架构演进设计
## 基线
App.tsx 四路由；FloatingDock 半圆导航；Hero 组件；BiliFetchPage 管理解析/选择/入队；ProfileFetchPage 包装 SubscriptionPanel；api.ts 已有 biliFetchSpace；backend/api/bilibili.py 已有 /fetch-space；BiliUserCrawler 使用 WBI 投稿接口，当前上限100且从第一页开始。复用 BiliVideoParser、HTTP client、签名、Cookie DPAPI 解密及现有任务仓储。

## 目标链路
UI Hero -> api.ts -> FastAPI -> 平台采集适配器 -> 规范化作品摘要 -> 列表勾选 -> 视频详情/分P -> 现有下载任务 -> DASH/FFmpeg -> 本地目录/SQLite。

## 模块边界
采集只返回摘要，不创建任务；详情解析补齐 cid/pages；下载复用 startDownload 和原有任务状态。平台适配器提供 recognize/listPage/getDetail，初期不强制抽象全部旧代码。分页使用真实页码与页大小，返回下一页，保留旧 fetch-space 契约。前端按平台+作品ID去重，任务按平台+BV+cid+下载类型识别；不要用标题做身份键。

## 状态与可靠性
idle/loading/partial/ready/error/cancelled；切换来源时取消或忽略过期响应；翻页串行、保留已有结果，错误可重试当前页；禁止无限重试，遵循现有限速策略，遇到平台限制停止并提示。SQLite 变更须有迁移及兼容测试，不新增服务。先复用现有存储，按需抽取共享组件，避免一次性重构。

## 强制开发约束
仅在 codex-dev 增量开发；保留 Tauri 2、React/TypeScript、FastAPI、SQLite 和现有主题、悬浮导航、Hero、下载队列。不得擅自重构 UI、替换技术栈或引入 Redis、PostgreSQL、Docker 等额外运行依赖。保持 Windows 原生打包、原有接口和数据兼容；凭据不得进入日志、提交或导出。仅处理有权访问及下载的内容。
