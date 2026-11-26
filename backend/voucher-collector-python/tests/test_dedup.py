from voucher_collector.dedup import (
    content_hash,
    deduplicate_batch,
    identity_hash,
    normalise_url,
)
from voucher_collector.models import NormalizedPost


def post(url: str, title: str = "titulo") -> NormalizedPost:
    return NormalizedPost(url=url, title=title)


# --- normalise_url ---------------------------------------------------------


def test_normalise_url_tira_rastreio_fragmento_barra_e_maiuscula_do_host():
    assert (
        normalise_url("http://Exemplo.com/a/?utm_source=x&b=1#frag")
        == "https://exemplo.com/a?b=1"
    )


def test_normalise_url_mantem_parametro_que_muda_a_pagina():
    assert normalise_url("https://x.com/a?id=7&utm_source=y") == "https://x.com/a?id=7"


def test_normalise_url_ignora_maiuscula_no_nome_do_parametro_de_rastreio():
    assert normalise_url("https://x.com/a?UTM_Source=x") == "https://x.com/a"


def test_normalise_url_so_espacos_vira_vazia():
    assert normalise_url("   ") == ""


# --- identity_hash ---------------------------------------------------------


def test_identity_hash_e_igual_para_a_mesma_pagina_escrita_de_jeitos_diferentes():
    assert identity_hash("http://exemplo.com/a/") == identity_hash(
        "https://exemplo.com/a?utm_campaign=z"
    )


def test_identity_hash_tem_64_caracteres_hexadecimais():
    h = identity_hash("https://x.com")
    assert len(h) == 64
    int(h, 16)  # levanta ValueError se tiver algo que não é hexadecimal


def test_identity_hash_muda_quando_a_pagina_muda():
    assert identity_hash("https://x.com/a") != identity_hash("https://x.com/b")


# --- content_hash ----------------------------------------------------------


def test_content_hash_ignora_espacos_repetidos_e_maiusculas():
    assert content_hash("Título  X", None, None) == content_hash("título x", None, None)


def test_content_hash_tem_40_caracteres():
    assert len(content_hash("Título X", None, None)) == 40


def test_content_hash_muda_quando_o_conteudo_muda():
    assert content_hash("t", "um texto", None) != content_hash("t", "outro texto", None)


# --- deduplicate_batch -----------------------------------------------------


def test_deduplicate_batch_mantem_so_a_primeira_de_duas_com_a_mesma_url_normalizada():
    primeira = post("http://exemplo.com/a/", "primeira")
    repetida = post("https://exemplo.com/a?utm_source=feed2", "repetida")

    assert deduplicate_batch([primeira, repetida]) == [primeira]


def test_deduplicate_batch_preserva_a_ordem_das_diferentes():
    a, b, c = post("https://x.com/a"), post("https://x.com/b"), post("https://x.com/c")

    assert deduplicate_batch([a, b, a, c, b]) == [a, b, c]
