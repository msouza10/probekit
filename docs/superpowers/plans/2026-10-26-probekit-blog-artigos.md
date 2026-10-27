# Artigos em markdown — plano de implementação

> **Para quem for executar:** use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`, task por task. Os passos usam caixas (`- [ ]`) como roteiro de execução; o estado oficial de cada task está na issue e no GitHub Project. Commit, push e PR são do criador: os passos de commit trazem só a mensagem sugerida.

**Goal:** o criador escreve `frontend/content/artigos/<slug>.md`, abre um PR e o deploy publica uma página pré-renderizada em `/artigos/<slug>`, com código colorido, sumário, diagramas por nome e imagem OG própria.

**Architecture:** um plugin do Vite compila cada `.md` no build para um módulo com `meta`, `tree` (hast, JSON) e `toc`; um catálogo reúne só os `meta` no bundle principal e carrega o corpo de um artigo sob demanda; um renderizador transforma a árvore em React com um mapa de componentes do site; as rotas, o `siteMeta` e o prerender passam a derivar do catálogo.

**Tech Stack:** Vite 8, React 19, `unified` (`remark-parse`, `remark-gfm`, `remark-directive`, `remark-rehype`), `@shikijs/rehype`, `gray-matter`, `hast-util-to-jsx-runtime`, `satori` + `@resvg/resvg-js` (imagem OG), Vitest + Testing Library.

**Spec:** [`2026-10-26-probekit-blog-artigos-design.md`](../specs/2026-10-26-probekit-blog-artigos-design.md). Branch sugerida: `feat/blog-artigos`.

## Restrições globais

- A seção só existe com **pelo menos um artigo**: sem artigo, não há rota `/artigos`, nem item no menu, nem entrada no sitemap, e o build passa. (Mesma regra do redesign: o menu mostra só o que existe.)
- Front matter: `title` (não vazio), `description` (não vazia, no máximo 160 caracteres), `date` (`AAAA-MM-DD` válida) e `updated` opcional (`AAAA-MM-DD`, não anterior a `date`). Slug = nome do arquivo, no formato `^[a-z0-9]+(-[a-z0-9]+)*$`.
- No corpo, título só a partir de `##` (o `h1` da página é o `title`). O sumário lista os `##`.
- O mesmo diagrama não aparece duas vezes no mesmo artigo (os ids do SVG são fixos).
- Qualquer erro de conteúdo derruba o build com `<slug>: <problema>`.
- HTML cru dentro do `.md` é descartado, nunca renderizado. Sem `dangerouslySetInnerHTML` no corpo.
- Só tokens semânticos existentes; sem gradiente nem sombra (o design guard cobre os arquivos novos). Código nos temas `github-light` / `github-dark`, escolhido pelo `.dark` do `<html>`.
- Dependências de build ficam em `devDependencies`; só `hast-util-to-jsx-runtime` é de execução. Versões travadas no `package-lock.json`.
- Os testes atuais continuam passando; os que dependem do menu são ajustados na Task 5.

## Foco da revisão

1. **Diagrama inexistente ou repetido** no `.md`: o build falha com o nome e o arquivo. Teste na Task 1 (compilador) e na Task 3 (registro cobre todos os nomes).
2. **Zero artigos:** sem rota, sem menu, sem sitemap, build verde. Testes nas Tasks 2 e 5.
3. **HTML cru e links perigosos** (`<script>`, `<img onerror>`, `javascript:` num link): nada disso chega ao DOM. Teste na Task 1 (árvore) e na Task 4 (render).
4. **Front matter inválido** (data `2026-13-45`, slug com maiúscula, descrição de 161 caracteres, `updated` antes de `date`): erro claro, sem página parcial. Teste na Task 1.
5. **Texto do artigo no bundle principal:** só `meta` vai na Home. Conferido por busca no `dist/` na Task 4.

---

### Task 1: Compilador de artigo e plugin do Vite

**Files:**
- Create: `frontend/vite/compileArticle.ts`, `frontend/vite/compileArticle.test.ts`, `frontend/vite/articlesPlugin.ts`
- Modify: `frontend/vite.config.ts` (registra o plugin), `frontend/tsconfig.node.json` (`include` ganha `vite/**/*.ts`), `frontend/package.json`

