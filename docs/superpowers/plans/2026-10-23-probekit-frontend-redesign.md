# Redesign visual do frontend — plano de implementação

> **Para quem for executar:** use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`, task por task. Os passos usam caixas (`- [ ]`) como roteiro de execução; o estado oficial de cada task está na issue e no GitHub Project.

**Objetivo:** trocar a aparência do site por um laboratório pessoal editorial (claro e escuro), sem mudar o comportamento de Ping e DNS Lookup.

**Arquitetura:** tokens semânticos no Tailwind v4 (claro e escuro por `data-theme`), três famílias de fonte hospedadas no próprio site, um componente `Bench` (painel escuro nos dois temas) e uma camada de movimento pura em `src/lib/motion.ts`, usada por `Reveal` e pelas rotas. As páginas são migradas uma a uma; os nomes antigos dos tokens ficam como alias até o fechamento, que os remove.

**Stack:** React 19, Vite, Tailwind v4, shadcn/ui, Motion, React Router, Vitest + Testing Library. Fontes via `@fontsource-variable/*`.

**Spec:** [`2026-10-23-probekit-frontend-redesign-design.md`](../specs/2026-10-23-probekit-frontend-redesign-design.md) (mockup de referência em `../specs/assets/`).

## Restrições globais

- Mantém React 19, Vite, Tailwind v4, shadcn/ui, Motion e React Router.
- Os 37 testes continuam passando: o comportamento testado não muda; asserções que dependem de texto ou marcação alterados podem ser ajustadas.
- Escopo: Home, Ping, DNS Lookup, Sobre, NotFound, Header e Footer. **Nenhum** item de menu, rota ou página de Artigos, Linha do tempo ou Arquitetura.
- Sem gradiente, sombra, glassmorphism, ícone decorativo, hover que levanta, nem "brilho". Tema escuro desenhado por si, não por inversão.
- Texto corrido em serifa; interface em sans; monoespaçada só em código, saída de comandos e dados.
- Movimento: entrada com fade + blur leve + deslocamento curto (`transform`, `opacity`, `filter` apenas); `prefers-reduced-motion` tira deslocamento e blur.
- A Home **não chama a API** ao carregar (rate limit compartilhado de 50 requisições por IP em 5 minutos).
- Exemplos de dado na Home usam `example.com` e `192.0.2.x` e vêm rotulados como exemplo.
- Fatos pessoais nos textos: só o link do GitHub (`https://github.com/msouza10/probekit`).
- Repositório público: nenhum segredo, IP ou nome de recurso interno nos textos.
- Contraste WCAG AA nos dois temas, foco visível, navegação por teclado.
- Fontes hospedadas no site, com `font-display: swap` e fallback de métricas ajustadas.
- Commits do frontend não geram release da API. O commit em si é do criador (`AGENTS.md`); cada task termina numa pausa para ele.

## Foco da revisão

Entradas e condições que a spec implica e nenhum task cobriria sozinho; cada linha tem o teste no task dono.

1. **`localStorage` bloqueado** (janela anônima): o botão de tema continua trocando o tema. Já coberto por `ThemeToggle.test.tsx`; Task 5 mantém.
2. **Saída longa em tela de 375 px** (hostname enorme, JSON de resultado): rola dentro da `Bench`, nunca a página inteira. Teste no Task 4.
3. **Sem `IntersectionObserver`** (jsdom, navegadores antigos): o conteúdo aparece mesmo assim. Teste no Task 2.
4. **Home sem rede:** não faz `fetch` ao montar. Teste no Task 6.
5. **Menu estreito (≤ 360 px):** o cabeçalho continua utilizável e sem itens fora de escopo. Teste no Task 5.

---

### Task 1: Fundação — tokens, fontes e tipografia base

**Files:**
- Modify: `frontend/index.html` (remover os `<link>` do Google Fonts; **manter** o script de tema anti-flash)
- Modify: `frontend/package.json` (adicionar `@fontsource-variable/inter`, `@fontsource-variable/newsreader`, `@fontsource-variable/jetbrains-mono`; confirmar os nomes com `npm view` antes)
- Modify: `frontend/src/main.tsx` (importar os CSS das fontes)
- Modify: `frontend/src/index.css` (bloco `@theme`, camada base, remap `data-theme`; remover o gradiente do `body`)
- Create: `frontend/src/design-guard.test.ts`

**Interfaces:**
- Produces: fontes `--font-serif`, `--font-sans`, `--font-mono` (utilitários `font-serif`, `font-sans`, `font-mono`); tokens semânticos shadcn (`--background`, `--foreground`, `--muted`, `--muted-foreground`, `--border`, `--card`, `--ring`, `--primary`…) com valores claros e escuros; `--highlight` (a única cor de destaque, utilitários `text-highlight`, `bg-highlight`); `--bench`, `--bench-foreground`, `--bench-muted`, `--bench-border`, `--bench-ok` (iguais nos dois temas). Os nomes antigos (`page-ink`, `card-carbon`, `deep-coal`, `steel-border`, `graphite`, `fog`, `ash`, `snow`, `blue-cornflower`) viram **alias** para os novos valores, para as páginas ainda não migradas continuarem renderizando.
- Produces (teste): `design-guard.test.ts` exporta nada; tem `const redesigned: string[]` com caminhos relativos a `frontend/`, e cada task acrescenta os seus arquivos.

- [ ] **Step 1: Escrever o teste que falha** em `frontend/src/design-guard.test.ts`, lendo arquivos com `node:fs`: (a) `index.html` não contém `fonts.googleapis.com` e contém `probekit-theme`; (b) em `index.css`, `--font-sans` não referencia `jetbrains`; (c) para cada caminho em `redesigned`, o conteúdo não casa `/linear-gradient|radial-gradient|box-shadow|\bshadow(-\w+)?\b/`, `/hover:-?translate-y|hover:scale/` nem os nomes antigos de token em classes (`/\b(text|bg|border|ring|fill|stroke)-(snow|ash|fog|graphite|page-ink|card-carbon|deep-coal|steel-border|blue-cornflower)\b/`). Começa com `redesigned = []`.
- [ ] **Step 2: Rodar e ver falhar.** Run: `cd frontend && npx vitest run src/design-guard.test.ts` — Expected: FAIL em (a) e (b).
- [ ] **Step 3: Implementar a fundação.** Paleta: neutros quentes (papel e tinta no claro, marrom-escuro no escuro) e uma cor de destaque discreta; valores a critério do builder, com AA conferido. No escuro, a `Bench` precisa se distinguir do fundo por tom e borda de 1 px. Base: corpo em serifa, títulos em serifa, interface (`button`, `input`, `nav`) em sans; `pre`/`code` em mono; sem `background-image` no `body`. Fontes com `font-display: swap` e um `@font-face` de fallback com `size-adjust` por família.
- [ ] **Step 4: Rodar tudo.** Run: `cd frontend && npm run test && npm run build && npm run lint` — Expected: guard e os 37 testes verdes, build sem erro.
- [ ] **Step 5: Conferir no navegador** (`npm run dev`): as páginas atuais renderizam sem quebrar nos dois temas, já com as fontes novas; o tema não pisca ao recarregar.
- [ ] **Step 6: Pausa para o criador commitar.** Mensagem sugerida: `feat(frontend): tokens, fontes e tipografia base do redesign`.

### Task 2: Movimento — `motion.ts`, `Reveal` e transição de rota

**Files:**
- Create: `frontend/src/lib/motion.ts`, `frontend/src/lib/motion.test.ts`
- Modify: `frontend/src/components/Reveal.tsx`, `frontend/src/AnimatedRoutes.tsx`, `frontend/src/AnimatedRoutes.test.tsx`
- Modify: `frontend/src/index.css` (remover `rise-in`, `scroll-hint`, `.reveal-visible` e as regras de animação que dependiam delas)

**Interfaces:**
- Produces: `entrance(reduced: boolean, delay?: number): { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition }` e `routeTransition(reduced: boolean): { initial; animate; exit; transition }`; `Reveal({ delay?: number; className?: string; children: ReactNode }): JSX.Element` (mantém a importação `@/components/Reveal`).
- Regras: com `reduced = false`, `initial` tem `opacity: 0`, `y` ≤ 16 e `filter` com `blur(`; `transition.duration` entre 0.2 e 0.6; com `reduced = true`, `initial` só tem `opacity`, sem `y` e sem `filter`, e `duration` ≤ 0.15.

- [ ] **Step 1: Testes que falham** em `motion.test.ts` com as regras acima (um `it` por regra, valores exatos nas asserções). Em `AnimatedRoutes.test.tsx`, ajustar para a nova transição mantendo a asserção de que a rota certa renderiza.
- [ ] **Step 2: Teste do `Reveal`:** renderiza os filhos quando `IntersectionObserver` não existe (jsdom) — o texto está no documento.
- [ ] **Step 3: Rodar e ver falhar.** Run: `cd frontend && npx vitest run src/lib/motion.test.ts src/AnimatedRoutes.test.tsx` — Expected: FAIL (módulo inexistente).
- [ ] **Step 4: Implementar** `motion.ts` (funções puras) e reescrever `Reveal` com `motion.div` + `whileInView` (uma vez) usando `entrance(useReducedMotion())`; `AnimatedRoutes` usa `routeTransition`.
- [ ] **Step 5: Rodar tudo.** Run: `cd frontend && npm run test && npm run build` — Expected: tudo verde.
- [ ] **Step 6: Pausa para o criador commitar.** `feat(frontend): camada de movimento com blur e respeito a reduced-motion`.

### Task 3: Primitivos shadcn reestilizados

**Files:**
- Modify: `frontend/src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `separator.tsx` e os `*.test.tsx` correspondentes
- Delete: `frontend/src/components/ui/navigation-menu.tsx` (nenhum arquivo o importa; conferir com `grep -rn "navigation-menu" frontend/src`)
- Modify: `frontend/src/design-guard.test.ts` (acrescentar os quatro arquivos em `redesigned`)

**Interfaces:**
- Consumes: tokens do Task 1.
- Produces: `Button` mantém `variant` (`default` = preenchido com tinta, `outline`, `ghost`, `link`; os demais podem ser removidos se ninguém usar) e `size`, `asChild`; sem `whileHover`; só `whileTap` com escala 0.98. `Card`/`Badge`/`Separator` planos: borda de 1 px, sem sombra.

- [ ] **Step 1: Acrescentar os arquivos ao guard e rodar** — Expected: FAIL por `shadow`/`hover:scale` nos primitivos.
- [ ] **Step 2: Reestilizar** os primitivos; ajustar `button.test.tsx` (existe `data-variant`, `asChild` renderiza o filho) e `card.test.tsx`.
- [ ] **Step 3: Rodar tudo.** Run: `cd frontend && npm run test && npm run build` — Expected: verde.
- [ ] **Step 4: Pausa para o criador commitar.** `feat(frontend): primitivos de UI planos e sem sombra`.

### Task 4: Componente `Bench`

**Files:**
- Create: `frontend/src/components/Bench.tsx`, `frontend/src/components/Bench.test.tsx`
- Modify: `frontend/src/index.css` (regra `.bench` que fixa as variáveis `--bench-*` nos dois temas)
- Modify: `frontend/src/design-guard.test.ts` (acrescentar `Bench.tsx`)

**Interfaces:**
- Produces: `Bench({ label, meta, example, className, children }: { label: string; meta?: string; example?: boolean; className?: string; children: ReactNode }): JSX.Element` — um `<section data-slot="bench" aria-label={label}>` com cabeçalho (label em caixa-alta pequena em mono, `meta` à direita, e a palavra "exemplo" quando `example`), e a área de conteúdo com `overflow-x-auto`.

- [ ] **Step 1: Testes que falham:** (a) renderiza `label`, `meta` e filhos; (b) `example` mostra o texto "exemplo", sem `example` não mostra; (c) a área de conteúdo tem a classe `overflow-x-auto` (saída longa rola dentro do painel); (d) o `section` expõe o nome acessível igual a `label`.
- [ ] **Step 2: Rodar e ver falhar.** Run: `cd frontend && npx vitest run src/components/Bench.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implementar** o componente e a regra `.bench`.
- [ ] **Step 4: Rodar tudo e conferir no navegador** que a bancada é escura e legível nos dois temas. Run: `cd frontend && npm run test` — Expected: verde.
- [ ] **Step 5: Pausa para o criador commitar.** `feat(frontend): componente Bench`.

### Task 5: Cabeçalho, rodapé e botão de tema

**Files:**
- Modify: `frontend/src/components/Header.tsx`, `Footer.tsx`, `ThemeToggle.tsx` e os três `*.test.tsx`
- Modify: `frontend/src/index.css` (remover as regras `.site-header`, `.tools-popover`, `.search-*`, `.footer-*`, `.theme-toggle-*` antigas; recriar o necessário sem sombra)
- Modify: `frontend/src/design-guard.test.ts`

**Interfaces:**
- Consumes: `Button`, tokens, `motion.ts`.
- Regras: logo vira palavra em serifa (sem caixa de ícone); some o ícone das linhas do menu de ferramentas; o menu e a busca mantêm o comportamento atual (abrir/fechar, Enter abre a primeira ferramenta disponível, Esc fecha); o botão de tema mantém `role="switch"` e `aria-label="Modo escuro"`; navegação principal contém só **Ferramentas** e **Sobre**; rodapé em primeira pessoa e com o link do GitHub; `Voltar ao topo` pode virar texto.

- [ ] **Step 1: Testes que falham** nos três arquivos de teste: (a) `Header` não contém texto `/artigos|linha do tempo|arquitetura/i`; (b) a busca continua achando "DNS" e abrindo `/dns-lookup`; (c) o toggle continua passando nos dois testes atuais; (d) `Footer` tem o link `https://github.com/msouza10/probekit` e nenhum outro link externo pessoal.
- [ ] **Step 2: Rodar e ver falhar o que for novo.** Run: `cd frontend && npx vitest run src/components` — Expected: FAIL só em (a) e (d) se o texto antigo ainda estiver lá.
- [ ] **Step 3: Reestilizar** os três componentes e migrar as classes do CSS global para utilitários ou para regras mínimas.
- [ ] **Step 4: Conferir em 375 px e 360 px** que o cabeçalho continua utilizável (menu, busca, tema, GitHub). Run: `cd frontend && npm run test && npm run build` — Expected: verde.
- [ ] **Step 5: Pausa para o criador commitar.** `feat(frontend): cabeçalho, rodapé e tema no novo visual`.

### Task 6: Home

**Files:**
- Modify: `frontend/src/pages/Home.tsx`, `Home.test.tsx`, `frontend/src/lib/tools.ts` (`status` de Ping e DNS Lookup passa de `"Em breve"` para `"Disponível"`, porque já estão no ar)
- Delete: `frontend/src/components/ToolCard.tsx`, `ToolCard.test.tsx`
- Modify: `frontend/src/index.css` (remover `.hero-*`, `.tool-card`, `.execution-*`, `.type-eyebrow`), `frontend/src/design-guard.test.ts`

**Interfaces:**
- Consumes: `Bench`, `Reveal`, `tools`.
- Estrutura: título e introdução em prosa de primeira pessoa (proposta do assistente, o criador revisa); uma `Bench example` com um `ping` de `example.com` (valores inventados, endereço `192.0.2.x`) e um link para `/ping`; lista das ferramentas disponíveis (`status !== "Planejado"`), cada uma com link, uma linha de descrição e por que existe; seção "como os diagnósticos são executados" em prosa. Some a busca por texto e as abas de categoria (existiam para seis ferramentas, agora são duas).

- [ ] **Step 1: Testes que falham** em `Home.test.tsx`: (a) um link por ferramenta com `status !== "Planejado"`, com o `href` certo; (b) existe um painel `Bench` com o texto "exemplo", e todo IPv4 dentro dele casa `/^192\.0\.2\./`; (c) `fetch` não é chamado ao montar (`vi.spyOn(globalThis, "fetch")`); (d) nenhum texto começa com `//`.
- [ ] **Step 2: Rodar e ver falhar.** Run: `cd frontend && npx vitest run src/pages/Home.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Reescrever a Home** e remover `ToolCard`.
- [ ] **Step 4: Rodar tudo.** Run: `cd frontend && npm run test && npm run build && npm run lint` — Expected: verde.
- [ ] **Step 5: Conferir** nos dois temas, em 375 px e 1280 px, e mostrar ao criador o texto proposto.
- [ ] **Step 6: Pausa para o criador commitar.** `feat(frontend): nova home do laboratório`.

### Task 7: Página de Ping

**Files:**
- Create: `frontend/src/pages/Ping.test.tsx`
- Modify: `frontend/src/pages/Ping.tsx`, `frontend/src/index.css` (se sobrar regra do Ping), `frontend/src/design-guard.test.ts`

**Interfaces:**
- Consumes: `runPing(target: string, count?: number, timeout?: number): Promise<PingResult>` e `PROBE_PROVIDER` de `@/lib/api`; `Bench`.
- Regras: o comportamento não muda (estados idle, loading, success, error; `count`, `timeout`, presets, copiar JSON, simulação só em `import.meta.env.DEV`); formulário editorial; resultado e saída na `Bench` como lista de definição (`<dl>`) no lugar dos quatro cards; os cartões da tela inicial viram prosa; o erro continua em vermelho de sinal; ícones decorativos saem.

- [ ] **Step 1: Escrever testes de caracterização ANTES de mexer** (com `vi.mock("@/lib/api")`): (a) sucesso mostra `avg_rtt`, `min_rtt`, `max_rtt` e a perda em `%`; (b) erro mostra a mensagem e o código, e o botão "Tentar com destino público (1.1.1.1)" chama `runPing("1.1.1.1", …)`; (c) alvo vazio não chama `runPing`; (d) "Copiar JSON" escreve no clipboard o JSON do resultado. Run: `cd frontend && npx vitest run src/pages/Ping.test.tsx` — Expected: PASS contra o código atual.
- [ ] **Step 2: Reestilizar** `Ping.tsx` e acrescentá-lo ao guard.
- [ ] **Step 3: Rodar de novo.** Run: `cd frontend && npm run test && npm run build` — Expected: os mesmos testes de caracterização continuam verdes.
- [ ] **Step 4: Conferir** os quatro estados nos dois temas, em 375 px, com um resultado de JSON longo.
- [ ] **Step 5: Pausa para o criador commitar.** `feat(frontend): página de ping no novo visual`.

### Task 8: Página de DNS Lookup

**Files:**
- Create: `frontend/src/pages/DnsLookup.test.tsx`
- Modify: `frontend/src/pages/DnsLookup.tsx`, `frontend/src/design-guard.test.ts`

**Interfaces:**
- Consumes: `runDnsLookup(domain: string, service?: string, proto?: string): Promise<DnsLookupResult>`; `Bench`; o mesmo padrão do Task 7.
- Regras: comportamento inalterado (A/AAAA, CNAME, MX com prioridade, TXT, NS, SRV opcional; estados e erros); registros na `Bench` como tabela mono simples; formulário e texto em prosa como no Ping.

- [ ] **Step 1: Testes de caracterização antes:** (a) sucesso lista endereços, um MX com a prioridade, um TXT e um NS; (b) com `service` e `proto` preenchidos, `runDnsLookup` recebe os três argumentos; (c) erro mostra mensagem e código; (d) domínio vazio não chama a API. Expected: PASS contra o código atual.
- [ ] **Step 2: Reestilizar** e acrescentar ao guard.
- [ ] **Step 3: Rodar tudo.** Run: `cd frontend && npm run test && npm run build` — Expected: verde.
- [ ] **Step 4: Pausa para o criador commitar.** `feat(frontend): página de dns lookup no novo visual`.

### Task 9: Sobre e NotFound

**Files:**
- Modify: `frontend/src/pages/Sobre.tsx`, `Sobre.test.tsx`, `NotFound.tsx`, `NotFound.test.tsx`, `frontend/src/design-guard.test.ts`

**Interfaces:**
- Regras: Sobre em prosa de primeira pessoa, apoiada no `OVERVIEW.md` (propósito, laboratório de DevOps, stack, código aberto); sem cards com ícone; links só para o repositório e as specs no GitHub; NotFound curto, sem a caixa de ícone e sem o "STATUS: 404_ROUTE_UNRESOLVED".

- [ ] **Step 1: Testes que falham:** (a) Sobre tem um `h1` e um link para `https://github.com/msouza10/probekit`; (b) Sobre não tem links externos além de `github.com/msouza10/probekit`; (c) NotFound tem o link que volta para `/` com o nome acessível "Voltar para a página inicial".
- [ ] **Step 2: Rodar e ver falhar o que for novo.** Run: `cd frontend && npx vitest run src/pages/Sobre.test.tsx src/pages/NotFound.test.tsx` — Expected: FAIL onde o texto antigo ainda bate.
- [ ] **Step 3: Reescrever** as duas páginas; texto como proposta para o criador revisar.
- [ ] **Step 4: Rodar tudo.** Run: `cd frontend && npm run test && npm run build` — Expected: verde.
- [ ] **Step 5: Pausa para o criador commitar.** `feat(frontend): sobre e 404 no novo visual`.

### Task 10: Fechamento — limpeza, `design.md` e verificação

**Files:**
- Modify: `frontend/src/index.css` (remover os aliases dos nomes antigos e qualquer regra órfã), `frontend/design.md` (reescrever do zero), `frontend/README.md` (se citar fontes, tokens ou JetBrains), `frontend/src/design-guard.test.ts` (incluir `src/index.css` e todos os `.tsx` de `src` que não são teste)
- Modify: `docs/architecture/arch.md` e `OVERVIEW.md`, **se** citarem o visual antigo (conferir com `grep -n "JetBrains\|azul\|cornflower" docs OVERVIEW.md frontend/README.md`)

**Interfaces:**
- Produces: `design.md` descreve o que o código faz: tokens reais, fontes, regras do `Bench`, movimento e os "não faça" do spec.

- [ ] **Step 1: Ampliar o guard** para `index.css` e todos os `.tsx` de produção e rodar. Run: `cd frontend && npx vitest run src/design-guard.test.ts` — Expected: FAIL se sobrou alias, gradiente, sombra ou nome antigo.
- [ ] **Step 2: Limpar** até passar; reescrever `design.md`.
- [ ] **Step 3: Rodar a bateria completa.** Run: `cd frontend && npm run build && npm run lint && npm run test && npm run format:check` — Expected: todos passam; a contagem de testes é a anterior mais os novos.
- [ ] **Step 4: Contraste e movimento.** Rodar Lighthouse (acessibilidade) em Home, Ping, DNS Lookup, Sobre e 404, nos dois temas — Expected: sem falha de contraste; com `prefers-reduced-motion: reduce` emulado, as entradas não deslocam nem desfocam.
- [ ] **Step 5: Capturas com o criador:** cinco páginas × dois temas × 375 px e 1280 px.
- [ ] **Step 6: Documentos.** Run: `python3 .claude/skills/probekit-docs/scripts/check_links.py` e `prettier --check` nos `.md` de `frontend/` — Expected: sem link quebrado e sem diferença de formatação.
- [ ] **Step 7: Pausa para o criador commitar.** `feat(frontend): fecha o redesign e reescreve o design.md`.
