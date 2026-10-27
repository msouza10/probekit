import { describe, expect, it, vi } from "vitest"
import {
  checkAll,
  checkArticle,
  formatReport,
  type ArticleReport,
} from "./articleChecks.ts"

// A primeira compilação de cada worker inicializa o shiki (temas e motor), o
// que passa dos 5 s padrão quando a suíte inteira roda em paralelo.
vi.setConfig({ testTimeout: 30_000 })

const options = { diagramNames: ["pipeline"] as const, today: "2026-10-26" }

const words = (count: number) =>
  Array.from({ length: count }, () => "palavra").join(" ")

const DESCRIPTION =
  "Uma explicação direta de como o ping mede o tempo de ida e volta até um servidor."

// Um artigo completo e válido; cada teste muda só o que quer provar. O corpo
// começa na linha 7 (cabeçalho nas linhas 1 a 5, linha em branco na 6).
function article(
  over: {
    title?: string
    description?: string
    date?: string
    extra?: string
  } = {},
  body = `## Primeira seção\n\n${words(160)}\n`,
) {
  const title = over.title ?? "Como o ping mede a latência"
  const description = over.description ?? DESCRIPTION
  const date = over.date ?? "2026-10-01"
  const extra = over.extra ? `${over.extra}\n` : ""
  return `---\ntitle: ${title}\ndescription: ${description}\ndate: ${date}\n${extra}---\n\n${body}`
}

const messages = async (
  source: string,
  level: "error" | "warning",
  slug = "x",
) =>
  (await checkArticle(slug, source, options))
    .filter((finding) => finding.level === level)
    .map((finding) => finding.message)

