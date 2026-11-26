# ADR-0015: Formato do item de desconto

## Status

Proposta (2026-11-24). Escrita a pedido do criador, no desenho do [spec dos descontos de certificações](../superpowers/specs/2026-11-24-probekit-descontos-certificacoes-design.md) (decisão 4). Depende da [ADR-0012](./0012-coletor-de-descontos-em-container-apps-job.md), da [ADR-0013](./0013-banco-de-descontos-no-cosmos-db.md) e da [ADR-0014](./0014-leitura-dos-descontos-pela-api-go.md). O status passa a Aceita quando o criador revisar este texto. O que falta confirmar está em _Validação_.

## Contexto

O coletor (Python) grava e a API Go (e, por ela, o site) lê. O formato do item no Cosmos DB é o **contrato entre os dois**: se ele muda, os dois lados mudam. Esta ADR define quais dados guardar, de onde cada um vem, o esquema, a chave de partição, por quanto tempo os dados ficam e o que a API devolve.

O que já está decidido nas outras ADRs e vale aqui:

- Um contêiner do Cosmos DB for NoSQL com throughput provisionado, dentro do free tier (1 000 RU/s e 25 GB).
- O histórico é permanente.
- O coletor roda de hora em hora, como um job com um único processo por vez, e chama o LLM só para os itens que passam no filtro de palavras-chave.
- A API serve um instantâneo em memória (os itens mais recentes), atualizado a cada 10 minutos.

O que as medições de 2026-11-24 dizem sobre o volume: cerca de 44 itens por dia passam no filtro, e o filtro é frouxo (perto de 60% é ruído). Estimativa do tamanho: itens de 2 a 3 KB, 44 por dia, dão cerca de 50 MB por ano. O índice padrão pode ser maior que os dados (a documentação avisa), então o pior caso é de uns 100 MB por ano, contra 25 GB gratuitos.

O que o VoucherBot guarda, e serve de referência: um `Post` (URL, título, conteúdo, resumo, autor, data, pontuação, `content_hash`, resultado da IA em JSON) e um `Event` consolidado (fornecedor, promoção, tipo, certificações, código, desconto, link, datas, regiões, estado `ACTIVE`/`EXPIRED`/`ARCHIVED`), com um registro de fonte e um mapa de fornecedor. O Probekit começa só com o equivalente ao `Post` já analisado, que é o que a página precisa.

## Decisão

### Um contêiner, dois tipos de documento

Um único contêiner, com a **chave de partição `/pk`, sempre com o valor `"v1"`**, e dois tipos de documento, separados pelo campo `type`:

- `item`: um post de fonte pública que passou no filtro de palavras-chave, com o resultado da análise do LLM.
- `run`: **um** documento (`id` fixo) com o resumo da última execução do coletor, sobrescrito a cada execução.

Posts que **não** passam no filtro não são gravados: o custo de reavaliá-los a cada hora é só CPU, e não há leitura nem escrita no banco.

### O item

Datas e horas são texto ISO 8601 em UTC com segundos e `Z` (`2026-11-24T14:02:00Z`), que ordena como texto na ordem do tempo. Datas sem hora (início e fim da promoção) são `AAAA-MM-DD`.

