# Probekit — frontend

Frontend do Probekit: uma SPA em React + Vite + TypeScript, estilizada com Tailwind CSS v4 e componentes shadcn/ui, com transições de página via Motion e roteamento via react-router-dom.

## Scripts

Dentro de `frontend/`:

```bash
npm run dev           # servidor de desenvolvimento com HMR
npm run test           # roda a suíte de testes (Vitest) uma vez
npm run test:watch     # roda a suíte de testes em modo watch
npm run build          # type-check (tsc -b), build do Vite, build SSR e pré-renderização das rotas
npm run lint           # lint (oxlint)
npm run format         # formata o código (Prettier)
npm run format:check   # verifica formatação sem alterar arquivos
```

## Cadeia de design tokens

[`DESIGN.md`](../DESIGN.md), na raiz do repositório, é a referência visual do projeto: paleta clara e escura, as três famílias de fonte (Newsreader, Inter e JetBrains Mono, hospedadas no site via `@fontsource`), a bancada e a lista do que fazer e do que não fazer. Os tokens vivem como variáveis CSS nos blocos `@theme` e `:root` de [`src/index.css`](./src/index.css); as utilities do Tailwind e os componentes shadcn/ui consomem essas variáveis diretamente, então qualquer mudança de token nesse arquivo se propaga para o app inteiro. O teste `src/design-guard.test.ts` impede o retorno de gradiente, sombra e dos nomes antigos de token.

## Como adicionar uma nova ferramenta

Edite [`src/lib/tools.ts`](./src/lib/tools.ts) — tanto a lista da home page quanto o dropdown "Ferramentas" do header leem desse mesmo array automaticamente. Basta adicionar um novo item (`name`, `description`, `href`) e, se a rota ainda não existir, registrar a página correspondente em `src/AnimatedRoutes.tsx`.

## Páginas

