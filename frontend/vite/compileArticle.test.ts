import { describe, expect, it, vi } from "vitest"
import { compileArticle, type Problem } from "./compileArticle.ts"

// A primeira compilação de cada worker inicializa o shiki (temas e motor), o
// que passa dos 5 s padrão quando a suíte inteira roda em paralelo.
vi.setConfig({ testTimeout: 30_000 })

const options = { diagramNames: ["arquitetura", "pipeline"] as const }

const frontMatter = (extra: Record<string, string> = {}) => {
  const fields = {
    title: "Como o ping mede a latência",
    description: "O que o tempo de ida e volta diz sobre a rede.",
    date: "2026-10-26",
    ...extra,
  }
  const lines = Object.entries(fields).map(
    ([key, value]) => `${key}: "${value}"`,
  )
  return `---\n${lines.join("\n")}\n---\n`
}

const article = (body: string, extra: Record<string, string> = {}) =>
  `${frontMatter(extra)}\n${body}\n`

// Todos os nós de elemento da árvore, em ordem de documento.
type Node = {
  type: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: Node[]
}
function elements(node: Node, found: Node[] = []): Node[] {
  if (node.type === "element") found.push(node)
  for (const child of node.children ?? []) elements(child, found)
  return found
}

describe("compileArticle", () => {
  it("devolve o meta com o tempo de leitura a 200 palavras por minuto", async () => {
    const longo = Array.from({ length: 450 }, () => "palavra").join(" ")
    const curto = await compileArticle(
      "curto",
      article("Poucas palavras."),
      options,
    )
    const medio = await compileArticle("longo", article(longo), options)

    expect(curto.meta).toEqual({
      slug: "curto",
      title: "Como o ping mede a latência",
      description: "O que o tempo de ida e volta diz sobre a rede.",
      date: "2026-10-26",
      readingMinutes: 1,
    })
    expect(medio.meta.readingMinutes).toBe(3)
  })

  it("monta o sumário só com os ## e ids sem repetição", async () => {
    const body =
      "## Dois títulos iguais\n\n### Subtítulo\n\n## Dois títulos iguais\n"
    const { toc } = await compileArticle("toc", article(body), options)

    expect(toc).toEqual([
      { id: "dois-titulos-iguais", title: "Dois títulos iguais" },
      { id: "dois-titulos-iguais-1", title: "Dois títulos iguais" },
    ])
  })

  it("colore o código com as variáveis dos dois temas", async () => {
    const body = "```ts\nconst a: number = 1\n```"
    const { tree } = await compileArticle("codigo", article(body), options)
    const json = JSON.stringify(tree)

    expect(json).toContain("--shiki-light")
    expect(json).toContain("--shiki-dark")
  })

  it("transforma ::diagram em um nó article-diagram", async () => {
    const body = '::diagram{name="pipeline"}'
    const { tree, diagrams } = await compileArticle(
      "fluxo",
      article(body),
      options,
    )
    const [node] = elements(tree as Node).filter(
      (el) => el.tagName === "article-diagram",
    )

    expect(node.properties?.name).toBe("pipeline")
    expect(diagrams).toEqual(["pipeline"])
  })

  describe("tamanho das imagens", () => {
    const imageOf = async (
      body: string,
      imageSize?: (src: string) => { width: number; height: number } | null,
    ) => {
      const { tree } = await compileArticle("a-b", article(body), {
        ...options,
        imageSize,
      })
      return elements(tree as Node).find((node) => node.tagName === "img")
    }

    it("põe width e height na imagem local, para o navegador reservar o espaço", async () => {
      const img = await imageOf("![meme](/articles/a.png)", () => ({
        width: 736,
        height: 824,
      }))
      expect(img?.properties?.width).toBe(736)
      expect(img?.properties?.height).toBe(824)
    })

    it("pergunta o tamanho pelo destino da imagem", async () => {
      const imageSize = vi.fn(() => ({ width: 10, height: 20 }))
      await imageOf("![x](/articles/a.png)", imageSize)
      expect(imageSize).toHaveBeenCalledWith("/articles/a.png")
    })

    it("deixa a imagem como está quando não há tamanho (destino externo ou ausente)", async () => {
      const img = await imageOf("![x](https://exemplo.com/a.png)", () => null)
      expect(img?.properties?.src).toBe("https://exemplo.com/a.png")
      expect(img?.properties).not.toHaveProperty("width")
      expect(img?.properties).not.toHaveProperty("height")
    })

    it("não muda nada sem a opção imageSize", async () => {
      const img = await imageOf("![x](/articles/a.png)")
      expect(img?.properties?.src).toBe("/articles/a.png")
      expect(img?.properties).not.toHaveProperty("width")
    })

    it("não pergunta o tamanho de imagem com destino não permitido", async () => {
      const imageSize = vi.fn(() => ({ width: 10, height: 20 }))
      const img = await imageOf("![x](javascript:alert(1))", imageSize)
      expect(imageSize).not.toHaveBeenCalled()
      expect(img?.properties).not.toHaveProperty("width")
    })
  })

  describe("erros de conteúdo", () => {
    it.each([
      [
        "diagrama desconhecido",
        "x",
        article('::diagram{name="nada"}'),
        'x: diagrama desconhecido "nada"',
      ],
      [
        "diagrama repetido",
        "x",
        article('::diagram{name="pipeline"}\n\n::diagram{name="pipeline"}'),
        'x: diagrama repetido "pipeline"',
      ],
      [
        "slug com maiúscula",
        "Data-Ruim",
        article("Texto."),
        "Data-Ruim: slug inválido",
      ],
      [
        "data impossível",
        "x",
        article("Texto.", { date: "2026-13-45" }),
        'x: date inválida "2026-13-45"',
      ],
      [
        "descrição de 161 caracteres",
        "x",
        article("Texto.", { description: "a".repeat(161) }),
        "x: description com mais de 160 caracteres",
      ],
      ["título vazio", "x", article("Texto.", { title: "" }), "x: title vazio"],
      [
        "updated antes de date",
        "x",
        article("Texto.", { updated: "2026-10-01" }),
        "x: updated anterior a date",
      ],
      [
        "título # no corpo",
        "x",
        article("# Outro título"),
        "x: título # no corpo; use ##",
      ],
    ])("%s", async (_name, slug, source, message) => {
      await expect(compileArticle(slug, source, options)).rejects.toThrow(
        message,
      )
    })
  })

  describe("com report, entrega todos os problemas em vez de lançar o primeiro", () => {
    const collect = async (source: string) => {
      const problems: Problem[] = []
      await compileArticle("x", source, {
        ...options,
        report: (problem) => problems.push(problem),
      })
      return problems
    }

    it("junta os problemas do corpo, com a linha no arquivo", async () => {
      const source = [
        "---", // 1
        "title: T", // 2
        "description: D", // 3
        "date: 2026-10-26", // 4
        "---", // 5
        "", // 6
        "# Título errado", // 7
        "", // 8
        '::diagram{name="nada"}', // 9
        "", // 10
        "::foo", // 11
        "",
      ].join("\n")
      const problems = await collect(source)

      expect(problems).toHaveLength(3)
      expect(problems).toEqual(
        expect.arrayContaining([
          { message: "título # no corpo; use ##", line: 7 },
          { message: 'diagrama desconhecido "nada"', line: 9 },
          { message: 'diretiva desconhecida "foo"', line: 11 },
        ]),
      )
    })

    it("junta os problemas do cabeçalho, na ordem das regras", async () => {
      const source = "---\ndescription: D\ndate: 2026-02-30\n---\n\nTexto.\n"
      const problems = await collect(source)

      expect(problems.map((problem) => problem.message)).toEqual([
        "title vazio",
        'date inválida "2026-02-30"',
      ])
    })

    it("junta problemas do cabeçalho e do corpo no mesmo artigo", async () => {
      const source = "---\ntitle: T\ndescription: D\n---\n\n# Errado\n"
      const messages = (await collect(source)).map((problem) => problem.message)

      expect(messages).toEqual(
        expect.arrayContaining([
          'date inválida ""',
          "título # no corpo; use ##",
        ]),
      )
    })

    it("um artigo sem problemas não entrega nada", async () => {
      expect(await collect(article("## Seção\n\nTexto."))).toEqual([])
    })

    it("um cabeçalho que não é YAML é entregue como problema, sem lançar", async () => {
      const problems = await collect("---js\n{ title: 'x' }\n---\nTexto\n")

      expect(problems).toEqual([{ message: "front matter deve ser YAML" }])
    })
  })

  describe("datas escritas sem aspas", () => {
    // O YAML lê `2026-02-30` como data e a trocaria por 2 de março, em silêncio.
    const raw = (extra: string) =>
      `---\ntitle: T\ndescription: D\ndate: 2026-10-26\n${extra}---\n\nTexto.\n`

    it("recusa um date impossível, em vez de publicar outro dia", async () => {
      const source =
        "---\ntitle: T\ndescription: D\ndate: 2026-02-30\n---\n\nTexto.\n"

      await expect(compileArticle("x", source, options)).rejects.toThrow(
        'x: date inválida "2026-02-30"',
      )
    })

    it("recusa um updated impossível", async () => {
      await expect(
        compileArticle("x", raw("updated: 2026-11-31\n"), options),
      ).rejects.toThrow('x: updated inválida "2026-11-31"')
    })

    it("aceita datas válidas sem aspas e as devolve como AAAA-MM-DD", async () => {
      const { meta } = await compileArticle(
        "x",
        raw("updated: 2026-11-02\n"),
        options,
      )

      expect(meta.date).toBe("2026-10-26")
      expect(meta.updated).toBe("2026-11-02")
    })
  })

  describe("conteúdo perigoso", () => {
    it("recusa front matter que não seja YAML (sem executar código)", async () => {
      const source =
        '---js\n{ title: "x", description: "y", date: "2026-10-26" }\n---\nTexto.\n'

      await expect(compileArticle("js", source, options)).rejects.toThrow(
        "js: front matter deve ser YAML",
      )
    })

    it("descarta HTML cru do corpo", async () => {
      const body = [
        "<script>alert(1)</script>",
        "",
        "Texto <img src=x onerror=alert(1)> no meio.",
      ].join("\n")
      const { tree } = await compileArticle("html", article(body), options)
      const json = JSON.stringify(tree)

      expect(json).not.toContain("script")
      expect(json).not.toContain("onerror")
      expect(json).not.toContain("alert(1)")
    })

    it("remove o href quando o destino começa com javascript:", async () => {
      const body =
        "[clique](javascript:alert(1)) e [seguro](https://probekit.cc)"
      const { tree } = await compileArticle("link", article(body), options)
      const links = elements(tree as Node).filter((el) => el.tagName === "a")

      expect(links).toHaveLength(2)
      expect(links[0].properties?.href).toBeUndefined()
      expect(links[1].properties?.href).toBe("https://probekit.cc")
    })
  })
})