| Campo | Quem produz e como | Observação |
|---|---|---|
| `id` | Coletor: SHA-256 hexadecimal da URL normalizada (a `identity_hash` do VoucherBot) | 64 caracteres ASCII. A mesma página em dois feeds vira um item só. |
| `pk` | Fixo: `"v1"` | Ver _Chave de partição_. |
| `type` | Fixo: `"item"` | |
| `schema_version` | Fixo: `1` | Sobe quando o formato muda de modo incompatível. |
| `url` | Feed: o link da entrada, como veio | A fonte original. Só `http` ou `https`. |
| `title` | Feed: título da entrada, em texto puro | |
| `snippet` | Feed: o resumo da entrada, sem HTML, cortado em 500 caracteres | É o que o LLM lê junto com o título. Não guardamos o conteúdo completo. |
| `published_at` | Feed: data de publicação, convertida para UTC; `null` se o feed não tem | |
| `first_seen_at`, `last_seen_at` | Coletor: relógio da execução | |
| `sort_at` | Coletor: `published_at`, ou `first_seen_at` se não houver | **Sempre preenchido.** É por ele que se ordena. |
| `source` | Catálogo de fontes: `{id, name, kind, vendor_hint}` da primeira fonte que trouxe o item | `vendor_hint` vem do mapa de fornecedor por fonte. |
| `seen_in` | Coletor: lista dos ids de todas as fontes que trouxeram o item | |
| `content_hash` | Coletor: hash do título, do resumo e da data (o do VoucherBot, 40 caracteres) | Detecta que a página mudou. |
| `keyword_score` | Coletor: soma da pontuação das palavras-chave | |
| `matched_keywords` | Coletor: as palavras-chave que casaram | Serve para ajustar o filtro, que é frouxo. |
| `analysis.status` | Coletor: `pending`, `done` ou `failed` | Ver _Ciclo da análise_. |
| `analysis.attempts` | Coletor: número de tentativas | |
| `analysis.analyzed_at`, `analysis.model`, `analysis.prompt_version` | Coletor: quando, por qual modelo e com qual versão do prompt | Para auditar e para reanalisar depois. |
| `analysis.last_error` | Coletor: um código curto (`rate_limited`, `invalid_json`, `provider_error`…) | Nunca o texto cru do erro. |
| `analysis.result` | **LLM**, validado contra o esquema do `ExtractedEvent`: `is_voucher`, `confidence`, `vendor`, `promotion_name`, `promotion_type`, `certifications`, `voucher_code`, `discount`, `registration_url`, `start_date`, `end_date`, `regions`, `reason` | Dado não confiável (ver abaixo). |
| `discount_percent` | **Código**, não o LLM: extrai o número de `discount` quando o texto é uma porcentagem (de 1 a 100); senão, `null` | O LLM não faz conta. |
| `hidden` | Criador, à mão: `true` esconde o item da API | Sempre gravado como `false` na criação. |

O que **não** guardamos, e por quê: o conteúdo completo ou o HTML do post (peso e direitos de autor; guardamos só o trecho e o link), o autor, a entrada crua do feed, a resposta crua do LLM (pode ser refeita a partir do título e do trecho) e a contagem de tokens.

### Como o LLM entra, e o que se faz com a resposta

A resposta do LLM é **dado não confiável**: um post pode tentar instruí-lo. Por isso:

- Passa por validação de esquema (`ExtractedEvent`). Resposta inválida vale como tentativa falha.
- `voucher_code` só é aceito se tiver 3 a 40 caracteres entre letras maiúsculas, dígitos, hífen e sublinhado. Senão, vira `null`.
- `registration_url` só é aceito se for `http` ou `https`. **Fica guardado, mas a API não o expõe na primeira versão**: um post malicioso poderia fazer o LLM devolver o link de um golpe. O site leva ao `url` do post, que é a fonte original.
- `promotion_type` livre é normalizado para um conjunto fechado, definido na implementação a partir do prompt do `analyzer.py` (que ainda não foi lido por inteiro). O que não casar vira `other`.
- `vendor` é minúsculo (o `ExtractedEvent` já faz isso). Na resposta da API, o fornecedor é `result.vendor` ou, se faltar, o `vendor_hint` da fonte.

### Ciclo da análise

```
passou no filtro ─▶ pending ──(LLM válido)──▶ done
                       │  ▲                     │
                       │  └── conteúdo mudou ───┘  (o resultado antigo fica até o novo chegar)
                       └──(5 tentativas falhas)──▶ failed
```

- Um item novo nasce `pending`. O coletor analisa até o teto de chamadas por execução (ADR-0012), dos mais novos para os mais antigos. O que sobra fica para a hora seguinte.
- Se o `content_hash` muda, o item volta a `pending` e mantém o resultado antigo até o novo chegar.
- Depois de 5 tentativas sem sucesso, o item vira `failed`. Não é mais tentado e **não aparece** na API. O criador pode reabrir um item mudando o campo à mão.
- Uma mudança de `prompt_version` **não** reanalisa o histórico sozinha (custo de chamadas). Isso seria uma ação deliberada.

### O que o coletor escreve sem apagar o que é do criador

O coletor atualiza itens existentes **lendo o documento, mesclando e substituindo**, preservando campos que ele não gerencia (como `hidden`). O processo é único, e o job tem um teto de tempo bem abaixo de 1 hora, para duas execuções não se sobreporem. A atualização parcial (`PATCH`) existe no SDK de Go, mas no de Python a documentação a marca como _preview_, então não é a base desta decisão.

