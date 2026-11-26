"""Testes da validação do que o LLM devolve (validate.py).

A resposta do LLM é dado NÃO confiável: um post pode tentar instruí-lo a
devolver um código com HTML, um link de golpe ou um percentual absurdo. Estas
funções são a última barreira antes de o dado ir para o banco e para o site.
"""

import pytest

from voucher_collector.schema import ExtractedEvent
from voucher_collector.validate import (
    PROMOTION_TYPES,
    clean_voucher_code,
    normalise_promotion_type,
    parse_discount_percent,
    safe_http_url,
    sanitize,
)

# --- parse_discount_percent ------------------------------------------------


@pytest.mark.parametrize(
    "texto, esperado",
    [
        ("50% off", 50),
        ("up to 100%", 100),
        ("Save 25% on any exam", 25),
        ("1%", 1),
        ("50 %", 50),
    ],
)
def test_percentual_valido(texto, esperado):
    assert parse_discount_percent(texto) == esperado


@pytest.mark.parametrize(
    "texto",
    [
        "US$ 100",  # valor em dinheiro não é percentual
        "150%",  # acima de 100
        "101%",
        "0%",
        "free exam",
        "",
        None,
    ],
)
def test_percentual_invalido_vira_none(texto):
    assert parse_discount_percent(texto) is None


# --- clean_voucher_code ----------------------------------------------------


@pytest.mark.parametrize(
    "bruto, esperado",
    [
        ("save-50", "SAVE-50"),
        ("  SAVE50  ", "SAVE50"),
        ("A_B-1", "A_B-1"),
        ("ABC", "ABC"),  # 3 caracteres: o mínimo
        ("A" * 40, "A" * 40),  # 40 caracteres: o máximo
    ],
)
def test_codigo_valido(bruto, esperado):
    assert clean_voucher_code(bruto) == esperado


@pytest.mark.parametrize(
    "bruto",
    [
        "ab",  # curto demais
        "A" * 41,  # longo demais
        "<script>",
        "SAVE 50",  # espaço no meio
        "SAVE50!",
        "SÁVE50",  # acento
        "'; DROP TABLE x;--",
        "",
        None,
    ],
)
def test_codigo_invalido_vira_none(bruto):
    assert clean_voucher_code(bruto) is None


# --- safe_http_url ---------------------------------------------------------


@pytest.mark.parametrize("url", ["https://a.com/x", "http://a.com/x?y=1#z"])
def test_url_http_e_https_passam_sem_mudar(url):
    assert safe_http_url(url) == url


@pytest.mark.parametrize(
    "url",
    [
        "javascript:alert(1)",
        "JavaScript:alert(1)",
        "java\nscript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "ftp://a.com/x",
        "file:///etc/passwd",
        "//evil.com/x",  # sem esquema
        "https://",  # sem host
        "a.com/x",
        "",
        None,
    ],
)
def test_url_que_nao_e_http_nem_https_vira_none(url):
    assert safe_http_url(url) is None


# --- normalise_promotion_type ----------------------------------------------


def test_conjunto_inicial_de_tipos():
    # Conjunto inicial do plano. A Task 8 lê o prompt do analyzer por inteiro e
    # pode fechá-lo de outro jeito; se mudar, mude aqui junto.
    assert PROMOTION_TYPES == {"voucher", "discount", "free_exam", "beta_exam", "other"}


@pytest.mark.parametrize(
    "bruto, esperado",
    [
        ("Free Exam", "free_exam"),
        ("VOUCHER", "voucher"),
        ("discount", "discount"),
        ("beta exam", "beta_exam"),
        ("  free_exam  ", "free_exam"),
    ],
)
def test_tipo_conhecido_e_normalizado(bruto, esperado):
    assert normalise_promotion_type(bruto) == esperado


@pytest.mark.parametrize("bruto", ["cupom misterioso", "", None, "<b>voucher</b>"])
def test_tipo_desconhecido_vira_other(bruto):
    assert normalise_promotion_type(bruto) == "other"


# --- sanitize --------------------------------------------------------------


def evento_malicioso() -> ExtractedEvent:
    return ExtractedEvent(
        is_voucher=True,
        confidence=0.9,
        vendor="AWS",
        promotion_type="Free Exam",
        voucher_code="<script>alert(1)</script>",
        registration_url="javascript:alert(1)",
        discount="50% off",
    )


def test_sanitize_limpa_codigo_url_e_tipo():
    limpo = sanitize(evento_malicioso())

    assert limpo.voucher_code is None
    assert limpo.registration_url is None
    assert limpo.promotion_type == "free_exam"


def test_sanitize_preserva_o_que_e_valido():
    evento = ExtractedEvent(
        is_voucher=True,
        confidence=0.8,
        vendor="aws",
        promotion_type="discount",
        voucher_code="save50",
        registration_url="https://aws.amazon.com/certification/",
        discount="50% off",
        certifications=["SAA-C03"],
        start_date="2026-11-20",
        end_date="2026-11-30",
        regions=["Global"],
    )

    limpo = sanitize(evento)

    assert limpo.voucher_code == "SAVE50"
    assert limpo.registration_url == "https://aws.amazon.com/certification/"
    assert limpo.promotion_type == "discount"
    assert limpo.discount == "50% off"
    assert limpo.certifications == ["SAA-C03"]
    assert (limpo.start_date, limpo.end_date) == ("2026-11-20", "2026-11-30")
    assert limpo.is_voucher is True
    assert limpo.confidence == 0.8


@pytest.mark.parametrize("confianca, esperado", [(7.0, 1.0), (-3.0, 0.0), (0.5, 0.5)])
def test_sanitize_mantem_confidence_entre_0_e_1(confianca, esperado):
    # `model_construct` pula a validação do pydantic: simula um valor ruim que
    # chegou por outro caminho. O `sanitize` não pode confiar que já foi limpo.
    evento = ExtractedEvent.model_construct(is_voucher=True, confidence=confianca)

    assert sanitize(evento).confidence == esperado


def test_sanitize_tipo_ausente_vira_other():
    assert sanitize(ExtractedEvent(is_voucher=True, confidence=0.9)).promotion_type == "other"
