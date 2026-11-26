# Vouchers de certificações — design

## Objetivo

Dar ao Probekit uma página pública com promoções de certificação de TI (vouchers, descontos, exames grátis e betas), sem login. Um coletor roda em lote, de hora em hora, lê fontes públicas, extrai os dados da promoção com um LLM e grava o resultado e o histórico; a API Go só lê e entrega; a página mostra.

O motivo: é uma necessidade real do criador (acompanhar promoções de certificação) e aproveita um projeto aberto que já resolve a parte difícil, o [VoucherBot](https://github.com/Devathmaj/VoucherBot) (Apache-2.0). O Probekit não tem uma máquina sobrando para rodar um serviço contínuo, então a coleta roda como job agendado em cloud, dentro dos limites gratuitos, e é também uma prática de DevOps e multicloud (ver [OVERVIEW](../../../OVERVIEW.md)).

## O que entra

- **Um coletor em Python**, em `backend/voucher-collector-python/`, empacotado em **imagem de container** e executado como **Azure Container Apps Job** com gatilho agendado (cron, em UTC) de hora em hora.
- **Guarda os itens no Azure Cosmos DB for NoSQL** (free tier vitalício), **com histórico permanente**: os itens não expiram.
- **Uma rota de leitura na API Go** (`GET /api/vouchers`, nome a confirmar) que devolve os itens já gravados, com **cache em memória** na própria API. A API não coleta, não faz scraping e não chama LLM.
- **Uma página no site** (`/voucher`) com a lista de promoções e **um aviso fechável no herói da Home** com o último desconto encontrado, no padrão visual do site (ver [No site](#no-site)).
- **Extração por LLM já na primeira versão**, como o VoucherBot faz: Groq primeiro (`gpt-oss-20b` e `gpt-oss-120b`, sorteados em partes iguais), `qwen3.8-27b` para reanalisar resultados de baixa confiança e Gemini como último recurso. Só os posts que passam no filtro de palavras-chave chegam ao LLM.
- **Reaproveitamento direto do código do VoucherBot** onde ele já está certo (tabela abaixo), mantendo a licença e marcando o que for modificado.
- **38 feeds** do catálogo do VoucherBot (RSS, Atom, JSON e fóruns). O catálogo tem 42; o The Register sai por ser bloqueado por desafio anti-bot (o próprio projeto o marca assim), e, dos 41 restantes testados ao vivo em 2026-11-24, 2 deram HTTP 404 (`rss:techtarget_aws` e `blog:suse_c_blog`) e 1 veio sem itens (`rss:techtarget_cloud`). Esses três ficam de fora até se achar o endereço novo. Respeita `robots.txt` e o intervalo mínimo entre requisições, com um User-Agent que identifica o Probekit.
- **Uma execução que falha ou é interrompida não corrompe nada**: a gravação é idempotente, pela chave de deduplicação, e a plataforma pode reiniciar o job (a documentação manda projetar para "pelo menos uma vez").

## O que não entra (agora)

- Casamento e consolidação de eventos (juntar vários posts na mesma promoção, o juiz `qwen` do VoucherBot).
- Notificações (e-mail, webhook, Discord, Telegram) e contas de usuário.
- Reddit, pela API oficial (exige credenciais) e pelo RSS público (não verificado se hoje funciona sem login nem se os termos permitem).
- Scraping de HTML. O VoucherBot marca vários sites como proibidos pelos termos de uso; cada fonte de HTML só entra depois de uma checagem própria, uma a uma.
- Expiração automática de itens (TTL). O volume é pequeno e o histórico é um requisito.
- Painel de administração das fontes. A lista de fontes é um arquivo no repositório.

## Anti-objetivos

- A API Go **não pode** ganhar tarefa longa, scraping ou chamada a LLM: ela continua respondendo rápido e sem depender de uma fonte de terceiros estar no ar.
- Uma fonte fora do ar, um LLM sem cota ou um bloqueio **não podem** derrubar a página nem apagar itens existentes. O que ficar sem análise é marcado e tentado na execução seguinte.
- O coletor **não pode** burlar `robots.txt`, esconder a identidade ou driblar bloqueios (como desafios anti-bot).
- Nenhuma credencial, chave ou nome de recurso interno no repositório (é público), **nem dentro da imagem de container**. As chaves do Groq e do Gemini e a conexão com o banco entram no job como secrets, e o repositório cita só os nomes.
- O site **não pode** chamar o banco da cloud direto do navegador: a leitura passa pela API do Probekit.
- O texto dos posts e a resposta do LLM são dados não confiáveis (um post pode tentar "instruir" o modelo). A resposta passa por validação de esquema e o site a exibe sempre como texto, nunca como HTML. Os links vindos dos itens só viram link se passarem em `isSafeUrl` e forem `http` ou `https`.
- O site **não pode** apresentar o que a IA extraiu como fato garantido: a página diz que os dados vêm de extração automática e sempre aponta para a fonte original.
- O custo **não pode** passar do que o free tier cobre sem aviso: a assinatura tem alerta de orçamento, e o throughput do banco fica dentro do limite grátis.

## Como funciona

```
cron (hora em hora, UTC) ──▶ Container Apps Job (imagem Python)
                               │ lê os 38 feeds
                               │ filtra por palavras-chave, deduplica
                               │ LLM extrai desconto, código, datas
                               ▼
                           Cosmos DB  ◀──lê── API Go (cache) ◀── site
```

1. O agendador do Container Apps dispara o job a cada hora. A execução tem um teto de tempo e de chamadas ao LLM.
2. O coletor percorre os feeds, respeitando o intervalo por servidor. Cada coleta devolve posts no formato comum (`NormalizedPost`).
3. Cada post recebe uma pontuação pela soma das palavras-chave que aparecem no título e no texto (`voucher`, `coupon`, `100% off`, `promo code`, `free exam`…). Abaixo do corte, é descartado. O corte do VoucherBot (1 ponto) é frouxo: palavras como `exam`, `certification` e `webinar` passam sozinhas, e na medição de 2026-11-24 passaram 338 dos 840 itens lidos, com ruído visível (ofertas do Marketplace da Microsoft, posts técnicos do Google Cloud). O corte e os pesos são ajustados na implementação, medindo contra os feeds reais; o LLM faz a classificação final (`is_voucher` e `confidence`).
4. A deduplicação usa a URL normalizada (sem `utm_*`, sem `#`, sem barra final): a mesma página vista duas vezes vira um item só, e o hash do conteúdo detecta quando ela mudou.
5. Os posts novos ou alterados vão ao LLM, que devolve um `ExtractedEvent` (fornecedor, tipo da promoção, certificações, código, desconto, link de inscrição, datas, regiões e confiança). A resposta é validada contra o esquema.
6. O coletor grava o item com o resultado da análise, ou com o estado "análise pendente" quando o LLM falhou ou a cota acabou.
7. A API lê os itens, os devolve do mais novo para o mais antigo, com limite por chamada, e guarda o resultado em cache por um tempo curto. O site mostra a lista.

O **contrato entre o coletor e a API é o formato do item no banco** (campos, chave de deduplicação e chave de partição). Ele é definido primeiro e vira a fonte da verdade dos dois lados.

### Controle de cota do LLM

O `analyzer.py` do VoucherBot guarda os totais de tokens e requisições por modelo **na memória do processo**. Num serviço sempre ligado isso vale para o dia inteiro. Num job, cada execução é um processo novo e os contadores zeram, então o limite diário nunca é contado de verdade. Por isso a versão do Probekit limita as chamadas por execução e, ao receber 429, deixa o post como "análise pendente" para a hora seguinte, em vez de portar a contabilidade em memória. O volume medido ajuda: em regime, cerca de 44 itens por dia passam no filtro (uns 2 por hora), e só a primeira execução tem um acúmulo (338 itens, 113 deles publicados nos últimos 30 dias). O teto por execução faz esse acúmulo ser analisado em algumas horas, sem estourar nenhum limite.

## No site

O frontend é do assistente (ver [Papéis](#papéis)) e segue o [redesign](./2026-10-23-probekit-frontend-redesign-design.md): editorial, sem grade de cards iguais, sem gradiente, sombra nem hover que levanta.

**Onde fica.** Uma página própria em `/voucher` (decisão do criador, 2026-11-24), com um item de menu ao lado de Artigos, rotulado "Vouchers" (nome da feature, decisão do criador, 2026-11-26; o subtítulo da página diz "Descontos de certificações", para quem busca pelo termo em português). Não entra no menu "Ferramentas", porque não é uma sonda que o visitante dispara: é uma lista de conteúdo, como os artigos. A Home ganha o aviso descrito abaixo.

**O que a página mostra.**

- Um título, um texto de abertura curto e uma **nota de confiança**: as promoções são coletadas de feeds públicos de hora em hora e extraídas por IA, podem ter erro, e a fonte original é sempre a referência. Mostra também quando foi a última coleta, vinda da resposta da API.
- A lista, do mais novo para o mais antigo, em linhas editoriais separadas por filete (o mesmo desenho da lista de artigos). Cada item mostra: fornecedor, título da promoção, tipo (voucher, desconto, exame grátis…), desconto, certificações, validade, região, o código quando houver (como texto, em fonte monoespaçada), a data de publicação e o nome da fonte. Cada item tem um link **"Ver na fonte"**, que abre o original em outra aba com `rel="noopener noreferrer"`.
- Itens com a análise pendente ou que falharam **não aparecem**: o filtro de palavras-chave deixa passar ruído, e mostrar um post ainda não classificado seria mostrar lixo (ver [ADR-0015](../../adr/0015-formato-do-item-de-desconto.md)). Se o LLM ficar fora do ar, a página continua com o que já foi analisado.
- Dois controles, ambos feitos no navegador: filtro por fornecedor e a opção de mostrar promoções já encerradas. Por padrão aparecem as vigentes e as sem data de término, estas últimas marcadas como tal. Se a lista tiver mais itens que o limite da API, um botão "Carregar mais" busca a página seguinte.

**Como busca os dados.** Uma função no cliente da API (`frontend/src/lib/api.ts`), no mesmo molde de `runPing`: usa `VITE_API_BASE_URL`, devolve o erro no contrato padrão `{error, code}` e cai no erro "API inacessível" quando a rede falha. Nenhuma URL do banco ou de outro serviço no código do site. A busca acontece ao abrir a página, sem atualização automática (o cache e a coleta horária já limitam a frescura).

**Estados.**

- *Carregando:* esqueleto que reserva a altura da lista, para o rodapé não pular (como o `RouteFallback`).
- *Vazio:* mensagem de que não há promoções no momento, sem tom de erro.
- *Erro:* a mensagem da API e um botão para tentar de novo.
- *Filtro sem resultado:* mensagem própria e um atalho para limpar o filtro.

**Segurança e acessibilidade.** Todo o texto dos itens é exibido como texto, nunca como HTML. O link só é renderizado se passar em `isSafeUrl` e usar `http` ou `https`; caso contrário o item aparece sem link. A lista é uma `<ul>`, as datas usam `<time>` e cada link "Ver na fonte" tem nome acessível com o título do item.

**Busca e compartilhamento.** A página entra no `siteMeta` (título, descrição, canonical), no pré-render e no sitemap, como as demais. Os itens chegam em tempo de execução, então o HTML pré-renderizado traz só a casca e o texto de abertura, e **os itens não são indexados**. É uma consequência aceita: a página não publica dados estruturados de oferta, porque o conteúdo vem de extração automática.

### Aviso no herói da Home

Pedido do criador (2026-11-24): um cartão **fechável** no herói da Home que leva ao último desconto encontrado e mostra a data, a porcentagem e o fornecedor. Diferente do bloco de exemplo que saiu da Home antes, aqui os dados são reais, e o aviso não aparece quando não há o que mostrar.

- **O que mostra.** Uma linha discreta, no mesmo lugar e no mesmo tom da linha "Último artigo": fornecedor, desconto (por exemplo "50% de desconto"; se o desconto não for uma porcentagem, o texto como veio, como "US$ 100") e a data em que a promoção foi encontrada, com um botão de fechar. Se a promoção tem data de término, a linha mostra "até dd/mm" no lugar da data em que foi encontrada, que é a informação que serve a quem chega.
- **Para onde leva.** Para `/voucher`, rolando até o item (cada linha da lista tem uma âncora com o identificador). O link não sai do site; a fonte original fica a um clique, no "Ver na fonte" do item.
- **Qual item.** O mais recente que já tenha a análise concluída e traga fornecedor e desconto. Item com análise pendente ou sem desconto não entra. Se não houver nenhum, o aviso não aparece.
- **De onde vem.** A Home reaproveita a mesma rota da lista (`GET /api/vouchers`), com um limite pequeno, e escolhe o primeiro item que serve. Assim não existe rota nova, e a resposta sai do cache da API. A busca só começa depois que a Home carregou, para não atrasar a primeira exibição.
- **Fechar.** O botão esconde o aviso e grava o identificador do item no navegador (`localStorage`, dentro de `try/catch`, como conveniência por visitante). Um desconto **novo** faz o aviso voltar; o mesmo desconto, fechado, não volta. Sem acesso ao armazenamento, o aviso aparece de novo a cada visita, e a Home continua funcionando.
- **Sem pulo de layout.** O HTML pré-renderizado não traz o aviso (ele depende de dados em tempo de execução). Por isso a linha reserva a sua altura e aparece com um fade; se não houver o que mostrar, ela recolhe. Isso precisa ser medido no Lighthouse: o CLS da Home não pode piorar.
- **Acessibilidade.** Um `<aside>` com nome acessível, o link com o texto completo, o botão com `aria-label` ("Fechar aviso de desconto") e alvo de toque de 44 px em telas de toque. A animação respeita `prefers-reduced-motion`.

**API e cota.** Hoje o rate limit da API protege só `/api/ping` e `/api/dns-lookup`, com um contador único por IP. A rota de vouchers **não pode dividir esse contador**: a Home chama a rota em toda visita, e isso gastaria a cota de ping de quem só abriu o site. A rota tem limite próprio (ou nenhum, já que lê de cache), definido na ADR 3, e CORS testado.

**Documentação a conferir quando a página entrar:** o diagrama e o texto da página Arquitetura, que hoje não incluem o coletor nem o banco, e o `frontend/README.md`.

## Reaproveitamento do VoucherBot

Referência: repositório `Devathmaj/VoucherBot`, lido em 2026-11-24 (último commit de 2026-09-23). A leitura cobriu `providers/base.py`, `services/ingestion/dedup.py`, `providers/http_policy.py`, o início de `providers/rss/collector.py`, `services/ai/schema.py`, a estrutura e as constantes de `services/ai/analyzer.py`, `Sources/RSS_List.txt` e os trechos de pontuação do `pipeline.py` e do `bootstrap.py`. **Não foram lidos** por inteiro o `analyzer.py` (634 linhas), os coletores `website`, `pearsonvue` e `training_provider`, nem o juiz de eventos, e a documentação do projeto não foi cotejada com o comportamento real.

| Do VoucherBot | Fica? | Como |
|---|---|---|
| `providers/base.py` (`NormalizedPost`, `BaseCollector`) | Sim | Como está. Só depende da biblioteca padrão. |
| `services/ingestion/dedup.py` | Sim | Quase como está. Importa só o `NormalizedPost`. Há um ponto a melhorar: o conjunto de parâmetros de rastreio é recalculado dentro do laço. |
| `providers/http_policy.py` | Sim, adaptado | A lógica (`robots.txt`, `Crawl-delay`, espera por servidor) está certa. Trocar `settings` e `structlog` por constantes e `logging`, e o User-Agent pelo do Probekit. |
| `providers/rss/collector.py` | Sim, adaptado | Em container, o `lxml` pode ficar. As reescritas de endereço de feed (Microsoft, Google) precisam ser conferidas ao vivo antes de confiar. |
| Pontuação por palavras-chave (`pipeline.py`, `bootstrap.py`) | Sim, extraída | Hoje está acoplada ao banco; vira uma função pura sobre uma lista de palavras. |
| `Sources/RSS_List.txt` | Sim, como dado | Vira um arquivo de configuração das fontes, revisado fonte a fonte, sem o The Register. |
| `services/ai/schema.py` (`ExtractedEvent`) | Sim | É o formato da extração. Depende de `pydantic`. |
| `services/ai/analyzer.py` | Sim, adaptado | Depende só de `settings` e do `ExtractedEvent`. Traz o prompt, a leitura e validação da resposta e os adaptadores do Groq e do Gemini. A contabilidade de cota em memória é trocada pelo controle por execução (ver acima). |
| FastAPI, SQLAlchemy, Alembic, `main.py` | Não | A API Go e o banco escolhido substituem. |
| Agendador, dispatcher, lease | Não | O agendador do Container Apps substitui. |
| E-mail, webhook, outbox | Não | Não há notificação. |
| Reddit, Kodexis | Não | Exigem chaves. |
| Casamento e consolidação de eventos | Não | Dependem de o histórico existir; ficam para depois. |
| Retenção | Não | O histórico é permanente. |

**Licença.** A Apache-2.0 permite reaproveitar e modificar. As obrigações são manter uma cópia da licença, preservar os avisos de copyright e **indicar nos arquivos o que foi modificado**. O VoucherBot não tem arquivo `NOTICE`. A cópia da licença e a origem de cada arquivo ficam em `backend/voucher-collector-python/THIRD_PARTY/`, e cada arquivo trazido ganha um cabeçalho com a origem e a nota de modificação.

## Decisões

As escolhas 1 e 2 são do criador (2026-11-24). As quatro têm ADR proposta, com as alternativas comparadas, e passam a aceitas quando o criador as revisar. Os números de free tier das alternativas foram levantados em 2026-11-24 nas páginas oficiais e entram nas ADRs, com o que não foi confirmado marcado como tal.

1. **Onde o coletor roda e o que o agenda: Azure Container Apps Job** ([ADR-0012](../../adr/0012-coletor-de-descontos-em-container-apps-job.md), proposta). Alternativas consideradas: Azure Functions Flex Consumption, AWS Lambda com EventBridge, GitHub Actions agendado, cron nas VMs da OCI, Cloudflare Workers. O Job foi escolhido porque o coletor é uma tarefa que roda até terminar, porque reaproveita o código do VoucherBot sem trocar dependências e porque roda igual no computador local e na cloud. O custo é ter Dockerfile, build da imagem e um registro.
   - Imagem **pública no GHCR** (decisão do criador, 2026-11-24), para evitar o custo do Azure Container Registry, que não tem plano grátis. A imagem não leva nenhum segredo.
   - Tamanho do job: **o mínimo**, 0,25 vCPU e 0,5 GiB (decisão do criador, 2026-11-24), para ficar bem dentro da franquia.
   - Exige **assinatura pay-as-you-go** (cartão) com alerta de orçamento. A conta gratuita da Azure dá US$ 200 por 30 dias; depois só valem os limites "sempre grátis".
2. **Onde ficam os itens: Azure Cosmos DB for NoSQL, com free tier** ([ADR-0013](../../adr/0013-banco-de-descontos-no-cosmos-db.md), proposta). Pela documentação da Microsoft (atualizada em 2026-04-27), o free tier dá 1 000 RU/s e 25 GB de forma vitalícia, em **uma conta por assinatura, marcado só na criação** e **fora do modo serverless**. Passou disso, cobra o preço normal. Alternativas consideradas: Postgres no Neon, DynamoDB, Firestore, OCI NoSQL, Turso.
3. **Como a API Go lê os itens** ([ADR-0014](../../adr/0014-leitura-dos-descontos-pela-api-go.md), proposta). A API mantém na memória um instantâneo dos itens mais recentes, atualizado em segundo plano a cada 10 minutos, e as requisições (inclusive a da Home) saem dele, sem esperar o banco. Se o Cosmos cai, a rota segue servindo o último instantâneo. A credencial é um principal de serviço do Entra ID, com certificado e o papel _Data Reader_ restrito ao contêiner; a chave da conta sai de cena depois que a leitura por Entra for validada nas duas VMs. O único serviço complementar é o próprio Entra ID, e a rota tem limite de requisições próprio. **Falta confirmar** que a API na OCI autentica no Cosmos de ponta a ponta (a ADR traz o plano B, com segredo de cliente, e o plano C, com arquivo publicado).
4. **Formato do item e do contrato** ([ADR-0015](../../adr/0015-formato-do-item-de-desconto.md), proposta). Um contêiner, com a chave de partição `/pk` de valor fixo `"v1"`, e dois tipos de documento: o `item` (um post que passou no filtro, com o resultado do LLM, o estado da análise e um campo `hidden` para o criador esconder um item à mão) e o `run` (o resumo da última execução, sobrescrito, que dá à página o "última coleta"). Não se guarda o conteúdo completo do post nem a resposta crua do LLM. O desconto em porcentagem é calculado por código, e o código do voucher e as URLs são validados. O histórico é permanente, sem TTL. A API devolve só itens analisados e confirmados (os pendentes e os que falharam não aparecem), no máximo os 500 mais recentes, com `limit` e `cursor`, e não expõe o link de inscrição extraído pelo LLM nesta versão.

## Verificação dos pontos em aberto (2026-11-24)

**Verificado:**

- **Feeds:** dos 41 testados, 38 respondem (3 saem, ver acima), nenhum foi barrado pelo `robots.txt`, e a coleta inteira levou de 78 a 81 s com 2 s de espera por servidor. Foi um teste descartável, com um GET por feed.
- **Memória:** pico de 144 a 145 MB com as bibliotecas do coletor (Groq, Gemini, `httpx`, `feedparser`, `pydantic`, `bs4`, `lxml`) carregadas, contra 512 MiB. Não inclui as chamadas ao LLM.
- **Volume:** 840 itens lidos, 338 passam no filtro atual, 44 deles publicados nas últimas 24 h, 80 nos últimos 7 dias e 113 nos últimos 30.
- **Timeout e tentativas do job:** o padrão é 1800 s e 0 tentativas. A documentação manda usar pelo menos 1 tentativa.
- **Logs:** o padrão é o Log Analytics, com 5 GB por mês grátis e a opção `none`. O volume esperado é de megabytes.
- **Cosmos DB:** o free tier é de 1 000 RU/s e 25 GB (a contradição dos "400 RU/s e 5 GB" era texto defasado de um README), os papéis de dados por Entra existem, as chaves podem ser desativadas, o firewall por IP existe e os limites de partição sobram para este volume. Detalhes na [ADR-0013](../../adr/0013-banco-de-descontos-no-cosmos-db.md).
- **Identidade gerenciada do job:** existe e o token vem por `DefaultAzureCredential` (ADR-0012).

**Falta confirmar:**

- Se a franquia gratuita do Container Apps vale para jobs e se alguma assinatura fica de fora. A documentação sugere que sim, sem afirmar. A conferência é pela análise de custos depois das primeiras execuções.
- Se o job baixa a imagem pública do GHCR sem credencial, e se o Container Apps Job existe na região escolhida. O teste é o primeiro deploy, e a região o criador consulta com a CLI da Azure.
- O valor máximo do timeout e das tentativas.
- Se a API Go, fora da Azure, autentica no Cosmos por Entra com certificado (o teste que decide a [ADR-0014](../../adr/0014-leitura-dos-descontos-pela-api-go.md)), se as VMs da OCI conseguem sair para o login da Microsoft e para o Cosmos, e se o criador pode registrar aplicativos no tenant. Chave somente de leitura não é documentada nas páginas lidas, e a decisão não depende dela.
- Quais credenciais o Terraform precisa para criar os recursos na Azure. Fica para uma ADR própria.
- O mínimo de RU/s por contêiner, o nível de consistência padrão e a região do Cosmos.
- Se o job escreve no Cosmos pela identidade gerenciada (o papel e o comando estão documentados, mas não foram testados).
- Os limites do plano grátis do Groq (a página mostra só a tabela do plano Developer, que é de 30 req/min e 1 000 req/dia por modelo, e a do plano gratuito fica na conta) e as do Gemini (só aparecem no AI Studio). O Gemini grátis usa as entradas para melhorar os produtos do Google, o que é aceitável para texto público. Se o Groq treina com as entradas não está dito nas páginas lidas. O teto de chamadas por execução e o tratamento de 429 funcionam qualquer que seja o limite.
- O tempo de uma execução real, com o LLM, e o consumo da franquia depois da primeira semana.

## Decisões de implementação (do assistente, a confirmar)

- Pasta `backend/voucher-collector-python/`, seguindo o padrão `backend/api-service-golang/`.
- Testes do coletor com `pytest`.
- Na página, o filtro por fornecedor e a opção de ver encerradas são o mínimo; mais filtros só se fizerem falta.
- O coletor e a API ficam em pipelines separados, e a release da API continua lendo só os commits que tocam `backend/api-service-golang/`. Mudanças no coletor não geram release da API.
- Esta spec descreve o que construir; o estado das tarefas fica nas issues e no Project, como em todo o repositório.

## Papéis

- **Criador:** escreve o coletor em Python (adaptando o código trazido, como exercício de aprendizado), o Dockerfile, o workflow de build da imagem, o Terraform, cadastra a assinatura e as chaves, executa tudo que exige credencial ou é irreversível, e aprova as ADRs.
- **Assistente:** ensina Python com conceitos e exemplos análogos, escreve os testes automatizados, revisa o Dockerfile, o Terraform e os workflows, escreve a página do site e a documentação. A rota da API em Go segue a regra normal de papéis: escolher, caso a caso, quem escreve.
- **Em conjunto:** o contrato do item, a lista de fontes e as palavras-chave.

## Critérios de pronto

- Existe ADR aceita para cada uma das quatro decisões acima, com data.
- O job, rodando agendado na cloud, grava itens reais no banco, e uma segunda execução não duplica nenhum deles (conferido pela contagem antes e depois).
- Uma fonte que falha (endereço fora do ar ou bloqueado por `robots.txt`) é registrada em log e não impede a coleta das demais.
- Um post sem cota de LLM fica como "análise pendente" e é analisado na execução seguinte, sem ser descartado.
- O tempo de uma execução e o consumo da franquia foram medidos e registrados, com data.
- `GET /api/vouchers` devolve os itens no contrato definido, com teste automatizado de sucesso, de banco indisponível e de paginação.
- O herói da Home mostra o aviso do último desconto (fornecedor, desconto e data), que leva a `/voucher` no item certo, pode ser fechado, não volta para o mesmo desconto e não aparece sem dado. O CLS da Home medido no Lighthouse não piora. Há testes automatizados de: com dado, sem dado, erro da API, fechar e lembrar, desconto novo reabrindo, e storage indisponível.
- `GET /api/vouchers` não consome a cota de `/api/ping` e `/api/dns-lookup`, e tem teste de CORS (origem permitida e bloqueada) e do IP real atrás do proxy.
- A página `/voucher` lista as promoções com os estados de carregamento, vazio, erro e filtro sem resultado, mostra a nota de confiança e a hora da última coleta, e exibe o texto dos itens sempre como texto. Um link com protocolo inseguro não vira link. Há testes automatizados dos estados, do filtro de encerradas e do link inseguro.
- A página tem entrada no menu, no `siteMeta` e no sitemap, e foi conferida no navegador (tema claro e escuro, celular e computador).
- A pasta `THIRD_PARTY/` traz a licença e a origem do código reaproveitado, e cada arquivo trazido tem o cabeçalho de origem.
- Nenhum segredo está na imagem nem no repositório.
- Os documentos afetados foram conferidos pela tabela "Mudou isto, confira aquilo" do [`docs/README.md`](../../README.md): variável de ambiente nova, contrato da API, `docs/architecture/arch.md` e runbook.
