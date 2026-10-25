# Probekit — referência visual

Este documento descreve o que o código faz hoje. A fonte dos valores é [`src/index.css`](./src/index.css); a das regras, os componentes em `src/components/`. Se um valor mudar lá, mude aqui no mesmo commit. Um teste ([`src/design-guard.test.ts`](./src/design-guard.test.ts)) impede o retorno de gradiente, sombra, hover que levanta e dos nomes antigos de token.

A direção é um **caderno de laboratório**: página clara e editorial (papel e tinta), com as ferramentas mostrando a saída numa **bancada** escura, como um painel de terminal dentro do caderno. A voz é a primeira pessoa; o texto das páginas é do criador.

## Cores

Todas são variáveis CSS em `:root` (tema claro) e `:root[data-theme="dark"]` (tema escuro). O Tailwind as expõe como `bg-background`, `text-muted-foreground`, `border-border` e assim por diante (bloco `@theme inline`). Existe **uma** cor de destaque, o âmbar de marca-texto (`--highlight`).

| Token                   | Claro     | Escuro    | Uso                                                                 |
| ----------------------- | --------- | --------- | ------------------------------------------------------------------- |
| `--background`          | `#faf8f4` | `#1c1915` | Fundo da página                                                     |
| `--foreground`          | `#1d1b17` | `#ece6da` | Texto principal                                                     |
| `--card`                | `#f4f0e8` | `#24201a` | Superfície de `Card` e `secondary`                                  |
| `--popover`             | `#faf8f4` | `#24201a` | Fundo de popover e diálogo                                          |
| `--muted`               | `#efeae0` | `#28231d` | Fundo discreto, hover de itens (`accent` aponta para ele)           |
| `--muted-foreground`    | `#5e584d` | `#a8a092` | Texto secundário                                                    |
| `--primary`             | `#1d1b17` | `#ece6da` | Botão principal (é o `--foreground`; o texto dele é `--background`) |
| `--destructive`         | `#a8321f` | `#ef8a78` | Erro: texto, borda e ícone                                          |
| `--destructive-surface` | `#f8e9e4` | `#3a1d17` | Fundo do bloco de erro, só atrás de conteúdo `destructive`          |
| `--success`             | `#2f6a3c` | `#9cc596` | Sucesso                                                             |
| `--border`              | `#e2dccf` | `#38322a` | Linhas finas e bordas decorativas                                   |
| `--input`               | `#958c7c` | `#6f675a` | Borda de campos (precisa ser visível: 3:1)                          |
| `--highlight`           | `#8a5410` | `#e2a85e` | Destaque, foco (`--ring`), seleção de texto (24% de mistura)        |

`--radius` vale `0.5rem`; `rounded-sm`, `md`, `lg` e `xl` saem dele (`-4px`, `-2px`, `+0`, `+4px`).

### Bancada

Escura nos dois temas: os valores **não mudam** com `data-theme`. A classe `.bench` fixa `color-scheme: dark` e só consome os tokens `--bench-*`.

| Token                | Valor     | Uso                      |
| -------------------- | --------- | ------------------------ |
| `--bench`            | `#100e0b` | Fundo                    |
| `--bench-foreground` | `#ece8e1` | Texto                    |
| `--bench-muted`      | `#9b9486` | Rótulo, meta, comentário |
| `--bench-border`     | `#3a342b` | Bordas e divisórias      |
| `--bench-ok`         | `#8fb98a` | Resultado bem-sucedido   |
| `--bench-highlight`  | `#e2a85e` | Foco e destaque          |

### Contraste medido (WCAG 2.x, razão de luminância relativa)

Texto exige 4,5:1 (AA); borda de campo e foco, 3:1.

| Par                                       | Claro | Escuro |
| ----------------------------------------- | ----- | ------ |
| `foreground` sobre `background`           | 16,21 | 14,09  |
| `foreground` sobre `card`                 | 15,13 | 13,03  |
| `muted-foreground` sobre `background`     | 6,65  | 6,76   |
| `muted-foreground` sobre `card`           | 6,20  | 6,25   |
| `muted-foreground` sobre `muted`          | 5,88  | 6,01   |
| `highlight` sobre `background`            | 5,90  | 8,34   |
| `highlight` sobre `card`                  | 5,50  | 7,71   |
| `destructive` sobre `background`          | 6,30  | 7,15   |
| `destructive` sobre `destructive-surface` | 5,66  | 6,27   |
| `success` sobre `background`              | 6,10  | 9,04   |
| `input` (borda) sobre `background`        | 3,13  | 3,14   |

Bancada (igual nos dois temas, sobre `--bench`): texto 15,78; `bench-muted` 6,40; `bench-ok` 8,69; `bench-highlight` 9,17.

