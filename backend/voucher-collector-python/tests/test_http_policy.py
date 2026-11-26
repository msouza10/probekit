"""Testes da política HTTP do coletor (robots.txt, intervalo por servidor, User-Agent).

Nenhum teste usa a internet nem espera de verdade. As fixtures `internet` e
`clock` (em conftest.py) trocam o `httpx.AsyncClient` por um servidor falso e o
relógio e o `sleep` do módulo por versões que só anotam quanto tempo "passou".

Para isso funcionar, o módulo `http_policy` precisa continuar usando
`httpx.AsyncClient(...)`, `time.monotonic()` e `asyncio.sleep(...)`
chamados por esses nomes (como no código original do VoucherBot).
"""

import asyncio

import httpx
import pytest

from voucher_collector.http_policy import (
    USER_AGENT,
    RobotsDisallowedError,
    polite_get,
)

FEED = "https://exemplo.com/feed.xml"


def pegar(*urls: str, **kwargs) -> list[httpx.Response]:
    """Chama `polite_get` para cada URL, em sequência, no mesmo laço de eventos."""

    async def principal():
        return [await polite_get(url, **kwargs) for url in urls]

    return asyncio.run(principal())


# --- robots.txt ------------------------------------------------------------


def test_robots_que_proibe_o_caminho_levanta_erro_e_nao_busca_o_feed(internet):
    internet.serve("exemplo.com", "/robots.txt", text="User-agent: *\nDisallow: /privado\n")

    with pytest.raises(RobotsDisallowedError):
        pegar("https://exemplo.com/privado/feed.xml")

    assert internet.caminhos() == ["/robots.txt"]


def test_robots_que_proibe_o_coletor_pelo_nome_bloqueia(internet):
    internet.serve(
        "exemplo.com", "/robots.txt", text="User-agent: ProbekitCollector\nDisallow: /\n"
    )

    with pytest.raises(RobotsDisallowedError):
        pegar(FEED)


def test_robots_que_proibe_so_outro_robo_deixa_passar(internet):
    internet.serve("exemplo.com", "/robots.txt", text="User-agent: OutroBot\nDisallow: /\n")
    internet.serve("exemplo.com", "/feed.xml", text="<rss/>")

    (resposta,) = pegar(FEED)

    assert resposta.text == "<rss/>"


def test_robots_404_permite(internet):
    internet.serve("exemplo.com", "/robots.txt", status=404)
    internet.serve("exemplo.com", "/feed.xml", text="<rss/>")

    (resposta,) = pegar(FEED)

    assert resposta.status_code == 200


def test_robots_com_erro_do_servidor_permite(internet):
    # Decisão herdada do VoucherBot: robots.txt que não carrega (5xx, rede) não
    # impede a coleta. Se preferir ser mais estrito, mude o código E este teste.
    internet.serve("exemplo.com", "/robots.txt", status=503)
    internet.serve("exemplo.com", "/feed.xml", text="<rss/>")

    (resposta,) = pegar(FEED)

    assert resposta.status_code == 200


def test_robots_e_buscado_uma_vez_por_servidor(internet, clock):
    internet.serve("exemplo.com", "/robots.txt", text="User-agent: *\nAllow: /\n")
    internet.serve("exemplo.com", "/a", text="a")
    internet.serve("exemplo.com", "/b", text="b")

    pegar("https://exemplo.com/a", "https://exemplo.com/b")

    assert internet.caminhos().count("/robots.txt") == 1


# --- intervalo entre requisições ao mesmo servidor -------------------------


def test_duas_chamadas_ao_mesmo_servidor_esperam_2_segundos(internet, clock):
    pegar("https://exemplo.com/a", "https://exemplo.com/b")

    assert clock.sleeps == [pytest.approx(2.0)]


def test_nao_espera_se_o_intervalo_ja_passou(internet, clock):
    async def principal():
        await polite_get("https://exemplo.com/a")
        clock.now += 5.0
        await polite_get("https://exemplo.com/b")

    asyncio.run(principal())

    assert clock.sleeps == []


def test_servidores_diferentes_nao_esperam_um_pelo_outro(internet, clock):
    pegar("https://exemplo.com/a", "https://outro.com/a")

    assert clock.sleeps == []


def test_crawl_delay_do_robots_maior_que_o_minimo_vale(internet, clock):
    internet.serve("exemplo.com", "/robots.txt", text="User-agent: *\nCrawl-delay: 5\n")

    pegar("https://exemplo.com/a", "https://exemplo.com/b")

    assert clock.sleeps == [pytest.approx(5.0)]


# --- identificação e erros -------------------------------------------------


def test_user_agent_identifica_o_probekit_no_robots_e_no_feed(internet):
    pegar(FEED, accept="application/rss+xml")

    assert len(internet.requests) == 2  # robots.txt e o feed
    assert {r.headers["user-agent"] for r in internet.requests} == {USER_AGENT}
    assert USER_AGENT.startswith("ProbekitCollector/")


def test_accept_pedido_vai_so_no_feed(internet):
    pegar(FEED, accept="application/rss+xml")

    feed = next(r for r in internet.requests if r.url.path == "/feed.xml")
    assert feed.headers["accept"] == "application/rss+xml"


def test_resposta_de_erro_do_feed_levanta_httpx_status_error(internet):
    internet.serve("exemplo.com", "/feed.xml", status=503)

    with pytest.raises(httpx.HTTPStatusError) as erro:
        pegar(FEED)

    assert erro.value.response.status_code == 503
