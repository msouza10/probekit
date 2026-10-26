---
name: Probekit
description: Caderno de laboratório na web, com o resultado das ferramentas no próprio papel e o JSON bruto numa bancada escura sob demanda.
colors:
  paper: "#fafafa"
  ink: "#171717"
  card-paper: "#f3f3f3"
  muted-paper: "#ebebeb"
  muted-ink: "#595959"
  rule-line: "#dcdcdc"
  field-line: "#8a8a8a"
  marker-gray: "#404040"
  error-ink: "#000000"
  error-surface: "#e6e6e6"
  success-gray: "#3d3d3d"
  night-paper: "#121212"
  night-ink: "#ededed"
  night-card: "#1b1b1b"
  night-muted: "#242424"
  night-muted-ink: "#a3a3a3"
  night-rule-line: "#333333"
  night-field-line: "#6e6e6e"
  night-marker-gray: "#d4d4d4"
  night-error-ink: "#ffffff"
  night-error-surface: "#2e2e2e"
  night-success-gray: "#d0d0d0"
  stat-commit: "#0969da"
  stat-pr: "#8250df"
  stat-issue: "#1a7f37"
  stat-deploy: "#1a7f37"
  night-stat-commit: "#58a6ff"
  night-stat-pr: "#bc8cff"
  night-stat-issue: "#3fb950"
  night-stat-deploy: "#3fb950"
  status-up: "#1a7f37"
  status-down: "#cf222e"
  night-status-up: "#3fb950"
  night-status-down: "#ff7b72"
  cloud-cloudflare: "#d9680b"
  cloud-oracle: "#c74634"
  night-cloud-cloudflare: "#f6821f"
  night-cloud-oracle: "#e8634f"
  bench: "#0a0a0a"
  bench-ink: "#ededed"
  bench-muted: "#9a9a9a"
  bench-line: "#2e2e2e"
  bench-ok: "#b8b8b8"
  bench-bright: "#ffffff"
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

A página é um caderno: papel branco, tinta preta, texto corrido em serifa, a voz do criador em primeira pessoa. As ferramentas não saem do caderno; elas escrevem nele. O resultado de um ping ou de uma consulta DNS também fica no papel: um veredicto em uma frase, com um ícone de estado, e os números logo abaixo. A **bancada**, um painel escuro de terminal encaixado na página, é reservada ao JSON bruto, e só aparece quando a pessoa pede.

O sistema é plano e quieto. A hierarquia vem de tom (cartão sobre papel) e de linha fina, nunca de sombra, gradiente ou movimento que chame atenção. O site é monocromático: só preto, cinzas e branco, sem matiz. O destaque (foco, seleção, o que importa no momento) é um degrau de cinza, não uma cor. O tema escuro é o mesmo caderno à noite: preto suave, desenhado à parte, não o claro invertido.

O projeto é de um criador aprendendo e construindo, sem tom de vitrine. O texto diz o que a coisa faz e de onde parte o teste, sem prometer.

**Key Characteristics:**
- Papel e tinta; serifa para ler, sans para operar, mono só para dados.
- Monocromático: preto, cinzas e branco; destaque, erro e sucesso são degraus de cinza, e o sentido vem do texto.
- Plano: sem sombra, sem gradiente, sem hover que levanta.
- O resultado das ferramentas fica no papel; a bancada escura (nos dois temas) mostra só o JSON bruto, sob demanda.
- Movimento curto, só `transform`, `opacity` e `filter`, e sempre com versão `prefers-reduced-motion`.

## Colors

Papel branco e tinta preta, em cinzas puros (R = G = B em todo valor). Os nomes `night-*` valem para `:root[data-theme="dark"]`; os demais, para o tema claro. Os valores vêm de `frontend/src/index.css`.

