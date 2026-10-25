# Página Arquitetura e Home mais simples — plano de implementação

> **Para quem for executar:** use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`, task por task. Os passos usam caixas (`- [ ]`) como roteiro de execução; o estado oficial de cada task está na issue e no GitHub Project.

**Goal:** criar a página `/arquitetura` com três diagramas animados (arquitetura, pipeline, infraestrutura) e simplificar a Home, sem afirmar nada que o repositório não sustente.

**Architecture:** um componente `Diagram` (figura com texto equivalente) e um hook `useDiagramMotion` que liga o movimento por um atributo `data-motion` só quando o diagrama está visível e o usuário não pediu movimento reduzido; o fluxo contínuo é CSS, a entrada é do Motion. Cada diagrama é um componente de SVG (versão larga) mais uma lista ordenada de passos que, no celular, é a versão vertical visível e, no desktop, fica só para leitores de tela.

**Tech Stack:** React 19, Vite, Tailwind v4, Motion, React Router, Vitest + Testing Library.

**Spec:** [`2026-10-25-probekit-pagina-arquitetura-design.md`](../specs/2026-10-25-probekit-pagina-arquitetura-design.md) (mockup de referência em `../specs/assets/2026-10-25-diagramas-animados.html`; visual herdado da [spec do redesign](../specs/2026-10-23-probekit-frontend-redesign-design.md)).

## Restrições globais

- Rota `/arquitetura`; item "Arquitetura" entre "Ferramentas" e "Sobre" no cabeçalho e no rodapé. Linha do tempo e Artigos continuam fora.
- Cada afirmação dos diagramas e dos textos é verdadeira e rastreável a um arquivo do repositório (tabela "Fonte de cada afirmação" da spec). O que não tiver fonte sai. Nada de "VMs se atualizando sozinhas".
- Sem dado inventado como real; sem demos, terminais ou trechos de código decorativos; sem IPs, nomes de recursos ou portas além do que o `OVERVIEW.md` já publica.
- Movimento: entrada e desenho pelo Motion; fluxo contínuo por CSS ligado só por `data-motion="on"`; **sem SMIL (`animateMotion`)**; só roda com o diagrama visível e **para por completo** com `prefers-reduced-motion` (o diagrama aparece parado e completo).
- Celular (< 640 px): versão vertical com nomes de pelo menos 14 px e texto secundário de pelo menos 12 px efetivos; um SVG largo apenas encolhido não atende; a página nunca rola na horizontal.
- Acessibilidade: cada SVG com `role="img"` e descrição; lista ordenada com o fluxo (visível no celular, só para leitores de tela no desktop); o diagrama nunca é a única fonte da informação.
- Só tokens semânticos existentes (`highlight` é a única cor de destaque; fundo do bloco `card`/`background`, borda e zona tracejada `border`, preenchimento do portão `muted`); se o contraste do tema escuro pedir, um alias semântico sem matiz novo, documentado no `design.md`. Sem gradiente, sombra ou ícone decorativo; tema escuro desenhado, não invertido.
- Links externos: só `https://github.com/msouza10/probekit/...`. Conteúdo em português, tom das outras páginas, sem tom de vitrine.
- Os 100 testes atuais continuam passando (asserções que dependem de texto ou marcação alterados podem ser ajustadas). O design guard cobre os arquivos novos.
- Commits locais, sem push; tudo na branch `feat/improve-frontend` (PR única, decisão do criador).

## Foco da revisão

1. **Sem `IntersectionObserver`** (jsdom, navegador antigo): o diagrama aparece completo e parado, e `data-motion="off"`. Teste no Task 1.
2. **Movimento reduzido:** `data-motion="off"`, nenhum ponto viajante renderizado, nenhum elemento animado. Teste no Task 1.
3. **Celular:** a lista ordenada é visível abaixo de `sm` e só para leitores de tela a partir de `sm`; o SVG largo só aparece a partir de `sm`. Teste no Task 1.
4. **Afirmações que envelhecem ou nunca foram verdade:** cada diagrama tem um teste que fixa a lista exata de rótulos (nada além do que a tabela de fontes sustenta). Tasks 3, 4 e 5.
5. **Links externos e rota:** todo `href` externo da página começa com o repositório; a rota `/arquitetura` renderiza dentro do `AnimatedRoutes`; a Home não chama a API. Tasks 2 e 6.

