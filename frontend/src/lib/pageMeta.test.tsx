import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { metaFor, usePageMeta } from "./pageMeta"

function Probe({ path }: { path: string }) {
  usePageMeta(path)
  return null
}

describe("metaFor", () => {
  it("dá título e descrição próprios a cada rota", () => {
    const paths = ["/", "/ping", "/dns-lookup", "/arquitetura", "/sobre"]
    const titles = paths.map((path) => metaFor(path).title)
    expect(new Set(titles).size).toBe(paths.length)
    for (const path of paths) {
      const { title, description } = metaFor(path)
      expect(title).toMatch(/Probekit/)
      expect(description.length).toBeGreaterThan(40)
      expect(description.length).toBeLessThanOrEqual(200)
    }
  })

  it("ignora a barra final e trata rota desconhecida como não encontrada", () => {
    expect(metaFor("/ping/")).toEqual(metaFor("/ping"))
    expect(metaFor("/nada").title).toMatch(/não encontrada/)
  })
})

describe("usePageMeta", () => {
  it("escreve o título e uma única meta description, trocando ao navegar", () => {
    const { rerender } = render(<Probe path="/sobre" />)
    expect(document.title).toBe(metaFor("/sobre").title)
    rerender(<Probe path="/ping" />)
    expect(document.title).toBe(metaFor("/ping").title)
    const tags = document.head.querySelectorAll('meta[name="description"]')
    expect(tags).toHaveLength(1)
    expect(tags[0]).toHaveAttribute("content", metaFor("/ping").description)
  })
})
