# Artigos em markdown — design

## Objetivo

Dar ao Probekit uma seção de artigos: o criador escreve em markdown, abre um pull request e o deploy publica. Cada artigo vira uma página própria, pré-renderizada (HTML pronto para buscadores), com sumário, código colorido, imagem de pré-visualização social e, quando precisar, diagramas no mesmo estilo da página `/arquitetura`.

O motivo: os artigos são o veículo de conteúdo do site (ver o [plano de SEO](../plans/2026-10-26-probekit-seo.md)) e o lugar onde o criador registra o que aprende, sem depender de nenhum serviço externo. É a spec "própria, depois" que as specs do [redesign](./2026-10-23-probekit-frontend-redesign-design.md) e da [página Arquitetura](./2026-10-25-probekit-pagina-arquitetura-design.md) deixaram para os artigos.

## O que entra

- Arquivos `frontend/content/artigos/<slug>.md`. O nome do arquivo (sem `.md`) é o slug da URL.
- Cabeçalho (front matter) com `title`, `description`, `date` (AAAA-MM-DD) e, opcional, `updated`. Sem tags, sem rascunho, sem RSS (decisão do criador em 2026-10-26: ficam para depois, se fizerem falta).
- Rotas `/artigos` (lista, do mais novo para o mais antigo) e `/artigos/<slug>`.
- Markdown comum (títulos, listas, tabelas, links, citações) mais:
  - **Código** com destaque de sintaxe feito no build, nos temas claro e escuro do site.
  - **Sumário** "Nesta página" montado dos títulos `##`, com o mesmo visual do `PageToc`.
  - **Diagrama por nome**: uma linha `::diagram{name="arquitetura"}` renderiza o componente registrado com esse nome.
- **Imagem OG por artigo** (1200×630), gerada no build com o título do artigo.
- A seção só existe com **pelo menos um artigo**: sem artigo não há rota `/artigos`, item de menu nem entrada no sitemap (o menu mostra só o que existe, como no [redesign](./2026-10-23-probekit-frontend-redesign-design.md)).
- Cada artigo entra sozinho no `siteMeta` (título, descrição, canonical, JSON-LD `BlogPosting`), no prerender, no sitemap e no cabeçalho do site ("Artigos").

## O que não entra (agora)

- Editor na web, login, banco, comentários, busca, tags, RSS, rascunhos, MDX, vários autores.
- Diagramas descritos dentro do `.md` (nós e ligações num bloco declarativo). Fica como epic futuro se o criador sentir falta; o registro por nome é o primeiro passo.
- Artigo de exemplo no site. Os testes usam arquivos próprios em `frontend/src/test/` e o primeiro artigo real é escrito pelo criador.

## Anti-objetivos

- Um artigo com erro (diagrama que não existe, data inválida, título vazio) **não pode** chegar à produção: o build falha, com a mensagem dizendo o arquivo e o problema.
- O markdown **não** pode virar HTML cru vindo do conteúdo sem passar pelo renderizador (sem `dangerouslySetInnerHTML` para o corpo do artigo).
- O JavaScript da Home e das ferramentas **não** carrega o texto dos artigos: só os metadados da lista vão no bundle principal.

## Como funciona

1. Um plugin do Vite lê cada `.md` no build, separa o front matter, converte o corpo em árvore (`unified`: `remark` → `rehype`), colorindo o código com `shiki` e transformando `::diagram` em um nó próprio. O módulo gerado exporta `meta` (front matter, tempo de leitura) e `tree` + `toc` (corpo e títulos).
2. Um catálogo (`src/lib/articles.ts`) reúne os `meta` com `import.meta.glob` (só o export `meta`) e oferece lista ordenada e busca por slug. A página de um artigo carrega o módulo daquele slug sob demanda (code splitting).
3. Um renderizador (`hast-util-to-jsx-runtime`) transforma a árvore em elementos React, com um mapa de componentes do site: título com âncora, link externo com `rel`, bloco de código, tabela e o nó de diagrama.
4. O mapa `articleDiagrams` (nome → componente) liga o nome do `.md` ao componente. Os três diagramas atuais (`arquitetura`, `pipeline`, `infraestrutura`) entram nele; diagramas novos são componentes novos, com a linguagem visual de `/arquitetura`.
5. As rotas dos artigos são derivadas do catálogo: `siteMeta` e o prerender param de depender de uma lista escrita à mão.

## Decisões de implementação (do assistente, a confirmar na revisão do plano)

- Processar no build com `unified`, sem MDX: o artigo continua markdown puro, e o criador não escreve JSX.
- `shiki` com dois temas (claro e escuro) pelo modo de variáveis CSS, para o código seguir o tema do site sem JavaScript.
- Imagem OG com `satori` + `@resvg/resvg-js`, usando as fontes que o site já tem (`@fontsource`), gravada em `dist/og/<slug>.png`.
- Lastmod do sitemap só para artigos (`updated` ou `date`); as páginas fixas ficam sem, porque o checkout raso do CI não permite datar com honestidade.

## Critérios de pronto

- Um `.md` novo vira página em `/artigos/<slug>` só com o arquivo e o PR, sem editar outro arquivo.
- `view-source` da página mostra o texto do artigo, o `<title>`, o canonical, o `og:image` próprio e o JSON-LD.
- Um nome de diagrama inexistente derruba o `npm run build` e `npm test`.
- Os testes e o design guard do frontend passam; o bundle principal não contém o texto de nenhum artigo.