---

### Task 1: `Diagram`, `useDiagramMotion` e o CSS do movimento

**Files:**
- Create: `frontend/src/components/diagrams/useDiagramMotion.ts`, `frontend/src/components/diagrams/Diagram.tsx`, `frontend/src/components/diagrams/Diagram.test.tsx`, `frontend/src/components/diagrams/useDiagramMotion.test.tsx`
- Modify: `frontend/src/index.css` (regras `.diagram-*` e `@keyframes` do fluxo, do pulso e da viagem dos pontos)

**Interfaces:**
- Produces:
  - `useDiagramMotion(): { ref: React.RefObject<HTMLElement | null>; on: boolean }` — `on` é `true` só se há `IntersectionObserver`, o elemento está visível e `useReducedMotion()` é falso; sai de visível → `false` (pausa fora da tela).
  - `type DiagramStep = { title: string; detail?: string; tag?: string }`
  - `Diagram({ id, title, summary, steps, children }: { id: string; title: string; summary: string; steps: DiagramStep[]; children: ReactNode })` — um `<figure data-motion="on" | "off" ref>` com: a versão larga (`<div className="hidden sm:block">{children}</div>`; `children` é o `<svg>` com `role="img"` e `aria-labelledby` apontando para o `title` e a `summary`, ids derivados de `id`) e `<ol className="… sm:sr-only">` com os `steps` (no celular é o diagrama vertical visível, com uma seta ou numeração entre os passos; `tag` aparece em mono ao lado do título).
  - Contrato de CSS (para os Tasks 3, 4 e 5): classes `diagram-flow` (linha tracejada que flui), `diagram-pulse` (borda que respira), `diagram-draw` (linha que se desenha) e `diagram-pop` (bloco que entra); todas só animam dentro de `[data-motion="on"]`; com `off` aparecem no estado final, visíveis. `diagram-packet` (ponto que viaja por `offset-path`, definido inline por quem usa: `style={{ offsetPath: 'path("…")' }}`) é `display: none` quando `off`.

- [ ] **Step 1: Escrever os testes que falham.** `useDiagramMotion.test.tsx`: (a) sem `IntersectionObserver` → `on === false`; (b) com um `IntersectionObserver` simulado (`vi.stubGlobal`) que dispara `isIntersecting: true` → `on === true`, e ao disparar `false` → volta a `false`; (c) com `matchMedia("(prefers-reduced-motion: reduce)")` verdadeiro, mesmo visível → `on === false`. `Diagram.test.tsx`: (a) renderiza `title` e `summary`, um `role="img"` com nome acessível igual ao `title` e uma lista ordenada com um `li` por passo; (b) o `ol` tem a classe `sm:sr-only` e o contêiner dos `children` tem `hidden` e `sm:block`; (c) `figure` tem `data-motion="off"` quando não há `IntersectionObserver`; (d) um passo com `tag` mostra a tag.
- [ ] **Step 2: Rodar e ver falhar.** Run: `cd frontend && npx vitest run src/components/diagrams` — Expected: FAIL (módulos inexistentes).
- [ ] **Step 3: Implementar** o hook e o `Diagram` com as assinaturas acima, e as regras CSS (durações e curvas a critério do builder, dentro do tom contido do site; só `transform`, `opacity`, `stroke-dashoffset`, `offset-distance` e a cor da borda).
- [ ] **Step 4: Rodar tudo.** Run: `cd frontend && npm run test && npm run build && npm run lint` — Expected: tudo verde; o design guard continua verde.
- [ ] **Step 5: Commit local.** `feat(frontend): componente Diagram e hook de movimento dos diagramas`.

