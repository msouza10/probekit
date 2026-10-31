# Runbook: auditoria de SEO e linha de base

Para quem quer medir o SEO do site, repetir a auditoria ou entender o que foi achado. O plano é o [plano de SEO](./superpowers/plans/2026-10-26-probekit-seo.md); o que fica por fazer vive nas issues e no GitHub Project, não aqui.

## 1. Como repetir a auditoria

A linha de base abaixo foi medida no site publicado (`https://probekit.cc`), que serve o mesmo build da `main`. Para medir um build local antes de publicar, use `cd frontend && npm run build && npx wrangler dev`: o `html_handling` do Wrangler serve `/ping` a partir de `ping.html`, como em produção.

**Lighthouse (SEO, Acessibilidade, Boas práticas).** Com o Chrome DevTools MCP, abra a rota e rode `lighthouse_audit` em `mobile` e em `desktop`. A ferramenta **não mede desempenho** (LCP, INP): para isso use `performance_start_trace` e `performance_analyze_insight`. O Lighthouse se recusa a auditar uma página que responde 404; para a 404 use `mode: snapshot`.

**`<head>` de cada página.** Depois de `npm run build`, confira em `frontend/dist/*.html`: um `<title>` e uma `description`; um canonical igual à URL pública; os dez `og:*`; JSON-LD que passa em `JSON.parse`; nenhum `robots` nas páginas indexáveis e `noindex` na 404; um `<h1>` por página.

**O que a auditoria automática não vê:**

```bash
# a 404 responde 404 de verdade (esperado: 404)
curl -s -o /dev/null -w "%{http_code}\n" https://probekit.cc/rota-inexistente

# robots.txt e sitemap.xml (esperado: 200 e 200)
curl -s -o /dev/null -w "%{http_code}\n" https://probekit.cc/robots.txt
curl -s -o /dev/null -w "%{http_code}\n" https://probekit.cc/sitemap.xml

# www e apex: esperado 301 para o apex (hoje responde 200 com o mesmo conteúdo)
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://www.probekit.cc/ping
```

## 2. Linha de base (2026-10-30)

Nota de 0 a 100, em celular e desktop. As quatro categorias abaixo vêm do Lighthouse; a quarta, _Agentic Browsing_, é uma categoria nova da ferramenta e é onde o CLS aparece.

| Rota                                 | SEO       | Acessibilidade | Boas práticas | Agentic Browsing |
| ------------------------------------ | --------- | -------------- | ------------- | ---------------- |
| `/`                                  | 100 / 100 | 100 / 100      | 100 / 100     | 100 / 100        |
| `/ping`                              | 100 / 100 | 100 / 100      | 100 / 100     | 100 / 100        |
| `/dns-lookup`                        | 100 / 100 | 100 / 100      | 100 / 100     | 100 / 100        |
| `/arquitetura`                       | 100 / 100 | 100 / 100      | 100 / 100     | **99** / 100     |
| `/sobre`                             | 100 / 100 | 100 / 100      | 100 / 100     | 100 / 100        |
| `/artigos`                           | 100 / 100 | 100 / 100      | 100 / 100     | 100 / 100        |
| `/artigos/hello-world`               | 100 / 100 | 100 / 100      | 100 / 100     | 100 / **92**     |
| rota inexistente (snapshot, celular) | 100       | 100            | 100           | 100              |

Cada célula é _celular / desktop_. Nas células com nota abaixo de 100 a causa é o CLS:

- `/arquitetura`, celular: CLS 0,056 (bom: até 0,1).
- `/artigos/hello-world`, desktop: CLS 0,121 pelo Lighthouse e 0,16 no trace a frio (precisa de melhoria: de 0,1 a 0,25).

