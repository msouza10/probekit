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
- **Bench** (`components/Bench.tsx`): painel escuro nos dois temas, `rounded-md`, borda `bench-border`. Tem um cabeçalho em mono com o `label` (caixa-alta) à esquerda e à direita `exemplo` (quando `example`) e `meta` (por exemplo a região de origem). O corpo é um `role="group"` com `tabIndex={0}` e `aria-label` "`label`, conteúdo": a área rola na horizontal e por isso é focável pelo teclado, com contorno `bench-highlight` por dentro. Usada na Home (exemplo de `ping`, **sempre rotulado como exemplo**) e como área de resultado em Ping e DNS Lookup. Só a saída do comando vai para a bancada; os formulários ficam na página.
- **Estados de erro**: bloco com borda `destructive`, fundo `destructive-surface`, `role="alert"`. Carregamento: um `<p role="status">` dentro de um contêiner `aria-live="polite"` sempre montado.

## Movimento

Biblioteca: Motion (`motion/react`). As regras ficam em [`src/lib/motion.ts`](./src/lib/motion.ts) e valem para todas as páginas.

- `entrance(reduced, delay)`: começa em `opacity: 0`, `y: 14`, `blur(6px)` e termina em `opacity: 1`, `y: 0`, `blur(0px)`, em 0,5s com ease `[0.22, 1, 0.36, 1]`; `delay` escalona itens. Ao terminar, `transitionEnd` troca o filtro por `none`, para não deixar um contexto de empilhamento nem texto suavizado.
- `routeTransition(reduced)`: troca de rota na mesma linguagem. Entra com `y: 12` e `blur(4px)`, sai com `y: -8` e `blur(4px)`, em 0,35s.
- `Reveal` aplica `entrance` uma vez, quando o bloco entra na viewport.
- **`prefers-reduced-motion: reduce`**: `useReducedMotion` seleciona o ramo `reduced`, que só anima `opacity` em 0,12s: sem deslocamento e sem blur. O CSS global também zera `scroll-behavior` suave e reduz animações e transições a 0,01ms.
- O popover de ferramentas do Header usa `@keyframes rise-in` (160ms), só sob `motion-safe`.
- Só `transform`, `opacity` e `filter`; nada que cause reflow.

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