`--border` (1,29 claro, 1,38 escuro sobre o fundo) é de propósito só uma linha de separação: nunca é a única indicação de um controle. Campos usam `--input`.

## Tipografia

Três famílias, hospedadas no próprio site (`@fontsource-variable`, importadas em `src/main.tsx`, `font-display: swap`). Cada uma tem um `@font-face` de fallback com métricas ajustadas (`size-adjust` e `ascent`/`descent-override`), para a troca não empurrar o layout.

| Família (token)                | Onde                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------- |
| Newsreader (`--font-serif`)    | Texto corrido e títulos (`body`, `h1`–`h4`). Padrão da página.                    |
| Inter (`--font-sans`)          | Interface: `button`, `input`, `select`, `textarea`, `label`, `nav`.               |
| JetBrains Mono (`--font-mono`) | `pre`, `code`, `kbd`, `samp`, a saída na bancada e dados. Nunca em texto corrido. |

Detalhes: títulos em peso 500, `letter-spacing: -0.015em`, `text-wrap: balance`; parágrafos com `text-wrap: pretty`; mono com algarismos tabulares e zero cortado, sem ligaduras.

Escala (utilidades `text-*`, em `@theme`):

| Token        | Tamanho   | Entrelinha |
| ------------ | --------- | ---------- |
| `caption`    | 0.8125rem | 1.5        |
| `body-sm`    | 0.9375rem | 1.6        |
| `body`       | 1.0625rem | 1.65       |
| `body-lg`    | 1.25rem   | 1.6        |
| `subheading` | 1.375rem  | 1.35       |
| `heading-sm` | 1.625rem  | 1.3        |
| `heading`    | 2.5rem    | 1.15       |
| `heading-lg` | 3.25rem   | 1.1        |
| `display`    | 4rem      | 1.05       |

`.type-eyebrow` (11px, peso 500, caixa-alta, `letter-spacing: 0.12em`) serve só de título curto de grupo no Header e no Footer, em texto normal. Nunca no formato `// TÍTULO`.

## Espaçamento e layout

- Coluna única de leitura: `Layout` limita o conteúdo a `max-w-[1200px]` com `px-4` (e `sm:px-8`); blocos de prosa ficam em torno de `38rem` e as saídas da bancada em `44rem`.
- Escala de espaçamento padrão do Tailwind (múltiplos de 4px). Sem grade de cards iguais; listas e linhas finas no lugar.
- Cabeçalho fixo: `--header-height` vale `80px` (`112px` abaixo de 640px). A âncora `#ferramentas` usa isso em `scroll-margin-top`.
- Corpo com `min-width: 320px`; os layouts foram desenhados para 375px e 1280px.

## Componentes

Todos planos: sem sombra, sem gradiente, a hierarquia vem de tom (`card` sobre `background`) e de borda fina.

- **Button** (`ui/button.tsx`): `rounded-md`, variantes `default` (fundo `primary`), `outline` (borda `border`), `ghost` e `link`. Hover só troca cor. Toque: `whileTap` com escala 0,98. Foco: anel de 2px em `--ring` com 2px de recuo. Alvo de toque padrão de 36px de altura; formulários usam `min-h-11`.
- **Card** (`ui/card.tsx`): `rounded-lg`, borda `border`, fundo `card`. Sem elevação, sem hover.
- **Badge** (`ui/badge.tsx`): `rounded-md` (não é pílula), 12px; `default`, `secondary`, `outline` e `destructive` (superfície + borda `destructive`).
- **Separator**: linha de 1px em `--border`.
- **Bench** (`components/Bench.tsx`): painel escuro nos dois temas, `rounded-md`, borda `bench-border`. Tem um cabeçalho em mono com o `label` (caixa-alta) à esquerda e à direita `exemplo` (quando `example`) e `meta` (por exemplo a região de origem). O corpo é um `role="group"` com `tabIndex={0}` e `aria-label` "`label`, conteúdo": a área rola na horizontal e por isso é focável pelo teclado, com contorno `bench-highlight` por dentro. Usada como área de resultado em Ping e DNS Lookup (a Home não a usa). Só a saída do comando vai para a bancada; os formulários ficam na página.
- **Estados de erro**: bloco com borda `destructive`, fundo `destructive-surface`, `role="alert"`. Carregamento: um `<p role="status">` dentro de um contêiner `aria-live="polite"` sempre montado.

## Movimento

Biblioteca: Motion (`motion/react`). As regras ficam em [`src/lib/motion.ts`](./src/lib/motion.ts) e valem para todas as páginas.

