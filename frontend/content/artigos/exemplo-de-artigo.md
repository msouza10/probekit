---
title: Exemplo de artigo para ver o layout
description: Um texto de teste com título, lista, código, tabela, citação e diagrama, só para conferir como os artigos aparecem no site.
date: 2026-10-26
---

Este é um **artigo de exemplo**, escrito em markdown, para conferir como o site mostra um texto longo. Nada aqui é conteúdo oficial do Probekit. O arquivo é temporário e sai antes de qualquer commit.

## Texto corrido

Um parágrafo normal tem a medida de leitura limitada, para a linha não ficar comprida demais em telas largas. Aqui há um [link externo](https://github.com/msouza10/probekit), um [link interno](/sobre) e um trecho de `código em linha` no meio da frase.

Também funcionam _itálico_, **negrito** e listas:

- o primeiro item da lista;
- o segundo item, um pouco mais comprido, para ver como a quebra de linha se comporta quando o texto passa da largura da coluna;
- o terceiro item.

Uma lista numerada:

1. Escreva o arquivo `.md` em `content/artigos/`.
2. Abra o pull request.
3. O deploy publica a página.

> Uma citação serve para destacar um trecho de outra fonte ou uma observação importante do texto.

## Código

Um bloco de código ganha a cor do tema atual, claro ou escuro:

```go
package main

import "fmt"

func main() {
	fmt.Println("olá, Probekit")
}
```

E um bloco de shell:

```bash
npm run dev
curl -s http://localhost:5173/artigos
```

## Tabela

| Termo | O que é           | Exemplo         |
| ----- | ----------------- | --------------- |
| A     | Endereço IPv4     | `192.0.2.10`    |
| AAAA  | Endereço IPv6     | `2001:db8::10`  |
| MX    | Servidor de email | `mail.exemplo.` |

## Diagrama

O mesmo diagrama da página de arquitetura entra pelo nome, com uma linha no markdown:

::diagram{name="pipeline"}

## Um título mais comprido para testar o sumário lateral

Fecha o exemplo. Depois do último parágrafo vem o rodapé do site.
