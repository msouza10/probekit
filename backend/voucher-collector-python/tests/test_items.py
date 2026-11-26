"""Testes do ciclo de vida do item (items.py), conforme a ADR-0015.

Um item nasce `pending`, é analisado pelo LLM (`done`) ou falha 5 vezes
(`failed`), e o criador pode escondê-lo à mão (`hidden`). Estas funções são puras:
recebem dicionários e devolvem dicionários, sem banco nem rede.

O resultado de uma análise (`AnalysisOutcome`) chega aqui como um objeto com
`kind`, `result`, `model` e `error_code`. Os testes usam um objeto simples com
esses quatro atributos, para não depender do analyzer.py (e dos SDKs do LLM).
"""

import json
from datetime import UTC, datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from voucher_collector.items import (
    MAX_ATTEMPTS,
    apply_outcome,
    build_item,
    is_visible_to_api,
    merge_existing,
)
from voucher_collector.models import NormalizedPost
from voucher_collector.schema import ExtractedEvent
from voucher_collector.sources import Source

NOW = datetime(2026, 11, 24, 14, 2, 0, tzinfo=UTC)
LATER = NOW + timedelta(hours=1)

FONTE = Source("aws_blog", "AWS Blog", "blog", "https://aws.amazon.com/feed", "aws", True)
OUTRA_FONTE = Source("aws_builder", "AWS Builder", "rss", "https://builder.aws.com/rss", "aws", True)


def post(**mudancas) -> NormalizedPost:
    campos = dict(
        url="https://exemplo.com/a",
        title="Título do post",
        content="Texto do post",
        published_at=datetime(2026, 11, 20, 14, 2, 0, tzinfo=UTC),
    )
    campos.update(mudancas)
    return NormalizedPost(**campos)


def novo(fonte: Source = FONTE, agora: datetime = NOW, **mudancas) -> dict:
    return build_item(post(**mudancas), fonte, 12, ["voucher", "exam"], agora)


def evento(**mudancas) -> ExtractedEvent:
    campos = dict(is_voucher=True, confidence=0.9, vendor="aws", discount="50% off")
    campos.update(mudancas)
    return ExtractedEvent(**campos)


def resultado(kind: str, result=None, model=None, error_code=None):
    return SimpleNamespace(kind=kind, result=result, model=model, error_code=error_code)


def analisado(item: dict | None = None, **mudancas_evento) -> dict:
    return apply_outcome(
        item or novo(), resultado("done", evento(**mudancas_evento), "openai/gpt-oss-20b"), NOW, 1
    )


# --- build_item ------------------------------------------------------------


def test_item_novo_tem_os_campos_fixos_e_nasce_pendente():
    item = novo()

    assert item["pk"] == "v1"
    assert item["type"] == "item"
    assert item["schema_version"] == 1
    assert item["analysis"] == {"status": "pending", "attempts": 0}


def test_item_novo_sempre_traz_hidden_falso():
    # Sem o campo `hidden`, a consulta da API (`c.hidden = false`) não acha o
    # item e ele some da página sem erro nenhum.
    item = novo()

    assert "hidden" in item
    assert item["hidden"] is False


def test_id_e_o_hash_da_url_normalizada():
    a = novo(url="http://Exemplo.com/a/?utm_source=feed1#topo")
    b = novo(url="https://exemplo.com/a")

    assert a["id"] == b["id"]
    assert len(a["id"]) == 64
    int(a["id"], 16)


def test_url_do_item_e_a_do_feed_como_veio():
    assert novo(url="http://Exemplo.com/a/?utm_source=x")["url"] == "http://Exemplo.com/a/?utm_source=x"


def test_copia_titulo_e_pontuacao_do_filtro():
    item = novo(title="Free exam voucher")

    assert item["title"] == "Free exam voucher"
    assert item["keyword_score"] == 12
    assert item["matched_keywords"] == ["voucher", "exam"]


def test_horas_em_utc_com_z_e_segundos():
    item = novo()

    assert item["first_seen_at"] == "2026-11-24T14:02:00Z"
    assert item["last_seen_at"] == "2026-11-24T14:02:00Z"
    assert item["published_at"] == "2026-11-20T14:02:00Z"


def test_data_de_publicacao_com_fuso_e_convertida_para_utc():
    fuso = timezone(timedelta(hours=2))

    item = novo(published_at=datetime(2026, 11, 20, 16, 2, 0, tzinfo=fuso))

    assert item["published_at"] == "2026-11-20T14:02:00Z"


def test_sort_at_e_a_data_de_publicacao():
    assert novo()["sort_at"] == "2026-11-20T14:02:00Z"


def test_sem_data_de_publicacao_sort_at_usa_a_primeira_vez_que_viu():
    item = novo(published_at=None)

    assert item["published_at"] is None
    assert item["sort_at"] == "2026-11-24T14:02:00Z"


def test_snippet_e_cortado_em_500_caracteres():
    item = novo(content="x" * 600)

    assert len(item["snippet"]) == 500


