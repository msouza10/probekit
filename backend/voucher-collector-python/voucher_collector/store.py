"""Onde os itens ficam guardados: o protocolo, a versão em memória (testes) e o Cosmos DB.

O coletor só fala com o banco por três operações (o protocolo `ItemStore`):

    get(item_id) -> dict | None     lê um documento pelo id
    put(item)                       cria ou substitui (pelo id)
    put_run(run)                    grava o resumo da última execução (id "last_run")

Todos os documentos ficam na partição "v1" (ADR-0015).
"""

from __future__ import annotations

import copy
from typing import Any, Protocol

from azure.cosmos import CosmosClient
from azure.cosmos import exceptions as cosmos_exceptions

PARTITION_KEY = "v1"
RUN_ID = "last_run"


class ItemStore(Protocol):
    def get(self, item_id: str) -> dict[str, Any] | None: ...

    def put(self, item: dict[str, Any]) -> None: ...

    def put_run(self, run: dict[str, Any]) -> None: ...


def _as_run(run: dict[str, Any]) -> dict[str, Any]:
    return {**run, "id": RUN_ID, "type": "run", "pk": PARTITION_KEY}


class InMemoryStore:
    """Cumpre o contrato sem banco. Para os testes olharem o que ficou, tem `documents()`."""

    def __init__(self) -> None:
        self._docs: dict[str, dict[str, Any]] = {}

    def get(self, item_id: str) -> dict[str, Any] | None:
        doc = self._docs.get(item_id)
        # Uma cópia, como o Cosmos devolve um documento novo a cada leitura.
        return copy.deepcopy(doc) if doc is not None else None

    def put(self, item: dict[str, Any]) -> None:
        self._docs[item["id"]] = copy.deepcopy(item)

    def put_run(self, run: dict[str, Any]) -> None:
        self.put(_as_run(run))

    def documents(self) -> list[dict[str, Any]]:
        return [copy.deepcopy(doc) for doc in self._docs.values()]


class CosmosStore:
    """O Cosmos DB for NoSQL. `credential` é uma credencial do Azure (identidade gerenciada na nuvem)."""

    def __init__(self, endpoint: str, database: str, container: str, credential: Any) -> None:
        client = CosmosClient(endpoint, credential=credential)
        self._container = client.get_database_client(database).get_container_client(container)

    def get(self, item_id: str) -> dict[str, Any] | None:
        try:
            doc = self._container.read_item(item_id, partition_key=PARTITION_KEY)
        except cosmos_exceptions.CosmosResourceNotFoundError:
            return None
        # Tira os campos que o próprio Cosmos acrescenta (_rid, _etag, _ts...).
        return {key: value for key, value in doc.items() if not key.startswith("_")}

    def put(self, item: dict[str, Any]) -> None:
        # `upsert_item`: cria ou substitui. A atualização parcial (PATCH) é preview no SDK de Python.
        self._container.upsert_item(item)

    def put_run(self, run: dict[str, Any]) -> None:
        self.put(_as_run(run))
