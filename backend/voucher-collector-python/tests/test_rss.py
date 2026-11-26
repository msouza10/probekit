"""Testes da leitura de feeds (rss.py).

`collect(fonte, limite)` baixa o feed (pela política HTTP, que respeita o
robots.txt e espera entre requisições) e devolve os itens como `NormalizedPost`.
Quando o feed não pode ser lido, levanta `FeedError` com um código:

    robots       o robots.txt proíbe o nosso User-Agent
    http_error   o servidor respondeu com erro (404, 403, 503...)
    network      não conseguiu falar com o servidor (conexão, tempo esgotado)
    not_a_feed   respondeu, mas não é um feed (página HTML, imagem, texto solto)

É esse código que o job anota em `feeds_failed`. Por isso nenhum erro pode ser
engolido devolvendo uma lista vazia: `[]` quer dizer "o feed está vazio".

O servidor e o relógio são falsos (fixtures `internet` e `clock`, em conftest.py).
"""

import asyncio
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pytest

from voucher_collector.rss import FeedError, collect
from voucher_collector.sources import Source

FIXTURES = Path(__file__).resolve().parent / "fixtures"
FEED_XML = (FIXTURES / "feed.xml").read_text(encoding="utf-8")
PAGINA_HTML = (FIXTURES / "pagina.html").read_text(encoding="utf-8")

FONTE = Source("exemplo", "Exemplo", "blog", "https://exemplo.com/feed.xml", "aws", True)


def coletar(fonte: Source = FONTE, limite: int = 25):
    return asyncio.run(collect(fonte, limite))


def servir_feed(internet, texto: str = FEED_XML, path: str = "/feed.xml", content_type: str = "application/rss+xml; charset=utf-8"):
    internet.serve("exemplo.com", path, text=texto, content_type=content_type)


def texto_do(post) -> str:
    """O texto limpo do post, esteja em `content` ou em `summary`."""
    return post.content or post.summary or ""


# --- o que sai de um feed bom ----------------------------------------------


def test_devolve_so_as_entradas_validas_na_ordem_do_feed(internet, clock):
    servir_feed(internet)

    posts = coletar()

    assert [p.title for p in posts] == [
        "Free exam voucher for AZ-104",
        "Post sem data",
        "Data com fuso",
    ]


def test_url_vem_como_esta_no_feed_sem_normalizar(internet, clock):
    # Quem normaliza para deduplicar é o dedup.py; o item guarda o link original.
    servir_feed(internet)

    assert coletar()[0].url == "https://exemplo.com/posts/1?utm_source=feed"


def test_data_de_publicacao_vira_utc(internet, clock):
    servir_feed(internet)

    primeiro, _, com_fuso = coletar()

    esperado = datetime(2026, 11, 24, 14, 2, 0, tzinfo=UTC)
    assert primeiro.published_at == esperado
    assert com_fuso.published_at == esperado  # 11:02 em -0300 é 14:02 em UTC
    assert primeiro.published_at.utcoffset().total_seconds() == 0


def test_entrada_sem_data_fica_com_published_at_none(internet, clock):
    servir_feed(internet)

    assert coletar()[1].published_at is None


def test_resumo_vira_texto_puro_sem_html(internet, clock):
    servir_feed(internet)

    texto = texto_do(coletar()[0])

    assert texto == "Olá mundo"


def test_entidades_do_resumo_viram_caracteres(internet, clock):
    servir_feed(internet)

    texto = texto_do(coletar()[2])

    assert texto == "Save 50% & more"
    assert "&amp;" not in texto


def test_respeita_o_limite_de_itens(internet, clock):
    servir_feed(internet)

    assert [p.title for p in coletar(limite=2)] == ["Free exam voucher for AZ-104", "Post sem data"]


# --- entradas que não podem virar item -------------------------------------


def test_entrada_sem_link_e_descartada(internet, clock):
    # Sem link, o id do item (hash da URL) seria o mesmo para todas as entradas
    # sem link, e elas virariam um item só, sem página nenhuma para visitar.
    servir_feed(internet)

    assert "Entrada sem link" not in [p.title for p in coletar()]


