"""Testes do job de coleta (job.py): o coletor inteiro, visto de fora.

`run(fontes, loja, provedores, *, now, max_llm_calls=40, collector=..., reasoner=None)`
percorre as fontes, filtra por palavras-chave, deduplica, grava os itens e pede
ao LLM a análise dos que ainda estão `pending` (os mais novos primeiro, até o
teto de chamadas). No fim grava o documento `last_run`.

Aqui tudo é falso: a loja é o `InMemoryStore`, o coletor e o LLM são objetos de
mentira. O que se confere é o que fica gravado e o resumo devolvido.

Decisões deste arquivo que o plano não fixava (mude código e teste juntos):
- `collector=` (padrão `rss.collect`) e `reasoner=` são parâmetros de `run`;
- `items_seen` conta os posts que passaram no filtro (os que viram item);
- um 429 do LLM faz o job PARAR de chamar o LLM naquela execução;
- `main()` chama `run`, `CosmosStore` e `load_sources` por esses nomes dentro de
  `job.py` (os testes de `main` os trocam por falsos).
"""

import asyncio
from dataclasses import asdict
from datetime import UTC, datetime, timedelta

import pytest
from helpers import ProvedorFalso, json_do_llm

from voucher_collector import job
from voucher_collector.analyzer import RateLimitError
from voucher_collector.dedup import identity_hash
from voucher_collector.job import RunSummary, main, run
from voucher_collector.models import NormalizedPost
from voucher_collector.rss import FeedError
from voucher_collector.sources import Source
from voucher_collector.store import InMemoryStore

INICIO = datetime(2026, 11, 24, 14, 0, 0, tzinfo=UTC)
FONTE_A = Source("a", "Fonte A", "blog", "https://a.com/feed", "aws", True)
FONTE_B = Source("b", "Fonte B", "rss", "https://b.com/feed", None, True)


def relogio():
    """Cada leitura avança 1 minuto, a partir de 14:00:00Z."""
    atual = [INICIO]

    def agora() -> datetime:
        valor = atual[0]
        atual[0] = valor + timedelta(minutes=1)
        return valor

    return agora


def post(n: int, titulo: str = "Free exam voucher", conteudo: str = "50% off all certification exams", url=None):
    """O post `n`. Quanto menor o `n`, mais novo (n=1 saiu há 1 hora)."""
    return NormalizedPost(
        url=url or f"https://exemplo.com/p/{n}",
        title=titulo,
        content=conteudo,
        published_at=INICIO - timedelta(hours=n),
    )


def post_sem_graca(n: int = 99):
    return post(n, "Docker blog post", "containers e mais containers")


class ColetorFalso:
    """Devolve, para cada fonte, a lista de posts combinada (ou levanta a exceção combinada)."""

    def __init__(self, **por_fonte) -> None:
        self.por_fonte = por_fonte

    async def __call__(self, source, limit):
        resposta = self.por_fonte[source.id]
        if isinstance(resposta, Exception):
            raise resposta
        return list(resposta)


class LojaQuebrada(InMemoryStore):
    def get(self, item_id):
        raise RuntimeError("banco fora do ar")

    def put(self, item):
        raise RuntimeError("banco fora do ar")

    def put_run(self, run_):
        raise RuntimeError("banco fora do ar")


def executar(fontes, loja, coletor, provedores=(), **kwargs) -> RunSummary:
    kwargs.setdefault("now", relogio())
    return asyncio.run(run(fontes, loja, list(provedores), collector=coletor, **kwargs))


def itens(loja) -> list[dict]:
    return [d for d in loja.documents() if d["type"] == "item"]


def id_de(post_) -> str:
    return identity_hash(post_.url)


# --- o caminho feliz -------------------------------------------------------


def test_post_que_passa_no_filtro_vira_item_analisado():
    bom = post(1)
    loja, llm = InMemoryStore(), ProvedorFalso("m", json_do_llm())

    resumo = executar([FONTE_A], loja, ColetorFalso(a=[bom, post_sem_graca()]), [llm])

    assert asdict(resumo) == {
        "status": "ok",
        "feeds_total": 1,
        "feeds_ok": 1,
        "feeds_failed": [],
        "items_seen": 1,
        "items_new": 1,
        "items_analyzed": 1,
        "llm_calls": 1,
        "llm_errors": 0,
    }
    (item,) = itens(loja)
    assert item["id"] == id_de(bom)
    assert item["analysis"]["status"] == "done"
    assert "voucher" in item["matched_keywords"]
    assert item["keyword_score"] >= 5


