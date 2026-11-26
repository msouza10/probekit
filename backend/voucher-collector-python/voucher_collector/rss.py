# Origem: VoucherBot (https://github.com/Devathmaj/VoucherBot), licença Apache-2.0 (THIRD_PARTY/LICENSE-VoucherBot).
# Arquivo original: voucherbot/providers/rss/collector.py (commit ab4dc19, lido em 2026-11-26).
# Modificações: a classe `RssCollector` virou a função `collect(source, limit)`; todo erro que virava
# `return []` agora levanta `FeedError` com um código; saíram o leitor de feed JSON (nenhuma fonte usa:
# o "rssfeed.json" da Cisco é XML), o fallback com `urllib` e o download do artigo de cada entrada sem
# resumo (cada um custava no mínimo 2 s de espera por servidor); links que não são http(s) ou que faltam
# são descartados; `structlog` virou `logging`. As funções de apoio (`_normalize_feed_url`,
# `_looks_like_html`, `_feed_content_type_is_plausible`, `_clean_html`, `_parse_date`) são o original.
"""Leitura de feeds RSS e Atom.

`collect(fonte, limite)` baixa o feed (pela política HTTP: robots.txt, intervalo por
servidor, User-Agent do Probekit) e devolve os itens como `NormalizedPost`. Quando o feed
não pode ser lido, levanta `FeedError`, e o `code` diz por quê:

    robots       o robots.txt proíbe o nosso User-Agent
    http_error   o servidor respondeu com erro (404, 403, 503...)
    network      não conseguiu falar com o servidor (conexão, tempo esgotado)
    not_a_feed   respondeu, mas não é um feed (página HTML, imagem, texto solto)

Nenhum erro é engolido devolvendo uma lista vazia: `[]` quer dizer "o feed está vazio".
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse

import feedparser
import httpx
from bs4 import BeautifulSoup
from lxml import etree

from voucher_collector.http_policy import RobotsDisallowedError, polite_get
from voucher_collector.models import NormalizedPost
from voucher_collector.sources import Source
from voucher_collector.validate import safe_http_url

logger = logging.getLogger(__name__)

_FEED_ACCEPT = (
    "application/rss+xml, application/atom+xml, application/xml, "
    "application/json, text/xml, */*"
)

# Legacy Tech Community blog URLs redirect to login; map them to working syndication endpoints.
_TECHCOMMUNITY_FEED_REWRITES: dict[str, str] = {
    "https://techcommunity.microsoft.com/t5/microsoft-learn-blog/bg-p/MicrosoftLearnBlog/rss": (
        "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/Community"
        "?interaction.style=blog&labels=Microsoft+Learn+Blog"
    ),
}

# cloud.google.com/blog/rss now serves HTML; the Atom feed moved to cloudblog.withgoogle.com.
_GOOGLE_CLOUD_BLOG_RE = re.compile(
    r"^https://cloud\.google\.com/blog/rss/?$",
    re.IGNORECASE,
)


class FeedError(Exception):
    """O feed não pôde ser lido. `code`: robots, http_error, network ou not_a_feed."""

    def __init__(self, code: str, detail: str = "") -> None:
        super().__init__(f"{code}: {detail}" if detail else code)
        self.code = code


def _normalize_feed_url(feed_url: str) -> str:
    """Rewrite known-broken feed URLs while leaving custom configs untouched."""
    if feed_url in _TECHCOMMUNITY_FEED_REWRITES:
        return _TECHCOMMUNITY_FEED_REWRITES[feed_url]

    if _GOOGLE_CLOUD_BLOG_RE.match(feed_url):
        return "https://cloudblog.withgoogle.com/rss/"

    parsed = urlparse(feed_url)
    if (
        parsed.hostname == "techcommunity.microsoft.com"
        and parsed.path.endswith("/rss")
        and not parsed.path.startswith("/t5/s/")
        and parsed.path.startswith("/t5/")
        and "gxcuf89792" in parsed.path
    ):
        rewritten_path = parsed.path.replace("/t5/", "/t5/s/", 1)
        return parsed._replace(path=rewritten_path).geturl()

    return feed_url


def _looks_like_html(content: bytes) -> bool:
    start = content.lstrip()[:256].lower()
    return start.startswith(b"<!doctype html") or start.startswith(b"<html")


# Content-Types that can never carry an RSS/Atom feed. Anything else is
# allowed through so real feeds with missing/loose headers keep working.
_NON_FEED_CONTENT_TYPE_PREFIXES = (
    "image/",
    "audio/",
    "video/",
    "multipart/",
    "application/pdf",
    "application/zip",
    "application/gzip",
    "application/x-gzip",
    "application/x-tar",
    "application/msword",
    "application/vnd.",
)


def _feed_content_type_is_plausible(content_type: str | None) -> bool:
    """True when the response Content-Type is (or could be) a feed.

    Missing/unknown types pass through unchanged; only payloads that can
    never be a feed are rejected.
    """
    if not content_type:
        return True
    media_type = content_type.split(";", 1)[0].strip().lower()
    if not media_type:
        return True
    return not media_type.startswith(_NON_FEED_CONTENT_TYPE_PREFIXES)


def _clean_html(value: Any) -> str | None:
    if not value or not isinstance(value, str):
        return None
    return BeautifulSoup(value, "lxml").get_text(separator=" ", strip=True) or None


def _parse_date(entry: Any) -> datetime | None:
    """Parse a date from an RSS entry, trying multiple fields."""
    for attr in ("published_parsed", "updated_parsed"):
        val = getattr(entry, attr, None)
        if val:
            try:
                return datetime(*val[:6]).replace(tzinfo=UTC)
            except Exception:
                pass
    return None


def _recover_feed(content: bytes) -> Any:
    """Segunda chance para XML quebrado: o lxml conserta o que dá e o feedparser lê de novo."""
    parser = etree.XMLParser(recover=True)
    root = etree.fromstring(content, parser)
    if root is None:
        raise ValueError("XML parser returned no root element")
    return feedparser.parse(etree.tostring(root, encoding="unicode"))


async def collect(source: Source, limit: int) -> list[NormalizedPost]:
    """Os `limit` primeiros itens do feed de `source`, ou `FeedError` se ele não pôde ser lido."""
    feed_url = _normalize_feed_url(source.url)
    try:
        response = await polite_get(feed_url, accept=_FEED_ACCEPT)
    except RobotsDisallowedError as exc:
        raise FeedError("robots", source.id) from exc
    except httpx.HTTPStatusError as exc:
        raise FeedError("http_error", f"{source.id}: HTTP {exc.response.status_code}") from exc
    except httpx.HTTPError as exc:
        raise FeedError("network", f"{source.id}: {type(exc).__name__}") from exc

    content = response.content
    if not _feed_content_type_is_plausible(response.headers.get("content-type")) or (
        _looks_like_html(content)
    ):
        raise FeedError("not_a_feed", source.id)

    feed = await asyncio.to_thread(feedparser.parse, content)
    if feed.bozo and not feed.entries:
        logger.info("rss: standard parse failed, trying lxml recovery (source=%s)", source.id)
        try:
            feed = await asyncio.to_thread(_recover_feed, content)
        except Exception as exc:
            raise FeedError("not_a_feed", f"{source.id}: {type(exc).__name__}") from exc
        if feed.bozo and not feed.entries:
            raise FeedError("not_a_feed", source.id)

    posts: list[NormalizedPost] = []
    for entry in feed.entries[:limit]:
        url = safe_http_url(entry.get("link"))
        if url is None:
            continue
        posts.append(
            NormalizedPost(
                url=url,
                title=entry.get("title") or "(no title)",
                content=_clean_html(entry.get("summary") or entry.get("description")),
                summary=None,
                author=entry.get("author"),
                published_at=_parse_date(entry),
                raw_data={
                    "feed_url": feed_url,
                    "vendor": source.vendor_hint,
                    "tags": [t.get("term") for t in entry.get("tags", []) if t.get("term")],
                },
            )
        )

    logger.info("rss: collected (source=%s, count=%d)", source.id, len(posts))
    return posts
