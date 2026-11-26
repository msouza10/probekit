"""Testes do filtro de palavras-chave (scoring.py).

`score(texto)` soma o peso de cada palavra de KEYWORDS que aparece no texto e
devolve também quais casaram. O chamador junta título e conteúdo antes
(`f"{titulo} {conteudo or ''}"`); aqui o texto já chega pronto.
"""

import dataclasses

import pytest

from voucher_collector.scoring import KEYWORDS, THRESHOLD, Keyword, score

# Os 34 pesos do VoucherBot (voucherbot/database/bootstrap.py, commit ab4dc19).
# A Task 20 recalibra o filtro com dados reais. Quando isso acontecer, este
# dicionário muda de propósito, junto com o código.
PESOS_INICIAIS = {
    "voucher": 5,
    "coupon": 5,
    "100% off": 5,
    "promo code": 5,
    "free exam": 5,
    "exam voucher": 5,
    "certification voucher": 5,
    "free certification": 4,
    "free access": 4,
    "discount": 4,
    "redeem": 4,
    "50% off": 4,
    "retake": 3,
    "safeguard": 3,
    "limited time": 3,
    "beta access": 3,
    "free tier": 3,
    "register now": 1,
    "webinar": 1,
    "virtual event": 1,
    "virtual training": 2,
    "free training": 2,
    "live session": 1,
    "certification": 1,
    "exam": 1,
    "pearsonvue": 2,
    "beta exam": 4,
    "exam credit": 5,
    "free trial": 3,
    "sponsored": 2,
    "waived": 4,
    "no cost": 4,
    "complimentary": 4,
    "free badge": 3,
}


# --- a lista de palavras ---------------------------------------------------


def test_keywords_tem_as_34_palavras_do_voucherbot_com_os_mesmos_pesos():
    assert {k.keyword: k.score for k in KEYWORDS} == PESOS_INICIAIS


def test_keywords_nao_repete_palavra():
    nomes = [k.keyword for k in KEYWORDS]
    assert len(nomes) == len(set(nomes)) == 34


def test_palavras_estao_em_minusculas_e_sem_espaco_nas_pontas():
    # `score` compara com o texto em minúsculas: uma palavra com maiúscula
    # na lista nunca casaria, e ninguém perceberia.
    for k in KEYWORDS:
        assert k.keyword == k.keyword.lower().strip(), k.keyword


def test_keywords_e_uma_tupla_de_keyword_imutaveis():
    assert isinstance(KEYWORDS, tuple)
    assert all(isinstance(k, Keyword) for k in KEYWORDS)
    with pytest.raises(dataclasses.FrozenInstanceError):
        KEYWORDS[0].score = 99  # type: ignore[misc]


def test_corte_inicial_e_1():
    assert THRESHOLD == 1


# --- score -----------------------------------------------------------------


def test_exemplo_do_plano_free_exam_voucher():
    # voucher 5 + free exam 5 + exam voucher 5 + exam 1
    assert score("Free exam voucher") == (
        16,
        ["voucher", "free exam", "exam voucher", "exam"],
    )


def test_texto_sem_palavra_chave_vale_zero():
    assert score("Docker blog post") == (0, [])


def test_texto_vazio_vale_zero():
    assert score("") == (0, [])


def test_ignora_maiusculas():
    assert score("FREE EXAM VOUCHER") == score("free exam voucher")


def test_palavras_casadas_saem_na_ordem_da_lista_e_nao_na_do_texto():
    # No texto vem "exam" antes de "voucher", mas na lista "voucher" vem primeiro.
    assert score("Exam voucher") == (11, ["voucher", "exam voucher", "exam"])


def test_palavra_repetida_no_texto_conta_uma_vez():
    assert score("voucher voucher voucher") == (5, ["voucher"])


def test_palavras_com_simbolo_e_espaco():
    assert score("Get 50% off today") == (4, ["50% off"])
    assert score("Take 100% off your exam") == (6, ["100% off", "exam"])


def test_uma_palavra_de_1_ponto_ja_passa_no_corte():
    pontos, casadas = score("Join our webinar")

    assert (pontos, casadas) == (1, ["webinar"])
    assert pontos >= THRESHOLD


def test_texto_sem_palavra_fica_abaixo_do_corte():
    assert score("Docker blog post")[0] < THRESHOLD


# --- comportamento herdado do VoucherBot -----------------------------------
# A busca é por trecho do texto, não por palavra inteira. Isso tem um lado bom
# (o plural "certifications" casa) e um lado ruim ("example" contém "exam").
# Os dois testes abaixo registram o que o código HOJE faz. A Task 20 pode trocar
# a busca por palavra inteira; se isso acontecer, o segundo teste muda de propósito.


def test_plural_casa_por_trecho():
    assert score("New certifications announced") == (1, ["certification"])


def test_palavra_que_so_contem_exam_tambem_casa():
    assert score("Example domain") == (1, ["exam"])