def test_link_que_nao_e_http_nem_https_e_descartado(internet, clock):
    servir_feed(internet)

    posts = coletar()

    assert "Entrada com link perigoso" not in [p.title for p in posts]
    assert all(p.url.startswith(("http://", "https://")) for p in posts)


# --- formatos de feed ------------------------------------------------------


def test_feed_xml_servido_numa_url_que_termina_em_json_e_lido(internet, clock):
    # Caso real: o "rssfeed.json" da Cisco é RSS em XML (Content-Type text/xml).
    fonte = Source("cisco", "Cisco", "rss", "https://exemplo.com/rssfeed.json", None, True)
    servir_feed(internet, path="/rssfeed.json", content_type="text/xml;charset=utf-8")

    assert len(coletar(fonte)) == 3


def test_feed_valido_sem_itens_devolve_lista_vazia(internet, clock):
    servir_feed(internet, '<?xml version="1.0"?><rss version="2.0"><channel><title>x</title></channel></rss>')

    assert coletar() == []


def test_feed_cortado_no_meio_ainda_devolve_o_que_chegou_inteiro(internet, clock):
    corte = FEED_XML.index("</item>") + len("</item>")
    servir_feed(internet, FEED_XML[:corte])

    assert [p.title for p in coletar()] == ["Free exam voucher for AZ-104"]


# --- erros: nada some em silêncio ------------------------------------------


def erro_ao_coletar(fonte: Source = FONTE) -> FeedError:
    with pytest.raises(FeedError) as erro:
        coletar(fonte)
    return erro.value


def test_pagina_html_no_lugar_do_feed_e_not_a_feed(internet, clock):
    servir_feed(internet, PAGINA_HTML, content_type="text/html; charset=utf-8")

    assert erro_ao_coletar().code == "not_a_feed"


def test_html_com_content_type_de_feed_tambem_e_not_a_feed(internet, clock):
    # Servidores mentem no Content-Type; o conteúdo é que manda.
    servir_feed(internet, PAGINA_HTML, content_type="application/rss+xml")

    assert erro_ao_coletar().code == "not_a_feed"


def test_content_type_que_nunca_e_feed_e_not_a_feed(internet, clock):
    # O corpo é um feed válido de propósito: só o Content-Type (imagem) o denuncia.
    servir_feed(internet, FEED_XML, content_type="image/png")

    assert erro_ao_coletar().code == "not_a_feed"


def test_texto_solto_que_nao_e_feed_e_not_a_feed(internet, clock):
    servir_feed(internet, "isto não é um feed, é só uma frase", content_type="text/plain")

    assert erro_ao_coletar().code == "not_a_feed"


@pytest.mark.parametrize("status", [401, 403, 404, 500, 503])
def test_resposta_de_erro_do_servidor_e_http_error(internet, clock, status):
    internet.serve("exemplo.com", "/feed.xml", status=status)

    assert erro_ao_coletar().code == "http_error"


@pytest.mark.parametrize(
    "falha", [httpx.ConnectError("sem rota"), httpx.ReadTimeout("demorou demais")]
)
def test_falha_de_conexao_e_network(internet, clock, falha):
    internet.falha("exemplo.com", "/feed.xml", falha)

    assert erro_ao_coletar().code == "network"


def test_robots_que_proibe_e_robots_e_o_feed_nem_e_pedido(internet, clock):
    internet.serve("exemplo.com", "/robots.txt", text="User-agent: *\nDisallow: /\n", content_type="text/plain")

    assert erro_ao_coletar().code == "robots"
    assert "/feed.xml" not in internet.caminhos()


def test_o_erro_diz_qual_fonte_falhou(internet, clock):
    internet.serve("exemplo.com", "/feed.xml", status=404)

    assert FONTE.id in str(erro_ao_coletar())


def test_feed_error_guarda_o_codigo():
    erro = FeedError("robots")

    assert isinstance(erro, Exception)
    assert erro.code == "robots"
