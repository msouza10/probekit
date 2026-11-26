"""Testes do armazenamento em memória (InMemoryStore, em store.py).

O coletor só fala com o banco por três operações (o protocolo `ItemStore`):

    get(item_id) -> dict | None     lê um documento pelo id
    put(item)                       cria ou substitui (pelo id)
    put_run(run)                    grava o resumo da última execução (id "last_run")

`InMemoryStore` cumpre esse contrato sem banco, e é com ele que o `job` é testado.
Para os testes olharem o que ficou guardado, ele tem uma operação a mais, que o
`CosmosStore` não precisa ter: `documents() -> list[dict]` (todos os documentos).

O mesmo contrato é conferido contra o Cosmos de verdade em test_store_cosmos.py.
"""

import pytest

from voucher_collector.store import InMemoryStore


def item(id_: str = "a" * 64, **campos) -> dict:
    return {"id": id_, "pk": "v1", "type": "item", "title": "um post", **campos}


def test_get_de_id_inexistente_devolve_none():
    assert InMemoryStore().get("nao-existe") is None


def test_put_e_get_devolvem_o_mesmo_documento():
    loja = InMemoryStore()

    loja.put(item(title="Free exam", analysis={"status": "pending", "attempts": 0}))

    assert loja.get("a" * 64) == item(title="Free exam", analysis={"status": "pending", "attempts": 0})


def test_put_do_mesmo_id_substitui_e_nao_duplica():
    loja = InMemoryStore()

    loja.put(item(title="primeira versão"))
    loja.put(item(title="segunda versão"))

    assert loja.get("a" * 64)["title"] == "segunda versão"
    assert len(loja.documents()) == 1


def test_ids_diferentes_sao_documentos_diferentes():
    loja = InMemoryStore()

    loja.put(item("a" * 64))
    loja.put(item("b" * 64))

    assert len(loja.documents()) == 2


def test_documento_sem_id_e_recusado():
    with pytest.raises((KeyError, ValueError)):
        InMemoryStore().put({"pk": "v1", "type": "item"})


def test_o_que_get_devolve_e_uma_copia():
    # O Cosmos devolve um documento novo a cada leitura. Se a versão em memória
    # devolvesse o próprio objeto, um teste (ou o job) que mexesse no resultado
    # alteraria o "banco" sem nunca chamar `put`.
    loja = InMemoryStore()
    loja.put(item(analysis={"status": "pending", "attempts": 0}))

    lido = loja.get("a" * 64)
    lido["title"] = "alterado fora"
    lido["analysis"]["status"] = "done"

    novamente = loja.get("a" * 64)
    assert novamente["title"] == "um post"
    assert novamente["analysis"]["status"] == "pending"


def test_o_que_put_recebe_tambem_e_copiado():
    loja = InMemoryStore()
    original = item(analysis={"status": "pending", "attempts": 0})

    loja.put(original)
    original["analysis"]["status"] = "done"

    assert loja.get("a" * 64)["analysis"]["status"] == "pending"


# --- o documento da última execução ----------------------------------------


def test_put_run_grava_com_id_last_run_tipo_run_e_particao_v1():
    loja = InMemoryStore()

    loja.put_run({"status": "ok", "feeds_total": 38})

    assert loja.get("last_run") == {
        "id": "last_run",
        "type": "run",
        "pk": "v1",
        "status": "ok",
        "feeds_total": 38,
    }


def test_put_run_sobrescreve_a_execucao_anterior():
    loja = InMemoryStore()

    loja.put_run({"status": "failed"})
    loja.put_run({"status": "ok"})

    assert loja.get("last_run")["status"] == "ok"
    assert [d for d in loja.documents() if d["type"] == "run"] == [loja.get("last_run")]


def test_o_run_nao_se_mistura_com_os_itens():
    loja = InMemoryStore()

    loja.put(item())
    loja.put_run({"status": "ok"})

    assert sorted(d["type"] for d in loja.documents()) == ["item", "run"]
    assert loja.get("a" * 64)["type"] == "item"
