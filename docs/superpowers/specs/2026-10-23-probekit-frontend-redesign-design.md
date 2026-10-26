# Probekit — redesign visual do frontend (etapa 1)

## Contexto

Ver `OVERVIEW.md` (propósito e decisões do produto) e `AGENTS.md` (divisão de papéis). O frontend atual (`frontend/`) funciona: Home, Ping, DNS Lookup, Sobre e NotFound, com testes e deploy no ar. O problema é a **aparência**. O criador descreve o site como "cara de IA, não é bonito". Este spec cobre só o redesign visual do que já existe; Artigos, Linha do tempo e Arquitetura são specs próprios, depois.

Responsável pela implementação: assistente (frontend), conforme `AGENTS.md`.

## Intenção

O Probekit **não é um site que vende ferramentas**. É um **laboratório pessoal que funciona de verdade**: as ferramentas existem e rodam, mas são o resultado de um estudo, feitas pelo criador para si e abertas a quem quiser olhar. Quem entra deve perceber, em poucos segundos, que está vendo a bancada de uma pessoa, com opinião e autoria, e não a vitrine de uma empresa.

O visual precisa carregar isso. As referências são **Medium** (o texto é o protagonista, tipografia editorial) e **Cursor** (interface sóbria e funcional, sem enfeite).

## Diagnóstico do que existe hoje

- A fonte do site inteiro é JetBrains Mono, inclusive texto corrido (`frontend/src/index.css`, `--font-sans`). Cansa para ler e dá cara de template "dev tool".
- Fundo azul-marinho com brilhos em gradiente radial; cards com gradiente, sombra e hover que "levanta".
- A Home segue o padrão de template: hero centralizado com traços ao lado do eyebrow, segunda linha do título pintada de azul, selos "Sem cadastro / Código aberto", três cards iguais, três passos numerados em colunas, eyebrows no formato `// TÍTULO`.
- `frontend/design.md` contradiz o código (manda Inter, sem gradiente e sem sombra) e contradiz a si mesmo (botão de 8px e, no exemplo, pílula).

## Objetivos

- A primeira impressão é "laboratório pessoal", não "produto".
- Leitura confortável de texto longo (os artigos virão depois e precisam de uma base que sirva).
- Identidade própria, que não pareça saída padrão de gerador.
- Tema claro e tema escuro de verdade, ambos com a mesma tipografia e o mesmo clima.
- Componentes reutilizáveis (shadcn/ui reestilizado), sem espalhar estilo avulso pelas páginas.
- Animação suave e discreta (ver "Movimento").

## Fora de escopo

- Artigos, Linha do tempo e Arquitetura: páginas, rotas e **itens de menu**. O menu mostra só o que existe hoje.
- Qualquer mudança de comportamento em Ping e DNS Lookup, no cliente da API ou nos contratos.
- Backend, infraestrutura e workflows.
- Internacionalização. O site continua em português.

## Anti-objetivos (seria falha, mesmo que "funcione")

- Parecer template: cards iguais em grade, gradientes, sombras, brilhos, hover que levanta, glassmorphism.
- Ícones decorativos. Ícone só quando comunica algo que o texto não comunica.
- Tom de vitrine: promessas ("Menos dúvidas. Mais diagnóstico."), selos de confiança, chamadas de venda.
- Dado inventado apresentado como real (regra do `OVERVIEW.md`: simulação só em desenvolvimento).
- Animação que chama atenção para si, ou que ignora `prefers-reduced-motion`.
- Tema escuro que seja só o claro invertido.

## Direção visual (decidida com o criador)

Escolhida entre três mockups: **"Híbrido"**. A página é clara e editorial; as ferramentas aparecem numa **bancada** escura, como um painel de terminal dentro do caderno.

- **Voz:** primeira pessoa, de caderno de laboratório. Exemplo do tom aprovado: "Um laboratório feito para mim, aberto para quem quiser olhar." O texto final é do criador; o assistente propõe e o criador ajusta.
- **Tipografia:** serifa nos títulos e no texto corrido, sans na interface, monoespaçada só para código, saída de comandos e dados. Os mockups usaram Newsreader, Inter e JetBrains Mono (escolha do assistente; a família serifa pode ser trocada se o builder achar melhor, mantendo o caráter editorial).
- **Estrutura da Home:** título e introdução em prosa; a bancada com as ferramentas; a seção "como os diagnósticos são executados" reescrita em prosa, sem as três colunas numeradas. Listas e linhas finas no lugar de grades de cards.
- **Tema:** o botão claro/escuro continua. O escuro é desenhado por si (mesma tipografia e mesmo clima de caderno, à noite), não gerado por inversão. A bancada é escura nos dois temas.

## Movimento

