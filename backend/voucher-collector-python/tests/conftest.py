"""Apoio compartilhado pelos testes: internet falsa, relógio falso e o marcador `cosmos`.

Nada aqui importa um módulo do coletor no topo do arquivo: os testes de um
módulo precisam continuar rodando mesmo que outro módulo ainda não exista.
"""

from __future__ import annotations

import asyncio
import os
import types

import pytest

try:
    import httpx
except ImportError:  # sem httpx, só as fixtures `internet` e `clock` ficam indisponíveis
    httpx = None


class Internet:
    """Servidor falso. Responde pelo (host, caminho) e guarda cada requisição.

    Troca o `httpx.AsyncClient` por um cliente ligado a este servidor. O que não
    foi registrado responde assim: o `robots.txt` dá 404 ("não existe, pode
    tudo") e qualquer outro caminho dá 200. Um teste que não fala de robots nem
    de erro não precisa registrar nada.
    """

    def __init__(self, monkeypatch: pytest.MonkeyPatch) -> None:
        if httpx is None:
            pytest.skip("instale o httpx para usar a internet falsa (pip install httpx)")
        self.routes: dict[tuple[str, str], tuple[int, str, str]] = {}
        self.falhas: dict[tuple[str, str], Exception] = {}
        self.requests: list[httpx.Request] = []
        cliente_real = httpx.AsyncClient
        monkeypatch.setattr(
            httpx,
            "AsyncClient",
            lambda **kwargs: cliente_real(
                transport=httpx.MockTransport(self._responder), **kwargs
            ),
        )

    def serve(
        self,
        host: str,
        path: str,
        status: int = 200,
        text: str = "",
        content_type: str = "application/xml",
    ) -> None:
        self.routes[(host, path)] = (status, text, content_type)

    def falha(self, host: str, path: str, erro: Exception) -> None:
        """Faz a requisição levantar `erro` (por exemplo `httpx.ConnectError`)."""
        self.falhas[(host, path)] = erro

    def _responder(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        chave = (request.url.host, request.url.path)
        if chave in self.falhas:
            raise self.falhas[chave]
        padrao = (404, "", "text/plain") if request.url.path == "/robots.txt" else (200, "ok", "text/plain")
        status, text, content_type = self.routes.get(chave, padrao)
        return httpx.Response(
            status, text=text, headers={"content-type": content_type}, request=request
        )

    def caminhos(self) -> list[str]:
        return [r.url.path for r in self.requests]


class Clock:
    """Relógio falso: `time.monotonic()` devolve `now`, e `sleep` só anota e avança `now`."""

    def __init__(self, monkeypatch: pytest.MonkeyPatch) -> None:
        from voucher_collector import http_policy

        self.now = 1000.0
        self.sleeps: list[float] = []

        async def sleep(seconds: float) -> None:
            self.sleeps.append(seconds)
            self.now += seconds

        # Troca só o nome visto pelo módulo. Trocar `time.monotonic` direto
        # quebraria o relógio interno do asyncio, que usa a mesma função.
        monkeypatch.setattr(
            http_policy, "time", types.SimpleNamespace(monotonic=lambda: self.now)
        )
        monkeypatch.setattr(
            http_policy,
            "asyncio",
            types.SimpleNamespace(
                Lock=asyncio.Lock, to_thread=asyncio.to_thread, sleep=sleep
            ),
        )


@pytest.fixture(autouse=True)
def caches_limpos():
    """Zera o cache de robots.txt e os intervalos por servidor entre os testes."""
    try:
        from voucher_collector import http_policy
    except ImportError:
        yield
        return
    http_policy.clear_policy_caches()
    yield
    http_policy.clear_policy_caches()


@pytest.fixture
def internet(monkeypatch):
    return Internet(monkeypatch)


@pytest.fixture
def clock(monkeypatch):
    return Clock(monkeypatch)


# --- testes que precisam de um Cosmos DB de verdade ------------------------


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "cosmos: precisa de um Cosmos DB de verdade (só roda com COSMOS_ENDPOINT definido)"
    )


def pytest_collection_modifyitems(config, items):
    if os.environ.get("COSMOS_ENDPOINT"):
        return
    pular = pytest.mark.skip(reason="defina COSMOS_ENDPOINT para rodar contra um Cosmos DB de verdade")
    for item in items:
        if "cosmos" in item.keywords:
            item.add_marker(pular)
