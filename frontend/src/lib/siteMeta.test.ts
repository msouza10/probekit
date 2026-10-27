import { describe, expect, it } from "vitest"
import type { ArticleMeta } from "./articles"
import { buildPages, canonicalUrl } from "./siteMeta"

const article = (extra: Partial<ArticleMeta> = {}): ArticleMeta => ({
  slug: "latencia-do-ping",
  title: "Como o ping mede a latência",
  description: "O que o tempo de ida e volta diz sobre a rede.",
  date: "2026-10-26",
  readingMinutes: 3,
  ...extra,
})

const fixedPaths = ["/", "/ping", "/dns-lookup", "/arquitetura", "/sobre"]

describe("buildPages", () => {
  it("sem artigos tem só as páginas fixas, sem /artigos", () => {
    expect(Object.keys(buildPages([]))).toEqual(fixedPaths)
  })

  it("com artigos acrescenta /artigos e uma página por artigo", () => {
    const pages = buildPages([
      article(),
      article({ slug: "outro-artigo", title: "Outro" }),
    ])

    expect(Object.keys(pages)).toEqual([
      ...fixedPaths,
      "/artigos",
      "/artigos/latencia-do-ping",
      "/artigos/outro-artigo",
    ])
  })

  it("a lista de artigos tem título, descrição e canonical próprios", () => {
    const list = buildPages([article()])["/artigos"]

    expect(list.title).toBe("Artigos · Probekit")
    expect(list.description).toBe(
      "Textos do Probekit, do mais novo para o mais antigo.",
    )
    expect(canonicalUrl(list)).toBe("https://probekit.cc/artigos")
    expect(list.noindex).toBeUndefined()
  })

  describe("a página de um artigo", () => {
    const page = buildPages([article()])["/artigos/latencia-do-ping"]

    it("usa o título e a descrição do artigo", () => {
      expect(page.title).toBe("Como o ping mede a latência · Probekit")
      expect(page.description).toBe(
        "O que o tempo de ida e volta diz sobre a rede.",
      )
      expect(canonicalUrl(page)).toBe(
        "https://probekit.cc/artigos/latencia-do-ping",
      )
    })

    it("é do tipo article e tem a imagem OG própria", () => {
      expect(page.type).toBe("article")
      expect(page.image).toBe("https://probekit.cc/og/latencia-do-ping.png")
    })

    it("tem o JSON-LD BlogPosting com as datas e a imagem", () => {
      expect(page.jsonLd).toMatchObject({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: "Como o ping mede a latência",
        description: "O que o tempo de ida e volta diz sobre a rede.",
        datePublished: "2026-10-26",
        dateModified: "2026-10-26",
        image: "https://probekit.cc/og/latencia-do-ping.png",
        inLanguage: "pt-BR",
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "https://probekit.cc/artigos/latencia-do-ping",
        },
        author: { "@type": "Person", name: "Marcos Souza" },
      })
    })
  })

  it("dateModified usa updated quando o artigo tem", () => {
    const page = buildPages([article({ updated: "2026-11-02" })])[
      "/artigos/latencia-do-ping"
    ]

    expect(page.jsonLd).toMatchObject({
      datePublished: "2026-10-26",
      dateModified: "2026-11-02",
    })
  })
})