def test_snippet_curto_fica_inteiro():
    assert novo(content="Texto curto")["snippet"] == "Texto curto"


def test_snippet_usa_o_summary_quando_o_post_nao_tem_content():
    assert novo(content=None, summary="Resumo do feed")["snippet"] == "Resumo do feed"


def test_fonte_e_lista_de_fontes_que_viram_o_item():
    item = novo()

    assert item["source"] == {"id": "aws_blog", "name": "AWS Blog", "kind": "blog", "vendor_hint": "aws"}
    assert item["seen_in"] == ["aws_blog"]


def test_content_hash_tem_40_caracteres_e_muda_com_o_texto():
    a = novo(content="um texto")
    b = novo(content="um texto")
    c = novo(content="outro texto")

    assert len(a["content_hash"]) == 40
    assert a["content_hash"] == b["content_hash"]
    assert a["content_hash"] != c["content_hash"]


def test_item_novo_cabe_em_json():
    # É assim que ele vai para o Cosmos.
    json.dumps(novo())


# --- merge_existing --------------------------------------------------------


def test_merge_preserva_hidden_verdadeiro():
    existente = {**novo(), "hidden": True}

    mesclado = merge_existing(existente, novo(agora=LATER), LATER)

    assert mesclado["hidden"] is True


def test_merge_mantem_a_primeira_vez_que_viu_e_atualiza_a_ultima():
    mesclado = merge_existing(novo(), novo(agora=LATER), LATER)

    assert mesclado["first_seen_at"] == "2026-11-24T14:02:00Z"
    assert mesclado["last_seen_at"] == "2026-11-24T15:02:00Z"


def test_merge_acrescenta_a_fonte_nova_sem_repetir_e_mantem_a_primeira():
    existente = novo(FONTE)

    uma_vez = merge_existing(existente, novo(OUTRA_FONTE, LATER), LATER)
    duas_vezes = merge_existing(uma_vez, novo(OUTRA_FONTE, LATER), LATER)
    de_volta = merge_existing(duas_vezes, novo(FONTE, LATER), LATER)

    assert uma_vez["seen_in"] == ["aws_blog", "aws_builder"]
    assert duas_vezes["seen_in"] == ["aws_blog", "aws_builder"]
    assert de_volta["seen_in"] == ["aws_blog", "aws_builder"]
    assert de_volta["source"]["id"] == "aws_blog"


def test_merge_com_o_mesmo_conteudo_nao_mexe_na_analise():
    existente = analisado()

    mesclado = merge_existing(existente, novo(agora=LATER), LATER)

    assert mesclado["analysis"] == existente["analysis"]
    assert mesclado["analysis"]["status"] == "done"
    assert mesclado["discount_percent"] == 50


def test_merge_com_conteudo_mudado_volta_a_pendente_e_guarda_o_resultado_antigo():
    existente = analisado()

    mesclado = merge_existing(existente, novo(agora=LATER, content="Texto novo"), LATER)

    assert mesclado["analysis"]["status"] == "pending"
    assert mesclado["analysis"]["result"] == existente["analysis"]["result"]
    assert mesclado["content_hash"] != existente["content_hash"]
    assert mesclado["snippet"] == "Texto novo"


def test_merge_com_conteudo_mudado_recomeca_a_contagem_de_tentativas():
    # Decisão do plano: página mudada merece 5 tentativas novas.
    existente = {**novo(), "analysis": {"status": "failed", "attempts": 5, "last_error": "invalid_json"}}

    mesclado = merge_existing(existente, novo(agora=LATER, content="Texto novo"), LATER)

    assert mesclado["analysis"]["status"] == "pending"
    assert mesclado["analysis"]["attempts"] == 0


def test_item_failed_que_reaparece_igual_continua_failed():
    existente = {**novo(), "analysis": {"status": "failed", "attempts": 5, "last_error": "invalid_json"}}

    mesclado = merge_existing(existente, novo(agora=LATER), LATER)

    assert mesclado["analysis"]["status"] == "failed"
    assert mesclado["analysis"]["attempts"] == 5


def test_merge_nao_troca_a_identidade():
    existente = novo()

    mesclado = merge_existing(existente, novo(agora=LATER), LATER)

    assert (mesclado["id"], mesclado["pk"], mesclado["type"]) == (existente["id"], "v1", "item")


# --- apply_outcome: análise concluída --------------------------------------


def test_analise_concluida_grava_resultado_modelo_e_versao_do_prompt():
    item = apply_outcome(novo(), resultado("done", evento(), "openai/gpt-oss-20b"), LATER, 3)

    assert item["analysis"]["status"] == "done"
    assert item["analysis"]["analyzed_at"] == "2026-11-24T15:02:00Z"
    assert item["analysis"]["model"] == "openai/gpt-oss-20b"
    assert item["analysis"]["prompt_version"] == 3
    assert item["analysis"]["result"]["is_voucher"] is True
    assert item["analysis"]["result"]["vendor"] == "aws"
    assert item["analysis"]["result"]["confidence"] == 0.9