### Task 2: Página Arquitetura (casca), rota e navegação

**Files:**
- Create: `frontend/src/pages/Arquitetura.tsx`, `frontend/src/pages/Arquitetura.test.tsx`
- Modify: `frontend/src/AnimatedRoutes.tsx` (rota `/arquitetura`), `frontend/src/AnimatedRoutes.test.tsx`, `frontend/src/components/Header.tsx`, `Header.test.tsx`, `frontend/src/components/Footer.tsx`, `Footer.test.tsx`

**Interfaces:**
- Consumes: `Reveal` (`@/components/Reveal`).
- Produces: `export default function Arquitetura()`; nos Tasks 3, 4 e 5 cada seção recebe um `<Diagram>` num ponto marcado por um comentário `{/* diagrama: arquitetura | pipeline | infraestrutura */}`; estrutura: um `h1` ("Arquitetura"), introdução em prosa, três seções `aria-labelledby` numeradas (`01 Arquitetura`, `02 Pipeline`, `03 Infraestrutura`) cada uma com um parágrafo e uma linha de links de fonte, e a seção final **Princípios** (Roda de verdade, Fica registrado, Código aberto).

- [ ] **Step 1: Escrever os testes que falham.** `Arquitetura.test.tsx`: (a) um único `h1`; (b) três `h2` de seção mais o de Princípios; (c) todo `a[href^="http"]` começa com `https://github.com/msouza10/probekit` (e existe pelo menos um); (d) nenhum texto começa com `//`; (e) `fetch` não é chamado ao montar. `AnimatedRoutes.test.tsx`: navegar a `/arquitetura` mostra o `h1` "Arquitetura". `Header.test.tsx`: existe o link "Arquitetura" com `href="/arquitetura"` (a asserção antiga que proibia `/arquitetura/` no cabeçalho passa a proibir só `/artigos|linha do tempo/i`; a contagem de links da navegação sobe de 1 para 2). `Footer.test.tsx`: link "Arquitetura" para `/arquitetura`.
- [ ] **Step 2: Rodar e ver falhar.** Run: `cd frontend && npx vitest run src/pages/Arquitetura.test.tsx src/AnimatedRoutes.test.tsx src/components/Header.test.tsx src/components/Footer.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implementar** a página (textos em português, tom das outras páginas; cada parágrafo só com fatos da tabela de fontes da spec), a rota, o `NavLink` no cabeçalho entre o menu de ferramentas e "Sobre" e o link no rodapé (coluna Projeto, antes de "Sobre o projeto").
- [ ] **Step 4: Rodar tudo.** Run: `cd frontend && npm run test && npm run build && npm run lint` — Expected: tudo verde.
- [ ] **Step 5: Commit local.** `feat(frontend): página Arquitetura, rota e navegação`.

### Task 3: Diagrama de arquitetura

**Files:**
- Create: `frontend/src/components/diagrams/ArchitectureDiagram.tsx`, `ArchitectureDiagram.test.tsx`
- Modify: `frontend/src/pages/Arquitetura.tsx` (monta o diagrama na seção 01), `Arquitetura.test.tsx`

**Interfaces:**
- Consumes: `Diagram`, `DiagramStep`, classes `diagram-*` (Task 1).
- Produces: `export function ArchitectureDiagram()` — renderiza `<Diagram id="arquitetura" …>` com o SVG largo.
- Fonte (a conferir): `OVERVIEW.md`; ADR-0001, ADR-0002; `frontend/wrangler.toml`; `infra/terraform/main.tf`, `infra/terraform/oci/loadbalacers.tf`, `instance.tf`. Rótulos permitidos e nada além: **Navegador** (você); **Cloudflare** com **Worker** (este site, estático) e **Proxy da API** (`api.probekit.cc`); **Oracle Cloud · São Paulo** com **Balanceador** (TCP 443), **VM 1** e **VM 2** (API em Go). Passos da lista: abrir o site; o navegador chama a API; o balanceador escolhe uma das duas VMs; a API em Go (que termina o TLS) confere o destino e recusa endereços privados, loopback e link-local; o ping envia ICMP de verdade e o DNS usa o resolvedor do sistema da VM; a resposta volta em JSON. Movimento: pontos cinza (o site chegando) e laranja (`highlight`, um pedido de teste) viajam por `offset-path`; as VMs respiram em turnos (`diagram-pulse`).

- [ ] **Step 1: Escrever os testes que falham.** (a) `getByRole("img", { name: /arquitetura/i })`; (b) a lista tem exatamente 6 passos e o texto de cada rótulo permitido aparece; **nenhum** texto de rótulo fora da lista permitida (compare o conjunto dos `text` do SVG com o esperado); (c) sem `IntersectionObserver` não há `.diagram-packet` visível e `data-motion="off"`; (d) a seção 01 da página contém o diagrama.
- [ ] **Step 2: Rodar e ver falhar.** Run: `cd frontend && npx vitest run src/components/diagrams/ArchitectureDiagram.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implementar** a geometria (viewBox largo, texto de 14 px em `font-sans` para nomes, 12 px para o secundário, mono só em `api.probekit.cc`), a lista de passos e a montagem na página; um comentário curto por rótulo com o arquivo-fonte.
- [ ] **Step 4: Verificar no navegador** (Chromium headless real, não o relógio virtual): nos dois temas, em 375 px (versão vertical legível, sem rolagem horizontal) e 1280 px; nota do que não deu para verificar.
- [ ] **Step 5: Rodar tudo.** Run: `cd frontend && npm run test && npm run build && npm run lint` — Expected: verde.
- [ ] **Step 6: Commit local.** `feat(frontend): diagrama de arquitetura animado`.

