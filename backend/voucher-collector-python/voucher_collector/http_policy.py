# Origem: VoucherBot (https://github.com/Devathmaj/VoucherBot), licença Apache-2.0 (THIRD_PARTY/LICENSE-VoucherBot).
# Arquivo original: voucherbot/providers/http_policy.py (commit ab4dc19, lido em 2026-11-26).
# Modificações: as configurações (`settings`) viraram constantes (User-Agent do Probekit, intervalo de 2,0 s,
# robots.txt sempre respeitado); `structlog` virou `logging`; saiu o parâmetro `extra_headers` de
# `polite_get`; o resto (cache de robots.txt, travas por servidor, Crawl-delay) é o original.
"""HTTP scraping policy: identifying User-Agent, robots.txt, and per-host delays.

Prefer RSS/APIs, obey robots.txt / Crawl-delay, identify the bot, and stay at or
below ~0.5 req/s per host when no crawl-delay is published.
"""

from __future__ import annotations

import asyncio
import logging
import time
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import httpx

logger = logging.getLogger(__name__)

# Quem somos para os servidores: o nome do robô e onde achar quem o roda.
USER_AGENT = "ProbekitCollector/0.1 (+https://probekit.cc)"

# Intervalo mínimo entre duas requisições ao mesmo servidor, em segundos.
MIN_DELAY_SECONDS = 2.0

# Cache robots.txt parsers per host: (parser | None, fetched_at_monotonic)
_robots_cache: dict[str, tuple[RobotFileParser | None, float]] = {}
_robots_locks: dict[str, asyncio.Lock] = {}
_host_locks: dict[str, asyncio.Lock] = {}
_host_last_request: dict[str, float] = {}

_ROBOTS_TTL_SECONDS = 3600.0


class RobotsDisallowedError(Exception):
    """Raised when robots.txt forbids fetching the URL for our User-Agent."""


def default_headers(*, accept: str | None = None) -> dict[str, str]:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
    }
    if accept:
        headers["Accept"] = accept
    return headers


def _host(url: str) -> str:
    return urlparse(url).netloc.lower()


def _robots_url(url: str) -> str:
    parts = urlparse(url)
    return f"{parts.scheme}://{parts.netloc}/robots.txt"


def _lock_for(mapping: dict[str, asyncio.Lock], key: str) -> asyncio.Lock:
    lock = mapping.get(key)
    if lock is None:
        lock = asyncio.Lock()
        mapping[key] = lock
    return lock


async def _load_robots(url: str) -> RobotFileParser | None:
    """Fetch and cache robots.txt for the URL's host. None = treat as allow-all."""
    host = _host(url)
    now = time.monotonic()
    cached = _robots_cache.get(host)
    if cached and (now - cached[1]) < _ROBOTS_TTL_SECONDS:
        return cached[0]

    async with _lock_for(_robots_locks, host):
        cached = _robots_cache.get(host)
        if cached and (time.monotonic() - cached[1]) < _ROBOTS_TTL_SECONDS:
            return cached[0]

        robots_url = _robots_url(url)
        parser = RobotFileParser()
        parser.set_url(robots_url)
        try:
            async with httpx.AsyncClient(
                headers=default_headers(),
                follow_redirects=True,
                timeout=10.0,
            ) as client:
                resp = await client.get(robots_url)
                if resp.status_code == 404:
                    _robots_cache[host] = (None, time.monotonic())
                    return None
                resp.raise_for_status()
                text = resp.text
            await asyncio.to_thread(parser.parse, text.splitlines())
            _robots_cache[host] = (parser, time.monotonic())
            return parser
        except Exception as exc:
            logger.warning(
                "http_policy: robots.txt unavailable; allowing with default delay (host=%s, error=%s)",
                host,
                str(exc)[:160],
            )
            _robots_cache[host] = (None, time.monotonic())
            return None


async def crawl_delay_seconds(url: str) -> float:
    """Effective delay: robots Crawl-delay if present, else the configured minimum."""
    parser = await _load_robots(url)
    if parser is None:
        return MIN_DELAY_SECONDS

    try:
        delay = parser.crawl_delay(USER_AGENT)
        if delay is None:
            delay = parser.crawl_delay("*")
    except Exception:
        delay = None

    if delay is None:
        return MIN_DELAY_SECONDS
    try:
        return max(MIN_DELAY_SECONDS, float(delay))
    except (TypeError, ValueError):
        return MIN_DELAY_SECONDS


async def is_allowed(url: str) -> bool:
    """Return False when robots.txt disallows this User-Agent for ``url``."""
    parser = await _load_robots(url)
    if parser is None:
        return True

    try:
        allowed = parser.can_fetch(USER_AGENT, url)
    except Exception:
        allowed = True

    if not allowed:
        logger.info("http_policy: blocked by robots.txt (url=%s)", url)
    return allowed


async def wait_for_host(url: str) -> None:
    """Sleep so successive requests to the same host respect crawl delay."""
    host = _host(url)
    delay = await crawl_delay_seconds(url)
    if delay <= 0:
        return

    async with _lock_for(_host_locks, host):
        last = _host_last_request.get(host, 0.0)
        elapsed = time.monotonic() - last
        remaining = delay - elapsed
        if remaining > 0:
            logger.debug("http_policy: politeness wait (host=%s, seconds=%.2f)", host, remaining)
            await asyncio.sleep(remaining)
        _host_last_request[host] = time.monotonic()


async def polite_get(
    url: str,
    *,
    accept: str | None = None,
    timeout: float = 15.0,
) -> httpx.Response:
    """robots-aware GET with per-host delay.

    Raises:
        RobotsDisallowedError: when robots.txt forbids this User-Agent.
        httpx.HTTPError: on network / HTTP failures.
    """
    if not await is_allowed(url):
        raise RobotsDisallowedError(url)

    await wait_for_host(url)

    async with httpx.AsyncClient(
        headers=default_headers(accept=accept),
        follow_redirects=True,
        timeout=timeout,
    ) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response


def clear_policy_caches() -> None:
    """Test helper: reset robots and rate-limit state."""
    _robots_cache.clear()
    _host_last_request.clear()
