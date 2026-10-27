// @vitest-environment node
import path from "node:path"
import { fileURLToPath } from "node:url"
import { format, resolveConfig } from "prettier"
import { describe, expect, it, vi } from "vitest"
import { checkArticle } from "./articleChecks.ts"
import { articleTemplate } from "./articleTemplate.ts"
import { isValidSlug, splitArticle } from "./compileArticle.ts"

// A primeira compilação de cada worker inicializa o shiki (temas e motor), o
// que passa dos 5 s padrão quando a suíte inteira roda em paralelo.
vi.setConfig({ testTimeout: 30_000 })

const frontend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
)
const input = { title: "Como o ping mede a latência", date: "2026-10-26" }

describe("articleTemplate", () => {
  it("traz título, descrição e data no cabeçalho", () => {
    const { data } = splitArticle(articleTemplate(input))

    expect(data.title).toBe("Como o ping mede a latência")
    expect(data.date).toBe("2026-10-26")
    expect(typeof data.description).toBe("string")
  })

  it("preserva um título com dois-pontos, aspas e &", () => {
    const title = 'Ping: o "teste" mais simples & útil'
    const { data } = splitArticle(articleTemplate({ ...input, title }))

    expect(data.title).toBe(title)
  })

  it("usa a descrição dada quando há uma", () => {
    const description = "Uma descrição já escrita pelo autor."
    const { data } = splitArticle(articleTemplate({ ...input, description }))

    expect(data.description).toBe(description)
  })

  it("a descrição padrão é um TODO de até 160 caracteres", () => {
    const { data } = splitArticle(articleTemplate(input))
    const description = data.description as string

    expect(description.startsWith("TODO")).toBe(true)
    expect(description.length).toBeLessThanOrEqual(160)
  })

  it("o corpo tem uma abertura, seções ## e Referências, com TODO a preencher", () => {
    const { content } = splitArticle(articleTemplate(input))

    expect(content).toContain("TODO")
    expect(content).toMatch(/^## /m)
    expect(content).toContain("## Referências")
    expect(content).not.toMatch(/^# /m)
  })

  it("não tem nenhum erro no conferidor, e avisa dos TODO que sobraram", async () => {
    const findings = await checkArticle("modelo", articleTemplate(input), {
      diagramNames: [],
      today: "2026-10-26",
    })

    expect(findings.filter((finding) => finding.level === "error")).toEqual([])
    expect(findings.map((finding) => finding.message)).toEqual(
      expect.arrayContaining([expect.stringContaining("TODO")]),
    )
  })

  it("já está do jeito que o Prettier deixa (o format:check do CI passa)", async () => {
    const file = path.join(frontend, "content/articles/modelo.md")
    const text = articleTemplate(input)
    const formatted = await format(text, {
      ...(await resolveConfig(file)),
      filepath: file,
    })

    expect(formatted).toBe(text)
  })
})

describe("isValidSlug", () => {
  it.each(["meu-artigo", "ping", "a1-b2", "dns-lookup-2026"])(
    "aceita %s",
    (slug) => {
      expect(isValidSlug(slug)).toBe(true)
    },
  )

  it.each(["", "Meu", "a_b", "-a", "a-", "a--b", "a b", "ação", "a.md"])(
    "recusa %j",
    (slug) => {
      expect(isValidSlug(slug)).toBe(false)
    },
  )
})
