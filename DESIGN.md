---
name: Probekit
description: Caderno de laboratório na web, com a saída das ferramentas numa bancada escura.
colors:
  paper: "#faf8f4"
  ink: "#1d1b17"
  card-paper: "#f4f0e8"
  muted-paper: "#efeae0"
  muted-ink: "#5e584d"
  rule-line: "#e2dccf"
  field-line: "#958c7c"
  marker-amber: "#8a5410"
  error-red: "#a8321f"
  error-surface: "#f8e9e4"
  success-green: "#2f6a3c"
  night-paper: "#1c1915"
  night-ink: "#ece6da"
  night-card: "#24201a"
  night-muted: "#28231d"
  night-muted-ink: "#a8a092"
  night-rule-line: "#38322a"
  night-field-line: "#6f675a"
  night-marker-amber: "#e2a85e"
  night-error-red: "#ef8a78"
  night-error-surface: "#3a1d17"
  night-success-green: "#9cc596"
  bench: "#100e0b"
  bench-ink: "#ece8e1"
  bench-muted: "#9b9486"
  bench-line: "#3a342b"
  bench-ok: "#8fb98a"
  bench-amber: "#e2a85e"
typography:
  display:
    fontFamily: "Newsreader Variable, Newsreader Fallback, Georgia, serif"
    fontSize: "4rem"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Newsreader Variable, Newsreader Fallback, Georgia, serif"
    fontSize: "2.5rem"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Newsreader Variable, Newsreader Fallback, Georgia, serif"
    fontSize: "1.375rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Newsreader Variable, Newsreader Fallback, Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  ui:
    fontFamily: "Inter Variable, Inter Fallback, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter Variable, Inter Fallback, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: "0.12em"
  data:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono Fallback, ui-monospace, monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "tabular-nums slashed-zero"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    height: "36px"
  card:
    backgroundColor: "{colors.card-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  badge:
    backgroundColor: "{colors.muted-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  bench:
    backgroundColor: "{colors.bench}"
    textColor: "{colors.bench-ink}"
    typography: "{typography.data}"
    rounded: "{rounded.md}"
---

# Design System: Probekit

## Overview

**Creative North Star: "O Caderno de Laboratório"**

A página é um caderno: papel quente, tinta escura, texto corrido em serifa, a voz do criador em primeira pessoa. As ferramentas não saem do caderno; elas escrevem nele. O resultado de um ping ou de uma consulta DNS aparece numa **bancada**, um painel escuro de terminal encaixado na página, e só ele. Formulários, títulos e explicações ficam no papel.

O sistema é plano e quieto. A hierarquia vem de tom (cartão sobre papel) e de linha fina, nunca de sombra, gradiente ou movimento que chame atenção. Existe uma única cor de destaque, o âmbar de marca-texto, usado para foco, seleção e o que importa no momento. O tema escuro é o mesmo caderno à noite: marrom-escuro quente, desenhado à parte, não o claro invertido.

O projeto é de um criador aprendendo e construindo, sem tom de vitrine. O texto diz o que a coisa faz e de onde parte o teste, sem prometer.

**Key Characteristics:**
- Papel e tinta; serifa para ler, sans para operar, mono só para dados.
- Uma voz de destaque (âmbar), mais erro e sucesso funcionais.
- Plano: sem sombra, sem gradiente, sem hover que levanta.
- A bancada escura isola a saída das ferramentas nos dois temas.
- Movimento curto, só `transform`, `opacity` e `filter`, e sempre com versão `prefers-reduced-motion`.

## Colors

Papel quente e tinta marrom-escura, com um único âmbar. Os nomes `night-*` valem para `:root[data-theme="dark"]`; os demais, para o tema claro. Os valores vêm de `frontend/src/index.css`.