Rotas em [`src/AnimatedRoutes.tsx`](./src/AnimatedRoutes.tsx): `/` (Home), `/ping`, `/dns-lookup`, `/arquitetura`, `/sobre` e `*` (NotFound). Com pelo menos um artigo em `content/artigos/`, entram também `/artigos` e `/artigos/:slug` (ver [Artigos](#artigos)). Só a Home entra no pacote principal; as outras são carregadas quando a rota abre (`React.lazy`), com uma área reservada enquanto carregam para o rodapé não pular. Título e descrição de cada rota ficam em [`src/lib/pageMeta.ts`](./src/lib/pageMeta.ts). A Arquitetura reúne três diagramas em SVG (regras em [`DESIGN.md`](../DESIGN.md), seção Diagramas).

## Páginas `/ping` e `/dns-lookup`

As duas páginas chamam a API de verdade por [`src/lib/api.ts`](./src/lib/api.ts) (`runPing` e `runDnsLookup`) e tratam os estados de carregando, sucesso e erro. O contrato da API e o comportamento esperado estão na spec [`docs/superpowers/specs/2026-10-01-probekit-ping-dns-feature-design.md`](../docs/superpowers/specs/2026-10-01-probekit-ping-dns-feature-design.md).

- A origem do teste ("Sonda: OCI · São Paulo") vem de constantes em `src/lib/api.ts` (`PROBE_PROVIDER`, `PROBE_PROVIDER_SHORT`, `PROBE_LOCATION`), porque a API roda sempre na mesma região. Se um dia houver mais de uma sonda, a origem passa a vir da resposta da API.
- Se a API não responder, **em produção** a página mostra o erro. A simulação de resultados (valores aleatórios, marcada como "Simulação local") só existe em desenvolvimento (`import.meta.env.DEV`), para um resultado inventado nunca passar por verdadeiro.

## Pré-renderização

`npm run build` faz quatro passos: `tsc -b`, `vite build`, `vite build --ssr src/entry-server.tsx` (o build para o servidor sai em `node_modules/.prerender`, fora de `dist/`) e `node scripts/prerender.mjs`, que renderiza cada rota com o mesmo App e grava `dist/<rota>.html` e `dist/404.html`. Quando há artigos, o mesmo passo grava `dist/artigos.html`, `dist/artigos/<slug>.html` e a imagem social de cada um em `dist/og/<slug>.png` (gerada com o satori, só no build; não vai para o JavaScript do navegador). O `<head>` de cada página (título, descrição, canonical, `og:`, `noindex` na 404 e JSON-LD) vem só de [`src/lib/siteMeta.ts`](./src/lib/siteMeta.ts), o mesmo módulo que atualiza a aba em tempo de execução. No navegador, [`src/mount.tsx`](./src/mount.tsx) hidrata o HTML pré-renderizado (e usa `createRoot` no `npm run dev`, onde não há HTML pronto).

Para um componente funcionar nos dois lados, não leia `window`, `localStorage` nem `IntersectionObserver` durante a renderização: use efeito, ou `useStaticMotion` (em `src/lib/motion.ts`), que sai "parado" no servidor e na hidratação. Para acrescentar uma rota: página em `src/pages`, rota em `AnimatedRoutes.tsx`, metadados em `siteMeta.ts` (a rota entra sozinha na pré-renderização, que percorre as chaves de `pages`) e a URL em `public/sitemap.xml`. As rotas dos artigos não seguem esse caminho: vêm do catálogo (`buildPages` em `siteMeta.ts`) e entram sozinhas, menos no `public/sitemap.xml`, que ainda é escrito à mão.

## Artigos

Cada `content/artigos/<slug>.md` vira a página `/artigos/<slug>`. Um plugin do Vite ([`vite/articlesPlugin.ts`](./vite/articlesPlugin.ts), com a lógica em [`vite/compileArticle.ts`](./vite/compileArticle.ts)) compila o markdown no build: valida o cabeçalho, colore o código (shiki), descarta HTML cru e links perigosos e troca `::diagram{name="..."}` pelo componente do diagrama. Erro de conteúdo derruba o build com `<slug>: <problema>`.

- [`src/lib/articles.ts`](./src/lib/articles.ts): o catálogo (do mais novo para o mais antigo). A lista usa só os metadados (`?meta`), para o texto dos artigos não ir no JavaScript principal; o corpo de cada artigo é carregado quando a página abre.
- `src/components/article/`: o renderizador do corpo (`ArticleBody`) e os diagramas disponíveis por nome (`diagramNames.ts`, `articleDiagrams.tsx`).
- `src/components/LatestArticle.tsx`: a linha "Último artigo" no herói da Home e o bloco "Artigos" no fechamento.
- `src/lib/ogImage.ts`: a imagem social de cada artigo (código só de Node).

Sem artigos, a seção inteira some: sem rota, sem item no menu nem no rodapé, sem linha e sem bloco na Home. Como escrever, ver e publicar um artigo, e o que cada erro de build significa, está no [runbook de artigos](../docs/runbook-artigos.md).

## Componentes das páginas

- `src/components/tool/`: esqueleto e peças das páginas de ferramenta (`ToolPage`, selo de origem, status, estatísticas, JSON sob demanda).
- `src/components/page/`: esqueleto das páginas informativas (`InfoPage`, sumário "Nesta página", `StackMap`, `AuthorCard`, `CreditsGrid`).
- `src/components/diagrams/`: os diagramas em SVG da Arquitetura.
- `src/components/article/`: o corpo dos artigos e o registro dos diagramas que um artigo pode incluir.
- `src/components/icons/techLogos.tsx`: logos das tecnologias (Home e Sobre).

O padrão visual de cada um está no [`DESIGN.md`](../DESIGN.md). As imagens de `public/brand/` são servidas como estão: mantenha-as pequenas (o retrato da Sobre tem poucos KB).

## Variáveis de ambiente

Veja [`.env.example`](./.env.example). Há uma só variável:

| Variável            | Função                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_API_BASE_URL` | URL base da API. Em produção: `https://api.probekit.cc`. Vazia (padrão no desenvolvimento), as chamadas ficam relativas (`/api/...`) e o proxy do Vite as encaminha para a API local |

O Vite embute essa variável **no momento do build**. Um build feito sem ela, publicado em produção, chama `/api/...` no próprio Worker (que só serve arquivos) e as ferramentas falham.

## Desenvolvimento com a API local

O proxy do Vite (`vite.config.ts`) encaminha `/api` para `https://localhost:8443`, aceitando o certificado autoassinado. Suba a API como descrito no [README raiz](../README.md#backend) (`ADDR=:8443` e um par de certificado de teste) e rode `npm run dev`. Como o navegador vê tudo na mesma origem, o CORS não entra em jogo no desenvolvimento.

## Publicação

O site é um **Cloudflare Worker com assets estáticos**, definido em [`wrangler.toml`](./wrangler.toml): o Worker `probekit` serve o conteúdo de `dist/`, devolve o `index.html` para rotas desconhecidas (o React Router assume, inclusive para `/ping` e `/dns-lookup` acessados direto) e liga os domínios `probekit.cc` e `www.probekit.cc`, para os quais a Cloudflare cria o DNS e o certificado.

O deploy é **automático**: o workflow _Deploy Frontend_ roda a cada push na `main` que mude algo em `frontend/**` (ou à mão, em Actions), faz o build com `VITE_API_BASE_URL=https://api.probekit.cc`, espera a aprovação do ambiente `production` e publica com o Wrangler, verificando o site e a API depois. O passo a passo, o rollback e o diagnóstico estão no [runbook](../docs/runbook-deploy.md#5-publicar-o-site).

Como plano B, o deploy manual:

```bash
cd frontend
npx wrangler login        # uma vez, autentica na conta da Cloudflare
VITE_API_BASE_URL=https://api.probekit.cc npm run build
npx wrangler deploy
```

Para validar a configuração sem publicar nada: `npx wrangler deploy --dry-run`.

Rotas inexistentes respondem **HTTP 404** (`not_found_handling = "404-page"`), servindo o `404.html` gerado no build. Cada rota tem o próprio HTML (`ping.html`, `sobre.html`...), e o Worker serve `/ping` pelo `ping.html`.
