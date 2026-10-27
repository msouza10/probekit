# Runbook: escrever e publicar um artigo

Como escrever um artigo em markdown, ver como ficou, publicar e o que fazer quando o build recusa. O desenho está na [spec dos artigos](./superpowers/specs/2026-10-26-probekit-blog-artigos-design.md); o deploy do site, no [runbook de deploy](./runbook-deploy.md).

> Verificado no build local em 2026-10-26. Ainda **não** foi verificado em produção: depois do primeiro deploy com um artigo real, confira a seção 6 e registre a data aqui.

## 1. Escrever

Crie `frontend/content/artigos/<slug>.md`. O nome do arquivo, sem `.md`, é o endereço do artigo: `meu-artigo.md` vira `/artigos/meu-artigo`. O slug usa só letras minúsculas, números e hífens (`^[a-z0-9]+(-[a-z0-9]+)*$`).

O arquivo começa com um cabeçalho (front matter) em YAML:

```markdown
---
title: Como o ping mede a latência
description: O que o tempo de ida e volta diz sobre a rede.
date: 2026-10-26
updated: 2026-11-02
---

Texto do artigo, em markdown.

## Primeira seção

Mais texto.
```

| Campo | Regra |
|---|---|
| `title` | obrigatório, não vazio |
| `description` | obrigatória, até 160 caracteres (é o texto que os buscadores mostram) |
| `date` | obrigatória, `AAAA-MM-DD`, uma data que existe (com ou sem aspas) |
| `updated` | opcional, `AAAA-MM-DD`, não anterior a `date` |

No corpo:

- O `h1` da página é o `title`. Use títulos a partir de `##`; um `#` derruba o build.
- Os `##` formam o sumário "Nesta página". Títulos `###` e abaixo ficam fora do sumário.
- Funcionam listas, tabelas, citações, links, `código em linha` e blocos de código. Indique a linguagem depois dos três acentos graves (` ```go `) para o bloco ganhar cor; sem linguagem, ele aparece sem cor.
- **HTML cru é descartado.** `<script>`, `<img>` e semelhantes no `.md` não chegam à página, e um link cujo destino não seja `http`, `https`, `mailto`, um caminho ou uma âncora perde o destino.
- Imagens ainda não têm fluxo próprio (não há pasta de imagens de artigo). Evite por enquanto.

## 2. Diagramas

Uma linha sozinha, com uma linha em branco antes e depois, inclui um diagrama da página [`/arquitetura`](https://probekit.cc/arquitetura):

```markdown
::diagram{name="pipeline"}
```

| Nome | Diagrama |
|---|---|
| `arquitetura` | do cliente à API |
| `pipeline` | o caminho de uma mudança |
| `infraestrutura` | o que o Terraform cria |

Cada diagrama entra **uma vez por artigo** (os ids do SVG são fixos). Um nome que não está na tabela derruba o build.

Para um diagrama novo: um componente em `frontend/src/components/diagrams/`, na mesma linguagem visual de `/arquitetura` ([`DESIGN.md`](../DESIGN.md), seção Diagramas), mais uma linha em `diagramNames.ts` e outra em `articleDiagrams.tsx` (ambos em `frontend/src/components/article/`). O TypeScript recusa um nome sem componente.

## 3. Ver antes de publicar

```bash
cd frontend
npm run dev
```

Abra `http://localhost:5173/artigos/<slug>`.

> Depois de um `npm install`, ou de mudar o `vite.config.ts`, **reinicie** o `npm run dev`. Um servidor que já estava aberto passa a responder `504 (Outdated Optimize Dep)` e a página do artigo fica em branco.

Para ver o que o site vai servir de verdade (HTML pré-renderizado e imagem social):

```bash
npm run build
ls dist/artigos dist/og
grep -o '<title>[^<]*</title>' dist/artigos/<slug>.html
```

Esperado: `dist/artigos/<slug>.html` e `dist/og/<slug>.png` existem, e o título é `<título do artigo> · Probekit`.

## 4. Publicar

Mesmo fluxo de qualquer mudança no site ([`docs/README.md`](./README.md)): branch, commit (por exemplo `feat(frontend): artigo "<título>"`), pull request e merge. Como a mudança só toca `frontend/`, ela dispara o workflow *Deploy Frontend* (com a aprovação do ambiente `production`) e não gera release da API.

A seção de artigos só existe quando há pelo menos um artigo. Com o primeiro, passam a existir `/artigos`, o item "Artigos" no menu e no rodapé, a linha "Último artigo" e o bloco "Artigos" na Home. Apagar o último artigo faz tudo isso sumir.

> **Pendente:** o `sitemap.xml` ainda é escrito à mão (`frontend/public/sitemap.xml`) e não lista os artigos. Até o epic de SEO gerar o sitemap a partir das rotas, acrescente a URL do artigo nele.

## 5. O que o build recusa

Todo erro de conteúdo derruba o `npm run build` e o `npm test`, com a mensagem `<slug>: <problema>`. Nenhuma página parcial é publicada.

| Mensagem | Causa e o que fazer |
|---|---|
| `<slug>: slug inválido` | o nome do arquivo tem maiúscula, espaço, acento ou `_`; renomeie para minúsculas e hífens |
| `title vazio` / `description vazia` | falta o campo no cabeçalho, ou está vazio |
| `description com mais de 160 caracteres` | encurte a descrição |
| `date inválida "<valor>"` | use `AAAA-MM-DD` com uma data que exista (`2026-13-45` não existe) |
| `updated inválida "<valor>"` | idem para `updated` |
| `updated anterior a date` | `updated` tem de ser igual ou posterior a `date` |
| `título # no corpo; use ##` | troque o `#` por `##` |
| `diagrama desconhecido "<nome>"` | o nome não está na tabela da seção 2 |
| `diagrama repetido "<nome>"` | o mesmo diagrama aparece duas vezes; mantenha uma |
| `diagrama sem nome` | falta o `name="..."` em `::diagram{...}` |
| `diretiva desconhecida "<nome>"` | só `::diagram` existe; para escrever `::` literalmente, ponha entre acentos graves |
| `front matter deve ser YAML` | o cabeçalho começa com `---js` ou outro formato; use `---` e YAML |

## 6. Conferir depois do deploy

Em `https://probekit.cc/artigos/<slug>`, com `view-source` (ou `curl -s`):

- o `<title>` é `<título do artigo> · Probekit` e há um `<link rel="canonical">` com a mesma URL;
- `og:type` é `article` e `og:image` é `https://probekit.cc/og/<slug>.png`;
- há um bloco `application/ld+json` com `"@type":"BlogPosting"`;
- o texto do artigo está no HTML, sem depender de JavaScript.

Abra `https://probekit.cc/og/<slug>.png`: deve ser uma imagem de 1200×630 com o título do artigo. A Home deve mostrar o artigo como "Último artigo".
