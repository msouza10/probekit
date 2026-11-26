"""Testes do CosmosStore contra um Cosmos DB de verdade.

SÓ RODAM com `COSMOS_ENDPOINT` definido (o `conftest.py` os pula sem ele). Também
precisam de `COSMOS_DATABASE` e `COSMOS_CONTAINER`, e de login no Azure (`az login`)
com o papel _Cosmos DB Built-in Data Contributor_ na conta.

Aponte para o contêiner de teste, nunca para o de produção: estes testes criam e
apagam documentos de id `teste-*`. O `put_run` não é testado aqui, de propósito:
ele grava o documento `last_run`, que existe uma vez só e é o do job de verdade.

    COSMOS_ENDPOINT=... COSMOS_DATABASE=... COSMOS_CONTAINER=... pytest -m cosmos
"""

import os
import uuid

import pytest

cosmos = pytest.importorskip("azure.cosmos")
identity = pytest.importorskip("azure.identity")

from voucher_collector.store import CosmosStore  # noqa: E402

pytestmark = pytest.mark.cosmos

# A consulta de listagem de referência (Task 3): o que a API Go vai fazer.
LISTAGEM = (
    "SELECT TOP 500 * FROM c WHERE c.type = 'item' AND c.hidden = false "
    "AND c.analysis.status = 'done' AND c.analysis.result.is_voucher = true "
    "ORDER BY c.sort_at DESC"
)


@pytest.fixture(scope="module")
def credencial():
    return identity.DefaultAzureCredential()


@pytest.fixture(scope="module")
def conteiner(credencial):
    cliente = cosmos.CosmosClient(os.environ["COSMOS_ENDPOINT"], credential=credencial)
    return cliente.get_database_client(os.environ["COSMOS_DATABASE"]).get_container_client(
        os.environ["COSMOS_CONTAINER"]
    )


@pytest.fixture
def loja(credencial):
    return CosmosStore(
        os.environ["COSMOS_ENDPOINT"],
        os.environ["COSMOS_DATABASE"],
        os.environ["COSMOS_CONTAINER"],
        credencial,
    )


@pytest.fixture
def ids_de_teste(conteiner):
    """Entrega uma função que cria um id `teste-*` e apaga tudo no final."""
    criados: list[str] = []

    def novo() -> str:
        id_ = f"teste-{uuid.uuid4().hex}"
        criados.append(id_)
        return id_

    yield novo
    for id_ in criados:
        try:
            conteiner.delete_item(id_, partition_key="v1")
        except cosmos.exceptions.CosmosResourceNotFoundError:
            pass


def documento(id_: str, **campos) -> dict:
    base = {
        "id": id_,
        "pk": "v1",
        "type": "item",
        "title": "post de teste",
        "sort_at": "2026-11-24T14:02:00Z",
        "analysis": {"status": "done", "attempts": 1, "result": {"is_voucher": True, "confidence": 0.9}},
    }
    base.update(campos)
    return base


def test_put_e_get_devolvem_o_mesmo_documento(loja, ids_de_teste):
    id_ = ids_de_teste()
    original = documento(id_, hidden=False)

    loja.put(original)
    lido = loja.get(id_)

    # O Cosmos acrescenta campos próprios (_rid, _etag, _ts...). Só os nossos contam.
    assert {k: lido[k] for k in original} == original


def test_get_de_id_inexistente_devolve_none(loja):
    assert loja.get(f"teste-nao-existe-{uuid.uuid4().hex}") is None


def test_put_do_mesmo_id_substitui(loja, ids_de_teste):
    id_ = ids_de_teste()

    loja.put(documento(id_, hidden=False, title="primeira"))
    loja.put(documento(id_, hidden=False, title="segunda"))

    assert loja.get(id_)["title"] == "segunda"


def test_item_gravado_sem_hidden_nao_aparece_na_listagem(loja, conteiner, ids_de_teste):
    # É por isso que o coletor SEMPRE grava `hidden`: sem o campo, `c.hidden = false`
    # não casa, e o item some da página sem nenhum erro.
    sem_hidden, com_hidden = ids_de_teste(), ids_de_teste()
    loja.put(documento(sem_hidden))
    loja.put(documento(com_hidden, hidden=False))

    ids_listados = {d["id"] for d in conteiner.query_items(LISTAGEM, enable_cross_partition_query=True)}

    assert com_hidden in ids_listados
    assert sem_hidden not in ids_listados
