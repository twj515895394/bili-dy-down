"""Public Bilibili collection/series/favorites page adapter."""
from urllib.parse import urlparse, parse_qs
import re

from crawlers.bilibili.bili_user_crawler import _normalize_cover_url, _parse_duration

BASE = "https://api.bilibili.com"


def collection_source(url: str):
    parsed = urlparse(url)
    if parsed.scheme not in ("https", "http") or parsed.hostname not in ("space.bilibili.com", "www.bilibili.com", "bilibili.com"):
        raise ValueError("请输入 B 站合集、系列或公开收藏夹链接")
    q = parse_qs(parsed.query)
    def number(key):
        value = q.get(key, [""])[0]
        return int(value) if value.isascii() and value.isdigit() and int(value) > 0 else None
    parts = parsed.path.strip("/").split("/")
    mid = int(parts[0]) if parsed.hostname == "space.bilibili.com" and parts[0].isdigit() else number("mid")
    if "favlist" in parts or "fav" in parts:
        fid = number("fid") or number("media_id")
        if fid:
            return "favorite", mid, fid
    if "lists" in parts:
        index = parts.index("lists") + 1
        if index < len(parts) and parts[index].isdigit() and int(parts[index]) > 0 and mid:
            kind = q.get("type", ["season"])[0]
            if kind in ("season", "series"):
                return kind, mid, int(parts[index])
    sid = number("season_id")
    if sid and mid:
        return "season", mid, sid
    sid = number("series_id")
    if sid and mid:
        return "series", mid, sid
    raise ValueError("链接缺少合集、系列或收藏夹 ID；请复制具体列表地址")


async def fetch_collection_page(client, url, page, size, cookie=None):
    from crawlers.http_client import pagination_throttle
    kind, mid, ident = collection_source(url)
    if page > 1:
        await pagination_throttle()
    if kind == "season":
        endpoint = "/x/polymer/web-space/seasons_archives_list"
        params = {"mid": mid, "season_id": ident, "page_num": page, "page_size": size}
    elif kind == "series":
        endpoint = "/x/series/archives"
        params = {"mid": mid, "series_id": ident, "pn": page, "ps": size, "sort": "desc"}
    else:
        endpoint = "/x/v3/fav/resource/list"
        params = {"media_id": ident, "pn": page, "ps": min(size, 20), "keyword": "", "order": "mtime", "type": 0, "tid": 0, "platform": "web"}
        size = min(size, 20)
    data = await client.get_json(BASE + endpoint, params, signed=False, cookie=cookie)
    if not isinstance(data, dict):
        raise ValueError("集合响应格式异常")
    rows = data.get("medias") if kind == "favorite" else data.get("archives")
    if rows is None and kind == "favorite" and (data.get("info") or {}).get("media_count") == 0:
        rows = []
    if not isinstance(rows, list):
        raise ValueError("无法获取集合列表，请检查权限或接口变更")
    total = (data.get("info") or {}).get("media_count") if kind == "favorite" else (data.get("page") or {}).get("total")
    if total is None:
        total = (data.get("meta") or {}).get("total")
    items = []
    seen = set()
    for row in rows:
        if not isinstance(row, dict):
            continue
        bvid = row.get("bvid")
        if not isinstance(bvid, str) or not re.fullmatch(r"BV[0-9A-Za-z]{9,10}", bvid) or bvid in seen:
            continue
        seen.add(bvid)
        owner = row.get("upper") or row.get("owner") or {}
        stat = row.get("cnt_info") or row.get("stat") or {}
        items.append({"url": "https://www.bilibili.com/video/" + bvid, "type": "video", "bvid": bvid,
                      "aid": row.get("aid") or row.get("id"), "title": row.get("title"),
                      "author": owner.get("name"), "author_mid": owner.get("mid") or mid,
                      "cover_url": _normalize_cover_url(row.get("pic") or row.get("cover") or ""),
                      "duration": _parse_duration(row.get("duration")), "view_count": stat.get("view") or stat.get("play"),
                      "publish_time": row.get("pubdate") or row.get("ctime"), "description": row.get("intro")})
    explicit = data.get("has_more")
    more = bool(rows) and (explicit if isinstance(explicit, bool) else page * size < total if isinstance(total, int) else len(rows) >= size)
    return {"items": items, "total": total, "has_more": more, "next_page": page + 1 if more else None, "page": page, "page_size": size}
