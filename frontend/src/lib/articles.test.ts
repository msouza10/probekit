import { describe, expect, it } from "vitest"
import type { ArticleMeta } from "../../vite/compileArticle.ts"
import {
  articlePath,
  createCatalog,
  createFinder,
  createLoader,
  formatDate,
} from "./articles"

const meta = (slug: string, date: string): ArticleMeta => ({
  slug,
  title: `Título de ${slug}`,
  description: `Descrição de ${slug}.`,
  date,
  readingMinutes: 1,
})

describe("createCatalog", () => {
  it("ordena do mais novo para o mais antigo", () => {
    const catalog = createCatalog({
      "/content/articles/antigo.md": meta("antigo", "2026-01-10"),
      "/content/articles/novo.md": meta("novo", "2026-10-26"),
      "/content/articles/meio.md": meta("meio", "2026-05-02"),
    })

    expect(catalog.map((article) => article.slug)).toEqual([
      "novo",
      "meio",
      "antigo",
    ])
  })

  it("desempata a mesma data pelo slug", () => {
    const catalog = createCatalog({
      "/content/articles/b.md": meta("b", "2026-10-26"),
      "/content/articles/a.md": meta("a", "2026-10-26"),
    })

    expect(catalog.map((article) => article.slug)).toEqual(["a", "b"])
  })

  it("devolve lista vazia quando não há artigos", () => {
    expect(createCatalog({})).toEqual([])
  })
})

describe("articlePath", () => {
  it("monta o caminho da página do artigo", () => {
    expect(articlePath("a-b")).toBe("/artigos/a-b")
  })
})

describe("formatDate", () => {
  it("escreve AAAA-MM-DD por extenso em português", () => {
    expect(formatDate("2026-10-26")).toBe("26 de outubro de 2026")
    expect(formatDate("2026-01-05")).toBe("5 de janeiro de 2026")
  })

  it("não muda de dia com o fuso do computador", () => {
    // Meia-noite UTC cairia no dia anterior em fusos a oeste de Greenwich.
    expect(formatDate("2026-03-01")).toBe("1 de março de 2026")
  })
})

describe("createFinder", () => {
  const find = createFinder([meta("novo", "2026-10-26")])

  it("acha o artigo pelo slug", () => {
    expect(find("novo")?.title).toBe("Título de novo")
  })

  it("devolve undefined para um slug que não existe", () => {
    expect(find("nada")).toBeUndefined()
  })
})

describe("createLoader", () => {
  const module = {
    meta: meta("novo", "2026-10-26"),
    tree: { type: "root" as const, children: [] },
    toc: [{ id: "a", title: "A" }],
    diagrams: [],
  }
  const load = createLoader({
    "/content/articles/novo.md": () => Promise.resolve(module),
  })

  it("carrega meta, tree e toc do artigo pelo slug", async () => {
    expect(await load("novo")).toEqual({
      meta: module.meta,
      tree: module.tree,
      toc: module.toc,
    })
  })

  it("devolve undefined para um slug que não existe, sem importar nada", async () => {
    expect(await load("nada")).toBeUndefined()
  })
})