### O documento `run`

`id: "last_run"`, `type: "run"`, `pk: "v1"`. Campos: `started_at`, `finished_at`, `status` (`ok`, `partial` ou `failed`), `feeds_total`, `feeds_ok`, `feeds_failed` (lista de ids), `items_seen`, `items_new`, `items_analyzed`, `llm_calls`, `llm_errors`. Dá à página o "última coleta" (`finished_at`) e a quem opera um jeito de ver feeds mortos e falhas do LLM com uma consulta. Sem histórico de execuções: os logs do job guardam isso.

### Chave de partição

`/pk` com o valor `"v1"`. Um valor só significa que toda consulta é de uma partição, que a unicidade do `id` vale para o contêiner inteiro (a mesma URL em dois feeds não vira dois itens) e que a leitura por `id` e chave é a leitura mais barata (1 RU para um item de cerca de 1 KB). O valor existe como texto para poder virar um valor por ano mais tarde, sem mudar o contêiner. A documentação aceita uma chave de pouca variedade "quando o volume de dados é pequeno e o tráfego por valor fica bem abaixo dos limites" da partição lógica, que são 20 GB e 10 000 RU/s. A chave **não pode ser trocada** depois (só migrando os dados para um contêiner novo), e o volume de dezenas de megabytes por ano deixa esse risco bem remoto.

### Índice

A política padrão do contêiner, que indexa todas as propriedades. Nenhum índice composto por enquanto: a única ordenação é `ORDER BY c.sort_at DESC`, de uma propriedade só. Excluir caminhos grandes (`/snippet/?`, `/analysis/result/reason/?`) é uma otimização de espaço que não vale a pena neste volume.

### Retenção

| Dado | Quanto tempo | Por quê |
|---|---|---|
| Itens `done` com `is_voucher` verdadeiro | Permanente | É o histórico que o criador pediu. |
| Itens `done` sem promoção, e `failed` | Permanente | Sem eles, o item voltaria a ser analisado toda vez que reaparecesse na janela do feed, gastando chamadas do LLM. |
| Posts abaixo do corte do filtro | Não são gravados | Reavaliar custa só CPU. |
| Documento `run` | Só o último | É sobrescrito a cada execução. |
| Logs do job | O padrão do Log Analytics (o nível gratuito dá 31 dias de retenção, pelas páginas lidas) | Diagnóstico, não histórico. |
| Instantâneo na API | Memória, trocado a cada 10 minutos | ADR-0014. |

**Sem TTL.** O volume não justifica, e o TTL do Cosmos usa a capacidade que sobra do throughput. Reavaliar quando o armazenamento passar de 1 GB (4% do gratuito).

### O contrato da API (`GET /api/vouchers`)

A API monta a resposta a partir do instantâneo. Entram na resposta os itens com `hidden` falso, `analysis.status` igual a `done`, `is_voucher` verdadeiro e `confidence` de pelo menos 0,5 (valor inicial, ajustado com os dados reais). Itens `pending` ou `failed` **não aparecem**: o filtro frouxo deixa passar ruído, e mostrar um post que ainda não foi classificado seria mostrar lixo. Se o LLM ficar fora do ar por dias, a página continua com o que já foi analisado.

```json
{
  "last_collected_at": "2026-11-24T14:00:12Z",
  "generated_at": "2026-11-24T14:05:00Z",
  "items": [
    {
      "id": "<64 caracteres hexadecimais>",
      "url": "https://exemplo.com/post",
      "title": "Título do post",
      "vendor": "aws",
      "promotion_name": "Nome da promoção",
      "promotion_type": "discount",
      "discount_text": "50%",
      "discount_percent": 50,
      "certifications": ["SAA-C03"],
      "voucher_code": null,
      "start_date": "2026-11-20",
      "end_date": "2026-11-30",
      "regions": ["Global"],
      "published_at": "2026-11-20T14:02:00Z",
      "source_name": "Nome da fonte"
    }
  ],
  "next_cursor": null
}
```

