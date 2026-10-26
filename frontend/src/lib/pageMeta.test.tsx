import { render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { metaFor, usePageMeta } from "./pageMeta"
import { canonicalUrl, notFound, pages, SITE_URL } from "./siteMeta"

function Probe({ path }: { path: string }) {
  usePageMeta(path)
  return null
}

const head = (selector: string) => document.head.querySelector(selector)

afterEach(() => {
  for (const tag of document.head.querySelectorAll(
    'meta[name="description"], meta[name="robots"], meta[property^="og:"], link[rel="canonical"]',
  ))
    tag.remove()
})

describe("metaFor", () => {
  it("dá título, descrição e caminho próprios a cada rota", () => {
    const paths = Object.keys(pages)
    expect(paths).toEqual([
      "/",
      "/ping",
      "/dns-lookup",
      "/arquitetura",
      "/sobre",
    ])
    expect(new Set(paths.map((path) => metaFor(path).title)).size).toBe(
      paths.length,
    )
    for (const path of paths) {
      const page = metaFor(path)
      expect(page.title).toMatch(/Probekit/)
      expect(page.title.length).toBeLessThanOrEqual(65)
      expect(page.description.length).toBeGreaterThan(40)
      expect(page.description.length).toBeLessThanOrEqual(200)
      expect(page.path).toBe(path)
      expect(page.noindex).toBeUndefined()
    }
  })

  it("ignora a barra final e trata rota desconhecida como não encontrada", () => {
    expect(metaFor("/ping/")).toEqual(metaFor("/ping"))
    expect(metaFor("/nada")).toBe(notFound)
    expect(notFound.noindex).toBe(true)
  })

  it("monta a URL canônica absoluta, sem barra final fora da Home", () => {
    expect(canonicalUrl(metaFor("/"))).toBe(`${SITE_URL}/`)
    expect(canonicalUrl(metaFor("/ping"))).toBe(`${SITE_URL}/ping`)
  })

  it("só descreve dados estruturados com o que já é público na página", () => {
    const sobre = pages["/sobre"].jsonLd as {
      mainEntity: { name: string; sameAs: string[] }
    }
    expect(sobre.mainEntity.name).toBe("Marcos Souza")
    expect(sobre.mainEntity.sameAs).toEqual([
      "https://github.com/msouza10",
      "https://www.linkedin.com/in/marcos-vinicius-3905b1206/",
    ])
    // Nada de avaliação, nota ou números de uso.
    const all = JSON.stringify(Object.values(pages).map((p) => p.jsonLd))
    expect(all).not.toMatch(/aggregateRating|review|ratingValue|userCount/i)
  })
})

describe("usePageMeta", () => {
  it("escreve título, descrição, canonical e og:, trocando ao navegar", () => {
    const { rerender } = render(<Probe path="/sobre" />)
    expect(document.title).toBe(metaFor("/sobre").title)
    rerender(<Probe path="/ping" />)
    const ping = metaFor("/ping")
    expect(document.title).toBe(ping.title)
    expect(
      document.head.querySelectorAll('meta[name="description"]'),
    ).toHaveLength(1)
    expect(head('meta[name="description"]')).toHaveAttribute(
      "content",
      ping.description,
    )
    expect(head('meta[property="og:title"]')).toHaveAttribute(
      "content",
      ping.title,
    )
    expect(head('meta[property="og:url"]')).toHaveAttribute(
      "content",
      `${SITE_URL}/ping`,
    )
    expect(head('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${SITE_URL}/ping`,
    )
    expect(head('meta[name="robots"]')).toBeNull()
  })

  it("marca a rota inexistente como noindex e tira a marca ao voltar", () => {
    const { rerender } = render(<Probe path="/nao-existe" />)
    expect(head('meta[name="robots"]')).toHaveAttribute("content", "noindex")
    rerender(<Probe path="/" />)
    expect(head('meta[name="robots"]')).toBeNull()
  })
})