### Task 4: Diagrama do pipeline

**Files:**
- Create: `frontend/src/components/diagrams/PipelineDiagram.tsx`, `PipelineDiagram.test.tsx`
- Modify: `frontend/src/pages/Arquitetura.tsx` (seção 02), `Arquitetura.test.tsx`

**Interfaces:**
- Consumes: `Diagram`, `DiagramStep`, classes `diagram-*`, o estilo visual do `ArchitectureDiagram` (Task 3).
- Produces: `export function PipelineDiagram()`.
- Fonte (a conferir): `.github/workflows/ci.yml`, `build-api-golang.yml`, `deploy-frontend.yml`, `deploy-api-golang.yml`, `rollback-api-golang.yml`, `rollback-frontend.yml`; ADR-0005, ADR-0007, ADR-0008; `docs/runbook-deploy.md`. Rótulos permitidos e nada além: **Pull request**; **CI** (Go · NPM · Terraform); **main**; **Release da API** (mudança em `backend/api-service-golang/**`); **Build do site** (mudança em `frontend/**`); **Deploy da API** (manual); **Aprovação** (ambiente `production`); **Deploy**; **Rollback** (API e site). O portão de aprovação fica no passo de deploy compartilhado (a API e os dois rollbacks também usam o ambiente `production`); nada sobre as VMs se atualizando sozinhas. Movimento: um ponto atravessa o caminho do pull request até o deploy e o portão pulsa (`diagram-pulse`) como se segurasse o deploy; o rollback é uma linha tracejada de volta, parada.