### Primary
- **Tinta** (`ink` #171717 / `night-ink` #ededed): texto principal e fundo do botão principal (o texto do botão é o papel).

### Secondary
- **Cinza de Destaque** (`marker-gray` #404040 / `night-marker-gray` #d4d4d4): o destaque, que agora é um tom e não uma cor. Anel de foco (`--ring`), seleção de texto (24% de mistura), sublinhados, setas e pulso dos diagramas. Contraste sobre o papel: 9,93 no claro, 12,64 no escuro.

### Neutral
- **Papel** (`paper` #fafafa / `night-paper` #121212): fundo da página e do popover.
- **Papel de Cartão** (`card-paper` #f3f3f3 / `night-card` #1b1b1b): superfície de `Card` e do botão secundário.
- **Papel Apagado** (`muted-paper` #ebebeb / `night-muted` #242424): fundo discreto e hover de itens.
- **Tinta Apagada** (`muted-ink` #595959 / `night-muted-ink` #a3a3a3): texto secundário, 6,71 no claro e 7,43 no escuro sobre o papel.
- **Linha de Caderno** (`rule-line` #dcdcdc / `night-rule-line` #333333): separadores e bordas decorativas, de propósito só uma linha (baixo contraste); nunca a única indicação de um controle.
- **Linha de Campo** (`field-line` #8a8a8a / `night-field-line` #6e6e6e): borda de campos, 3:1 sobre o fundo.

### Funcional
- **Tinta de Erro** (`error-ink` #000000 / `night-error-ink` #ffffff) sobre **Superfície de Erro** (`error-surface` #e6e6e6 / `night-error-surface` #2e2e2e): bloco de erro com borda e texto `destructive`. O extremo do cinza (preto no claro, branco no escuro) marca o erro; a mensagem escrita é quem diz o que houve.
- **Cinza de Sucesso** (`success-gray` #3d3d3d / `night-success-gray` #d0d0d0): sucesso.

### Exceção: ícones e zonas de provedor coloridos
Únicas cores fora da escala de cinza. Ícones (nunca texto, fundo ou borda de componente) e, nos diagramas, a borda da zona de cada provedor. Três grupos:

**Atividade do repositório.** Os indicadores usam as cores do GitHub, para commit, PR, issue e deploy concluído se reconhecerem de relance. Aparecem na linha do herói (`RepoPulse`) e nos números do rodapé (`RepoStats`).
- **Commit** (`stat-commit` #0969da / `night-stat-commit` #58a6ff), **PR** (`stat-pr` #8250df / `night-stat-pr` #bc8cff), **Issue** (`stat-issue` #1a7f37 / `night-stat-issue` #3fb950) e **Deploy** (`stat-deploy`, o mesmo verde da issue).
- Contraste sobre o papel: de 4,83 a 4,97 no claro e de 7,37 a 7,43 no escuro (mínimo de 3:1 para ícone).
- Os ícones são decorativos (`aria-hidden`); o sentido continua escrito no texto ao lado.

**Provedores nos diagramas** (`cloud-*`). Cada provedor tem a cor da marca na borda da zona tracejada, na bolinha do rótulo, nas ligações e setas que apontam para ele e no ponto animado enquanto ele atravessa a zona: **Cloudflare** (`cloud-cloudflare` #d9680b / `night-cloud-cloudflare` #f6821f, laranja) e **Oracle Cloud** (`cloud-oracle` #c74634 / `night-cloud-oracle` #e8634f, vermelho). O texto e os blocos continuam em cinza, e o nome do provedor está sempre escrito no rótulo. Ligação e seta que não entram em nenhuma cloud (por exemplo, a que vai do código ao `apply` no diagrama de infraestrutura) ficam em cinza. Contraste sobre o papel: 3,39 e 4,62 no claro, 7,25 e 5,65 no escuro (mínimo de 3:1 para elementos gráficos). O laranja claro da Cloudflare foi escurecido em relação ao da marca (#f6821f, 2,47 no claro) para passar de 3:1. Zonas de papel (Frontend, Backend) não usam cor.

**Estado do resultado** (`ResultStatus`). O ícone do veredicto de uma ferramenta: **respondeu** (`status-up` #1a7f37 / `night-status-up` #3fb950, `CircleCheck`), **não respondeu, por conta do destino** (`status-down` #cf222e / `night-status-down` #ff7b72, `CircleX`) e **falha nossa ou do pedido** (cinza `muted-ink`, `CircleAlert`). Vermelho quer dizer "o destino está fora"; endereço recusado, API fora do ar e limite de uso são cinza, porque o problema não é do destino. O sentido está sempre na frase do veredicto. Contraste sobre o papel: 4,87 (verde) e 5,13 (vermelho) no claro, 7,37 e 7,43 no escuro.

### Bancada
Escura nos dois temas; os valores não mudam com `data-theme`.
- **Fundo da Bancada** (`bench` #0a0a0a), **Tinta da Bancada** (`bench-ink` #ededed), **Apagado** (`bench-muted` #9a9a9a), **Linha** (`bench-line` #2e2e2e), **Ok** (`bench-ok` #b8b8b8) e **Brilho** (`bench-bright` #ffffff, o realce dentro da bancada).

### Named Rules
**A Regra do Cinza Puro.** Nenhum valor de cor tem matiz: R, G e B são iguais. As únicas exceções são os ícones de atividade do repositório (`stat-*`), os de estado do resultado (`status-*`) e a zona de provedor, com suas ligações, setas e pontos, nos diagramas (`cloud-*`), descritos acima. Nada de marrom, bege ou cinza "quente" ou "frio". Destaque, erro e sucesso se distinguem por degrau de cinza e por texto, nunca só por cor. Cor nova só entra em ícone (de atividade do repositório ou de estado do resultado) ou, num diagrama, na zona de provedor e no que a liga (borda, ligação, seta, ponto), nunca em texto, fundo de bloco ou borda de componente.

**A Regra do Escuro Desenhado.** O tema escuro não é o claro invertido: preto suave (#121212, não #000) e cinzas reclareados para manter o contraste. Todo par de texto precisa de 4,5:1 (AA) nos dois temas.

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
- **Data** (JetBrains Mono, algarismos tabulares e zero cortado, sem ligaduras): `pre`, `code`, o JSON na bancada, os valores dos resultados e dados.

### Named Rules
**A Regra da Serifa de Leitura.** Texto corrido nunca é monoespaçado. Mono é só para código e dados.

**A Regra do Eyebrow Limpo.** Eyebrow é texto normal em caixa-alta. Nunca no formato `// TÍTULO`.

## Layout

Coluna única de leitura. O `Layout` limita o conteúdo a 1200px com `px-4` (16px) e `sm:px-8` (32px); prosa fica em torno de 38rem e os formulários e resultados das ferramentas em 44rem. Espaçamento na escala padrão do Tailwind (múltiplos de 4px). Sem grade de cards iguais: listas e linhas finas no lugar.

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
- **Hover / Focus / Tap:** hover só troca cor (180ms, sob `motion-safe`); toque com `whileTap` em escala 0,98; foco com anel de 2px em `marker-gray` e 2px de recuo.

### Cards / Containers
- **Corner Style:** `lg` (8px).
- **Background:** `card-paper`, borda `rule-line`.
- **Shadow Strategy:** nenhuma; sem elevação e sem hover.

### Badge
- `md` (não é pílula), 12px; variantes `default`, `secondary`, `outline` e `destructive` (superfície e borda de erro).

### Bancada (Bench)
Painel escuro nos dois temas, `md`, borda `bench-line`. O cabeçalho em mono traz o rótulo em caixa-alta à esquerda e, à direita, a meta. O corpo é um `role="group"` focável (`tabIndex=0`, `aria-label` "rótulo, conteúdo") que rola na horizontal, com contorno `bench-bright` por dentro. Hoje só mostra o JSON bruto de uma resposta, dentro do `JsonDisclosure`; o resultado em si não vai para a bancada.

### Página de ferramenta (padrão)
Toda ferramenta (Ping, DNS Lookup e as futuras) segue o mesmo esqueleto, montado com os componentes de `components/tool/`. Ordem, de cima para baixo:
1. **`ToolPage`**: o `<main>`, o `h1` com o nome da ferramenta, o selo de origem na mesma linha dele, na ponta direita e uma frase que diz o que a ferramenta faz. Dono do ritmo vertical (`gap-8`, `sm:gap-10`, `pt-10`, `sm:pt-14`); a página não acrescenta margem própria.
2. **Formulário**: campo principal, atalhos e, se houver, opções avançadas recolhidas. Largura máxima 44rem.
3. **`OriginStrip`**: um selo (`Badge` secundário, com borda, cantos `md`) com o ícone de pino de localização (`MapPin`, decorativo) e o texto "Sonda: OCI · São Paulo". Entra no `meta` do `ToolPage`, na ponta direita da linha do título, alinhado à largura do formulário (44rem); em tela estreita quebra para a linha de baixo. Depois do primeiro resultado mostra a região que a API devolveu (`origin_region`).
4. **Notas** (só antes do primeiro resultado): no máximo duas frases curtas em `text-body-sm`, em tinta apagada, para o que a pessoa precisa saber antes de usar.
5. **Resultado** (`Reveal`, 44rem): `ResultStatus` (veredicto em uma frase, no `h2` em sans semibold, alinhado ao centro da primeira linha do ícone de estado), `ResultStats` (rótulo pequeno em sans e valor em mono, 2 colunas no celular e 4 no desktop, sem gráfico) e `JsonDisclosure`.
6. **Erro nosso ou do pedido**: o mesmo `ResultStatus`, em tom cinza, com a mensagem, o código e uma ação de nova tentativa.

**Variações do padrão.** O esqueleto é o mesmo; muda o corpo do resultado:
- **Ping**: números em `ResultStats` (4 colunas).
- **DNS Lookup**: grupos de registros em `RecordGroup` (A e AAAA, MX, NS, TXT e SRV quando houver), separados por linha fina, com título em sans e a contagem; valores em mono; tabelas para MX e SRV; grupo vazio diz "Nenhum registro X encontrado." (`EmptyRecords`). O veredicto traz o resumo do que existe ("2 endereços · 2 MX · 2 NS · 2 TXT").
- **Veredicto do Ping**: verde "está respondendo" (com a perda dita na frase quando parcial), vermelho "não respondeu" (nenhum pacote voltou) e vermelho "não foi encontrado" quando a API devolve `invalid_target` (o nome não resolve). `private_ip_not_allowed` e os demais erros são cinza.
- **Veredicto do DNS**: verde "está resolvendo" (há endereço), verde "tem registros, mas nenhum endereço" (só MX, TXT etc.), vermelho "não tem registros" e vermelho "não foi encontrado" quando a API devolve `domain_not_found`. Qualquer outro erro é cinza.

Regras do padrão: o veredicto vem primeiro e diz o que aconteceu com o destino; vermelho vale para qualquer "o destino não existe ou não responde", inclusive um erro da API que descreva isso (`domain_not_found` no DNS, `invalid_target` no Ping), mostrado com texto próprio em português e o código ao lado; número sem valor (por exemplo, latência de quem não respondeu) aparece como "—", nunca como "0"; o JSON bruto começa fechado, abre com a entrada padrão do site (opacidade, 14px de deslocamento e desfoque de 6px que some; só opacidade com movimento reduzido), fecha sem animação, e "Copiar JSON" funciona com ele fechado; nenhuma ferramenta inventa um quadro próprio para o resultado.

### Página informativa (padrão)
Sobre, Arquitetura e as páginas de texto futuras seguem um esqueleto, montado com os componentes de `components/page/`:
1. **`InfoPage`**: o `<main>`, o `h1` (máx. 20ch) e a abertura em `text-body-lg` apagado, com no máximo dois parágrafos. No desktop (lg), duas colunas: o conteúdo, flexível, e o sumário, de 13rem. Ritmo vertical `gap-12`, `sm:gap-16` e `pt-10`, `sm:pt-14`, sem margem própria da página.
2. **`InfoSection`**: uma coluna só. Linha fina em cima, o número opcional ("01", decorativo), o título `h2` e, logo abaixo dele, o conteúdo. O título nunca fica ao lado do texto. Cada seção tem `id` e `scroll-margin-top` igual à altura do cabeçalho mais 24px, para o link do sumário não esconder o título. Título longo aceita um nome curto no sumário (`tocTitle`).
3. **`PageToc`** ("Nesta página"): sumário montado sozinho a partir das `InfoSection` da página (atributo `data-toc`), sem lista repetida. No desktop fica na lateral direita, fixo ao rolar (`sticky`, abaixo do cabeçalho); em tela estreita vira um bloco recolhido (`details`) logo depois da abertura. O item da seção atual leva `aria-current="location"`, traço de 2px em `foreground` e peso 500; os outros ficam em tinta apagada. A seção atual é a última cujo topo passou da linha de leitura (160px do topo), e a última seção quando a página chega ao fim; antes da primeira, nenhuma. Alvo de toque de 44px com ponteiro grosso.
4. **`FactList`**: termo e detalhe com linha fina entre os itens, para stack e princípios.
5. **`SourceLinks`**: links do repositório no fim da seção, em sans, abrindo em outra aba; apontam para o arquivo exato (por exemplo, o ADR certo), não para a pasta inteira.

Regras: cada parágrafo só afirma o que está no repositório (código, workflows, ADRs ou Terraform) e é conferido contra ele quando o código muda; links internos usam `Link` do roteador e links externos só vão para o repositório do projeto; texto em primeira pessoa, sem prometer o que não existe. Página de texto com mais de uma seção usa o sumário; página de uma seção só, não.

### Estados
- **Erro de ferramenta** (falha nossa ou do pedido): `ResultStatus` em tom cinza (`role="alert"`), com a mensagem, o código em `code` e um botão de nova tentativa. Sem bloco com borda vermelha; `error-ink` e `error-surface` ficam para erros de formulário simples (por exemplo, o campo vazio do ping rápido).
- **Destino que não respondeu:** não é erro; é resultado, com `ResultStatus` em tom vermelho (`role="status"`).
- **Carregamento:** `<p role="status">` dentro de um contêiner `aria-live="polite"` sempre montado.
- **Foco global:** `:focus-visible` com contorno de 2px em `marker-gray` e 4px de recuo.
- **Troca de tema:** View Transition API; o retrato do tema antigo some e o do novo aparece, com desfoque de 6px (`opacity` e `filter`, 400ms, `ease`). Com `prefers-reduced-motion`, só `opacity` em 0,12s. Sem suporte do navegador, a troca é direta. Nenhuma máscara nem `clip-path`, para ficar dentro da regra de movimento.

### Diagrama
Figura com legenda, resumo, svg largo e lista ordenada de passos. Abaixo de 640px a lista de passos é o diagrama (cartões empilhados ligados por seta); acima, a lista fica só para leitores de tela. O movimento é CSS, ligado por `[data-motion="on"]`, e desligado com `prefers-reduced-motion`. Usa só tokens existentes: bloco `card` com borda `rule-line`, zonas tracejadas e ligações em `field-line`, e o caminho em destaque (e suas setas) em `marker-gray`. Tom: o texto de um diagrama é técnico e descreve só o que existe (componente, protocolo, porta, região), sem segunda pessoa nem analogia; a explicação para quem não é técnico fica nos parágrafos da seção, não no desenho. Fronteira do sistema: o cliente (o navegador) é o único ator externo e entra no diagrama como a origem, à esquerda, com fundo da página e traço de campo (`external`) em vez do cartão dos componentes; é dele que partem os ramos do sistema. Os ramos se agrupam por papel (Frontend, Backend) em zonas tracejadas. Todo componente diz onde roda: dentro do papel há zonas de localização aninhadas ("Cloudflare · borda", "Oracle Cloud · sa-saopaulo-1"), e o que roda no cliente (a interface web) fica fora de qualquer zona de provedor, com "roda no navegador" no subtítulo. A zona de um provedor leva a cor dele (`cloud-*`) na borda e numa bolinha ao lado do rótulo. Cor das ligações e setas: a da cloud para onde apontam; quando o destino é o cliente (Workers para a interface web), a da cloud de onde saem. Cor do ponto: muda a cada zona que atravessa (cinza fora de zona, laranja na Cloudflare, vermelho na Oracle) e acompanha o percurso na volta; os limites são calculados da geometria do caminho contra as zonas, não escritos à mão, então mudar o desenho exige recalcular. Papel sozinho nunca basta: um bloco solto dentro de Frontend ou Backend deixa a dúvida de onde ele está. Sentido das setas: aponta para onde o dado vai, e o ponto animado vai até o destino e volta, mostrando a resposta.

**Linhas (critério).** Cada estilo de linha diz uma coisa, e só essa:
- **Contínua, com seta:** ligação por onde passa tráfego ou uma ação (uma requisição, um passo do pipeline, o `apply`). Todas as ligações de um diagrama são do mesmo tipo, porque no sistema real são todas requisição e resposta; o que as diferencia é a cloud para onde apontam (cor) ou, no Pipeline, ser o caminho em destaque.
- **Tracejada e parada:** o que não é o fluxo principal. Três usos, e só eles: a fronteira de uma zona, um caminho excepcional (o rollback do Pipeline) e uma referência guardada (o estado remoto da Infraestrutura).
- **Tracejada em movimento:** não existe. O ponto animado já diz que há tráfego e em que sentido; animar também o traço repetiria a informação e, na mesma cor da linha, nem apareceria.
- **Movimento:** a ligação se desenha uma vez, na entrada, e depois fica parada. Quem anda é o ponto, e só ele.

Se uma ligação nova precisar de um estilo próprio, ela tem que representar uma diferença real do sistema (por exemplo, um canal assíncrono), e essa diferença entra aqui antes do estilo.

### Coruja ASCII
Elemento de identidade escolhido pelo criador e exceção deliberada à regra de "sem elementos decorativos". Arte em `src/assets/coruja-ascii.txt`, em `muted-ink` e mono, decorativa (`aria-hidden`), só de `lg` para cima. Desenha-se de cima para baixo e depois cintila; olhos e bico nunca são tocados pela cintilação. Com `prefers-reduced-motion` aparece completa e parada.

## Do's and Don'ts

### Do:
- **Do** usar `marker-gray` como único destaque (um tom de cinza), para foco, seleção e o que importa agora.
- **Do** manter o resultado das ferramentas no papel e usar a bancada escura só para o JSON bruto, sob demanda.
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
- **Don't** animar o traço de uma ligação depois de desenhada, nem usar tracejado para ligação de fluxo: tracejado é fronteira, caminho excepcional ou referência.
- **Don't** apresentar dado inventado como real.
- **Don't** criar uma segunda cor de destaque; vermelho e verde são só erro e sucesso.
- **Don't** usar animação que chame atenção para si ou que ignore `prefers-reduced-motion`.
