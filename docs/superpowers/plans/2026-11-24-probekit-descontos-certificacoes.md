# Vouchers de certificações — plano de implementação

> **Para quem for executar:** use `superpowers:executing-plans` (ou `superpowers:subagent-driven-development`), task por task. As caixas (`- [ ]`) são o roteiro de execução; o estado oficial de cada task está na **issue** e no GitHub Project (ver [`docs/README.md`](../../README.md)). Commit, push e PR são do criador.

**Goal:** o Probekit ganha a página `/voucher` e um destaque na Home com o último voucher ativo, a partir das promoções de certificação de TI coletadas de hora em hora de 38 feeds públicos, analisadas por LLM e guardadas com histórico permanente.

**Architecture:** um coletor Python (adaptado do VoucherBot) roda como Azure Container Apps Job agendado e grava itens no Cosmos DB (free tier). A API Go mantém um instantâneo em memória dos itens mais recentes e o serve em `GET /api/vouchers`. O site lê só a API.

**Tech Stack:** Python 3.14 (`httpx`, `feedparser`, `pydantic`, `groq`, `google-genai`, `azure-cosmos`, `azure-identity`, `pytest`), Docker/GHCR, Terraform (Azure), GitHub Actions, Go 1.25 (`azcosmos`, `azidentity`), React/Vite/Vitest.

**Spec e decisões:** [spec](../specs/2026-11-24-probekit-descontos-certificacoes-design.md) e as ADRs [0012](../../adr/0012-coletor-de-descontos-em-container-apps-job.md) (onde roda), [0013](../../adr/0013-banco-de-descontos-no-cosmos-db.md) (banco), [0014](../../adr/0014-leitura-dos-descontos-pela-api-go.md) (leitura pela API) e [0015](../../adr/0015-formato-do-item-de-desconto.md) (formato do item). O plano só começa a ser executado depois de as ADRs serem aceitas pelo criador.

## Restrições globais