- `entrance(reduced, delay)`: começa em `opacity: 0`, `y: 14`, `blur(6px)` e termina em `opacity: 1`, `y: 0`, `blur(0px)`, em 0,5s com ease `[0.22, 1, 0.36, 1]`; `delay` escalona itens. Ao terminar, `transitionEnd` troca o filtro por `none`, para não deixar um contexto de empilhamento nem texto suavizado.
- `routeTransition(reduced)`: troca de rota na mesma linguagem. Entra com `y: 12` e `blur(4px)`, sai com `y: -8` e `blur(4px)`, em 0,35s.
- `Reveal` aplica `entrance` uma vez, quando o bloco entra na viewport.
- **`prefers-reduced-motion: reduce`**: `useReducedMotion` seleciona o ramo `reduced`, que só anima `opacity` em 0,12s: sem deslocamento e sem blur. O CSS global também zera `scroll-behavior` suave e reduz animações e transições a 0,01ms.
- O popover de ferramentas do Header usa `@keyframes rise-in` (160ms), só sob `motion-safe`.
- Só `transform`, `opacity` e `filter`; nada que cause reflow.

## Diagramas

A página `/arquitetura` tem três diagramas (Arquitetura, Pipeline e Infraestrutura) em [`src/components/diagrams/`](./src/components/diagrams/). Cada um explica um fluxo; o movimento só reforça a leitura e nenhum diagrama depende dele.

### Componente `Diagram`

`Diagram` (`Diagram.tsx`) recebe `id`, `title`, `summary`, `steps` e um **render prop** em `children`. Ele chama `children({ title, summary })` com os ids derivados de `id` (`diagramIds.ts`), e o `<svg>` devolvido deve ter `role="img"`, `aria-labelledby` apontando para esses dois ids, e dentro um `<title id>` e um `<desc id>`. O `Diagram` desenha a `<figure>` (legenda, resumo, svg largo e a lista ordenada dos passos). As peças comuns do SVG (`Node`, `arrow`, `delay`, `NAME`, `SUB`) estão em `svgParts.tsx`.

### Versão vertical (abaixo de 640px)

Abaixo de `sm` (640px) o svg largo fica escondido e a **lista ordenada de passos é o diagrama**: cartões `border-border bg-card` empilhados, ligados por uma seta (linha `bg-border` e ponta em `border-highlight`). De `sm` para cima a lista continua no DOM, só para leitores de tela (`sm:sr-only`), e o resumo também. Assim o texto é o mesmo nas duas versões e o svg nunca é a única fonte da informação.

Tamanhos mínimos de texto (a spec exige nome do bloco com pelo menos 14px efetivos e secundário com pelo menos 12px):

- Versão larga: o `viewBox` tem 600 unidades de largura e o svg é limitado a `max-w-[600px]`. A coluna mais estreita em que ele aparece tem 576px (viewport de 640px menos o `sm:px-8`), escala 0,96. Por isso o nome do bloco usa 15 unidades (14,4px efetivos) e o secundário e o rótulo de zona, 13 (12,5px efetivos).
- Versão vertical: texto em HTML (`text-body-sm` no título do passo, 15px, e `text-caption` no detalhe, 13px), sem escala.

### Movimento

`useDiagramMotion` (`useDiagramMotion.ts`) devolve `{ ref, on }`. `on` é verdadeiro só quando um `IntersectionObserver` (limiar 0,2) diz que a figura está na tela **e** `useReducedMotion` é falso. O `Diagram` põe `data-motion="on"` ou `data-motion="off"` na `<figure>`. Sem `IntersectionObserver` (jsdom) o valor fica `off`. Em `off` tudo aparece parado, no estado final, e os pontos que viajam não são exibidos.

O movimento é só CSS (`@keyframes` em `src/index.css`), ligado por `[data-motion="on"]`. Classes:

| Classe            | O que faz                                                                           |
| ----------------- | ----------------------------------------------------------------------------------- |
| `.diagram-draw`   | A linha se desenha uma vez (`stroke-dashoffset`); exige `pathLength="1"` no `path`  |
| `.diagram-flow`   | Tracejado que corre sobre uma linha já desenhada (fluxo contínuo)                   |
| `.diagram-pop`    | Entrada do bloco: `opacity` e `translateY(6px)`, com atraso escalonado              |
| `.diagram-pulse`  | A borda do bloco (portão e VMs) alterna entre `--border` e `--highlight`            |
| `.diagram-packet` | Ponto que viaja por uma linha (`offset-path`), escondido fora de `data-motion="on"` |

Regras:

- `pathLength="1"` em todo `path` com `.diagram-draw`.
- **Uma classe de animação por elemento**: duas animações no mesmo elemento se sobrepõem. Linha que se desenha e depois flui são dois `path`, a base com `.diagram-draw` e outra por cima com `.diagram-flow`.
- **Sem SMIL** (`animateMotion`): não se pausa por CSS nem se testa no jsdom.
- Os pontos andam por `offsetPath: path("...")` (estilo inline), com a duração trocável por `--diagram-travel`. São desenhados antes dos blocos, então somem por baixo de cada bloco que atravessam.
- Atrasos escalonados vão inline (`animation-delay`).
- Com `prefers-reduced-motion: reduce` o CSS também zera `.diagram-*` e esconde `.diagram-packet`, além de o atributo ficar `off`.