- `last_collected_at` é o `finished_at` do documento `run`. `generated_at` é a hora em que o instantâneo foi montado.
- Ordem: `sort_at` decrescente, desempate pelo `id`.
- Parâmetros: `limit` (padrão 20, máximo 50) e `cursor` (opaco, baseado em `sort_at` e `id` do último item, estável mesmo quando entram itens novos).
- O instantâneo guarda no máximo os 500 itens mais recentes. Os itens mais antigos ficam no banco, mas **a primeira versão não os expõe** (a página é sobre promoções vigentes). Uma rota de histórico fica para depois.
- Sem `snippet`, `reason`, `confidence`, `registration_url`, `keyword_score` nem dados de depuração.
- Erro: o contrato padrão `{error, code}`. O código `vouchers_unavailable` (HTTP 503) cobre o caso de a primeira carga do instantâneo ainda não ter acontecido.
- Se um item está encerrado (`end_date` anterior a hoje) é decisão de exibição do site, comparada em dia no fuso do visitante. A API não filtra por data.

## Alternativas consideradas

### Dois contêineres (itens e estado de fontes ou execuções)

**Motivo da não escolha:** o mínimo de RU/s por contêiner provisionado não foi confirmado, e dois contêineres consomem o limite grátis duas vezes. O estado das fontes (ETag, contagem de falhas, desativação) não é necessário nesta versão: 41 feeds respondem em cerca de 80 segundos mesmo sem requisições condicionais, e as falhas aparecem nos logs e no documento `run`.

### Chave de partição por fornecedor, por mês ou pelo próprio `id`

- **Por fornecedor:** o `id` só é único dentro da partição, então a mesma URL vinda de dois feeds de fornecedores diferentes viraria dois itens. E o fornecedor só se conhece depois do LLM.
- **Por mês de publicação:** o item de um feed sem data iria para a partição do mês da primeira coleta, e a verificação de existência precisaria saber o mês antes de ler.
- **Pelo `id`:** cada item numa partição própria faz a listagem cruzar partições sempre (2 a 3 RU por partição física, segundo a documentação), sem ganho neste volume.

**Motivo da não escolha de todas:** complexidade sem benefício neste volume, e a chave não pode ser trocada depois. O valor único é o que a documentação aceita para dados pequenos.

### Modelo do VoucherBot (posts mais eventos consolidados)

**Motivo da não escolha:** o evento consolidado depende do casamento de posts (juiz de IA e pontuação), que está fora do escopo. O item de hoje é o equivalente ao `Post`. Se o casamento chegar, o evento entra como um tipo novo de documento, com `schema_version` e sem migrar os itens.

### Guardar o conteúdo completo do post e a resposta crua do LLM

**Motivo da não escolha:** peso, direitos de autor, e o custo de reanalisar a partir do título e do trecho é baixo. O trecho curto e o link bastam.

### Deixar o LLM normalizar o desconto (`discount_percent`)

**Motivo da não escolha:** a extração de "50%" por expressão regular é determinística, testável e não alucina. O texto original continua em `discount_text`.

### Apagar os itens que não são promoção

**Motivo da não escolha:** eles são a memória de "já vi e não é nada". Sem eles, o mesmo post gastaria uma chamada do LLM toda vez que aparecesse na janela do feed.

### TTL para itens antigos

**Motivo da não escolha:** o criador quer histórico, e o volume é de dezenas de megabytes por ano.

## Consequências

### Positivas

- Um contrato claro e versionado entre coletor e API. A API ignora campos desconhecidos, então o coletor pode acrescentar campos sem quebrá-la.
- Toda consulta é de uma partição, e a existência de um item se checa por leitura direta (a mais barata).
- A mesma página em vários feeds é um item só, e a origem é preservada em `seen_in`.
- O criador pode esconder um item ruim à mão (`hidden`), sem redeploy.
- O LLM só preenche o que depende de linguagem. O que é conta ou formato (porcentagem, código, URL) é validado por código.
- O volume previsto (algumas dezenas de megabytes por ano) deixa o limite grátis muito longe.

### Negativas