- Job com gatilho `Schedule`, cron `0 * * * *` (UTC), plano Consumption, **0,25 vCPU e 0,5 GiB**; imagem **pública no GHCR**, **sem nenhum segredo dentro**, sem tag `latest`.
- Contêiner do Cosmos com chave de partição **`/pk`**, valor fixo **`"v1"`**; dois tipos de documento (`type`): `item` e `run` (o `id` do `run` é `"last_run"`). Sem TTL. Throughput provisionado no contêiner, no máximo 1 000 RU/s no total; consistência **Session** declarada.
- `id` do item = SHA-256 hexadecimal da URL normalizada. Horas em ISO 8601 UTC com `Z` e segundos (`2026-11-24T14:02:00Z`); datas de promoção `AAAA-MM-DD`. `snippet` com no máximo **500** caracteres. Sempre gravar `hidden` (`false`) e `sort_at`.
- Análise: até **5** tentativas, depois `failed`. Erros de cota (429) e teto de chamadas **não** consomem tentativa. Teto padrão de **40** chamadas ao LLM por execução. Ordem de provedores: Groq (`gpt-oss-20b` e `gpt-oss-120b`, 50/50), `qwen3.8-27b` para baixa confiança, Gemini por último.
- Resposta do LLM é dado não confiável: validar o esquema; `voucher_code` só com 3 a 40 caracteres entre `A-Z`, `0-9`, `-` e `_`; URLs só `http` ou `https`; `discount_percent` calculado por código (1 a 100).
- A API devolve só itens `done`, `is_voucher` verdadeiro, `confidence >= 0.5` e `hidden` falso; nunca `snippet`, `reason`, `confidence`, `registration_url`. Instantâneo de até **500** itens, atualizado a cada **10 minutos**; `limit` padrão **20**, máximo **50**; erro `vouchers_unavailable` (HTTP 503) até a primeira carga.
- Nenhum segredo, IP ou nome de recurso interno no repositório: só os **nomes** das variáveis (`GROQ_API_KEY`, `GEMINI_API_KEY`, `COSMOS_ENDPOINT`, `COSMOS_DATABASE`, `COSMOS_CONTAINER`, `MAX_LLM_CALLS`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_CERTIFICATE_PATH`).
- Código trazido do VoucherBot (Apache-2.0) mantém o aviso de origem, a cópia da licença em `THIRD_PARTY/` e a nota do que foi modificado, em cada arquivo.
- A rota nova **não** compartilha o contador de requisições de `/api/ping` e `/api/dns-lookup`. Os testes atuais continuam passando.
- Terraform e workflows são do criador: as tasks dele descrevem o resultado, não o código. O Python do coletor foi **delegado ao assistente em 2026-11-26** (o criador começou a escrevê-lo como aprendizado e passou a tarefa); os testes de todas as partes já existem e são o contrato.
- Workflows novos: `permissions` mínimas (`packages: write` só no job que publica a imagem), nenhum `pull_request_target`, segredos só em jobs que rodam na `main`. O `apply` do Azure aplica o **plano revisado**, no ambiente `production`. Um job novo no CI **não tem filtro de pasta** e só entra na regra `protection-main` depois de ter rodado uma vez: a regra exige os checks pelo nome, e um check que não roda deixa o merge esperando para sempre.

## Foco da revisão

1. **Listagem vazia por campo ausente:** um item sem `sort_at` ou `hidden` some da consulta da listagem. Tasks 3, 9 e 10.
2. **Resposta do LLM maliciosa ou inválida:** código, URL ou JSON com conteúdo de ataque não chega ao banco nem ao site. Tasks 7 e 17.
3. **Mesma página em dois feeds, ou com `utm_*`/`http`:** vira um item só. Tasks 4 e 11.
4. **Cota do LLM (429) e teto de chamadas:** o item fica para a hora seguinte, sem perder tentativa nem ser descartado. Tasks 8, 9 e 11.
5. **Execução repetida ou interrompida:** duplica, apaga `hidden` ou deixa item pela metade. Tasks 9, 10 e 11.
6. **Banco fora do ar, certificado expirado ou primeira carga falha:** a API serve o último instantâneo, ou o erro padronizado até haver um. Task 15.
7. **Rota que gasta a cota de ping, e CORS:** a Home não pode consumir o limite de quem só abriu o site. Task 15.
8. **Link inseguro e texto com HTML vindo de terceiros:** nunca vira link nem HTML. Task 17.
9. **Aviso da Home que desloca o layout:** o CLS da Home não pode piorar. Task 18.
10. **Check novo na regra da `main` antes de o job existir, ou com filtro de pasta:** trava todos os PRs. Tasks 12 e 21.
11. **Imagem privada no GHCR:** o Container Apps Job não consegue baixá-la sem credencial. Task 12.
12. **Coleta parada sem ninguém ver:** a página só mostra uma "última coleta" que envelhece. Task 25.

## Ciclo padrão das tasks de código

Vale para as Tasks 4 a 11, 15 a 18, salvo onde a task disser outro. Os testes saem **primeiro** (do assistente); o código é do dono da task.

- [ ] Escrever os testes da task e rodá-los: precisam **falhar** pelo motivo certo (função inexistente, não erro de sintaxe).
- [ ] Implementar a interface descrita em _Interfaces_ (assinatura exata; o corpo é do dono).
- [ ] Rodar os testes da task e a suíte inteira do módulo: tudo passa.
- [ ] Rodar o linter do módulo (`ruff check` no Python, `go vet ./...` no Go, `npm run lint` no site).
- [ ] O criador faz o commit, com o prefixo certo, e abre o PR com `Closes #N`.

## Arquivos

```
backend/voucher-collector-python/
  pyproject.toml  Dockerfile  sources.yaml  THIRD_PARTY/
  voucher_collector/  models.py dedup.py scoring.py sources.py http_policy.py rss.py
                      validate.py schema.py analyzer.py items.py store.py job.py
  tests/  (um arquivo por módulo) + fixtures/
backend/api-service-golang/  voucher/ (snapshot, tipos, Cosmos)  handler/vouchers.go
infra/terraform/azure/       (raiz própria, com estado próprio: Cosmos, Container Apps, identidades, orçamento)
.github/workflows/           ci.yml (jobs Python e Docker), build-collector.yml, deploy-azure.yml,
                             rollback-collector.yml, check-collector-freshness.yml
.github/dependabot.yml
frontend/src/                lib/api.ts, lib/vouchers.ts, pages/Voucher.tsx,
                             components/voucher/*, components/VoucherSpotlight.tsx
```

## Ordem e dependências

```
T1 ─▶ T2 ─▶ T3 ──────────────────────┐
T4 ─▶ T5 ─▶ T6 ──────────────────────┤
 └──▶ T7 ─▶ T8 ─▶ T9 ─▶ T10 ─▶ T11 ◀─┘ ─▶ T12 ─▶ T13 ─▶ T14 ─▶ T20
T15 (só o contrato) ─▶ T16 (precisa de T2)
T17 ─▶ T18 (só o contrato; testam com a API falsa)
T14, T16, T18 ─▶ T19

Workflows (Tasks 21 a 25):
T4..T11 ─▶ T21 (job Python no CI)        T2 ─▶ T21 (valida também o Terraform do Azure)
T21 ─▶ T12 (imagem, build e job Docker)
T1, T2 ─▶ T22 (plan e apply do Azure) ─▶ T13 (o apply do job passa por ele)
T13 ─▶ T23 (rollback)        T13, T16 ─▶ T25 (alerta de coleta parada)
T24 (dependabot): sem dependência
```

As Tasks 15, 17 e 18 não esperam a nuvem: usam o contrato da ADR-0015 e uma fonte falsa. As Tasks 21 a 25 são workflows e ficam com o criador; o assistente revisa. A Task 21 pode começar já: o Python existe e os testes passam.

---

### Task 1: ADR do Terraform na Azure

**Dono:** Criador (escreve o ADR; o assistente revisa) · **Área:** infra, docs · **Tipo:** Decision

**Files:** Create `docs/adr/0016-terraform-na-azure.md` (modelo de `docs/adr/0000-exemple-adr.md`).

**Resultado:** decidir (a) como o workflow do GitHub se autentica na Azure para o Terraform (a [ADR-0014](../../adr/0014-leitura-dos-descontos-pela-api-go.md) deixou isso em aberto; a recomendação é OIDC, sem segredo guardado, com as IDs em variáveis do ambiente); (b) **uma raiz ou duas**: `infra/terraform/azure` com estado próprio (recomendado: a conta do Cosmos só aceita o free tier na criação, e o "Deploy API" também faz SSH nas VMs) ou um módulo da raiz atual; (c) a assinatura, o grupo de recursos e o alerta de orçamento; (d) **como a tag nova da imagem chega ao job**: variável do Terraform alterada por PR, `az containerapp job update` direto do build (e então o Terraform precisa de `ignore_changes` na imagem), ou o build disparando o `apply`; (e) **onde ficam as chaves do LLM**: passá-las ao Terraform como variável coloca o valor no **estado**, então o ADR confirma a criptografia e o acesso ao bucket do estado, ou escolhe outro caminho; (f) como o certificado do Entra da API Go chega às VMs (Task 16). As alternativas e o motivo da não escolha entram no ADR; só nomes de segredos, nunca valores.

**Conferir:** `python3 .claude/skills/probekit-docs/scripts/check_links.py` sem links novos quebrados.

### Task 2: Terraform da Azure e do Cosmos DB

**Dono:** Criador · **Área:** infra, pipeline

**Files:** Create `infra/terraform/azure/` (uma **raiz própria**, com `providers`, `backend` e estado próprios, se a ADR-0016 confirmar a recomendação). O workflow de `plan` e `apply` é a Task 22 e a validação no CI é a Task 21.

**Resultado:** conta Cosmos DB for NoSQL **com free tier marcado na criação** (não dá para marcar depois), banco e contêiner `/pk` com throughput dentro de 1 000 RU/s (usar o mínimo que o portal aceitar), consistência Session, alerta de orçamento. As chaves da conta ficam ligadas por enquanto.

**Conferir:** `terraform fmt -check` e `terraform validate` passam; o `plan` é revisado antes do `apply`; no portal, a conta mostra o free tier aplicado, o throughput do contêiner e o mínimo de RU/s aceito (anotar o valor, que a [ADR-0013](../../adr/0013-banco-de-descontos-no-cosmos-db.md) deixou em aberto).

### Task 3: Prova do contêiner com itens de teste

**Dono:** Assistente prepara, Criador roda no portal · **Área:** docs

**Files:** Create `backend/voucher-collector-python/tests/fixtures/items_teste.json` (cerca de 20 itens com `id` iniciado em `teste-`, `sort_at` variado, alguns sem `published_at`, dois com `hidden: true`, um `pending`, um `failed`, um `is_voucher: false`). O resultado vai para a seção _Validação_ das ADRs.

**Interfaces — Produces:** as consultas de referência, para as Tasks 10 e 16:
`SELECT TOP 500 * FROM c WHERE c.type = 'item' AND c.hidden = false AND c.analysis.status = 'done' AND c.analysis.result.is_voucher = true ORDER BY c.sort_at DESC`.

- [ ] O assistente entrega o arquivo de itens e a consulta.
- [ ] O criador importa os itens no contêiner do projeto, antes de o coletor existir, e roda a consulta no Data Explorer. Depois apaga todos os itens de `id` iniciado em `teste-`.
- [ ] Conferir: a consulta devolve só os itens esperados, ordenados do mais novo ao mais antigo, **inclusive** os sem `published_at` (que usam `first_seen_at` em `sort_at`); o custo em RU da consulta aparece na resposta.
- [ ] O assistente registra o resultado, com a data, na _Validação_ das ADRs 0013 e 0015 (como o `ORDER BY` trata campo ausente, o RU da listagem, o mínimo de RU/s), trocando "falta confirmar" pelo que foi visto.

### Task 4: Coletor — esqueleto, origem e deduplicação

**Dono:** Assistente (Python delegado pelo criador em 2026-11-26) · testes já escritos · **Área:** pipeline, api

**Files:**
- Create: `backend/voucher-collector-python/pyproject.toml`, `THIRD_PARTY/LICENSE-VoucherBot` e `THIRD_PARTY/README.md` (origem, repositório e data da leitura), `voucher_collector/models.py`, `voucher_collector/dedup.py`
- Test: `tests/test_dedup.py`
- O job `Python` do CI e o check na regra `protection-main` são a Task 21.

**Interfaces — Produces:**
```python
# models.py (do VoucherBot, providers/base.py)
@dataclass
class NormalizedPost: url: str; title: str; content: str | None; summary: str | None; author: str | None; published_at: datetime | None; raw_data: dict
# dedup.py (do VoucherBot, services/ingestion/dedup.py)
def normalise_url(url: str) -> str
def identity_hash(url: str) -> str          # SHA-256 hex, 64 caracteres
def content_hash(title: str, content: str | None, published_at: datetime | None) -> str   # 40 caracteres
def deduplicate_batch(posts: Sequence[NormalizedPost]) -> list[NormalizedPost]
```

**Testes (`tests/test_dedup.py`):**
- `normalise_url("http://Exemplo.com/a/?utm_source=x&b=1#frag") == "https://exemplo.com/a?b=1"`
- `identity_hash("http://exemplo.com/a/") == identity_hash("https://exemplo.com/a?utm_campaign=z")` e `len(identity_hash("https://x.com")) == 64`
- `content_hash("Título  X", None, None)` ignora espaços repetidos e maiúsculas, e tem 40 caracteres.
- `deduplicate_batch` mantém só a primeira de duas posts com a mesma URL normalizada.

**Implementar:** trazer `base.py` e `dedup.py` do VoucherBot com o cabeçalho de origem e de modificação. A melhoria sugerida (como exercício): o conjunto de parâmetros de rastreio é recalculado dentro do laço de `normalise_url`; calcular uma vez fora. Versões iniciais das dependências: as usadas na medição de 2026-11-24 (`feedparser 6.0.14`, `httpx 0.28.1`, `pydantic 2.14.4`, `groq 1.7.0`, `google-genai 3.6.1`, `lxml 6.1.3`, `beautifulsoup4 4.15.0`).

**Conferir:** `cd backend/voucher-collector-python && python -m pytest tests/test_dedup.py -q` passa; todo arquivo trazido tem o cabeçalho de origem.

### Task 5: Coletor — pontuação, fontes e política HTTP

**Dono:** Assistente (Python delegado pelo criador em 2026-11-26) · testes já escritos · **Área:** pipeline

**Files:** Create `voucher_collector/scoring.py`, `sources.py`, `http_policy.py`, `sources.yaml`; Test `tests/test_scoring.py`, `test_sources.py`, `test_http_policy.py`.

**Interfaces — Produces:**
```python
# scoring.py  (as 34 palavras e pesos do bootstrap.py do VoucherBot; corte inicial = 1)
@dataclass(frozen=True) class Keyword: keyword: str; score: int
KEYWORDS: tuple[Keyword, ...]; THRESHOLD: int = 1
def score(text: str) -> tuple[int, list[str]]      # soma e palavras que casaram, na ordem de KEYWORDS
# sources.py
@dataclass(frozen=True) class Source: id: str; name: str; kind: str; url: str; vendor_hint: str | None; enabled: bool
def load_sources(path: Path) -> list[Source]
# http_policy.py  (de providers/http_policy.py, sem `settings` nem `structlog`)
class RobotsDisallowedError(Exception)
USER_AGENT = "ProbekitCollector/0.1 (+https://probekit.cc)"
async def polite_get(url: str, *, accept: str | None = None, timeout: float = 15.0) -> httpx.Response
```

**Testes:**
- `score("Free exam voucher") == (16, ["voucher", "free exam", "exam voucher", "exam"])` e `score("Docker blog post") == (0, [])`.
- `load_sources(...)` devolve **38** fontes habilitadas, todas com URL `https`, sem `theregister.com`, sem `techtarget_aws`, `techtarget_cloud` nem `suse_c_blog`.
- `polite_get` levanta `RobotsDisallowedError` quando o `robots.txt` do servidor proíbe o User-Agent (transporte falso do `httpx`); duas chamadas ao mesmo servidor respeitam no mínimo **2,0 s** entre elas (relógio e `sleep` falsos); `robots.txt` com 404 permite.

**Implementar:** `sources.yaml` vem do `Sources/RSS_List.txt` do VoucherBot menos as três fontes mortas e o The Register; o campo `vendor_hint` segue o mapa de fornecedor deles. O criador confere cada URL ao vivo antes de habilitá-la.

### Task 6: Coletor — leitura de feeds

**Dono:** Assistente (Python delegado pelo criador em 2026-11-26) · testes já escritos · **Área:** pipeline

**Files:** Create `voucher_collector/rss.py`; Test `tests/test_rss.py`, fixtures `tests/fixtures/{feed.xml,feed.json,pagina.html}`.

**Interfaces — Consumes:** `Source`, `polite_get`, `NormalizedPost`. **Produces:**
```python
class FeedError(Exception): code: str     # "http_error", "not_a_feed", "robots", "network"
async def collect(source: Source, limit: int) -> list[NormalizedPost]
```

**Testes:**
- A partir de `feed.xml`: devolve os itens com `published_at` em UTC, `summary` **sem HTML** (`"<p>Olá <b>mundo</b></p>"` vira `"Olá mundo"`) e respeita `limit`.
- A partir de `feed.json` (formato do feed JSON do Cisco): lê `title`, `link` e data.
- `pagina.html` (HTML no lugar de feed) e HTTP 404 levantam `FeedError` com o código certo; `robots.txt` proibindo levanta `FeedError("robots")`.
- Uma entrada sem data devolve `published_at is None`.

**Implementar:** adaptar `providers/rss/collector.py` do VoucherBot. Em container o `lxml` pode ficar. Conferir ao vivo as reescritas de endereço de feed (Microsoft e Google) antes de manter.

### Task 7: Coletor — esquema do LLM e validação

**Dono:** Assistente (Python delegado pelo criador em 2026-11-26) · testes já escritos · **Área:** pipeline, segurança

**Files:** Create `voucher_collector/schema.py`, `validate.py`; Test `tests/test_validate.py`, `tests/test_schema.py`.

**Interfaces — Produces:**
```python
# schema.py (de services/ai/schema.py)
class ExtractedEvent(BaseModel): is_voucher: bool; confidence: float; vendor: str | None; promotion_name: str | None; promotion_type: str | None; certifications: list[str] | None; voucher_code: str | None; discount: str | None; registration_url: str | None; start_date: str | None; end_date: str | None; regions: list[str] | None; reason: str | None
# validate.py
PROMOTION_TYPES = {"voucher", "discount", "free_exam", "beta_exam", "other"}   # conjunto inicial; confirmar com o prompt do analyzer
def parse_discount_percent(text: str | None) -> int | None
def clean_voucher_code(code: str | None) -> str | None
def safe_http_url(url: str | None) -> str | None
def normalise_promotion_type(raw: str | None) -> str
def sanitize(event: ExtractedEvent) -> ExtractedEvent        # aplica as regras acima e o `confidence` entre 0 e 1
```

**Testes:** `parse_discount_percent("50% off") == 50`; `("up to 100%") == 100`; `("US$ 100") is None`; `("150%") is None`; `clean_voucher_code("save-50") == "SAVE-50"`; `("ab") is None`; `("<script>") is None`; `safe_http_url("javascript:alert(1)") is None`; `safe_http_url("https://a.com/x") == "https://a.com/x"`; `normalise_promotion_type("Free Exam") == "free_exam"` e o desconhecido vira `"other"`; `ExtractedEvent` com `certifications=[None]` vira `None` (comportamento do VoucherBot).

### Task 8: Coletor — analisador de LLM

**Dono:** Assistente (Python delegado pelo criador em 2026-11-26) · testes já escritos · **Área:** pipeline

**Files:** Create `voucher_collector/analyzer.py`; Test `tests/test_analyzer.py`; Modify `THIRD_PARTY/README.md`.

**Interfaces — Consumes:** `ExtractedEvent`, `sanitize`. **Produces:**
```python
class CallBudget:
    def __init__(self, max_calls: int) -> None
    def take(self) -> bool                       # False quando o teto foi atingido
@dataclass
class AnalysisOutcome: kind: Literal["done", "error", "deferred"]; result: ExtractedEvent | None; model: str | None; error_code: str | None   # "invalid_json", "provider_error"; "rate_limited" e "budget" são deferred
async def analyze_post(title: str, snippet: str, budget: CallBudget, providers: Sequence[Provider]) -> AnalysisOutcome
```
`Provider` é um protocolo com `name: str` e `async complete(system: str, user: str) -> str`; os adaptadores do Groq e do Gemini o implementam (o teste usa um falso).

**Testes:** JSON válido → `kind == "done"` com o resultado já sanitizado e `model` do provedor; JSON inválido → `("error", "invalid_json")`; provedor que levanta 429 → `("deferred", "rate_limited")`; `CallBudget(1)` com dois posts → o segundo volta `("deferred", "budget")`; resultado de baixa confiança (o limiar é o do `analyzer.py` do VoucherBot) dispara o reanalisador (`qwen`) uma vez; falha do Groq que **não** é 429 cai no Gemini; a chave de API **nunca** aparece em `repr(outcome)` nem em log.

**Implementar:** adaptar `services/ai/analyzer.py`: manter o prompt, a leitura e a validação da resposta e os adaptadores; **não** portar a contabilidade de tokens por modelo em memória (substituída por `CallBudget`). Antes, ler o prompt inteiro para fechar o conjunto de `PROMOTION_TYPES` da Task 7.

### Task 9: Coletor — montagem do item e ciclo da análise

**Dono:** Assistente (Python delegado pelo criador em 2026-11-26) · testes já escritos · **Área:** pipeline

**Files:** Create `voucher_collector/items.py`; Test `tests/test_items.py`.

**Interfaces — Consumes:** `NormalizedPost`, `Source`, `identity_hash`, `content_hash`, `score`, `AnalysisOutcome`, `parse_discount_percent`. **Produces:**
```python
MAX_ATTEMPTS = 5
def build_item(post: NormalizedPost, source: Source, keyword_score: int, matched: list[str], now: datetime) -> dict
def merge_existing(existing: dict, incoming: dict, now: datetime) -> dict
def apply_outcome(item: dict, outcome: AnalysisOutcome, now: datetime, prompt_version: int) -> dict
def is_visible_to_api(item: dict) -> bool        # as regras de visibilidade da ADR-0015
```

**Testes:**
- `build_item(...)` traz `id == identity_hash(url)`, `pk == "v1"`, `type == "item"`, `schema_version == 1`, `hidden is False`, `analysis == {"status": "pending", "attempts": 0}`, `len(snippet) <= 500`, e `sort_at == published_at` (ou `first_seen_at` quando não há data).
- `merge_existing` **preserva** `hidden=True` e `first_seen_at`, atualiza `last_seen_at`, acrescenta a fonte nova em `seen_in` sem repetir, e, se o `content_hash` mudou, volta `analysis.status` para `pending` **mantendo** o resultado antigo.
- `apply_outcome`: `done` grava `analyzed_at`, `model`, `prompt_version`, o resultado e `discount_percent`; `error` incrementa `attempts`; a 5ª falha vira `failed`; `deferred` **não** muda `attempts`.
- `is_visible_to_api` é falso para `hidden`, `pending`, `failed`, `is_voucher` falso e `confidence < 0.5`.

### Task 10: Coletor — armazenamento no Cosmos

**Dono:** Assistente (Python delegado pelo criador em 2026-11-26) · testes já escritos · **Área:** pipeline, infra

**Files:** Create `voucher_collector/store.py`; Test `tests/test_store.py` (com `InMemoryStore`) e `tests/test_store_cosmos.py` (integração, marcada `@pytest.mark.cosmos`, só roda com `COSMOS_ENDPOINT` definido).

**Interfaces — Produces:**
```python
class ItemStore(Protocol):
    def get(self, item_id: str) -> dict | None
    def put(self, item: dict) -> None          # cria ou substitui
    def put_run(self, run: dict) -> None       # id "last_run", type "run", pk "v1"
class InMemoryStore: ...                        # para os testes dos outros módulos
class CosmosStore:
    def __init__(self, endpoint: str, database: str, container: str, credential) -> None
```

**Testes:** `InMemoryStore`: `get` de id inexistente devolve `None`; `put` duas vezes o mesmo `id` deixa um documento; `put_run` sobrescreve. Integração (Cosmos): `put` + `get` devolvem o mesmo documento; um item gravado **sem** `hidden` não aparece na consulta de listagem da Task 3 (documenta o motivo de o coletor sempre gravá-lo).

**Implementar:** `azure-cosmos` com `DefaultAzureCredential` (identidade gerenciada na nuvem; na máquina local, o login do `az`, e então o criador precisa do papel _Data Contributor_ no próprio usuário). O SDK de Python não é a base de nenhuma operação `PATCH` (preview): ler, mesclar e substituir.

### Task 11: Coletor — o job

**Dono:** Assistente (Python delegado pelo criador em 2026-11-26) · testes já escritos · **Área:** pipeline

**Files:** Create `voucher_collector/job.py`; Test `tests/test_job.py`.

**Interfaces — Consumes:** todos os anteriores. **Produces:**
```python
@dataclass
class RunSummary: status: Literal["ok", "partial", "failed"]; feeds_total: int; feeds_ok: int; feeds_failed: list[str]; items_seen: int; items_new: int; items_analyzed: int; llm_calls: int; llm_errors: int
async def run(sources: list[Source], store: ItemStore, providers: Sequence[Provider], *, now: Callable[[], datetime], max_llm_calls: int = 40) -> RunSummary
def main() -> int          # lê as variáveis de ambiente; 0 para ok e partial, 1 para failed, 2 para configuração ausente
```

**Testes (com `InMemoryStore`, coletor e provedor falsos):**
- Duas execuções seguidas com os mesmos posts deixam o mesmo número de itens (nada duplica).
- Uma fonte que levanta `FeedError` não impede as outras; `feeds_failed` a lista; `status == "partial"`.
- Com 5 itens `pending` e `max_llm_calls=2`, só 2 são analisados, os **mais novos primeiro**; os outros 3 continuam `pending` com `attempts == 0`.
- Um item com `hidden=True` no banco continua `hidden=True` depois da execução.
- Todas as fontes falhando, ou o banco indisponível: `status == "failed"` e `main()` devolve 1. Variáveis ausentes: `main()` devolve 2 e a mensagem **não** contém valor de segredo.
- O documento `run` é gravado ao fim, com `finished_at`.

**Conferir:** `python -m pytest -q` passa na pasta; rodar `python -m voucher_collector.job` com `MAX_LLM_CALLS=0` contra o contêiner do projeto grava itens `pending` (sem chamar o LLM) e o `run`; uma segunda execução não aumenta a contagem de itens.

### Task 12: Imagem do coletor e publicação no GHCR

**Dono:** Criador · **Área:** pipeline

**Files:** Create `backend/voucher-collector-python/Dockerfile`, `.dockerignore`, `.github/workflows/build-collector.yml`; Modify `.github/workflows/ci.yml` (job `Docker`).

**Resultado:**
- A imagem roda como usuário sem privilégios, sem segredo (nem `.env`) dentro, com as dependências do `pyproject.toml` (versões travadas) e o `sources.yaml` ao lado do pacote; o comando padrão é `python -m voucher_collector.job`.
- `build-collector.yml`: roda só quando muda `backend/voucher-collector-python/**` (ou o próprio workflow) na `main`; **roda os testes antes de publicar**, como o `build-api-golang.yml`; publica no GHCR com tag pelo **SHA do commit**, nunca `latest`; `permissions: packages: write` **só no job que publica**; nenhum `pull_request_target`.
- CI: o job `Docker` do `ci.yml` faz o `docker build` **sem publicar**, em todo PR (sem filtro de pasta). O check `Docker` só entra na regra `protection-main` depois de ter rodado uma vez.
- **Passo manual, uma vez:** o primeiro pacote publicado nasce **privado**. Torná-lo **público** é na página do pacote no GitHub (um workflow não consegue), e isso entra no `docs/runbook-vouchers.md`. Sem isso o Container Apps Job não baixa a imagem sem credencial.

**Conferir:** `docker build` local funciona; `docker run --rm <imagem>` sem variáveis sai com código 2 e imprime só os **nomes** das variáveis que faltam; o PR mostra o check `Docker`; depois do merge, a imagem aparece no GHCR com a tag do SHA; a imagem **publicada** baixa sem login (`docker pull` de uma sessão deslogada); `docker history` não mostra nenhuma chave.

### Task 13: Container Apps Job, identidade e papéis (Terraform)

**Dono:** Criador · **Área:** infra

**Files:** Modify `infra/terraform/azure/`. O `apply` passa pelo workflow da Task 22; a forma de a tag nova da imagem chegar ao job é a decisão (d) da ADR-0016.

**Resultado:** ambiente Container Apps (Consumption), job `Schedule` com `0 * * * *`, 0,25 vCPU e 0,5 GiB, teto de tempo da réplica bem abaixo de 1 hora (sugestão: 900 s), limite de tentativas 1, imagem pelo SHA, _secrets_ `GROQ_API_KEY` e `GEMINI_API_KEY` por `secretref`, as demais variáveis como configuração, identidade gerenciada com o papel _Data Contributor_ restrito ao contêiner, logs no destino padrão.

**Conferir:** o `plan` mostra só os recursos esperados; depois do `apply`, uma execução manual termina com sucesso; **a primeira execução prova**: o job baixa a imagem do GHCR sem credencial, escreve no Cosmos pela identidade e o Container Apps Job existe na região escolhida (as dúvidas da [ADR-0012](../../adr/0012-coletor-de-descontos-em-container-apps-job.md)).

### Task 14: Primeira semana: medir e registrar

**Dono:** Criador executa · Assistente registra · **Área:** docs

**Files:** Modify a seção _Validação_ das ADRs 0012, 0013, 0014 e 0015 (só _Status_ e _Validação_, com data).

- [ ] Registrar, com a data e a origem de cada número: duração real da execução (com LLM), memória usada, RU consumidos pelo job e pela consulta da listagem, consumo da franquia do Container Apps na análise de custos, quantos feeds falharam por dia e quantas chamadas ao LLM por dia.
- [ ] Trocar cada "falta confirmar" que ficou confirmada (ou desmentida) pelo resultado.
- [ ] Onde um número desmentir uma decisão (por exemplo, a franquia não vale para jobs), **abrir uma Decision** e um ADR novo; não reescrever a decisão aceita.

### Task 15: API Go — rota, instantâneo e testes (fonte falsa)

**Dono:** a definir pelo criador (exercício dele, ou do assistente), caso a caso · testes do assistente · **Área:** api

**Files:** Create `backend/api-service-golang/voucher/voucher.go`, `voucher/snapshot.go`, `handler/vouchers.go`; Test `voucher/snapshot_test.go`, `handler/vouchers_test.go`; Modify `main.go` (registrar a rota com limitador próprio). Commit com prefixo `feat(api):`, porque a rota é funcionalidade nova e gera release minor.

**Interfaces — Produces:**
```go
type Doc struct { /* visão do item no banco: campos da ADR-0015 que a API usa */ }
type Item struct { /* resposta: campos do contrato da ADR-0015, com json tags */ }
type Source interface { Latest(ctx context.Context, n int) ([]Doc, time.Time, error) } // time = last_collected_at
type Snapshot struct{ /* ... */ }
func NewSnapshot(src Source, every time.Duration, max int) *Snapshot
func (s *Snapshot) Start(ctx context.Context)                     // 1ª carga e depois a cada `every`, em segundo plano
func (s *Snapshot) Page(limit int, cursor string) (items []Item, next string, lastCollected time.Time, err error)
func Vouchers(s *Snapshot) http.Handler                           // GET /api/vouchers?limit=&cursor=
```

**Testes:**
- Antes da primeira carga: HTTP 503 com `{"error": ..., "code": "vouchers_unavailable"}`.
- Depois: HTTP 200 com `last_collected_at`, `generated_at`, `items`, `next_cursor`; ordem por `sort_at` decrescente, desempate por `id`.
- Filtra `hidden`, `pending`, `failed`, `is_voucher` falso e `confidence < 0.5`; a resposta **não** contém `snippet`, `reason`, `confidence`, `registration_url` (compara as chaves do JSON).
- `limit` padrão 20; `limit=100` devolve no máximo 50; o `cursor` continua sem repetir nem pular item, mesmo se entrarem itens novos entre as páginas; `cursor` lixo devolve HTTP 400 no contrato padrão.
- Se a segunda carga falha, a resposta continua sendo a do instantâneo anterior.
- **Limite próprio:** 50 chamadas a `/api/vouchers` do mesmo IP não bloqueiam a 51ª chamada a `/api/ping` desse IP; o IP real atrás do proxy confiável é o que conta.
- **CORS:** origem permitida recebe o cabeçalho de permissão; origem não permitida não.

**Conferir:** `cd backend/api-service-golang && go test ./... && go vet ./...` passam.

### Task 16: API Go — Cosmos real, credencial e entrega na VM

**Dono:** Criador · **Área:** api, infra

**Files:** (commit com prefixo `feat(api):`) Create `voucher/cosmos.go` (+ teste de integração opcional); Modify `go.mod`, `main.go` (variáveis `COSMOS_ENDPOINT`, `COSMOS_DATABASE`, `COSMOS_CONTAINER`; se `COSMOS_ENDPOINT` estiver vazio, a rota **não** é registrada e o log diz por quê); Modify `infra/shellscript/deploy-api-go.sh` (e `infra/shellscript/tests/`); Modify `.github/workflows/deploy-api-golang.yml` (o certificado do Entra viaja como o certificado TLS: secret do ambiente `production`, `scp` e o script de deploy); Modify `infra/terraform/azure/` (app registration, certificado, papel _Data Reader_ no contêiner).

**Interfaces — Consumes:** `Source`. **Produces:** `func NewCosmosSource(endpoint, database, container string, cred azcore.TokenCredential) (*CosmosSource, error)`.

**Resultado:** a API lê o Cosmos com `azcosmos` e a credencial de certificado do `azidentity`. O arquivo do certificado chega à VM como o certificado TLS (secret do ambiente `production`, `0600`, dono o usuário do serviço) e o caminho vai em `AZURE_CLIENT_CERTIFICATE_PATH`; **nada** de segredo nas linhas `Environment=` da unidade do systemd. A validade do certificado é registrada no runbook (Task 19).

**Conferir:** nas duas VMs, `GET /api/vouchers` devolve 200 com itens; `stat -c %a` do arquivo do certificado mostra `600`; `systemctl show` da unidade não traz o conteúdo do certificado; **só depois** disso, ativar `disableLocalAuth` e confirmar que o acesso por chave da conta **falha**, e que a API e o job continuam funcionando. Se a leitura por certificado falhar fora da Azure, aplicar o plano B da [ADR-0014](../../adr/0014-leitura-dos-descontos-pela-api-go.md) (segredo de cliente) e registrar na ADR.

### Task 17: Frontend — cliente da API, página e menu

**Dono:** Assistente · **Área:** frontend

**Files:** Modify `frontend/src/lib/api.ts`, `AnimatedRoutes.tsx`, `Header.tsx`, `lib/siteMeta.ts`; Create `lib/vouchers.ts`, `pages/Voucher.tsx`, `components/voucher/VoucherList.tsx`, `components/voucher/VoucherRow.tsx`; Test os `.test.tsx` ao lado de cada um.

**Interfaces — Produces:**
```ts
export interface VoucherItem { id: string; url: string; title: string; vendor: string | null; promotion_name: string | null; promotion_type: string; discount_text: string | null; discount_percent: number | null; certifications: string[]; voucher_code: string | null; start_date: string | null; end_date: string | null; regions: string[]; published_at: string | null; source_name: string }
export interface VouchersResponse { last_collected_at: string; generated_at: string; items: VoucherItem[]; next_cursor: string | null }
export async function getVouchers(opts?: { limit?: number; cursor?: string }): Promise<VouchersResponse>   // erros no contrato { error, code }
// lib/vouchers.ts
export function isEnded(item: VoucherItem, today: Date): boolean
export function isSafeLink(url: string): boolean        // `isSafeUrl` e só http/https
```

**Testes:** estados *carregando* (reserva altura), *vazio*, *erro* (botão tenta de novo) e *filtro sem resultado*; lista do mais novo ao mais antigo; filtro por fornecedor; vigentes por padrão e encerradas com a opção; item sem `end_date` aparece marcado; título `<img src=x onerror=alert(1)>` aparece **como texto**; `url` `javascript:alert(1)` não vira link; "Carregar mais" usa `next_cursor`; cada linha tem `id` como âncora (`#<id>` rola até ela); o menu mostra "Vouchers" para `/voucher` e a página traz o subtítulo "Descontos de certificações"; `/voucher` entra no `siteMeta` e no sitemap; a rota é carregada sob demanda.

**Conferir:** `cd frontend && npm test && npm run build && npm run lint` passam; `prettier --check` nos `.md` do `frontend/`; conferir no navegador (claro e escuro, celular e computador) com a API falsa do Vite ou a de produção.

### Task 18: Frontend — aviso do último desconto na Home

**Dono:** Assistente · **Área:** frontend

**Files:** Create `lib/useFeaturedVoucher.ts`, `components/VoucherLine.tsx` (a linha do herói: o rótulo "Voucher ativo" e um selo sem frase com logo, "−50%" e carimbo do prazo), `components/VoucherSpotlight.tsx` (seção com o ingresso completo, abaixo da primeira tela) e `components/voucher/ticketParts.tsx` (as peças do ingresso, compartilhadas com a lista) (+ testes); Modify `pages/Home.tsx` (+ teste); `lib/vouchers.ts`.

**Interfaces — Produces:** `pickBannerItem(items: VoucherItem[], today: Date): VoucherItem | null` (o primeiro com `vendor` e `discount_text` **que ainda está ativo**); `useFeaturedVoucher(): { item, today } | null`, que busca uma vez e alimenta a linha do herói e a seção (cada uma recebe `featured` por props); `pillText(item, today): string` (rótulo acessível do selo da linha) e `remainingShort(days): string` ("hoje", "amanhã", "5 dias"). Sem botão de fechar e sem `localStorage`.

**Testes:** nada aparece se a API falha, se a lista é vazia, se nenhum item tem fornecedor e desconto ou se todos acabaram; o destaque é o mais recente **ativo** (se o mais novo acabou, o próximo que vale); no dia seguinte ao término ele some, no último dia ainda aparece; o título leva a `/voucher#<id>` e há o link para `/voucher`; título com HTML aparece como texto; não há botão nem uso de `localStorage`; na Home há uma busca só para os dois lugares, a linha fica no herói, logo depois do "Último artigo" e fora do fluxo, e a seção depois de "O que já funciona"; a Home segue inteira sem eles.

**Conferir:** `npm test` passa; **antes e depois**, medir o CLS da Home no Lighthouse (`chrome-devtools`), registrar os dois valores na PR, e o depois não pode ser pior. A seção fica abaixo da primeira tela de propósito (logo após o herói, o CLS a 500 px de largura passou de 0,03 para 0,22).

### Task 19: Documentação

**Dono:** Assistente · **Área:** docs

**Files:** Modify `docs/architecture/arch.md`, `frontend/src/pages/Arquitetura.tsx` e o diagrama, `README.md` (tabela de variáveis de ambiente, coletor e API), `frontend/README.md`, `OVERVIEW.md` (decisões e progresso, **só** depois de as ADRs serem aceitas), `docs/superpowers/specs/2026-11-24-probekit-descontos-certificacoes-design.md` (trocar "proposta" pelo estado das ADRs); Create `docs/runbook-vouchers.md`.

**Resultado:** o runbook traz, com comando e resultado esperado: disparar o job à mão; ler o último `run` e os logs; achar um feed morto; esconder um item (`hidden`); reabrir um item `failed`; renovar o certificado da API e o que acontece se ele expirar (a página mostra uma "última coleta" que envelhece); reverter a rota se a leitura falhar. Siga a tabela "Mudou isto, confira aquilo" do [`docs/README.md`](../../README.md).

**Conferir:** `python3 .claude/skills/probekit-docs/scripts/check_links.py`; nenhum valor de segredo, IP ou nome interno; nada afirmado como verificado sem data e evidência.

### Task 20: Calibrar o filtro e a confiança com dados reais

**Dono:** Criador e Assistente · **Área:** pipeline

**Files:** Modify `voucher_collector/scoring.py` e `tests/test_scoring.py`; a regra de visibilidade (`items.py` e `voucher/snapshot.go`) se o corte de confiança mudar.

- [ ] Depois de pelo menos uma semana de execuções, consultar os itens `done` e comparar `matched_keywords` e `keyword_score` com `is_voucher`: quais palavras só trazem ruído (por exemplo `exam`, `certification` e `webinar` com 1 ponto) e quais promoções legítimas ficaram de fora.
- [ ] Propor novos pesos e um novo corte; ajustar os testes com exemplos reais (títulos de itens verdadeiros e falsos); medir de novo quantos itens por dia vão ao LLM.
- [ ] Ajustar o corte de `confidence` olhando itens `done` com valores próximos de 0,5.
- [ ] Registrar na ADR-0015 (_Validação_, com data) o corte novo e o motivo.

### Task 21: CI — job Python e validação do Terraform do Azure

**Dono:** Criador · **Área:** pipeline

**Files:** Modify `.github/workflows/ci.yml`; depois, a regra `protection-main` (feito no GitHub, não no repositório).

**Resultado:** um job `Python` que roda em **todo** PR para a `main`, como `Go`, `Terraform` e `NPM` (sem filtro de pasta): instala `backend/voucher-collector-python` com `pip install -e ".[dev]"` e roda `ruff check` e `pytest`. O job `Terraform` passa a validar também a raiz `infra/terraform/azure` (`init -backend=false` e `validate`; o `fmt -recursive` já cobre as subpastas), quando a Task 2 existir.

**Por que sem filtro de pasta:** a regra da `main` exige os checks pelo nome. Um check que não roda no PR deixa o merge esperando para sempre.

**Conferir:** um PR de teste mostra os checks `Go`, `Terraform`, `NPM` e `Python`, todos passando, inclusive num PR que mexe só em `frontend/`. **Só depois** o check `Python` entra na regra `protection-main`.

### Task 22: Workflow de plan e apply do Terraform na Azure

**Dono:** Criador · **Área:** infra, pipeline

**Files:** Create `.github/workflows/deploy-azure.yml`.

**Resultado:** um workflow só para `infra/terraform/azure` (não o `deploy-api-golang.yml`, que também faz SSH nas VMs). Mesmo desenho do atual: `plan` no ambiente `plan`, plano guardado **criptografado** como artefato, `apply` no ambiente `production` (com revisor) aplicando **exatamente** aquele plano. Entra na Azure como a ADR-0016 decidir (recomendado: OIDC). `permissions` mínimas, `concurrency` própria para dois `apply` não correrem juntos, nenhum `pull_request_target`.

**Conferir:** o `plan` roda sem nenhum segredo da Azure guardado no repositório; o `apply` só começa depois da aprovação; rodar duas vezes seguidas sem mudança dá `No changes`; o artefato do plano some em 1 dia.

### Task 23: Rollback da imagem do coletor

**Dono:** Criador · **Área:** pipeline

**Files:** Create `.github/workflows/rollback-collector.yml` (ou, se a ADR-0016 escolher a tag como variável do Terraform, uma entrada `workflow_dispatch` do `deploy-azure.yml`).

**Resultado:** voltar o job para uma tag (SHA) anterior da imagem, no ambiente `production`, sem refazer o build. Segue o padrão dos `rollback-*` existentes (um job `check` e um `rollback`).

**Conferir:** rodar com o SHA anterior deixa o job apontando para ele; uma execução manual do job termina com sucesso; uma tag que não existe no GHCR falha **antes** de mudar qualquer coisa.

### Task 24: Dependabot

**Dono:** Criador · **Área:** pipeline

**Files:** Create `.github/dependabot.yml`.

**Resultado:** atualizações semanais para `pip` e `docker` (`/backend/voucher-collector-python`), `gomod` (`/backend/api-service-golang`), `npm` (`/frontend`), `github-actions` (`/`) e `terraform` (`/infra/terraform` e `/infra/terraform/azure`), cada um com limite baixo de PRs abertos. O coletor trava as versões com `==`; sem o bot elas envelhecem sem ninguém ver.

**Conferir:** a página _Insights → Dependency graph → Dependabot_ lista os seis ecossistemas; o CI roda nos PRs do bot.

### Task 25: Alerta de coleta parada

**Dono:** Criador · **Área:** pipeline

**Files:** Create `.github/workflows/check-collector-freshness.yml`.

**Resultado:** um workflow agendado (a cada 3 horas, mais `workflow_dispatch`) que lê `last_collected_at` de `GET /api/vouchers?limit=1` na API pública e **falha** se a última coleta tem mais de 3 horas (o job roda de hora em hora) ou se a API responde erro. A falha é o alerta (o GitHub avisa por e-mail). `permissions: contents: read`, nenhum segredo: só a URL pública.

**Conferir:** contra a API em produção passa; com o limite de idade em 0 hora falha, com uma mensagem que diz a idade da última coleta.