def test_post_abaixo_do_corte_nao_e_gravado_nem_vai_ao_llm():
    loja, llm = InMemoryStore(), ProvedorFalso("m", json_do_llm())

    resumo = executar([FONTE_A], loja, ColetorFalso(a=[post_sem_graca()]), [llm])

    assert itens(loja) == []
    assert llm.chamadas == []
    assert (resumo.items_seen, resumo.items_new, resumo.llm_calls) == (0, 0, 0)


def test_documento_run_e_gravado_no_fim_com_o_resumo():
    loja = InMemoryStore()

    resumo = executar([FONTE_A], loja, ColetorFalso(a=[post(1)]), [ProvedorFalso("m", json_do_llm())])

    ultimo = loja.get("last_run")
    assert (ultimo["type"], ultimo["pk"], ultimo["status"]) == ("run", "v1", "ok")
    assert ultimo["started_at"] == "2026-11-24T14:00:00Z"
    assert ultimo["finished_at"] >= ultimo["started_at"]
    assert ultimo["finished_at"].endswith("Z")
    for campo, valor in asdict(resumo).items():
        assert ultimo[campo] == valor, campo


# --- reexecução e deduplicação ---------------------------------------------


def test_executar_duas_vezes_nao_duplica_nem_chama_o_llm_de_novo():
    loja, llm = InMemoryStore(), ProvedorFalso("m", json_do_llm())
    coletor = ColetorFalso(a=[post(1), post(2)])

    executar([FONTE_A], loja, coletor, [llm])
    segunda = executar([FONTE_A], loja, coletor, [llm])

    assert len(itens(loja)) == 2
    assert len(llm.chamadas) == 2  # só as da primeira execução
    assert (segunda.items_new, segunda.items_analyzed, segunda.llm_calls) == (0, 0, 0)
    assert segunda.items_seen == 2


def test_mesma_pagina_em_duas_fontes_vira_um_item_so():
    loja = InMemoryStore()
    coletor = ColetorFalso(
        a=[post(1, url="http://exemplo.com/p/1/?utm_source=a")],
        b=[post(1, url="https://exemplo.com/p/1")],
    )

    resumo = executar([FONTE_A, FONTE_B], loja, coletor, [ProvedorFalso("m", json_do_llm())])

    (item,) = itens(loja)
    assert item["seen_in"] == ["a", "b"]
    assert item["source"]["id"] == "a"
    assert (resumo.items_seen, resumo.items_new) == (1, 1)


def test_a_mesma_url_duas_vezes_no_mesmo_feed_vira_um_item_so():
    loja = InMemoryStore()

    resumo = executar([FONTE_A], loja, ColetorFalso(a=[post(1), post(1)]))

    assert len(itens(loja)) == 1
    assert (resumo.items_seen, resumo.items_new) == (1, 1)


def test_pagina_que_mudou_e_analisada_de_novo():
    loja, llm = InMemoryStore(), ProvedorFalso("m", json_do_llm())
    coletor = ColetorFalso(a=[post(1)])
    executar([FONTE_A], loja, coletor, [llm])

    coletor.por_fonte["a"] = [post(1, conteudo="Agora com 70% off em todos os exames")]
    resumo = executar([FONTE_A], loja, coletor, [llm])

    assert len(llm.chamadas) == 2
    assert resumo.items_analyzed == 1
    assert loja.get(id_de(post(1)))["analysis"]["status"] == "done"


def test_item_escondido_pelo_criador_continua_escondido():
    loja, llm = InMemoryStore(), ProvedorFalso("m", json_do_llm())
    coletor = ColetorFalso(a=[post(1)])
    executar([FONTE_A], loja, coletor, [llm])
    loja.put({**loja.get(id_de(post(1))), "hidden": True})

    coletor.por_fonte["a"] = [post(1, conteudo="Texto novo, a página mudou")]
    executar([FONTE_A], loja, coletor, [llm])

    assert loja.get(id_de(post(1)))["hidden"] is True


# --- fontes que falham -----------------------------------------------------


def test_fonte_que_falha_nao_derruba_as_outras():
    loja = InMemoryStore()
    coletor = ColetorFalso(a=FeedError("http_error"), b=[post(1)])

    resumo = executar([FONTE_A, FONTE_B], loja, coletor, [ProvedorFalso("m", json_do_llm())])

    assert resumo.status == "partial"
    assert resumo.feeds_failed == ["a"]
    assert (resumo.feeds_total, resumo.feeds_ok) == (2, 1)
    assert len(itens(loja)) == 1


