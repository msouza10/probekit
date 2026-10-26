# SEO técnico, de conteúdo e social — plano de implementação

> **Para quem for executar:** use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`, task por task. Os passos usam caixas (`- [ ]`) como roteiro de execução; o estado oficial de cada task está na issue e no GitHub Project. Commit, push e PR são do criador: os passos de commit trazem só a mensagem sugerida.

**Goal:** medir onde o site está hoje e fechar as lacunas de SEO técnico (sitemap gerado, metadados sociais completos, dados estruturados, redirect do `www`, medição no CI) e de conteúdo (termos que o site deve ranquear e os primeiros artigos).

**Architecture:** a base já existe: pré-render por rota, `<head>` por página vindo de `siteMeta.ts`, canonical, Open Graph, JSON-LD, 404 com status real, `robots.txt` e `sitemap.xml` ([ADR-0008](../../adr/0008-deploy-do-site-pelo-github-actions.md) cobre o deploy). Este plano começa por uma auditoria que dá a linha de base e deixa o que sobrar virar issue; as correções de código mexem em `siteMeta.ts`, `prerenderHtml.ts`, `scripts/prerender.mjs` e `entry-server.tsx`; o CI e o redirect são do criador.

**Tech Stack:** o do frontend (Vite, React, Vitest), Lighthouse (via chrome-devtools nas auditorias), Cloudflare.

**Spec:** não há spec própria (o plano não muda o que o produto faz). Depende do [plano dos artigos](./2026-10-26-probekit-blog-artigos.md): as Tasks 2 e 3 abaixo assumem as Tasks 5 e 6 dele prontas. Branch sugerida: `feat/seo`.

## Restrições globais

- Cada afirmação em título, descrição e JSON-LD é verdadeira e rastreável ao que o site faz (regra do `siteMeta.ts`). Nada de avaliação, preço ou recurso que não exista.
- Título de página com no máximo 60 caracteres; descrição com no máximo 160; um teste fixa isso para **todas** as páginas, inclusive as de artigos.
- A URL canônica é o apex em HTTPS, sem barra final (a Home é `/`). Sitemap, `og:url` e canonical usam exatamente a mesma URL.
- Páginas `noindex` (a 404) não entram no sitemap.
- Medição (Search Console, Bing, analytics) **fica de fora** deste plano, por decisão do criador em 2026-10-26.
- Workflows e regras da Cloudflare são do criador: as tasks dele descrevem o resultado, não o YAML. O repositório é público: nenhum segredo nem detalhe de exposição.
- Os testes atuais continuam passando.

## Foco da revisão

1. **Sitemap e canonical divergem** (barra final, `www`, página `noindex` listada): um teste confere que o conjunto de URLs do sitemap é igual ao conjunto de canonicals das páginas indexáveis. Task 2.
2. **Título ou descrição cortados** no resultado de busca: teste de comprimento para todas as páginas. Task 5.
3. **JSON-LD quebrado por escape** (`</script>`, aspas, `&` num título de artigo): o JSON-LD sai válido e o `<script>` não fecha antes da hora. Task 4.
4. **Rota inexistente respondendo 200** (soft 404): a verificação pós-deploy exige 404 de verdade. Task 7.
5. **`www` e apex servindo o mesmo conteúdo** sem redirect: a verificação do `www` passa a esperar o redirect, em vez de 200. Task 7.

---

### Task 1: Auditoria e linha de base

**Files:**
- Create: `docs/runbook-seo.md`

- [ ] **Step 1: Subir o build como a Cloudflare serve.** `cd frontend && npm run build && npx wrangler dev` (o `html_handling` do Wrangler serve `/ping` a partir de `ping.html`, como em produção).
- [ ] **Step 2: Medir cada rota** (`/`, `/ping`, `/dns-lookup`, `/arquitetura`, `/sobre` e uma rota inexistente) com `lighthouse_audit` em celular e desktop: categorias SEO, Acessibilidade, Boas práticas e Desempenho, mais LCP, CLS e INP. Guardar no runbook, com a data, uma tabela rota × categoria.
- [ ] **Step 3: Conferir o `<head>` de cada `dist/*.html`:** um `title`, uma `description`, um canonical igual à URL pública, `og:*` completos, JSON-LD que faz `JSON.parse`, ausência de `robots` nas páginas indexáveis e `noindex` na 404.
- [ ] **Step 4: Conferir o que a auditoria automática não vê:** a 404 responde com status 404 (`curl -s -o /dev/null -w "%{http_code}" …/rota-inexistente`); `robots.txt` e `sitemap.xml` respondem 200; `www` e apex respondem o mesmo (anotar); o carrossel de tecnologias da Home não tem mais controle de pausa (removido a pedido do criador em 2026-10-26) e a regra WCAG 2.2.2 pede um mecanismo para movimento automático acima de 5 segundos: **registrar o impacto e as alternativas sem botão** (pausar no foco do teclado, parar depois de algumas voltas) para o criador decidir.
- [ ] **Step 5: Escrever o `docs/runbook-seo.md`:** como repetir a auditoria (comandos acima), a tabela de linha de base datada, e a lista de achados com a gravidade. O que não estiver coberto pelas Tasks 2 a 7 vira issue (`fix` ou `chore`), não item deste plano. Se o item "404 para rotas inexistentes" da lista do Project se confirmar como já resolvido, avisar o criador para fechá-lo.
- [ ] **Step 6: Conferir.** `python3 .claude/skills/probekit-docs/scripts/check_links.py` e `cd frontend && npx prettier --check ../docs/runbook-seo.md`.
- [ ] **Step 7: Commit (do criador)** — `docs: runbook de SEO com a linha de base`.

### Task 2: Sitemap gerado no build

**Files:**
- Create: `frontend/src/lib/sitemap.ts`, `frontend/src/lib/sitemap.test.ts`
- Modify: `frontend/src/lib/siteMeta.ts` (`PageMeta.lastmod?: string`, preenchido nos artigos com `updated ?? date`), `frontend/src/entry-server.tsx` (exporta `sitemapXml`), `frontend/scripts/prerender.mjs` (grava `dist/sitemap.xml`); Delete: `frontend/public/sitemap.xml`

**Interfaces:**
- Produces:
  - `type SitemapEntry = { path: string; lastmod?: string }`
  - `buildSitemap(entries: SitemapEntry[]): string` — XML `urlset` com `<loc>` = URL canônica (`SITE_URL` + path, Home `/`) e `<lastmod>` só quando houver; texto escapado.
  - `sitemapEntries(pages: Record<string, PageMeta>): SitemapEntry[]` — ordem estável, sem páginas `noindex`.

- [ ] **Step 1: Testes que falham:** (a) a 404 (`noindex`) não entra; (b) as URLs do sitemap são exatamente `canonicalUrl` de cada página indexável, sem duplicata; (c) `&` num caminho sai como `&amp;`; (d) entrada sem `lastmod` não tem a tag; com `lastmod` tem, no formato `AAAA-MM-DD`; (e) a saída começa com a declaração XML e o `xmlns` do sitemap.
- [ ] **Step 2: Rodar e ver falhar.** `cd frontend && npx vitest run src/lib/sitemap.test.ts`.
- [ ] **Step 3: Implementar** as duas funções; `lastmod` só nos artigos (as páginas fixas ficam sem, porque o checkout raso do CI não permite datar com honestidade). O `prerender.mjs` grava o resultado em `dist/sitemap.xml`, e o `public/sitemap.xml` à mão é removido.
- [ ] **Step 4: Rodar.** `npx vitest run` → PASS; `npm run build && curl`-equivalente: `grep -c "<loc>" dist/sitemap.xml` igual ao número de páginas indexáveis; `robots.txt` continua apontando para `https://probekit.cc/sitemap.xml`.
- [ ] **Step 5: Commit (do criador)** — `feat(frontend): sitemap gerado no build a partir das rotas`.

### Task 3: Twitter cards e imagem social por página

**Files:**
- Modify: `frontend/src/lib/prerenderHtml.ts`, `frontend/src/lib/pageMeta.ts`, `frontend/src/lib/siteMeta.ts`, `frontend/scripts/prerender.mjs`, e os testes `prerenderHtml.test.ts`, `pageMeta.test.tsx`, `siteMeta` (novo teste)

**Interfaces:**
- Consumes: `renderOgImage(title: string): Promise<Uint8Array>` e `PageMeta.image` (plano dos artigos, Tasks 5 e 6).
- Produces: `applyPageMeta` e `usePageMeta` passam a manter `twitter:card` (`summary_large_image`), `twitter:title`, `twitter:description` e `twitter:image` iguais aos `og:*` da página; as páginas `/ping`, `/dns-lookup`, `/arquitetura` e `/sobre` ganham `image: "https://probekit.cc/og/<nome>.png"`, gerada no build com `renderOgImage(page.title)`; a Home mantém a `og.jpg` da marca. (Escolha do assistente; o criador pode pedir a Home também.)

- [ ] **Step 1: Testes que falham:** (a) para cada página indexável, `twitter:image` e `og:image` são a mesma URL absoluta; (b) `twitter:title` e `twitter:description` iguais aos de `og:`; (c) `usePageMeta` atualiza `twitter:*` ao trocar de rota; (d) a 404 não precisa de imagem própria.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** (`setMeta` já existe em `prerenderHtml.ts`; `pageMeta.ts` usa o mesmo `upsert` das outras tags). O `prerender.mjs` gera `dist/og/<nome>.png` para as páginas com `image` própria.
- [ ] **Step 4: Rodar.** `npx vitest run` → PASS; `npm run build` e `file dist/og/*.png` mostra `1200 x 630`; abrir uma imagem e conferir a legibilidade (screenshot na resposta).
- [ ] **Step 5: Commit (do criador)** — `feat(frontend): twitter cards e imagem social própria por página`.

### Task 4: Dados estruturados com breadcrumb

**Files:**
- Modify: `frontend/src/lib/siteMeta.ts`, `frontend/src/lib/prerenderHtml.test.ts`, novo `frontend/src/lib/siteMeta.test.ts`

**Interfaces:**
- Produces: `breadcrumb(meta: PageMeta): Record<string, unknown>` — `BreadcrumbList` com "Probekit" (`/`) e a página atual (para artigos, "Artigos" no meio); `buildPages` junta o JSON-LD da página e o breadcrumb em um `@graph` quando há os dois. A Home não leva breadcrumb.

- [ ] **Step 1: Testes que falham:** (a) todo `jsonLd` de toda página passa por `JSON.parse(serializeJsonLd(x))` e volta igual; (b) `/ping` tem `BreadcrumbList` com 2 itens e `position` 1 e 2; um artigo tem 3; (c) título de artigo com `</script>` e `"` serializa sem fechar o `<script>`; (d) todos os `item` são URLs canônicas existentes em `pages`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** `breadcrumb` e a junção em `@graph`.
- [ ] **Step 4: Rodar.** `npx vitest run` → PASS; abrir o `dist/ping.html` e conferir o JSON no validador de resultados avançados do Google (o criador cola a URL pública depois do deploy; registrar no runbook o resultado, com a data, ou "não verificado").
- [ ] **Step 5: Commit (do criador)** — `feat(frontend): breadcrumb nos dados estruturados`.

### Task 5: Termos de busca, títulos e primeiros artigos

**Files:**
- Modify: `docs/runbook-seo.md` (seção "Mapa de termos"), `frontend/src/lib/siteMeta.ts`, novo teste de comprimento em `frontend/src/lib/siteMeta.test.ts`

- [ ] **Step 1: Pesquisar os termos** com busca na web (modo estendido): como as pessoas procuram "ping online", "teste de ping", "dns lookup", "consulta dns", "ping a partir de São Paulo" e variações em português; anotar, por termo, quem ranqueia hoje e a intenção de busca. Só registrar o que a pesquisa trouxe, com a data.
- [ ] **Step 2: Montar o mapa de termos** no runbook: termo principal e secundários de cada página (Home, Ping, DNS Lookup, Arquitetura) e **cinco temas de artigo** que respondem a perguntas reais ligadas às ferramentas (por exemplo, o que significa cada tipo de registro DNS, como ler a latência de um ping). Os temas viram rascunhos de issue no Project, com o criador como dono (ele escreve os artigos).
- [ ] **Step 3: Teste que falha:** para toda página em `pages`, `title.length <= 60` e `description.length <= 160`; título e descrição de cada página são únicos entre si.
- [ ] **Step 4: Ajustar** os títulos e as descrições das páginas onde o mapa de termos pedir, sem afirmar nada que o site não faça.
- [ ] **Step 5: Rodar.** `npx vitest run src/lib/siteMeta.test.ts` → PASS; `npx prettier --check src/lib/siteMeta.ts`.
- [ ] **Step 6: Commit (do criador)** — `feat(frontend): títulos e descrições a partir do mapa de termos`.

### Task 6: Lighthouse no CI (criador)

**Resultado esperado:** todo pull request que mexe em `frontend/**` roda o Lighthouse contra o build e **falha** se a categoria SEO ou a Acessibilidade ficar abaixo do limiar. O limiar vem da linha de base da Task 1 (não menor que ela). Fica claro no log qual rota e qual auditoria falhou. A decisão da ferramenta (Lighthouse CI ou outra) é do criador; se houver alternativa real, vira ADR.

- [ ] **Step 1 (criador):** escolher a ferramenta e escrever o job no `ci.yml` ou num workflow à parte. O job novo **não** pode virar check obrigatório antes de rodar verde (ver a regra do ruleset em `docs/README.md`).
- [ ] **Step 2 (assistente):** revisar o workflow com `github-actions-hardening` e `github-actions-efficiency` e conferir, com um PR de teste que quebra de propósito o `<title>`, que o job falha.
- [ ] **Step 3:** atualizar `docs/runbook-seo.md` com o limiar e como rodar o mesmo check localmente.

### Task 7: `www` para o apex e verificação pós-deploy (criador)

**Resultado esperado:** `www.probekit.cc` redireciona (301) para `probekit.cc` preservando o caminho; `verify-sites.sh` deixa de esperar HTTP 200 no `www` e passa a esperar o redirect; o script também confere `robots.txt` e `sitemap.xml` com 200 e uma rota inexistente com 404. O mecanismo do redirect (regra da Cloudflare ou outro) é do criador.

- [ ] **Step 1 (criador):** configurar o redirect e ajustar `infra/shellscript/verify-sites.sh` (hoje a lista `SITES` inclui `https://www.probekit.cc/` e exige 200).
- [ ] **Step 2 (assistente):** revisar o script e o resultado com `curl -sI https://www.probekit.cc/ping` (esperado: `301` e `location: https://probekit.cc/ping`) e `curl -s -o /dev/null -w "%{http_code}" https://probekit.cc/nada` (esperado: `404`). Registrar no `docs/runbook-seo.md` e no `docs/runbook-deploy.md`, com a data.
