# API 契约
以下新增接口为设计，不是已实现声明；路径相对于现有 API 前缀。

## 兼容接口
POST /bilibili/fetch-space: {url, mid?, max_count:1..100} -> {items,has_more,total}；保留原行为。POST /bilibili/parse 现有批量上限50；用于补齐选中视频详情，分批且保持并发限制。POST /bilibili/playurl、现有 startDownload 不改契约。

## 新分页接口（Phase 2）
POST /bilibili/space/page: {url?,mid?,page:1,page_size:30,order:'pubdate'|'click'} -> {items,total,has_more,next_page,mid,page,page_size}。URL/MID 至少一个，冲突报错；page>=1，page_size 受平台上限及验证限制；next_page 无更多为 null。摘要：url,type,bvid,aid,title,author,author_mid,cover_url,duration,view_count,danmaku_count,publish_time,description；未知字段 null，不伪造。页码随排序固定，跨页按 BV 去重，动态投稿可能造成漂移。

## 后续接口
POST /bilibili/collections/page、/bilibili/favorites/page：{url,page,page_size}，返回同一列表契约；先验证合集/系列/收藏夹实际接口及权限。统一采集接口后续采用 {platform,source_type,source_id,page,order}，保持旧接口。

## 错误
400 输入或平台业务错误，503 服务未初始化；新接口可附稳定 error_code（INVALID_URL/COOKIE_REQUIRED/RATE_LIMIT/UPSTREAM_ERROR），不得泄漏 Cookie。空页与失败区分，遇到 -412 等停止并提示，不承诺绕过风控。

## 强制开发约束
仅在 codex-dev 增量开发；保留 Tauri 2、React/TypeScript、FastAPI、SQLite 和现有主题、悬浮导航、Hero、下载队列。不得擅自重构 UI、替换技术栈或引入 Redis、PostgreSQL、Docker 等额外运行依赖。保持 Windows 原生打包、原有接口和数据兼容；凭据不得进入日志、提交或导出。仅处理有权访问及下载的内容。