Referência do criador: o que o **Airbnb** faz. São transições suaves e polidas, como **blur na entrada**, fade, deslocamento curto e transições de rota fluidas. Não é uma quantidade grande de elementos se mexendo.

- Entradas: fade + blur leve + deslocamento curto, com escalonamento entre itens. Saídas e troca de rota na mesma linguagem.
- Interações (hover, foco, clique, troca de tema): resposta rápida e contida.
- Só propriedades baratas (transform, opacity, filter). Nada que cause reflow.
- `prefers-reduced-motion` desliga o deslocamento e o blur e mantém no máximo um fade curto.
- Motion já é a biblioteca do projeto; segue sendo.

## Restrições

- Mantém a stack: React 19, Vite, Tailwind v4, shadcn/ui, Motion, React Router.
- Mantém os 37 testes passando, ajustando os que dependem de texto ou marcação que mudar; comportamento testado não muda.
- `frontend/design.md` é reescrito para refletir esta direção e passa a ser a fonte da verdade do visual; código e documento não podem divergir de novo.
- Acessibilidade: contraste suficiente nos dois temas, foco visível, navegação por teclado.
- O repositório é público: nada de segredo, IP ou nome de recurso interno nos textos do site.
- Fontes carregadas de um jeito que não piore o desempenho nem cause salto visível de layout.
- **Fatos pessoais no texto (decidido com o criador):** só o link do GitHub, e informações que vêm do próprio git quando necessário. Sem nome, foto ou contato por enquanto, e isso não é prioridade. A página Sobre se apoia no `OVERVIEW.md` e no propósito do lab.
- A Home não chama a API sozinha ao carregar (o rate limit é compartilhado, 50 requisições por IP em 5 minutos).

## Decisões do assistente (o criador confere)

- **Referência visual:** o mockup aprovado está em [`assets/2026-10-23-redesign-home-direcoes.html`](./assets/2026-10-23-redesign-home-direcoes.html) (opção C, "Híbrido"). É referência de tom, tipografia e proporção, não um layout para portar linha a linha.
- **Bancada como componente compartilhado:** um único componente `Bench` (painel escuro nos dois temas), usado na Home e como área de resultado nas páginas de Ping e DNS Lookup. O formulário dessas páginas fica editorial (claro no tema claro); só a saída do comando vai para a bancada.
- **Painel de bancada na Home:** um painel com um exemplo de `ping`, **rotulado como exemplo**, com link para a ferramenta de verdade. Os valores de exemplo podem ser inventados desde que sejam claramente exemplo e usem endereços reservados para documentação (`example.com`, `192.0.2.x`). Não faz chamada automática. As duas ferramentas aparecem numa lista abaixo do painel, sem `ToolCard`.
- **Testes:** "os 37 testes passam" significa que não há regressão de comportamento. Ajustar asserções que dependem de texto ou marcação que mudou é esperado e permitido, inclusive de novo quando o criador revisar o texto.
- **Fontes:** hospedadas no próprio site (por exemplo `@fontsource`), com `font-display: swap` e fallback com métricas ajustadas para evitar salto de layout, no lugar do link do Google Fonts.
- **Tema inicial:** segue a preferência do sistema; o botão sobrepõe e a escolha é lembrada. Sem piscar o tema errado ao carregar.
- **Paleta:** neutros quentes (papel e tinta no claro, marrom-escuro no escuro) e **uma** cor de destaque discreta. O azul-marinho com azul claro sai. Os valores exatos ficam com o builder, dentro destas restrições.

## O que fica para o builder

- Valores finais de cor, escala tipográfica e espaçamento.
- Como organizar os tokens no Tailwind v4 e no tema do shadcn.
- A ordem de execução, incluindo a quebra em tasks e PRs.
- O desenho final de Ping, DNS Lookup, Sobre, NotFound, Header e Footer, seguindo a direção acima.
- O texto final das páginas, como proposta para o criador revisar.

## Critérios de aceite (verificáveis)

- `npm run build`, `npm run lint`, `npm run test` e `npm run format:check` passam em `frontend/`.
- Nenhuma ocorrência de `linear-gradient`, `radial-gradient` ou `box-shadow` nos estilos de superfície, e nenhum hover com `translateY` em cards (`grep` em `frontend/src`).
- O texto corrido não usa fonte monoespaçada.
- Nos dois temas, o contraste de texto e controles atinge WCAG AA, conferido com o Lighthouse ou o axe.
- Com `prefers-reduced-motion: reduce`, não há deslocamento nem blur nas entradas.
- Home, Ping, DNS Lookup, Sobre e NotFound, nos dois temas, em 375 px e 1280 px, conferidos em captura de tela com o criador.
- `frontend/design.md` descreve o que o código faz.