### Primary
- **Tinta** (`ink` #1d1b17 / `night-ink` #ece6da): texto principal e fundo do botão principal (o texto do botão é o papel).

### Secondary
- **Âmbar de Marca-texto** (`marker-amber` #8a5410 / `night-marker-amber` #e2a85e): a única cor de destaque. Anel de foco (`--ring`), seleção de texto (24% de mistura), setas e pulso dos diagramas. Contraste sobre o papel: 5,90 no claro, 8,34 no escuro.

### Neutral
- **Papel** (`paper` #faf8f4 / `night-paper` #1c1915): fundo da página e do popover.
- **Papel de Cartão** (`card-paper` #f4f0e8 / `night-card` #24201a): superfície de `Card` e do botão secundário.
- **Papel Apagado** (`muted-paper` #efeae0 / `night-muted` #28231d): fundo discreto e hover de itens.
- **Tinta Apagada** (`muted-ink` #5e584d / `night-muted-ink` #a8a092): texto secundário, 6,65 no claro e 6,76 no escuro sobre o papel.
- **Linha de Caderno** (`rule-line` #e2dccf / `night-rule-line` #38322a): separadores e bordas decorativas, de propósito só uma linha (1,29 de contraste); nunca a única indicação de um controle.
- **Linha de Campo** (`field-line` #958c7c / `night-field-line` #6f675a): borda de campos, 3:1 sobre o fundo.

### Funcional
- **Vermelho de Erro** (`error-red` #a8321f / `night-error-red` #ef8a78) sobre **Superfície de Erro** (`error-surface` #f8e9e4 / `night-error-surface` #3a1d17): bloco de erro com borda e texto `destructive`.
- **Verde de Sucesso** (`success-green` #2f6a3c / `night-success-green` #9cc596): sucesso.

### Bancada
Escura nos dois temas; os valores não mudam com `data-theme`.
- **Fundo da Bancada** (`bench` #100e0b), **Tinta da Bancada** (`bench-ink` #ece8e1), **Apagado** (`bench-muted` #9b9486), **Linha** (`bench-line` #3a342b), **Ok** (`bench-ok` #8fb98a) e **Âmbar** (`bench-amber` #e2a85e).

### Named Rules
**A Regra da Voz Única.** Há uma só cor de destaque, o âmbar. Vermelho e verde existem apenas para erro e sucesso, nunca como segunda cor de marca.

**A Regra do Escuro Desenhado.** O tema escuro não é o claro invertido: marrom quente, âmbar mais claro para manter o contraste, vermelho e verde reclareados. Todo par de texto precisa de 4,5:1 (AA) nos dois temas.

## Typography

**Display / Body Font:** Newsreader Variable (fallback Georgia, serif)
**UI Font:** Inter Variable (fallback ui-sans-serif, system-ui)
**Mono Font:** JetBrains Mono Variable (fallback ui-monospace)

**Character:** Serifa editorial para ler e sans neutra para operar, como um caderno com anotações a lápis. Três famílias hospedadas no próprio site, cada uma com um `@font-face` de fallback de métricas ajustadas, para a troca de fonte não empurrar o layout.

### Hierarchy
- **Display** (500, 4rem, 1.05): título do herói da Home.
- **Headline** (500, 2.5rem, 1.15; `heading-lg` 3.25rem para o topo de página): títulos de página. Letter-spacing -0.015em e `text-wrap: balance`.
- **Title** (500, 1.375rem, 1.35; `heading-sm` 1.625rem): subtítulos e títulos de seção.
- **Body** (400, 1.0625rem, 1.65; `body-lg` 1.25rem, `body-sm` 0.9375rem): texto corrido, com `text-wrap: pretty`. Blocos de prosa em torno de 38rem.
- **UI** (Inter, 0.9375rem): `button`, `input`, `select`, `textarea`, `label`, `nav`.
- **Label / eyebrow** (Inter 500, 11px, caixa-alta, 0.12em): só título curto de grupo no Header e no Footer, em texto normal.
- **Data** (JetBrains Mono, algarismos tabulares e zero cortado, sem ligaduras): `pre`, `code`, a saída na bancada e dados.

### Named Rules
**A Regra da Serifa de Leitura.** Texto corrido nunca é monoespaçado. Mono é só para código e dados.

**A Regra do Eyebrow Limpo.** Eyebrow é texto normal em caixa-alta. Nunca no formato `// TÍTULO`.

## Layout

Coluna única de leitura. O `Layout` limita o conteúdo a 1200px com `px-4` (16px) e `sm:px-8` (32px); prosa fica em torno de 38rem e as saídas da bancada em 44rem. Espaçamento na escala padrão do Tailwind (múltiplos de 4px). Sem grade de cards iguais: listas e linhas finas no lugar.

Cabeçalho fixo de 80px (112px abaixo de 640px); a âncora `#ferramentas` usa isso em `scroll-margin-top`. O corpo tem `min-width: 320px` e os layouts foram desenhados para 375px e 1280px. A coruja ASCII aparece só a partir de `lg` (1024px); abaixo disso o herói volta a uma coluna.

## Elevation & Depth

Nenhuma sombra. A profundidade vem de tom (`card` sobre `paper`, a bancada escura sobre o papel) e de borda fina de 1px. O fundo do diálogo de busca é um véu liso (`bench/60`), sem desfoque.

### Named Rules
**A Regra do Plano.** Sem sombra, gradiente, brilho, glassmorphism nem hover que levanta (`translate-y`, `scale` no hover). Hover só troca cor.

## Shapes

Cantos discretos a partir de `--radius` 0.5rem: `sm` 4px, `md` 6px, `lg` 8px, `xl` 12px. Botão, badge e bancada usam `md`; cartão usa `lg`. Badge não é pílula. Bordas de 1px em `rule-line`; controles de formulário usam `field-line`, que precisa ser visível.

## Components

Todos planos; a hierarquia vem de tom e de borda fina.

### Buttons
- **Shape:** cantos `md` (6px).
- **Primary:** fundo `ink`, texto `paper`; 36px de altura por padrão, formulários usam `min-h-11`.
- **Outline / Ghost / Link:** borda `rule-line`, só texto, ou sublinhado.
- **Hover / Focus / Tap:** hover só troca cor (180ms, sob `motion-safe`); toque com `whileTap` em escala 0,98; foco com anel de 2px em `marker-amber` e 2px de recuo.

### Cards / Containers
- **Corner Style:** `lg` (8px).
- **Background:** `card-paper`, borda `rule-line`.
- **Shadow Strategy:** nenhuma; sem elevação e sem hover.

### Badge
- `md` (não é pílula), 12px; variantes `default`, `secondary`, `outline` e `destructive` (superfície e borda de erro).

### Bancada (Bench)
O componente de assinatura. Painel escuro nos dois temas, `md`, borda `bench-line`. O cabeçalho em mono traz o rótulo em caixa-alta à esquerda e, à direita, "exemplo" (quando a saída é exemplo) e a meta (por exemplo, a região de origem). O corpo é um `role="group"` focável (`tabIndex=0`, `aria-label` "rótulo, conteúdo") que rola na horizontal, com contorno `bench-amber` por dentro. Usada nos resultados de Ping e DNS Lookup. Só a saída do comando vai para a bancada; formulários ficam no papel.

### Estados
- **Erro:** bloco com borda e texto `error-red` sobre `error-surface`, `role="alert"`.
- **Carregamento:** `<p role="status">` dentro de um contêiner `aria-live="polite"` sempre montado.
- **Foco global:** `:focus-visible` com contorno de 2px em `marker-amber` e 4px de recuo.
- **Troca de tema:** View Transition API; o retrato do tema antigo some e o do novo aparece, com desfoque de 6px (`opacity` e `filter`, 400ms, `ease`). Com `prefers-reduced-motion`, só `opacity` em 0,12s. Sem suporte do navegador, a troca é direta. Nenhuma máscara nem `clip-path`, para ficar dentro da regra de movimento.

### Diagrama
Figura com legenda, resumo, svg largo e lista ordenada de passos. Abaixo de 640px a lista de passos é o diagrama (cartões empilhados ligados por seta); acima, a lista fica só para leitores de tela. O movimento é CSS, ligado por `[data-motion="on"]`, e desligado com `prefers-reduced-motion`. Usa só tokens existentes: bloco `card` com borda `rule-line`, zonas tracejadas e ligações em `field-line`, fluxo e setas em `marker-amber`.

### Coruja ASCII
Elemento de identidade escolhido pelo criador e exceção deliberada à regra de "sem elementos decorativos". Arte em `src/assets/coruja-ascii.txt`, em `muted-ink` e mono, decorativa (`aria-hidden`), só de `lg` para cima. Desenha-se de cima para baixo e depois cintila; olhos e bico nunca são tocados pela cintilação. Com `prefers-reduced-motion` aparece completa e parada.

## Do's and Don'ts

### Do:
- **Do** usar `marker-amber` como única cor de destaque, para foco, seleção e o que importa agora.
- **Do** manter a saída das ferramentas na bancada escura e o resto no papel.
- **Do** desenhar o tema escuro à parte e medir o contraste (4,5:1 para texto, 3:1 para borda de campo e foco).
- **Do** animar só `transform`, `opacity` e `filter`, com um ramo `reduced` que só anima `opacity` em 0,12s.
- **Do** rotular exemplo como exemplo e usar endereços reservados (`example.com`, `192.0.2.x`).
- **Do** dar foco visível a todo controle.

### Don't:
- **Don't** usar gradiente, sombra, brilho, glassmorphism nem hover que levanta.
- **Don't** usar ícone decorativo; ícone só quando diz algo que o texto não diz.
- **Don't** montar grade de cards iguais nem seção de três colunas numeradas (desenho de template).
- **Don't** adotar tom de vitrine: promessas, selos de confiança, chamadas de venda.
- **Don't** escrever eyebrow no formato `// TÍTULO`.
- **Don't** usar fonte monoespaçada em texto corrido.
- **Don't** apresentar dado inventado como real.
- **Don't** criar uma segunda cor de destaque; vermelho e verde são só erro e sucesso.
- **Don't** usar animação que chame atenção para si ou que ignore `prefers-reduced-motion`.