- Chave de partição fixa: se o volume crescer em ordens de grandeza, é preciso migrar para um contêiner novo (a documentação aponta a cópia de contêiner).
- O coletor precisa ler e mesclar antes de substituir (em vez de um `PATCH` atômico), e só funciona bem com um processo por vez.
- O filtro frouxo faz o LLM analisar cerca de 60% de ruído. Cada análise de ruído é uma chamada gasta.
- `hidden` é um campo manual. Esquecê-lo ao criar um item (a consulta compara com `false`) o faria sumir da API, por isso o coletor sempre o grava.
- Itens sem data ordenam pela primeira vez em que foram vistos, e isso pode colocar um post antigo "no topo" no dia em que ele aparece pela primeira vez.
- A primeira versão não expõe o link de inscrição nem o histórico antigo.
- Os dois lados (o `analyzer` do Python e o tipo em Go) precisam concordar nos nomes dos campos. Um teste de contrato com um exemplo de documento e de resposta deve existir nos dois lados.

## Validação

Verificado em 2026-11-24, na documentação da Microsoft Learn:

- **Limites:** item de até 2 MB, `id` de até 1 023 bytes (qualquer caractere Unicode menos `/` e `\`, mas a página recomenda ASCII alfanumérico), aninhamento de até 128 níveis, partição lógica de até 20 GB.
- **Indexação:** a política padrão indexa todas as propriedades, com índice de intervalo em textos e números. Ordenar por duas ou mais propriedades exige índice composto, e ordenar por uma só não.
- **Partição:** a chave e o valor de um item não mudam depois de criados; trocar a chave exige mover os dados para um contêiner novo.
- **`PATCH`:** existe, com até 10 operações, e o SDK de Go o expõe (`PatchItem`). No Python a documentação o chama de _preview_.
- **ETag:** o `_etag` serve de pré-condição ("if-match"), e o conflito devolve HTTP 412.
- **Chave única:** vale por partição lógica e não pode ser acrescentada a um contêiner existente. Esta decisão não usa chave única.
- **TTL:** mecanismo documentado (`DefaultTimeToLive` no contêiner e `ttl` no item); em contas com throughput provisionado, usa a capacidade que sobra. Esta decisão não usa TTL.
- **Leitura por `id` e chave:** 1 RU para um item de cerca de 1 KB.
- **Estimativas de tamanho e volume (minhas, não da documentação):** de 2 a 3 KB por item, 44 itens por dia, de 50 a 100 MB por ano.

**Falta confirmar:**

- Como o `ORDER BY` trata um documento que **não tem** a propriedade ordenada, e se um campo ausente se compara com `= false`. A página da documentação deu 404. O desenho se protege (o `sort_at` e o `hidden` são sempre gravados), mas o teste decide: antes de aceitar a ADR, criar o contêiner com itens de teste e rodar a consulta da listagem.
- O custo em RU da consulta da listagem (500 itens) e das gravações. Só o custo da leitura por `id` está documentado.
- Se o SDK de Python aceita a pré-condição por ETag na substituição, e se o `upsert` preserva campos que o coletor não envia (não preserva; é por isso que o coletor lê antes de substituir).
- A paginação por token de continuação e o comportamento de `OFFSET`/`LIMIT` (páginas deram 404). A API não depende deles, porque pagina o instantâneo em memória, mas a consulta de carga usa `TOP`.
- Se o guia oficial de datas recomenda texto ISO 8601 para ordenar. O desenho depende só de o formato fixo ordenar como texto, o que o teste de listagem também mostra.
- O conjunto fechado de `promotion_type` e o prompt exato do `analyzer.py` (não lido por inteiro).
- O limiar de confiança (0,5) e o corte do filtro, a ajustar com os dados reais das primeiras semanas.
- O mínimo de RU/s por contêiner na conta com free tier (ADR-0013).

## Referências

- [Limites do Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/concepts-limits)
- [Política de indexação](https://learn.microsoft.com/azure/cosmos-db/index-policy)
- [Particionamento](https://learn.microsoft.com/azure/cosmos-db/partitioning)
- [Atualização parcial de documentos](https://learn.microsoft.com/azure/cosmos-db/partial-document-update)
- [Concorrência otimista](https://learn.microsoft.com/azure/cosmos-db/database-transactions-optimistic-concurrency)
- [Chaves únicas](https://learn.microsoft.com/azure/cosmos-db/unique-keys)
- [Time to live](https://learn.microsoft.com/azure/cosmos-db/time-to-live)
- [Unidades de requisição](https://learn.microsoft.com/azure/cosmos-db/request-units)