### Cores

Só tokens existentes, sem alias novo: bloco `fill-card` com `stroke-border` (o portão usa `fill-muted`); zonas tracejadas e ligações em `stroke-input` (3:1 sobre o fundo); fluxo, setas do caminho principal e pulso em `stroke-highlight`; nomes em `fill-foreground` e texto secundário em `fill-muted-foreground`. O ponto de uma das linhas usa `var(--muted-foreground)` e os demais, `--highlight`.

### Página Arquitetura

[`src/pages/Arquitetura.tsx`](./src/pages/Arquitetura.tsx): título e introdução, três seções numeradas (01 Arquitetura, 02 Pipeline, 03 Infraestrutura), cada uma com parágrafos, o diagrama e links para as fontes no GitHub, e por fim os Princípios. Cada rótulo e cada parágrafo vêm de um arquivo do repositório (o comentário perto do texto diz de qual); o que não tem fonte não entra.

### Coruja em ASCII

[`src/components/AsciiOwl.tsx`](./src/components/AsciiOwl.tsx), ao lado do título da Home. É um elemento de identidade escolhido pelo criador e uma exceção deliberada à regra de "sem elementos decorativos". A arte vem de `src/assets/coruja-ascii.txt` (importada com `?raw`).

- Decorativa: o wrapper tem `aria-hidden="true"`; o `<pre>` tem `aria-hidden="true"`, `select-none` e `pointer-events-none`. Cor `text-muted-foreground`, fonte `font-mono`.
- Só aparece a partir de `lg` (1024px): abaixo disso o wrapper é `hidden`, e o herói da Home volta a uma coluna.
- Encaixe: o wrapper é um `container-type: inline-size` e o corpo da fonte é `calc(100cqw / colunas / 0.6)`, com 0,6em de avanço da JetBrains Mono. A arte ocupa a coluna inteira em qualquer largura, sem rolagem horizontal (o wrapper tem `overflow-hidden`). A altura final é reservada com as mesmas constantes (`minHeight`), para o herói não se deslocar enquanto a coruja é desenhada.
- Animação em duas fases, escrita direto no texto do `<pre>` (sem re-render do React): ao ficar visível pela primeira vez, a coruja se desenha de cima para baixo, uma linha a cada 38ms; depois cintila, a cada 110ms, trocando alguns caracteres por outros da rampa `.:-=+*#%@&MXAHSGB35`, que voltam ao original aos poucos. Espaços da arte nunca mudam, e os olhos (com os brilhos) e o bico são protegidos: a cintilação nunca toca nessas células, listadas no componente. A arte foi retocada à mão, não convertida de uma imagem.
- Os timers pausam quando a coruja sai da tela (`IntersectionObserver`) ou a aba fica escondida, e retomam sem redesenhar. Ao desmontar, tudo é limpo.
- Com `prefers-reduced-motion: reduce`, ou sem `IntersectionObserver`, a arte aparece completa e estática.

## Foco e acessibilidade

- `:focus-visible` global: contorno de 2px em `--ring` (= `--highlight`) com 4px de recuo. Componentes podem trocar por anel próprio, mas sempre com foco visível.
- Navegação e botões têm texto ou `aria-label`; ícones só aparecem quando dizem algo que o texto não diz.
- O tema inicial segue a preferência do sistema; o botão alterna e a escolha fica em `localStorage` (chave `probekit-theme`). Um script em `index.html` aplica o tema antes da primeira pintura, para não piscar o tema errado.

## O que não fazer

- Sem gradiente, sombra, brilho, **hover que levanta** (`translate-y`, `scale` no hover) nem glassmorphism. O fundo do diálogo de busca é um véu liso (`bg-bench/60`), sem desfoque (`backdrop-blur` não é usado).
- Sem ícones decorativos.
- Sem cards iguais em grade nem seção de três colunas numeradas, que é o desenho de template.
- Sem tom de vitrine: promessas, selos de confiança, chamadas de venda.
- Sem eyebrow no formato `// TÍTULO`.
- Sem texto corrido em fonte monoespaçada.
- Sem dado inventado apresentado como real: exemplo é rotulado como exemplo e usa endereços reservados (`example.com`, `192.0.2.x`); a simulação de resultados só existe em desenvolvimento.
- Sem segunda cor de destaque. Vermelho e verde existem só para erro e sucesso.
- O tema escuro é **desenhado**, não o claro invertido: marrom-escuro quente, `--highlight` mais claro para manter o contraste, `--destructive` e `--success` reclareados.
- Sem animação que chame atenção para si ou que ignore `prefers-reduced-motion`.