- [ ] **Step 1: Escrever os testes que falham.** (a) `getByRole("img", { name: /pipeline/i })`; (b) o conjunto de rótulos do SVG é exatamente o permitido (nenhum a mais) e a lista ordenada tem um passo por etapa (pull request, CI, `main`, release da API, build do site, aprovação, deploy, rollback); (c) em `data-motion="off"` o ponto viajante não é renderizado; (d) o texto "atualizam sozinhas" não aparece em lugar nenhum da página.
- [ ] **Step 2: Rodar e ver falhar.** Run: `cd frontend && npx vitest run src/components/diagrams/PipelineDiagram.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implementar** a geometria (a bifurcação após `main`, o portão e o rollback), a versão vertical via lista (a bifurcação vira dois ramos empilhados e o rollback uma linha de nota), os comentários de fonte e a montagem na seção 02.
- [ ] **Step 4: Verificar no navegador** como no Task 3 (dois temas, 375 e 1280 px, reduced motion).
- [ ] **Step 5: Rodar tudo.** Run: `cd frontend && npm run test && npm run build && npm run lint` — Expected: verde.
- [ ] **Step 6: Commit local.** `feat(frontend): diagrama do pipeline animado`.

### Task 5: Diagrama da infraestrutura

**Files:**
- Create: `frontend/src/components/diagrams/InfrastructureDiagram.tsx`, `InfrastructureDiagram.test.tsx`
- Modify: `frontend/src/pages/Arquitetura.tsx` (seção 03), `Arquitetura.test.tsx`

**Interfaces:**
- Consumes: `Diagram`, `DiagramStep`, classes `diagram-*`, estilo do Task 3.
- Produces: `export function InfrastructureDiagram()`.
- Fonte (a conferir): `infra/terraform/backend.tf`, `infra/terraform/oci/*.tf`, `infra/terraform/cloudflare/`; ADR-0005, ADR-0008. Rótulos permitidos e nada além: **\*.tf** (o código); **plan → apply** (terraform); **Oracle Cloud** com **Rede**, **2 VMs**, **Balanceador**; **Cloudflare** com **DNS api (proxied)**; **Estado remoto** (bucket na OCI). Texto de apoio: o Worker do site é publicado pelo pipeline, não pelo Terraform; só OCI e Cloudflare entram (as pastas `aws` e `azure` não fazem parte do que o site conta). Movimento: as linhas se desenham (`diagram-draw`) e os recursos entram em sequência (`diagram-pop`), uma vez, ao ficar visível.

- [ ] **Step 1: Escrever os testes que falham.** (a) `getByRole("img", { name: /infraestrutura/i })`; (b) conjunto de rótulos exato; lista ordenada com um passo por etapa (escrever o código, plan e apply, criar na OCI, criar o DNS na Cloudflare, guardar o estado); (c) as palavras "AWS" e "Azure" não aparecem na página; (d) em `data-motion="off"` todos os blocos estão visíveis (sem classe de estado inicial oculta).
- [ ] **Step 2: Rodar e ver falhar.** Run: `cd frontend && npx vitest run src/components/diagrams/InfrastructureDiagram.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implementar** a geometria, a lista, os comentários de fonte e a montagem na seção 03.
- [ ] **Step 4: Verificar no navegador** como no Task 3.
- [ ] **Step 5: Rodar tudo.** Run: `cd frontend && npm run test && npm run build && npm run lint` — Expected: verde.
- [ ] **Step 6: Commit local.** `feat(frontend): diagrama da infraestrutura animado`.

### Task 6: Home mais simples

**Files:**
- Modify: `frontend/src/pages/Home.tsx`, `Home.test.tsx`
- Modify: `frontend/src/index.css` (só se sobrar regra que apenas a Home usava)

**Interfaces:**
- Consumes: `Reveal`; a página `/arquitetura` (Task 2).
- Estrutura final: abertura (título e os dois parágrafos de hoje); **Perfil do laboratório**, uma `<dl>` com sete pares (Foco: Go · DevOps · redes; API: Go, em duas VMs · Oracle Cloud, São Paulo; Site: Cloudflare Worker com arquivos estáticos; Infraestrutura: Terraform · OCI e Cloudflare; Entrega: GitHub Actions · CI, release, deploy com aprovação e rollback; Decisões: ADRs e specs no repositório, com link para `https://github.com/msouza10/probekit/tree/main/docs/adr`; Licença: MIT, com link para `https://github.com/msouza10/probekit/blob/main/LICENSE`); **O que já funciona** (a lista de hoje); uma linha com link "Arquitetura" para `/arquitetura`. Saem o `Bench`, `ExamplePing`, o link "Rodar de verdade" e a seção "Como os diagnósticos são executados".

- [ ] **Step 1: Atualizar os testes (falham).** (a) um link por ferramenta disponível, nenhuma planejada (já existem); (b) **não** há região `Bench` e o texto "exemplo" não aparece; (c) existe um link para `/arquitetura`; (d) a `<dl>` tem 7 `dt` com os rótulos acima, e os links de decisões e licença têm os `href` do repositório; (e) todo `a[href^="http"]` começa com `https://github.com/msouza10/probekit`; (f) `fetch` não é chamado; (g) nenhum texto começa com `//`. Remover os testes do `Bench` e do "Rodar de verdade".
- [ ] **Step 2: Rodar e ver falhar.** Run: `cd frontend && npx vitest run src/pages/Home.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implementar** a Home nova e apagar o código morto (`ExamplePing`, `exampleReplies`, importação do `Bench`, o parágrafo `prose` se ficar sem uso). `Bench.tsx` e seu teste **ficam** (Ping e DNS o usam).
- [ ] **Step 4: Rodar tudo.** Run: `cd frontend && npm run test && npm run build && npm run lint` — Expected: verde.
- [ ] **Step 5: Commit local.** `feat(frontend): home mais simples com perfil do laboratório`.

### Task 7: Fechamento — documentos e verificação

**Files:**
- Modify: `frontend/src/design-guard.test.ts` (acrescentar a asserção de que a lista computada contém `src/pages/Arquitetura.tsx`, `src/components/diagrams/Diagram.tsx` e `src/pages/Ping.tsx`), `frontend/design.md` (seção dos diagramas: o atributo `data-motion`, as classes `diagram-*`, a versão vertical, as regras de tamanho e contraste, a página Arquitetura), `frontend/README.md` e `OVERVIEW.md` (a lista de páginas passa a incluir Arquitetura; só isso), `docs/architecture/arch.md` (se descrever as páginas do frontend: conferir com `grep -n "Sobre\|NotFound" docs/architecture/arch.md`)

- [ ] **Step 1: Ampliar o guard** com a asserção acima e rodar. Run: `cd frontend && npx vitest run src/design-guard.test.ts` — Expected: PASS (os arquivos novos já são cobertos pelo glob) e FAIL se algum tiver gradiente, sombra ou nome antigo.
- [ ] **Step 2: Atualizar a documentação** conforme os arquivos acima, só com o que o código faz.
- [ ] **Step 3: Bateria completa.** Run: `cd frontend && npm run build && npm run lint && npm run test && npm run format:check` e, da raiz, `python3 .claude/skills/probekit-docs/scripts/check_links.py` — Expected: tudo passa, 0 links quebrados.
- [ ] **Step 4: Conferir cada afirmação** da tabela "Fonte de cada afirmação" da spec contra o arquivo citado e registrar o resultado (afirmação, arquivo, confere ou não) no relatório; qualquer divergência vira correção no diagrama.
- [ ] **Step 5: Acessibilidade e movimento no navegador real** (Playwright via `playwright-core` já instalado em `~/.npm/_npx`, Chromium em `/usr/bin/chromium-browser`, ou Lighthouse): `/` e `/arquitetura` nos dois temas (Lighthouse de acessibilidade sem falha de contraste); com `reducedMotion: "reduce"`, `data-motion="off"` e nenhum ponto viajante visível; capturas de tela de `/` e `/arquitetura` em 375 px e 1280 px nos dois temas, sem rolagem horizontal da página; salvar as capturas em `.superpowers/final-shots/`. Declarar o que não foi possível verificar.
- [ ] **Step 6: Commit local.** `feat(frontend): fecha a página Arquitetura e atualiza a documentação`.
