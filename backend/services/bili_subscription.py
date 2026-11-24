"""B站订阅复用原有订阅表、扫描周期和下载队列。"""
from datetime import datetime, timezone
from fastapi import HTTPException
from app.crypto import decrypt_secret
from app.models import SubscriptionItem, SubscriptionItemStatus
from backend.state import ctx


def saved_cookie():
    return decrypt_secret(ctx.config_repo.get("bilibili_cookie") or "") or None if ctx.config_repo is not None else None


async def scan_bili_subscription(repo, sub):
    if ctx.bili_user_crawler is None:
        raise RuntimeError("B站服务未初始化")
    mid = int(sub.sec_user_id.split(":", 1)[1])
    count = scanned = 0
    seen = set()
    page = 1
    cookie = saved_cookie()
    while scanned < sub.max_items:
        posts, _, more = await ctx.bili_user_crawler.fetch_page(mid, page, 30, "pubdate", cookie)
        for post in posts:
            if post.bvid in seen:
                continue
            seen.add(post.bvid)
            scanned += 1
            if not repo.get_item_by_aweme_id(sub.id, post.bvid):
                repo.add_item(SubscriptionItem(id=None, subscription_id=sub.id, aweme_id=post.bvid,
                    url=f"https://www.bilibili.com/video/{post.bvid}", title=post.title, author=post.author,
                    author_sec_id=sub.sec_user_id, type="video", duration=str(post.duration),
                    image_count=None, cover_url=post.cover_url,
                    publish_time=datetime.fromtimestamp(post.pubdate, timezone.utc).isoformat() if post.pubdate else None,
                    status=SubscriptionItemStatus.NEW.value))
                count += 1
            if scanned >= sub.max_items:
                break
        if not more or not posts:
            break
        page += 1
        if page > (sub.max_items + 29) // 30 + 2:
            break
    return count, scanned


async def enqueue_bili_subscription(item):
    from backend.api.download import enqueue_download_items
    if ctx.bili_video_parser is None:
        raise HTTPException(503, "B站服务未初始化")
    cookie = saved_cookie()
    info = await ctx.bili_video_parser.parse_video(bvid=item.aweme_id, cookie=cookie)
    payload = []
    for page in info.pages:
        if page.cid <= 0:
            raise HTTPException(400, "分P缺少CID")
        streams = await ctx.bili_video_parser.parse_playurl(bvid=info.bvid, cid=page.cid, quality=80, cookie=cookie)
        audio = None
        if streams.dash:
            video = max(streams.video_streams, key=lambda s: s.bandwidth, default=None)
            audio_stream = max(streams.audio_streams, key=lambda s: s.bandwidth, default=None)
            if not video or not audio_stream:
                raise HTTPException(400, "缺少音视频流")
            url, audio = video.url, audio_stream.url
        else:
            url = streams.url
        if not url:
            raise HTTPException(400, "缺少视频流")
        payload.append(dict(url=url, no_watermark_url=url, audio_url=audio, bvid=info.bvid,
            aweme_id=info.bvid, cid=page.cid, page=page.page, title=item.title + (f" P{page.page}" if len(info.pages)>1 else ""),
            author=item.author, cover_url=item.cover_url, type="video"))
    if not payload:
        raise HTTPException(400, "没有可下载分P")
    return await enqueue_download_items("bilibili", item.url, payload)