def test_erro_inesperado_de_uma_fonte_tambem_nao_derruba_as_outras():
    loja = InMemoryStore()
    coletor = ColetorFalso(a=ValueError("bug no leitor"), b=[post(1)])

    resumo = executar([FONTE_A, FONTE_B], loja, coletor, [ProvedorFalso("m", json_do_llm())])

    assert (resumo.status, resumo.feeds_failed) == ("partial", ["a"])
    assert len(itens(loja)) == 1


def test_todas_as_fontes_falhando_e_failed_e_o_run_registra():
    loja = InMemoryStore()
    coletor = ColetorFalso(a=FeedError("robots"), b=FeedError("network"))

    resumo = executar([FONTE_A, FONTE_B], loja, coletor)

    assert resumo.status == "failed"
    assert resumo.feeds_failed == ["a", "b"]
    assert loja.get("last_run")["status"] == "failed"


def test_banco_fora_do_ar_e_failed_e_nao_levanta_excecao():
    resumo = executar([FONTE_A], LojaQuebrada(), ColetorFalso(a=[post(1)]), [ProvedorFalso("m", json_do_llm())])

    assert resumo.status == "failed"


# --- teto de chamadas e limites do LLM -------------------------------------


def test_zero_chamadas_grava_os_itens_pendentes_sem_chamar_o_llm():
    loja = InMemoryStore()

    resumo = executar([FONTE_A], loja, ColetorFalso(a=[post(n) for n in (1, 2, 3)]), max_llm_calls=0)

    assert [i["analysis"] for i in itens(loja)] == [{"status": "pending", "attempts": 0}] * 3
    assert (resumo.status, resumo.items_analyzed, resumo.llm_calls) == ("ok", 0, 0)


def test_com_teto_de_2_so_os_2_mais_novos_sao_analisados_e_os_outros_ficam_pendentes():
    loja = InMemoryStore()
    coletor = ColetorFalso(a=[post(n) for n in range(1, 6)])  # post(1) é o mais novo
    executar([FONTE_A], loja, coletor, max_llm_calls=0)
    llm = ProvedorFalso("m", json_do_llm())

    resumo = executar([FONTE_A], loja, coletor, [llm], max_llm_calls=2)

    estados = {n: loja.get(id_de(post(n)))["analysis"] for n in range(1, 6)}
    assert [n for n, a in estados.items() if a["status"] == "done"] == [1, 2]
    assert all(estados[n] == {"status": "pending", "attempts": 0} for n in (3, 4, 5))
    assert (resumo.items_analyzed, resumo.llm_calls) == (2, 2)


def test_o_teto_padrao_e_de_40_chamadas_por_execucao():
    loja, llm = InMemoryStore(), ProvedorFalso("m", json_do_llm())

    resumo = executar([FONTE_A], loja, ColetorFalso(a=[post(n) for n in range(1, 46)]), [llm])

    assert len(llm.chamadas) == 40
    assert resumo.llm_calls == 40
    assert sum(1 for i in itens(loja) if i["analysis"]["status"] == "pending") == 5


def test_429_deixa_os_itens_pendentes_sem_gastar_tentativa_e_para_de_chamar():
    loja = InMemoryStore()
    llm = ProvedorFalso("m", RateLimitError("429 Too Many Requests"))

    resumo = executar([FONTE_A], loja, ColetorFalso(a=[post(n) for n in (1, 2, 3)]), [llm])

    assert len(llm.chamadas) == 1  # não insiste: os outros 2 ficam para a hora seguinte
    assert all(i["analysis"]["status"] == "pending" and i["analysis"]["attempts"] == 0 for i in itens(loja))
    assert loja.get(id_de(post(1)))["analysis"]["last_error"] == "rate_limited"
    assert (resumo.status, resumo.llm_errors, resumo.items_analyzed) == ("ok", 0, 0)


# --- análise que falha ------------------------------------------------------


def test_json_invalido_gasta_tentativa_e_na_quinta_o_item_vira_failed_de_vez():
    loja, llm = InMemoryStore(), ProvedorFalso("m", "isso não é json")
    coletor = ColetorFalso(a=[post(1)])

    for tentativa in range(1, 6):
        resumo = executar([FONTE_A], loja, coletor, [llm])
        analise = loja.get(id_de(post(1)))["analysis"]
        assert analise["attempts"] == tentativa
        assert (resumo.llm_errors, resumo.status) == (1, "ok")

    assert analise["status"] == "failed"
    assert analise["last_error"] == "invalid_json"

    executar([FONTE_A], loja, coletor, [llm])  # a sexta: não deve nem chamar o LLM
    assert len(llm.chamadas) == 5
    assert loja.get(id_de(post(1)))["analysis"]["status"] == "failed"


