"""O ciclo de vida do item (ADR-0015): montar, mesclar, aplicar o resultado da análise.

Um item nasce `pending`, é analisado pelo LLM (`done`) ou falha `MAX_ATTEMPTS` vezes (`failed`),
e o criador pode escondê-lo à mão (`hidden`). Tudo aqui é puro: recebe dicionários e devolve
dicionários, sem banco nem rede.
"""

from __future__ import annotations

import copy
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any

from voucher_collector.dedup import content_hash, identity_hash
from voucher_collector.models import NormalizedPost
from voucher_collector.sources import Source
from voucher_collector.validate import parse_discount_percent

# Depois de tantas tentativas com erro, o item vira `failed` e não é mais tentado.
MAX_ATTEMPTS = 5

# A API só mostra itens com pelo menos esta confiança (ADR-0015, "O contrato da API").
MIN_VISIBLE_CONFIDENCE = 0.5

SNIPPET_MAX_CHARS = 500
PARTITION_KEY = "v1"
SCHEMA_VERSION = 1


def _iso(moment: datetime) -> str:
    """`2026-11-24T14:02:00Z`: UTC, com segundos e `Z`, que ordena como texto na ordem do tempo."""
    return moment.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def build_item(
    post: NormalizedPost,
    source: Source,
    keyword_score: int,
    matched: Sequence[str],
    now: datetime,
) -> dict[str, Any]:
    """O item novo de um post que passou no filtro de palavras-chave: nasce `pending`, visível."""
    seen_at = _iso(now)
    published_at = _iso(post.published_at) if post.published_at else None
    text = post.content or post.summary or ""
    return {
        "id": identity_hash(post.url),
        "pk": PARTITION_KEY,
        "type": "item",
        "schema_version": SCHEMA_VERSION,
        "url": post.url,
        "title": post.title,
        "snippet": text[:SNIPPET_MAX_CHARS],
        "published_at": published_at,
        "first_seen_at": seen_at,
        "last_seen_at": seen_at,
        # Sempre preenchido: é por ele que a API ordena, e um item sem `sort_at` some da listagem.
        "sort_at": published_at or seen_at,
        "source": {
            "id": source.id,
            "name": source.name,
            "kind": source.kind,
            "vendor_hint": source.vendor_hint,
        },
        "seen_in": [source.id],
        "content_hash": content_hash(post.title, text, post.published_at),
        "keyword_score": keyword_score,
        "matched_keywords": list(matched),
        "analysis": {"status": "pending", "attempts": 0},
        "discount_percent": None,
        # Sempre gravado: sem o campo, a consulta da API (`c.hidden = false`) não acha o item.
        "hidden": False,
    }


def merge_existing(existing: dict[str, Any], incoming: dict[str, Any], now: datetime) -> dict[str, Any]:
    """O item já guardado, atualizado com o que o feed trouxe agora.

    Preserva o que o coletor não gerencia (`hidden`, a primeira vez que viu, a fonte original).
    Se a página mudou (`content_hash` diferente), volta a `pending` com as tentativas zeradas,
    mas mantém o resultado antigo até o novo chegar.
    """
    merged = copy.deepcopy(existing)
    merged["last_seen_at"] = _iso(now)
    for source_id in incoming["seen_in"]:
        if source_id not in merged["seen_in"]:
            merged["seen_in"].append(source_id)

    if incoming["content_hash"] != existing["content_hash"]:
        for field in ("title", "snippet", "content_hash", "published_at", "sort_at"):
            merged[field] = incoming[field]
        analysis = merged["analysis"]
        analysis["status"] = "pending"
        analysis["attempts"] = 0
        analysis.pop("last_error", None)
    return merged


def apply_outcome(item: dict[str, Any], outcome: Any, now: datetime, prompt_version: int) -> dict[str, Any]:
    """O item com o resultado de uma análise aplicado (`outcome`: `AnalysisOutcome`).

    - `done`: grava o resultado, o modelo e a versão do prompt, e calcula o percentual por código;
    - `error`: conta uma tentativa; na `MAX_ATTEMPTS`-ésima o item vira `failed`;
    - `deferred`: não mexe nas tentativas (foi o limite do provedor ou o teto de chamadas).
    """
    updated = copy.deepcopy(item)
    analysis = updated["analysis"]
    if outcome.kind == "done":
        analysis["status"] = "done"
        analysis["analyzed_at"] = _iso(now)
        analysis["model"] = outcome.model
        analysis["prompt_version"] = prompt_version
        analysis["result"] = outcome.result.model_dump()
        analysis.pop("last_error", None)
        updated["discount_percent"] = parse_discount_percent(outcome.result.discount)
    elif outcome.kind == "error":
        analysis["attempts"] = analysis.get("attempts", 0) + 1
        analysis["last_error"] = outcome.error_code
        if analysis["attempts"] >= MAX_ATTEMPTS:
            analysis["status"] = "failed"
    else:
        analysis["last_error"] = outcome.error_code
    return updated


def is_visible_to_api(item: dict[str, Any]) -> bool:
    """Se a API deve mostrar o item: não escondido, analisado, é promoção e com confiança mínima.

    Um item sem o campo `hidden` não aparece (é o mesmo que faz a consulta do Cosmos).
    """
    analysis = item.get("analysis") or {}
    result = analysis.get("result") or {}
    return bool(
        item.get("hidden") is False
        and analysis.get("status") == "done"
        and result.get("is_voucher") is True
        and result.get("confidence", 0) >= MIN_VISIBLE_CONFIDENCE
    )
