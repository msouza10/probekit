"""O job de coleta: o que roda de hora em hora (`python -m voucher_collector.job`).

`run` percorre as fontes, filtra por palavras-chave, deduplica, grava os itens e pede ao LLM a
análise dos que estão `pending` (os mais novos primeiro, até o teto de chamadas). No fim grava o
documento `last_run`. `main` lê a configuração do ambiente e devolve o código de saída:

    0  ok ou partial (algumas fontes falharam, mas a coleta andou)
    1  failed (todas as fontes falharam, ou o banco não respondeu, ou erro inesperado)
    2  configuração ausente ou inválida

Variáveis de ambiente: COSMOS_ENDPOINT, COSMOS_DATABASE, COSMOS_CONTAINER (obrigatórias);
GROQ_API_KEY e GEMINI_API_KEY (pelo menos uma, salvo se MAX_LLM_CALLS=0); MAX_LLM_CALLS (padrão
40); SOURCES_FILE (padrão: o sources.yaml ao lado do pacote). Nenhum valor de segredo é impresso.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from azure.identity import DefaultAzureCredential

from voucher_collector.analyzer import CallBudget, Provider, analyze_post, build_providers
from voucher_collector.dedup import deduplicate_batch
from voucher_collector.items import apply_outcome, build_item, merge_existing
from voucher_collector.models import NormalizedPost
from voucher_collector.rss import collect
from voucher_collector.scoring import THRESHOLD, score
from voucher_collector.sources import Source, load_sources
from voucher_collector.store import CosmosStore, ItemStore

logger = logging.getLogger(__name__)

# Sobe quando o prompt muda de um jeito que muda o resultado (fica gravado em cada análise).
PROMPT_VERSION = 1

DEFAULT_MAX_LLM_CALLS = 40
FEED_LIMIT = 25
DEFAULT_SOURCES_FILE = Path(__file__).resolve().parent.parent / "sources.yaml"

Collector = Callable[[Source, int], Awaitable[list[NormalizedPost]]]


@dataclass
class RunSummary:
    status: Literal["ok", "partial", "failed"]
    feeds_total: int
    feeds_ok: int
    feeds_failed: list[str]
    items_seen: int  # posts que passaram no filtro (viraram item)
    items_new: int
    items_analyzed: int
    llm_calls: int
    llm_errors: int


def _iso(moment: datetime) -> str:
    return moment.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


async def run(
    sources: Sequence[Source],
    store: ItemStore,
    providers: Sequence[Provider],
    *,
    now: Callable[[], datetime],
    max_llm_calls: int = DEFAULT_MAX_LLM_CALLS,
    collector: Collector = collect,
    reasoner: Provider | None = None,
) -> RunSummary:
    """Uma execução inteira. Nunca levanta por falha de fonte, do LLM ou do banco: devolve o resumo."""
    started = now()
    summary = RunSummary("ok", len(sources), 0, [], 0, 0, 0, 0, 0)
    budget = CallBudget(max_llm_calls)
    try:
        touched = await _collect_and_store(sources, store, collector, started, summary)
        summary.items_seen = len(touched)
        await _analyse_pending(touched, store, providers, reasoner, budget, now, summary)
        if summary.feeds_total > 0 and summary.feeds_ok == 0:
            summary.status = "failed"
        elif summary.feeds_failed:
            summary.status = "partial"
    except Exception as exc:
        logger.error("job: a execução falhou (%s)", type(exc).__name__)
        summary.status = "failed"

    summary.llm_calls = max_llm_calls - budget.remaining
    try:
        store.put_run({**asdict(summary), "started_at": _iso(started), "finished_at": _iso(now())})
    except Exception as exc:
        logger.error("job: não consegui gravar o resumo da execução (%s)", type(exc).__name__)
    return summary


async def _collect_and_store(
    sources: Sequence[Source],
    store: ItemStore,
    collector: Collector,
    started: datetime,
    summary: RunSummary,
) -> dict[str, dict]:
    """Lê cada fonte, filtra, deduplica e grava. Devolve os itens tocados, por id."""
    touched: dict[str, dict] = {}
    for source in sources:
        try:
            posts = await collector(source, FEED_LIMIT)
        except Exception as exc:
            # Uma fonte ruim (FeedError ou bug) não derruba as outras.
            logger.warning("job: a fonte %s falhou (%s)", source.id, type(exc).__name__)
            summary.feeds_failed.append(source.id)
            continue
        summary.feeds_ok += 1
        for post in deduplicate_batch(posts):
            points, matched = score(f"{post.title} {post.content or ''}")
            if points < THRESHOLD:
                continue
            incoming = build_item(post, source, points, matched, started)
            existing = touched.get(incoming["id"]) or store.get(incoming["id"])
            if existing is None:
                item = incoming
                summary.items_new += 1
            else:
                item = merge_existing(existing, incoming, started)
            store.put(item)
            touched[item["id"]] = item
    return touched


async def _analyse_pending(
    touched: dict[str, dict],
    store: ItemStore,
    providers: Sequence[Provider],
    reasoner: Provider | None,
    budget: CallBudget,
    now: Callable[[], datetime],
    summary: RunSummary,
) -> None:
    """Pede ao LLM a análise dos itens `pending`, dos mais novos para os mais antigos."""
    pending = sorted(
        (item for item in touched.values() if item["analysis"]["status"] == "pending"),
        key=lambda item: item["sort_at"],
        reverse=True,
    )
    for item in pending:
        if budget.remaining <= 0:
            break  # os que sobram ficam como estão, sem tentativa gasta, para a próxima hora
        outcome = await analyze_post(
            item["title"], item["snippet"], budget, providers, reasoner=reasoner
        )
        store.put(apply_outcome(item, outcome, now(), PROMPT_VERSION))
        if outcome.kind == "done":
            summary.items_analyzed += 1
        elif outcome.kind == "error":
            summary.llm_errors += 1
        else:
            break  # 429 ou teto: insistir só gasta cota; o resto fica para a próxima hora


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    env = os.environ
    missing = [
        name for name in ("COSMOS_ENDPOINT", "COSMOS_DATABASE", "COSMOS_CONTAINER") if not env.get(name)
    ]
    try:
        max_llm_calls = int(env.get("MAX_LLM_CALLS", str(DEFAULT_MAX_LLM_CALLS)))
    except ValueError:
        print("MAX_LLM_CALLS precisa ser um número inteiro", file=sys.stderr)
        return 2
    if max_llm_calls != 0 and not (env.get("GROQ_API_KEY") or env.get("GEMINI_API_KEY")):
        missing.append("GROQ_API_KEY ou GEMINI_API_KEY")
    if missing:
        # Só os NOMES das variáveis que faltam, nunca valor nenhum.
        print("Configuração ausente: " + ", ".join(missing), file=sys.stderr)
        return 2

    try:
        store = CosmosStore(
            env["COSMOS_ENDPOINT"],
            env["COSMOS_DATABASE"],
            env["COSMOS_CONTAINER"],
            DefaultAzureCredential(),
        )
        providers, reasoner = build_providers(env.get("GROQ_API_KEY"), env.get("GEMINI_API_KEY"))
        sources = load_sources(env.get("SOURCES_FILE") or DEFAULT_SOURCES_FILE)
        summary = asyncio.run(
            run(
                sources,
                store,
                providers,
                now=lambda: datetime.now(UTC),
                max_llm_calls=max_llm_calls,
                reasoner=reasoner,
            )
        )
    except Exception as exc:
        # Só o tipo do erro: a mensagem de um erro de SDK pode trazer a chave ou o endereço.
        print(f"Falha na execução: {type(exc).__name__}", file=sys.stderr)
        return 1
    logger.info("job: %s", asdict(summary))
    return 1 if summary.status == "failed" else 0


if __name__ == "__main__":
    sys.exit(main())