# --- main() -----------------------------------------------------------------

CONFIG = {
    "COSMOS_ENDPOINT": "https://conta-exemplo.documents.azure.com:443/",
    "COSMOS_DATABASE": "vouchers",
    "COSMOS_CONTAINER": "itens",
    "GROQ_API_KEY": "gsk_SECRET_VALUE_123",
}


@pytest.fixture
def ambiente(monkeypatch):
    for nome in ("COSMOS_ENDPOINT", "COSMOS_DATABASE", "COSMOS_CONTAINER", "GROQ_API_KEY", "GEMINI_API_KEY", "MAX_LLM_CALLS"):
        monkeypatch.delenv(nome, raising=False)

    def definir(**variaveis):
        for nome, valor in variaveis.items():
            monkeypatch.setenv(nome, valor)

    return definir


@pytest.fixture
def run_falso(monkeypatch):
    """Troca `run`, `CosmosStore` e `load_sources` de job.py. Devolve o que `run` recebeu."""
    recebido: dict = {}

    def preparar(resultado: RunSummary | Exception):
        async def falso(*args, **kwargs):
            recebido.update(kwargs)
            if isinstance(resultado, Exception):
                raise resultado
            return resultado

        monkeypatch.setattr(job, "run", falso)
        monkeypatch.setattr(job, "CosmosStore", lambda *a, **k: InMemoryStore())
        monkeypatch.setattr(job, "load_sources", lambda *a, **k: [])
        return recebido

    return preparar


def resumo_com(status: str) -> RunSummary:
    return RunSummary(status, 1, 1, [], 0, 0, 0, 0, 0)


def test_sem_configuracao_devolve_2_diz_o_que_falta_e_nao_imprime_segredo(ambiente, capsys):
    ambiente(GROQ_API_KEY=CONFIG["GROQ_API_KEY"])

    codigo = main()

    saida = capsys.readouterr()
    texto = saida.out + saida.err
    assert codigo == 2
    assert "COSMOS_ENDPOINT" in texto
    assert CONFIG["GROQ_API_KEY"] not in texto


def test_sem_nenhuma_chave_de_llm_devolve_2(ambiente, capsys):
    ambiente(**{k: v for k, v in CONFIG.items() if k != "GROQ_API_KEY"})

    codigo = main()

    saida = capsys.readouterr()
    assert codigo == 2
    assert "GROQ_API_KEY" in saida.out + saida.err


def test_sem_chave_de_llm_mas_com_zero_chamadas_o_job_roda(ambiente, run_falso):
    recebido = run_falso(resumo_com("ok"))
    ambiente(**{k: v for k, v in CONFIG.items() if k != "GROQ_API_KEY"}, MAX_LLM_CALLS="0")

    assert main() == 0
    assert recebido["max_llm_calls"] == 0


@pytest.mark.parametrize("valor, esperado", [(None, 40), ("7", 7)])
def test_max_llm_calls_vem_da_variavel_e_o_padrao_e_40(ambiente, run_falso, valor, esperado):
    recebido = run_falso(resumo_com("ok"))
    ambiente(**CONFIG)
    if valor is not None:
        ambiente(MAX_LLM_CALLS=valor)

    main()

    assert recebido["max_llm_calls"] == esperado


def test_max_llm_calls_que_nao_e_numero_devolve_2(ambiente):
    ambiente(**CONFIG, MAX_LLM_CALLS="muitas")

    assert main() == 2


@pytest.mark.parametrize("status, codigo", [("ok", 0), ("partial", 0), ("failed", 1)])
def test_codigo_de_saida_segue_o_status_da_execucao(ambiente, run_falso, status, codigo):
    run_falso(resumo_com(status))
    ambiente(**CONFIG)

    assert main() == codigo


def test_erro_inesperado_devolve_1_sem_vazar_segredo(ambiente, run_falso, capsys):
    run_falso(RuntimeError(f"falhou com a chave {CONFIG['GROQ_API_KEY']}"))
    ambiente(**CONFIG)

    codigo = main()

    saida = capsys.readouterr()
    assert codigo == 1
    assert CONFIG["GROQ_API_KEY"] not in saida.out + saida.err