**Interfaces:**
- Produces:
  - `type ArticleMeta = { slug: string; title: string; description: string; date: string; updated?: string; readingMinutes: number }`
  - `type TocEntry = { id: string; title: string }`
  - `type CompiledArticle = { meta: ArticleMeta; tree: import("hast").Root; toc: TocEntry[]; diagrams: string[] }`
  - `compileArticle(slug: string, source: string, options: { diagramNames: readonly string[] }): Promise<CompiledArticle>` — lança `Error` com a mensagem `"<slug>: <problema>"`.
  - `articlesPlugin(options: { diagramNames: readonly string[] }): import("vite").Plugin` — transforma `content/artigos/*.md` em `export const meta`, `export const tree`, `export const toc` e `export const diagrams` (JSON sem `position`).

- [ ] **Step 1: Escrever os testes que falham.** Em `compileArticle.test.ts`: (a) artigo válido devolve `meta` com `readingMinutes` = palavras ÷ 200 arredondado para cima, mínimo 1; (b) `toc` lista só os `##`, com ids sem repetição (`dois-titulos-iguais` e `dois-titulos-iguais-1`); (c) bloco ` ```ts ` sai com spans que carregam as variáveis `--shiki-light` e `--shiki-dark`; (d) `::diagram{name="pipeline"}` vira o elemento `article-diagram` com `properties.name === "pipeline"` e `diagrams === ["pipeline"]`; (e) erros, um teste cada, com a mensagem exata: `"x: diagrama desconhecido \"nada\""`, diagrama repetido, `"Data-Ruim: slug inválido"`, `date` `2026-13-45`, descrição de 161 caracteres, `title` vazio, `updated` anterior a `date`, `#` no corpo; (f) `<script>alert(1)</script>` e `<img src=x onerror=alert(1)>` no corpo não aparecem em nenhum nó da árvore; um link cujo destino começa com `javascript:` sai sem `href`.
- [ ] **Step 2: Rodar e ver falhar.** `cd frontend && npx vitest run vite/compileArticle.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3: Instalar as dependências** (`unified remark-parse remark-gfm remark-directive remark-rehype @shikijs/rehype gray-matter github-slugger unist-util-visit hast-util-to-string @types/hast` em dev; `hast-util-to-jsx-runtime` em runtime) e **implementar `compileArticle`**: front matter com `gray-matter`, validação antes de processar, pipeline `remark-parse → remark-gfm → remark-directive → (plugin local: leaf `diagram` vira `article-diagram`) → remark-rehype (sem `allowDangerousHtml`) → @shikijs/rehype (`themes: { light: "github-light", dark: "github-dark" }`, `defaultColor: false`)`. Ids dos títulos com `github-slugger`.
- [ ] **Step 4: Implementar `articlesPlugin`** (`enforce: "pre"`, `transform` só para ids em `content/artigos/*.md`, `addWatchFile` para recarregar no dev; o slug sai do nome do arquivo) e registrá-lo em `vite.config.ts` com `diagramNames` vindo de `src/components/article/diagramNames.ts` (criado na Task 3; até lá, `[]`).
- [ ] **Step 5: Rodar os testes.** `npx vitest run vite/compileArticle.test.ts` → PASS; `npx tsc -b` sem erros.
- [ ] **Step 6: Commit (do criador)** — `feat(frontend): compila artigos em markdown no build`.

### Task 2: Catálogo de artigos

**Files:**
- Create: `frontend/src/lib/articles.ts`, `frontend/src/lib/articles.test.ts`

**Interfaces:**
- Consumes: `ArticleMeta`, `CompiledArticle` (Task 1).
- Produces:
  - `createCatalog(metaModules: Record<string, ArticleMeta>): ArticleMeta[]` — ordena por `date` decrescente e, em empate, por `slug`.
  - `articles: ArticleMeta[]` — `createCatalog(import.meta.glob("/content/artigos/*.md", { import: "meta", eager: true }))`.
  - `articlePath(slug: string): string` → `"/artigos/<slug>"`.
  - `findArticle(slug: string): ArticleMeta | undefined`.
  - `loadArticle(slug: string): Promise<Pick<CompiledArticle, "meta" | "tree" | "toc"> | undefined>` — `import.meta.glob("/content/artigos/*.md")` (lazy), `undefined` para slug que não existe.

- [ ] **Step 1: Testes que falham** com módulos de teste escritos à mão: `createCatalog` ordena (mais novo primeiro; empate por slug); lista vazia devolve `[]`; `articlePath("a-b")` é `/artigos/a-b`.
- [ ] **Step 2: Rodar e ver falhar** (`npx vitest run src/lib/articles.test.ts`).
- [ ] **Step 3: Implementar** as assinaturas acima. O glob eager usa só o export `meta`.
- [ ] **Step 4: Rodar.** PASS; `npx tsc -b` sem erros (com `content/artigos/` ainda vazio o glob devolve `{}`).
- [ ] **Step 5: Commit (do criador)** — `feat(frontend): catálogo de artigos`.

### Task 3: Diagramas por nome

**Files:**
- Create: `frontend/src/components/article/diagramNames.ts`, `frontend/src/components/article/articleDiagrams.tsx`, `frontend/src/components/article/articleDiagrams.test.tsx`
- Modify: `frontend/vite.config.ts` (passa `diagramNames` ao plugin)

**Interfaces:**
- Produces:
  - `diagramNames = ["arquitetura", "pipeline", "infraestrutura"] as const` e `type DiagramName = (typeof diagramNames)[number]`.
  - `articleDiagrams: Record<DiagramName, React.ComponentType>` — mapeia para `ArchitectureDiagram`, `PipelineDiagram` e `InfrastructureDiagram`.
  - `ArticleDiagram({ name }: { name: string }): ReactNode` — renderiza o componente do registro; nome fora do registro lança `Error`.

- [ ] **Step 1: Testes que falham:** cada `diagramNames[i]` tem componente em `articleDiagrams` e renderiza um `figure` com `figcaption`; `ArticleDiagram name="nada"` lança; o tipo `Record<DiagramName, …>` impede esquecer um nome (verificado por `tsc`).
- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run src/components/article/articleDiagrams.test.tsx`.
- [ ] **Step 3: Implementar** os três arquivos; `diagramNames.ts` não importa React (o `vite.config.ts` o lê).
- [ ] **Step 4: Rodar.** PASS; `npx vitest run vite/compileArticle.test.ts` continua verde.
- [ ] **Step 5: Commit (do criador)** — `feat(frontend): diagramas de /arquitetura disponíveis por nome nos artigos`.

### Task 4: Corpo e páginas do artigo

**Files:**
- Create: `frontend/src/components/article/ArticleBody.tsx`, `frontend/src/pages/Artigo.tsx`, `frontend/src/pages/Artigos.tsx` e os testes `ArticleBody.test.tsx`, `Artigo.test.tsx`, `Artigos.test.tsx`
- Modify: `frontend/src/AnimatedRoutes.tsx` (rotas lazy `/artigos` e `/artigos/:slug`, só se `articles.length > 0`), `frontend/src/index.css` (regras `.shiki` para os dois temas)

**Interfaces:**
- Consumes: `articles`, `findArticle`, `loadArticle`, `articlePath` (Task 2); `ArticleDiagram` (Task 3); `PageToc`, `useActiveId` de `components/page`.
- Produces:
  - `ArticleBody({ tree }: { tree: import("hast").Root }): ReactNode` — componentes: `h2`/`h3` com `id` e link de âncora; `a` externo com `target="_blank" rel="noreferrer"`; `pre` rolável na horizontal; `table` dentro de um contêiner rolável; `article-diagram` → `ArticleDiagram`. Largura de leitura `max-w-[38rem]`.
  - `default export Artigo()` — lê `:slug`, mostra `NotFound` se `findArticle` não acha; senão `h1` (título), data e tempo de leitura, descrição, sumário lateral e o corpo carregado por `loadArticle`.
  - `default export Artigos()` — lista com título, descrição e data, do mais novo para o mais antigo.

- [ ] **Step 1: Testes que falham** (com `vi.mock("@/lib/articles")` e uma árvore escrita à mão): (a) `ArticleBody` renderiza `h2` com `id`; (b) link externo ganha `rel="noreferrer"`; (c) um nó `script` ou um `href="javascript:…"` na árvore não aparece no DOM; (d) `article-diagram` renderiza o `figure`; (e) `Artigo` com slug inexistente mostra "Página não encontrada"; (f) `Artigo` mostra um único `h1` e o sumário com os `##`; (g) `Artigos` lista na ordem certa.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** as páginas e o renderizador (`toJsxRuntime` de `hast-util-to-jsx-runtime`); o sumário vem de `toc` (não do DOM), então também aparece no HTML pré-renderizado. CSS: `.shiki span { color: var(--shiki-light) }` e `.dark .shiki span { color: var(--shiki-dark) }`.
- [ ] **Step 4: Rodar os testes** (`npx vitest run`) → tudo PASS.
- [ ] **Step 5: Conferir o bundle.** Com um `.md` temporário em `content/artigos/` contendo a frase `FRASE-UNICA-DE-TESTE`: `npm run build && grep -rl "FRASE-UNICA-DE-TESTE" dist/assets` deve listar **só** o chunk daquele artigo, nunca o `index-*.js`. Remover o arquivo temporário.
- [ ] **Step 6: Commit (do criador)** — `feat(frontend): páginas de lista e de leitura de artigos`.

### Task 5: Rotas, metadados, prerender e menu

**Files:**
- Modify: `frontend/src/lib/siteMeta.ts`, `frontend/src/lib/prerenderHtml.ts`, `frontend/src/entry-server.tsx`, `frontend/src/components/Header.tsx`, `frontend/src/components/Footer.tsx`, `frontend/public/_headers` (cache de `/og/*`), e os testes `siteMeta`/`prerenderHtml`/`Header`/`Footer`/`AnimatedRoutes`

**Interfaces:**
- Consumes: `articles`, `articlePath` (Task 2).
- Produces:
  - `PageMeta` ganha `image?: string` (URL absoluta) e `type?: "website" | "article"`.
  - `buildPages(list: ArticleMeta[]): Record<string, PageMeta>` — as páginas fixas de hoje; com `list.length > 0`, mais `/artigos` e uma entrada por artigo, com `type: "article"`, `image: "https://probekit.cc/og/<slug>.png"` e JSON-LD `BlogPosting` (`headline`, `description`, `datePublished`, `dateModified = updated ?? date`, `author`, `image`, `mainEntityOfPage`, `inLanguage`).
  - `pages = buildPages(articles)`; `metaFor` e `entry-server` (`routePaths`) passam a usar as rotas de `pages` sem mudança de contrato.
  - `applyPageMeta` escreve `og:type` e `og:image` (e `og:image:alt` = título) por página; sem `image`, mantém a `og.jpg` do template.

- [ ] **Step 1: Testes que falham:** (a) `buildPages([])` não tem `/artigos`; com um artigo tem `/artigos` e `/artigos/<slug>`; (b) o JSON-LD do artigo tem `@type: "BlogPosting"` e as datas; (c) título com `</script>` e `&` sai escapado no `<head>` e no JSON-LD; (d) `applyPageMeta` com `image` troca `og:image` e `og:type`; (e) `Header` e `Footer` têm o link "Artigos" **só** quando há artigos (com `vi.mock("@/lib/articles")`), e a asserção antiga de `Header.test.tsx:81-82` passa a valer só para o caso sem artigos.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.** O item "Artigos" entra entre "Arquitetura" e "Sobre"; `_headers` ganha `/og/*` com `Cache-Control: public, max-age=86400`.
- [ ] **Step 4: Rodar tudo.** `npx vitest run` → PASS. Com um `.md` temporário: `npm run build` gera `dist/artigos.html` e `dist/artigos/<slug>.html`; `grep -c "BlogPosting" dist/artigos/<slug>.html` → 1. Remover o temporário e confirmar que o build sem artigos passa e **não** gera `dist/artigos.html`.
- [ ] **Step 5: Commit (do criador)** — `feat(frontend): rotas, metadados e menu dos artigos`.

### Task 6: Imagem OG por artigo

**Files:**
- Create: `frontend/src/lib/ogImage.ts` (código só de Node, usado no build), `frontend/src/lib/ogImage.test.ts`
- Modify: `frontend/src/entry-server.tsx` (exporta `renderOgImage` e a lista de artigos), `frontend/scripts/prerender.mjs` (grava `dist/og/<slug>.png`), `frontend/package.json` (`satori`, `@resvg/resvg-js`, `@fontsource/inter`, `@fontsource/newsreader` em dev)

**Interfaces:**
- Produces: `renderOgImage(title: string): Promise<Uint8Array>` — PNG 1200×630: fundo do site, o `title` em Newsreader (até 3 linhas, com reticências), "probekit.cc" em Inter embaixo.

- [ ] **Step 1: Testes que falham:** o resultado começa com a assinatura PNG (`89 50 4E 47`); a largura e a altura lidas do cabeçalho IHDR são 1200 e 630; um título de 200 caracteres não lança.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.** `satori` só lê fontes `ttf`/`otf`/`woff` (não `woff2` nem variáveis): usar os arquivos `woff` dos pacotes `@fontsource/*` estáticos (peso 500). Confirmar no `npm run build` que as dependências de Node ficam fora do bundle do cliente (`grep -l satori dist/assets/*.js` → vazio).
- [ ] **Step 4: Rodar.** `npx vitest run src/lib/ogImage.test.ts` → PASS; com um `.md` temporário, `npm run build` cria `dist/og/<slug>.png` e `file dist/og/<slug>.png` informa `1200 x 630`. Abrir a imagem e conferir a legibilidade (screenshot na resposta).
- [ ] **Step 5: Commit (do criador)** — `feat(frontend): imagem de pré-visualização social por artigo`.

### Task 7: Documentação do fluxo de artigos

**Files:**
- Create: `docs/runbook-artigos.md`
- Modify: `frontend/README.md`, `docs/architecture/arch.md`, `OVERVIEW.md` (decisão confirmada)

- [ ] **Step 1: Escrever o runbook** para quem vai publicar: onde criar o arquivo, o front matter com um exemplo, como incluir `::diagram{name="…"}` e a lista de nomes, como ver no `npm run dev`, o que cada erro de build significa e o que fazer, e como conferir depois do deploy (`view-source` mostra título, canonical, `og:image` e JSON-LD).
- [ ] **Step 2: Atualizar** a seção de estrutura do `frontend/README.md`, o fluxo em `docs/architecture/arch.md` e a lista de decisões do `OVERVIEW.md` (inclusive a Home apontando para o artigo mais recente, da Task 8, que se executa antes desta).
- [ ] **Step 3: Conferir.** `python3 .claude/skills/probekit-docs/scripts/check_links.py` sem links quebrados; `cd frontend && npx prettier --check ../docs/runbook-artigos.md README.md`.
- [ ] **Step 4: Commit (do criador)** — `docs: runbook de artigos e arquitetura atualizada`.

### Task 8: A Home aponta para o artigo mais recente

Acrescentada em 2026-10-26, a pedido do criador (ver a spec). Executar depois da Task 6 e antes da Task 7.

**Files:**
- Create: `frontend/src/components/LatestArticle.tsx`, `frontend/src/components/LatestArticle.test.tsx`
- Modify: `frontend/src/pages/Home.tsx`, `frontend/src/pages/Home.test.tsx`

**Interfaces:**
- Consumes: `articles`, `articlePath`, `formatDate`, `ArticleMeta` (Task 2). O catálogo já vem do mais novo para o mais antigo, então o mais recente é `articles[0]`.
- Produces:
  - `LatestArticleLine({ article }: { article: ArticleMeta }): ReactNode` — uma linha no tom da `RepoPulse`: o rótulo "Último artigo" e o título como link para `articlePath(article.slug)`.
  - `LatestArticleCard({ article }: { article: ArticleMeta }): ReactNode` — um `section` (região "Artigos") com o rótulo "Artigos", o título como link grande, a descrição, a data com o tempo de leitura e um link "Todos os artigos" para `/artigos`.
  - `Home` usa `articles[0]` e, sem artigo, não renderiza nenhum dos dois; o fechamento vira uma grade de duas colunas (Arquitetura e o card) a partir de `sm`, e uma coluna no celular.

- [ ] **Step 1: Testes que falham.** `LatestArticle.test.tsx`: (a) a linha mostra "Último artigo" e um link com o título para `/artigos/<slug>`; (b) o card tem o título como link, a descrição, a data por extenso num `time` e o link "Todos os artigos" para `/artigos`. `Home.test.tsx` (com `vi.mock("@/lib/articles")` e catálogo por teste): (c) sem artigos, a Home não tem "Último artigo", nem a região "Artigos", nem link para `/artigos` (o teste atual do fechamento continua valendo); (d) com dois artigos, só o mais novo aparece, no herói e no card; (e) a região "Arquitetura" continua com um único link; (f) a Home continua sem chamar a API do Probekit ao montar.
- [ ] **Step 2: Rodar e ver falhar.** `cd frontend && npx vitest run src/components/LatestArticle.test.tsx src/pages/Home.test.tsx`.
- [ ] **Step 3: Implementar** os dois componentes e a ligação na `Home`. A linha entra no herói logo abaixo de `RepoPulse`, num `Reveal` com atraso de `0.32`; o card segue o desenho do bloco "Arquitetura" (rótulo, título grande com seta, texto).
- [ ] **Step 4: Rodar tudo.** `npx vitest run` → PASS nos dois estados (com e sem `content/artigos/*.md`); `npm run build` passa. Conferir no navegador, no tema claro, no escuro e no celular, com um artigo temporário (screenshots na resposta).
- [ ] **Step 5: Commit (do criador)** — `feat(frontend): Home aponta para o artigo mais recente`.
