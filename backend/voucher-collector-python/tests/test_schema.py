"""Testes do esquema que o LLM preenche (schema.py, trazido do VoucherBot sem mudança).

Estes testes passam desde o dia em que o arquivo foi trazido: eles registram
o comportamento do VoucherBot de que o resto do coletor depende. Se alguém
mexer no schema.py, são eles que avisam.
"""

import pytest

from voucher_collector.schema import ExtractedEvent


def test_campos_ausentes_tem_valor_padrao_seguro():
    evento = ExtractedEvent()

    assert evento.is_voucher is False
    assert evento.confidence == 0.0
    assert evento.voucher_code is None
    assert evento.certifications is None


@pytest.mark.parametrize("bruto, esperado", [(7, 1.0), (-3, 0.0), (0.42, 0.42)])
def test_confidence_fica_entre_0_e_1(bruto, esperado):
    assert ExtractedEvent(confidence=bruto).confidence == esperado


def test_voucher_code_vira_maiusculo_e_sem_espacos():
    assert ExtractedEvent(voucher_code="  save-50 ").voucher_code == "SAVE-50"


@pytest.mark.parametrize("bruto", [None, 123, "", "   "])
def test_voucher_code_que_nao_e_texto_util_vira_none(bruto):
    assert ExtractedEvent.model_validate({"voucher_code": bruto}).voucher_code is None


def test_vendor_vira_minusculo():
    assert ExtractedEvent(vendor=" AWS ").vendor == "aws"


def test_lista_com_null_vira_none_quando_so_tem_null():
    # O LLM às vezes devolve [null] no lugar de null ou [].
    dados = {"certifications": [None], "regions": [None, None]}

    evento = ExtractedEvent.model_validate(dados)

    assert evento.certifications is None
    assert evento.regions is None


def test_lista_com_null_no_meio_perde_so_o_null():
    evento = ExtractedEvent.model_validate({"certifications": ["AZ-104", None, "SC-300"]})

    assert evento.certifications == ["AZ-104", "SC-300"]


def test_resultado_pode_virar_dicionario_serializavel_em_json():
    # É assim que o resultado entra no documento do Cosmos (analysis.result).
    import json

    evento = ExtractedEvent(is_voucher=True, confidence=0.9, vendor="aws", certifications=["SAA-C03"])

    texto = json.dumps(evento.model_dump())

    assert json.loads(texto)["certifications"] == ["SAA-C03"]
