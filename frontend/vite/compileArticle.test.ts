import { describe, expect, it, vi } from "vitest"
import { compileArticle } from "./compileArticle.ts"

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