def test_percentual_do_desconto_e_calculado_pelo_codigo():
    assert analisado(discount="50% off")["discount_percent"] == 50


@pytest.mark.parametrize("texto", ["US$ 100", "free exam", None, "150%"])
def test_desconto_que_nao_e_percentual_deixa_discount_percent_nulo(texto):
    assert analisado(discount=texto).get("discount_percent") is None


def test_resultado_da_analise_cabe_em_json():
    json.dumps(analisado(certifications=["SAA-C03"], regions=["Global"]))


def test_analise_concluida_apaga_o_ultimo_erro():
    adiado = apply_outcome(novo(), resultado("deferred", error_code="rate_limited"), NOW, 1)

    item = analisado(adiado)

    assert item["analysis"].get("last_error") is None


# --- apply_outcome: erros e tentativas -------------------------------------


def test_o_limite_e_de_5_tentativas():
    assert MAX_ATTEMPTS == 5


def test_erro_conta_tentativa_e_na_quinta_o_item_vira_failed():
    item = novo()
    erro = resultado("error", error_code="invalid_json")

    for tentativa in range(1, MAX_ATTEMPTS):
        item = apply_outcome(item, erro, NOW, 1)
        assert item["analysis"]["status"] == "pending"
        assert item["analysis"]["attempts"] == tentativa

    item = apply_outcome(item, erro, NOW, 1)

    assert item["analysis"]["status"] == "failed"
    assert item["analysis"]["attempts"] == MAX_ATTEMPTS
    assert item["analysis"]["last_error"] == "invalid_json"


@pytest.mark.parametrize("codigo", ["rate_limited", "budget"])
def test_adiado_nao_gasta_tentativa_nem_derruba_o_item(codigo):
    item = novo()

    for _ in range(MAX_ATTEMPTS * 2):
        item = apply_outcome(item, resultado("deferred", error_code=codigo), NOW, 1)

    assert item["analysis"]["status"] == "pending"
    assert item["analysis"]["attempts"] == 0
    assert item["analysis"]["last_error"] == codigo


def test_erro_depois_de_conteudo_mudado_nao_apaga_o_resultado_antigo():
    existente = analisado()
    pendente = merge_existing(existente, novo(agora=LATER, content="Texto novo"), LATER)

    item = apply_outcome(pendente, resultado("error", error_code="provider_error"), LATER, 1)

    assert item["analysis"]["result"] == existente["analysis"]["result"]


def test_apply_outcome_nao_desfaz_o_hidden_do_criador():
    escondido = {**novo(), "hidden": True}

    assert apply_outcome(escondido, resultado("done", evento(), "m"), NOW, 1)["hidden"] is True
    assert apply_outcome(escondido, resultado("error", error_code="invalid_json"), NOW, 1)["hidden"] is True


# --- is_visible_to_api -----------------------------------------------------


def item_visivel() -> dict:
    # Escrito à mão (e não por build_item + apply_outcome) para que o teste
    # diga o que o contrato exige, e não o que o código faz.
    return {
        "hidden": False,
        "analysis": {"status": "done", "result": {"is_voucher": True, "confidence": 0.9}},
    }


def test_item_concluido_com_promocao_e_confianca_aparece():
    assert is_visible_to_api(item_visivel()) is True


def test_confianca_de_0_5_aparece_e_abaixo_disso_nao():
    meio = item_visivel()
    meio["analysis"]["result"]["confidence"] = 0.5
    baixo = item_visivel()
    baixo["analysis"]["result"]["confidence"] = 0.49

    assert is_visible_to_api(meio) is True
    assert is_visible_to_api(baixo) is False


def test_item_escondido_nao_aparece():
    item = item_visivel()
    item["hidden"] = True

    assert is_visible_to_api(item) is False


def test_item_sem_o_campo_hidden_nao_aparece():
    # Mesmo comportamento da consulta do Cosmos (`c.hidden = false`).
    item = item_visivel()
    del item["hidden"]

    assert is_visible_to_api(item) is False


@pytest.mark.parametrize("estado", ["pending", "failed"])
def test_item_pendente_ou_failed_nao_aparece_nem_com_resultado_antigo(estado):
    item = item_visivel()
    item["analysis"]["status"] = estado

    assert is_visible_to_api(item) is False


def test_item_que_nao_e_promocao_nao_aparece():
    item = item_visivel()
    item["analysis"]["result"]["is_voucher"] = False

    assert is_visible_to_api(item) is False


def test_item_pendente_sem_resultado_nao_aparece():
    assert is_visible_to_api(novo()) is False


def test_do_item_novo_ate_aparecer_na_api():
    item = novo()
    assert is_visible_to_api(item) is False

    item = apply_outcome(item, resultado("done", evento(is_voucher=True, confidence=0.9), "m"), NOW, 1)

    assert is_visible_to_api(item) is True