**Depois da correção do CLS (2026-10-30, [#51](https://github.com/msouza10/probekit/issues/51), PR #55):** em `/artigos/hello-world`, em produção, o CLS caiu para **0,00** no trace a frio (antes: 0,16) e o Lighthouse deu 100 nas quatro categorias em celular e desktop (antes: Agentic Browsing 92 no desktop). O LCP foi de 143 ms para 108 ms.

**Desempenho:** só o artigo foi medido com trace (cache ignorado, sem limitação de CPU nem de rede): LCP de 143 ms (TTFB 20 ms, atraso de carga 16 ms, duração da carga 35 ms, atraso de renderização 71 ms). As outras rotas, o INP e a medição em rede lenta **não foram medidos**. Sem dados de usuários reais (CrUX) para esta URL.

**Estado da página:** em todas as rotas há um `<title>` no `<head>`, uma `description`, um canonical igual à URL pública, os dez `og:*` e um `<h1>`. O `lang` é `pt-BR`. A 404 tem `noindex`, status HTTP 404 e canonical `/404`. O JSON-LD é válido em todas as páginas que o têm: `WebSite` na Home, `WebApplication` em `/ping` e `/dns-lookup`, `AboutPage` em `/sobre` e `BlogPosting` no artigo.

**Depois do PR #63 (2026-10-30, [#52](https://github.com/msouza10/probekit/issues/52), #56, #57 e #59), em produção:**

- `sitemap.xml` com 7 URLs, iguais aos canonicals das 7 páginas indexáveis, com `lastmod` só no artigo (`curl -s https://probekit.cc/sitemap.xml | grep -c "<loc>"`).
- `twitter:title`, `twitter:description` e `twitter:image` iguais aos `og:*` nas 7 rotas; `/ping`, `/dns-lookup`, `/arquitetura` e `/sobre` têm imagem social própria de 1200×630.
- `BreadcrumbList` (JSON válido) em todas as páginas menos a Home e a 404: 2 itens nas páginas fixas e na lista de artigos, 3 no artigo.
- Imagem do artigo em WebP: 15 kB (antes 263 kB). No trace do artigo, o `ImageDelivery` estima 5,3 kB de desperdício (antes 174 kB), o CLS é 0,00, o LCP 102 ms e o Lighthouse dá 100 nas quatro categorias no celular.

**Validador de resultados enriquecidos do Google (2026-10-30):** o `WebApplication` de `/ping` é lido sem erros; os campos `offers` e `aggregateRating` aparecem como opcionais e ficam de fora de propósito, porque o site não tem preço nem avaliações e não vai inventá-los. O `BreadcrumbList` **ainda não foi verificado** no validador: o resultado entregue mostrava só o `WebApplication`.

## 3. Achados

Do mais importante para o menos. A coluna _Onde_ diz qual task do plano cobre o achado; o que não tem task vira issue.

| #   | Gravidade   | Achado                                                                                                                                                                                                                                                                     | Onde                                                                 |
| --- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | Média       | O `sitemap.xml` é um arquivo fixo com 5 URLs e **não lista `/artigos` nem `/artigos/hello-world`**, que existem e são indexáveis.                                                                                                                                          | Corrigido: #59, PR #63 (2026-10-30)                                  |
| 2   | Média       | O CLS do artigo passa de 0,1. Causas apontadas pelo trace: a imagem sem `width`/`height` (o componente `img` do markdown, em `frontend/src/components/article/ArticleBody.tsx`) e a troca das fontes Newsreader e Inter ao carregar (`font-display: swap`, sem pré-carga). | Corrigido: #51, PR #55 (2026-10-30)                                  |
| 3   | Média       | O `www.probekit.cc` responde 200 com **o mesmo conteúdo** do apex, sem redirect. O canonical do HTML aponta para o apex, o que reduz o dano, mas dois endereços servem a página.                                                                                           | Task 7                                                               |
| 4   | Baixa       | `public/articles/hello-world.png` tem 263 kB (736 × 824, PNG). O trace estima 174 kB desperdiçados na entrega da imagem.                                                                                                                                                   | Corrigido: #52, PR #63 (2026-10-30)                                  |
| 5   | Baixa       | Só `twitter:card` está presente. Não há `twitter:title`, `twitter:description` nem `twitter:image` próprios; o que vale é o fallback do Open Graph.                                                                                                                        | Corrigido: #57, PR #63 (2026-10-30)                                  |
| 6   | Baixa       | Só o artigo tem JSON-LD de conteúdo. Não há `BreadcrumbList` em nenhuma página.                                                                                                                                                                                            | Corrigido: #56, PR #63 (2026-10-30); validador do Google: ver abaixo |
| 7   | Baixa       | Descrições curtas: `/ping` e `/arquitetura` têm 99 caracteres, `/artigos` 52 e a 404 37. Títulos curtos: `/sobre` 16 e `/artigos` 18. Isso desperdiça espaço no resultado de busca.                                                                                        | Task 5                                                               |
| 8   | Informativa | O CLS de 0,056 em `/arquitetura` no celular está abaixo do limite; só vale reconferir se piorar.                                                                                                                                                                           | Nenhuma                                                              |

### Carrossel de tecnologias da Home (WCAG 2.2.2)

O carrossel (`frontend/src/components/ui/logo-cloud-3.tsx`) anda sozinho em laço contínuo de 32 s. Hoje ele **pausa ao passar o mouse** e **para** com `prefers-reduced-motion: reduce`, mas **não tem botão de pausa** (removido a pedido do criador em 2026-10-26).

A regra WCAG 2.2.2 (nível A) pede um mecanismo para pausar, parar ou ocultar qualquer movimento automático que dure mais de 5 segundos. A pausa por mouse não atende quem usa teclado ou toque, e a preferência de movimento reduzido atende só quem a configurou. O Lighthouse não testa essa regra: a Home tirou 100 em Acessibilidade mesmo assim.

Alternativas **sem botão**, para o criador decidir:

1. Parar o movimento depois de algumas voltas (por exemplo, 2 voltas, ou cerca de 64 s).
2. Pausar quando qualquer item recebe foco do teclado ou toque, além do mouse. Só ajuda se os itens puderem receber foco.
3. Deixar o carrossel parado por padrão e animar só quando a faixa está visível e o usuário passou o mouse.
4. Manter como está e aceitar o desvio de nível A no relatório de acessibilidade.

## 4. O que conferir depois de mudar algo

- O Lighthouse de cada rota alterada deve manter 100 em SEO e em Acessibilidade.
- O CLS do artigo deve cair para 0,1 ou menos (item 2).
- O `sitemap.xml` deve listar todas as URLs com `canonical` e `index` (item 1).
- O `www` deve responder 301 para o apex (item 3).

## 5. Mapa de termos (2026-10-30)

**Como foi feito e o que isso não mostra.** Foram 5 buscas na web em 2026-10-30, uma por termo. A ferramenta de busca devolve **quem aparece** para cada consulta; ela **não** dá a posição no Google Brasil nem o volume de buscas. Por isso a tabela diz a intenção que os resultados sugerem e quem aparece, sem prometer ranking. As escolhas de palavra-chave são do criador.

| Termo pesquisado                                    | Intenção que os resultados sugerem                                                                                                       | Quem aparece (amostra)                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ping online, teste de ping de um site               | mista: entender o que é ping e testar um destino                                                                                         | [Canaltech](https://canaltech.com.br/telecom/ping-o-que-e-e-para-que-serve/), [Tecnoblog](https://tecnoblog.net/263177/o-que-e-ping-latencia/), [Exitlag](https://www.exitlag.com/blog/pt/teste-de-ping-como-medir-e-melhorar/), [Wix](https://support.wix.com/pt/article/fazer-um-teste-de-ping), [Site24x7](https://www.site24x7.com/pt/tools/teste-ping.html), [DNS Robot](https://dnsrobot.net/pt/ping) |
| consulta DNS online, dns lookup                     | ferramenta: o usuário quer consultar um domínio agora                                                                                    | [miniwebtool](https://miniwebtool.com/br/consulta-dns/), [DNS Robot](https://dnsrobot.net/es/dns-lookup), [Aback Tools](https://abacktools.com/es/tools/web/network/dns-lookup), [DNSai](https://dnsai.com/nslookup/), [showmyip](https://www.showmyip.com/dns-lookup/); muitas páginas em inglês                                                                                                           |
| o que significa latência, ping em ms                | informativa; o ângulo de jogos online domina                                                                                             | [Exitlag](https://www.exitlag.com/blog/pt/ping-ms-como-afeta-e-como-melhorar/), [Homehost](https://www.homehost.com.br/blog/internet/latencia/), [Valor Final](https://valorfinal.com.br/guia/ping-jitter-e-latencia), [Tecnoblog](https://tecnoblog.net/responde/o-que-e-ping-latencia/)                                                                                                                   |
| tipos de registro DNS (A, AAAA, CNAME, MX, TXT, NS) | informativa: definir cada tipo                                                                                                           | [Site24x7](https://www.site24x7.com/pt/learn/dns-record-types.html), [DigiCert](https://www.digicert.com/pt/faq/dns/what-are-dns-records), [DomainDetails](https://domaindetails.com/kb/technical-guides/dns-record-types-explained)                                                                                                                                                                        |
| ping a partir de São Paulo                          | **fraca** na amostra: os resultados são fóruns de jogos e páginas de latência de provedores, sem uma ferramenta de ping "a partir de SP" | [TecMundo](https://www.tecmundo.com.br/internet/408526-por-que-o-ping-dos-games-no-brasil-e-tao-alto.htm), [Hats Network (São Paulo)](https://hatsnet.io/docs/network/latency/gru-sao-paulo)                                                                                                                                                                                                                |

**O que a pesquisa deixa claro:** as faixas de "ping bom" variam por fonte (de menos de 30 ms a menos de 50 ms para jogos, 50 a 100 ms tolerável e mais de 100 a 150 ms alto), então um texto do site não deve afirmar um número único. O ângulo "a partir de São Paulo" é um diferencial do produto, mas não apareceu como termo buscado.

### Termos por página (proposta)

| Página         | Termo principal            | Secundários                                                           | Título e descrição hoje                        |
| -------------- | -------------------------- | --------------------------------------------------------------------- | ---------------------------------------------- |
| Home           | ping e consulta DNS online | ferramentas de rede online                                            | já contêm o termo principal                    |
| `/ping`        | ping online                | teste de ping, testar latência de um site, ping a partir de São Paulo | o título já traz "Ping online" e "São Paulo"   |
| `/dns-lookup`  | consulta DNS online        | dns lookup, consultar registros DNS, registros A, MX e TXT            | o título já traz "Consulta DNS" e "DNS Lookup" |
| `/arquitetura` | arquitetura do Probekit    |                                                                       | página de marca, sem termo de busca            |

Os títulos e as descrições das páginas fixas **não foram alterados**: já contêm os termos principais, e as descrições de `/ping` e `/arquitetura` (99 caracteres) são curtas, mas válidas. Aumentá-las exigiria afirmar algo novo sobre o que o site faz, e isso não foi verificado nesta rodada. O que passou a ser conferido por teste: todo `<title>` tem até 60 caracteres e toda descrição até 160, únicos entre as páginas (`src/lib/siteMeta.test.ts`).

### Cinco temas de artigo (propostas, para o criador decidir)

Cada tema responde a uma pergunta que apareceu nos resultados acima, ligada a uma das ferramentas.

1. O que significa cada tipo de registro DNS (A, AAAA, CNAME, MX, TXT e NS).
2. Como ler o resultado de um ping: latência, jitter e perda de pacotes.
3. Ping alto: o que é normal e o que não é, e por que a distância até o servidor pesa.
4. Como saber se um site caiu ou se o problema é a sua conexão (com ping e consulta DNS).
5. DNS mudou e não aparece: o que é propagação e como conferir um registro depois de alterá-lo.