describe("checkArticle", () => {
  it("um artigo completo e válido não tem nada a apontar", async () => {
    expect(await checkArticle("x", article(), options)).toEqual([])
  })

  describe("erros", () => {
    it("lista todos os problemas de uma vez, os do corpo com a linha", async () => {
      const source = [
        "---", // 1
        `description: ${DESCRIPTION}`, // 2
        "---", // 3
        "", // 4
        "# Errado", // 5
        "", // 6
        '::diagram{name="nada"}', // 7
        "",
        words(160),
        "",
      ].join("\n")
      const findings = await checkArticle("x", source, options)
      const errors = findings.filter((finding) => finding.level === "error")

      expect(errors).toHaveLength(4)
      expect(errors).toEqual(
        expect.arrayContaining([
          { level: "error", message: "title vazio" },
          { level: "error", message: 'date inválida ""' },
          { level: "error", message: "título # no corpo; use ##", line: 5 },
          {
            level: "error",
            message: 'diagrama desconhecido "nada"',
            line: 7,
          },
        ]),
      )
    })

    it("recusa um arquivo sem corpo", async () => {
      const source = `---\ntitle: T\ndescription: ${DESCRIPTION}\ndate: 2026-10-01\n---\n`

      expect(await messages(source, "error")).toContain("corpo vazio")
    })

    it("recusa um cabeçalho que não é YAML, sem lançar", async () => {
      expect(
        await messages("---js\n{ title: 'x' }\n---\nTexto\n", "error"),
      ).toEqual(["front matter deve ser YAML"])
    })

    it("lista os erros antes dos avisos", async () => {
      const source = article({ title: "a".repeat(61) }, "# Errado\n")
      const levels = (await checkArticle("x", source, options)).map(
        (finding) => finding.level,
      )

      expect(levels.indexOf("error")).toBeLessThan(levels.indexOf("warning"))
    })
  })

  describe("avisos (não derrubam o build)", () => {
    it("title: 60 caracteres passa, 61 avisa", async () => {
      expect(
        await messages(article({ title: "a".repeat(60) }), "warning"),
      ).toEqual([])
      expect(
        await messages(article({ title: "a".repeat(61) }), "warning"),
      ).toEqual(["title com 61 caracteres (o buscador mostra até cerca de 60)"])
    })

    it("description: 70 caracteres passa, 69 avisa", async () => {
      expect(
        await messages(article({ description: "a".repeat(70) }), "warning"),
      ).toEqual([])
      expect(
        await messages(article({ description: "a".repeat(69) }), "warning"),
      ).toEqual([
        "description com 69 caracteres (abaixo de 70, curta para o resultado de busca)",
      ])
    })

    it("corpo: 150 palavras passa, 149 avisa", async () => {
      // O título "## Seção" conta 2 palavras do total.
      const body = (count: number) => `## Seção\n\n${words(count - 2)}\n`

      expect(await messages(article({}, body(150)), "warning")).toEqual([])
      expect(await messages(article({}, body(149)), "warning")).toEqual([
        "corpo com 149 palavras (menos de 150)",
      ])
    })

    it("avisa quando não há nenhuma seção ##", async () => {
      const source = article({}, `${words(160)}\n`)

      expect(await messages(source, "warning")).toEqual([
        'nenhuma seção ## (o artigo fica sem o sumário "Nesta página")',
      ])
    })

    it("avisa de bloco de código sem linguagem, com a linha", async () => {
      const body = `## Seção\n\n${words(160)}\n\n\`\`\`\nsem cor\n\`\`\`\n`
      const findings = await checkArticle("x", article({}, body), options)

      expect(findings).toEqual([
        {
          level: "warning",
          message: "bloco de código sem linguagem (fica sem cor)",
          line: 11,
        },
      ])
    })

    it("não avisa de um bloco com linguagem", async () => {
      const body = `## Seção\n\n${words(160)}\n\n\`\`\`go\nfunc main() {}\n\`\`\`\n`

      expect(await messages(article({}, body), "warning")).toEqual([])
    })

    it.each(["“", "”", "‘", "’", "–", "—"])(
      "avisa do caractere tipográfico %s num bloco de código, que quebra o comando copiado",
      async (char) => {
        const body = `## Seção\n\n${words(160)}\n\n\`\`\`bash\ncurl ${char}x${char}\n\`\`\`\n`
        const findings = await checkArticle("x", article({}, body), options)

        expect(findings).toEqual([
          {
            level: "warning",
            message: `bloco de código com "${char}" (caractere tipográfico): use o ASCII, senão o comando copiado quebra`,
            line: 11,
          },
        ])
      },
    )

    it("não avisa de caractere tipográfico no texto, só no código", async () => {
      const body = `## Seção\n\n${words(160)} “aspas” e um — travessão\n`

      expect(await messages(article({}, body), "warning")).toEqual([])
    })

    it("avisa de HTML cru, que será descartado", async () => {
      const body = `## Seção\n\n${words(160)}\n\n<div>cru</div>\n`

      expect(await messages(article({}, body), "warning")).toEqual([
        "HTML cru no corpo (será descartado)",
      ])
    })

    it("avisa de link e imagem com destino não permitido", async () => {
      const body = `## Seção\n\n${words(160)} [clique](javascript:alert(1)) ![x](data:text/html,oi)\n`

      expect(await messages(article({}, body), "warning")).toEqual([
        "link com destino não permitido (perde o destino): javascript:alert(1)",
        "imagem com destino não permitido (perde o destino): data:text/html,oi",
      ])
    })

    it("não avisa de link externo, interno nem âncora", async () => {
      const body = `## Seção\n\n${words(160)} [a](https://probekit.cc) [b](/sobre) [c](#seção)\n`

      expect(await messages(article({}, body), "warning")).toEqual([])
    })

    it("avisa de date posterior a hoje, mas não de hoje", async () => {
      expect(
        await messages(article({ date: "2026-10-26" }), "warning"),
      ).toEqual([])
      expect(
        await messages(article({ date: "2026-10-27" }), "warning"),
      ).toEqual([
        "date 2026-10-27 é posterior a hoje (2026-10-26); o artigo aparece no site mesmo assim",
      ])
    })

    it("avisa de um campo que o site não usa", async () => {
      expect(
        await messages(article({ extra: "tags: [ping]" }), "warning"),
      ).toEqual(['campo "tags" não é usado pelo site (será ignorado)'])
    })

    it("avisa que draft não impede a publicação", async () => {
      expect(
        await messages(article({ extra: "draft: true" }), "warning"),
      ).toEqual([
        'campo "draft" não é usado pelo site: o artigo é publicado mesmo assim',
      ])
    })

    it("avisa de TODO no título, na descrição e no corpo (modelo sem preencher)", async () => {
      const body = `## Seção\n\nTODO: escrever.\n\n${words(160)}\n`
      const findings = await checkArticle(
        "x",
        article(
          {
            title: "TODO título",
            description:
              "TODO resumo do artigo em até cento e sessenta caracteres para o buscador mostrar na pesquisa",
          },
          body,
        ),
        options,
      )

      expect(findings.filter((f) => f.message.includes("TODO"))).toEqual([
        {
          level: "warning",
          message: 'title contém "TODO" (parte do modelo sem preencher)',
        },
        {
          level: "warning",
          message: 'description contém "TODO" (parte do modelo sem preencher)',
        },
        {
          level: "warning",
          message: 'corpo contém "TODO" (parte do modelo sem preencher)',
          line: 9,
        },
      ])
    })

    it("não confunde 'todos' e 'TODOS' com o marcador TODO", async () => {
      const body = `## Seção\n\nTodos os dias, TODOS os servidores. ${words(160)}\n`

      expect(await messages(article({}, body), "warning")).toEqual([])
    })

    it("não avisa de updated, que o site usa", async () => {
      expect(
        await messages(article({ extra: "updated: 2026-10-10" }), "warning"),
      ).toEqual([])
    })
  })
})

