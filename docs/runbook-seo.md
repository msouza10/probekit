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

## 3. Achados

Do mais importante para o menos. A coluna _Onde_ diz qual task do plano cobre o achado; o que não tem task vira issue.

| #   | Gravidade   | Achado                                                                                                                                                                                                                                                                     | Onde                                               |
| --- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | Média       | O `sitemap.xml` é um arquivo fixo com 5 URLs e **não lista `/artigos` nem `/artigos/hello-world`**, que existem e são indexáveis.                                                                                                                                          | Task 2                                             |
| 2   | Média       | O CLS do artigo passa de 0,1. Causas apontadas pelo trace: a imagem sem `width`/`height` (o componente `img` do markdown, em `frontend/src/components/article/ArticleBody.tsx`) e a troca das fontes Newsreader e Inter ao carregar (`font-display: swap`, sem pré-carga). | Corrigido: #51, PR #55 (2026-10-30)                |
| 3   | Média       | O `www.probekit.cc` responde 200 com **o mesmo conteúdo** do apex, sem redirect. O canonical do HTML aponta para o apex, o que reduz o dano, mas dois endereços servem a página.                                                                                           | Task 7                                             |
| 4   | Baixa       | `public/articles/hello-world.png` tem 263 kB (736 × 824, PNG). O trace estima 174 kB desperdiçados na entrega da imagem.                                                                                                                                                   | Issue nova (`chore(frontend)`), junto com o item 2 |
| 5   | Baixa       | Só `twitter:card` está presente. Não há `twitter:title`, `twitter:description` nem `twitter:image` próprios; o que vale é o fallback do Open Graph.                                                                                                                        | Task 3                                             |
| 6   | Baixa       | Só o artigo tem JSON-LD de conteúdo. Não há `BreadcrumbList` em nenhuma página.                                                                                                                                                                                            | Task 4                                             |
| 7   | Baixa       | Descrições curtas: `/ping` e `/arquitetura` têm 99 caracteres, `/artigos` 52 e a 404 37. Títulos curtos: `/sobre` 16 e `/artigos` 18. Isso desperdiça espaço no resultado de busca.                                                                                        | Task 5                                             |
| 8   | Informativa | O CLS de 0,056 em `/arquitetura` no celular está abaixo do limite; só vale reconferir se piorar.                                                                                                                                                                           | Nenhuma                                            |

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