describe("checkAll", () => {
  const file = (slug: string, title: string) => ({
    slug,
    file: `content/articles/${slug}.md`,
    source: article({ title }),
  })

  it("avisa de título repetido nos dois artigos, e só neles", async () => {
    const reports = await checkAll(
      [
        file("um", "Como o ping mede a latência"),
        file("dois", "  como o PING mede a latência "),
        file("tres", "Outro assunto"),
      ],
      options,
    )
    const warnings = (slug: string) =>
      reports
        .find((report) => report.slug === slug)!
        .findings.map((finding) => finding.message)

    expect(warnings("um")).toEqual([
      "title igual ao de content/articles/dois.md",
    ])
    expect(warnings("dois")).toEqual([
      "title igual ao de content/articles/um.md",
    ])
    expect(warnings("tres")).toEqual([])
  })

  it("devolve um relatório por arquivo, na ordem recebida", async () => {
    const reports = await checkAll([file("b", "B"), file("a", "A")], options)

    expect(reports.map((report) => report.slug)).toEqual(["b", "a"])
    expect(reports[0].file).toBe("content/articles/b.md")
  })
})

describe("formatReport", () => {
  const report = (
    slug: string,
    findings: ArticleReport["findings"],
  ): ArticleReport => ({ slug, file: `content/articles/${slug}.md`, findings })

  it("mostra arquivo, nível, linha e mensagem, e conta erros e avisos", () => {
    const { text, errors, warnings } = formatReport([
      report("a", [
        { level: "error", message: "título # no corpo; use ##", line: 7 },
        { level: "warning", message: "corpo com 12 palavras (menos de 150)" },
      ]),
      report("b", []),
    ])

    expect(text).toBe(
      [
        "content/articles/a.md",
        "  erro   linha 7   título # no corpo; use ##",
        "  aviso            corpo com 12 palavras (menos de 150)",
        "",
        "2 artigos conferidos: 1 erro e 1 aviso.",
      ].join("\n"),
    )
    expect(errors).toBe(1)
    expect(warnings).toBe(1)
  })

  it("sem nenhum problema, diz que está tudo certo", () => {
    const { text, errors, warnings } = formatReport([report("a", [])])

    expect(text).toBe("1 artigo conferido: tudo certo.")
    expect(errors + warnings).toBe(0)
  })

  it("só com avisos, não fala em erro", () => {
    const { text } = formatReport([
      report("a", [{ level: "warning", message: "x" }]),
      report("b", [{ level: "warning", message: "y" }]),
    ])

    expect(text.split("\n").at(-1)).toBe("2 artigos conferidos: 2 avisos.")
  })
})
