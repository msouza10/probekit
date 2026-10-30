import { describe, expect, it } from "vitest"
import type { ArticleMeta } from "./articles"
import { serializeJsonLd } from "./prerenderHtml"
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

  describe("imagem social", () => {
    const pages = buildPages([article()])

    it.each(["ping", "dns-lookup", "arquitetura", "sobre"])(
      "/%s tem a própria imagem em og/",
      (name) => {
        expect(pages[`/${name}`].image).toBe(
          `https://probekit.cc/og/${name}.png`,
        )
      },
    )

    it("a Home e a lista de artigos ficam com a imagem da marca", () => {
      expect(pages["/"].image).toBeUndefined()
      expect(pages["/artigos"].image).toBeUndefined()
    })
  })

  describe("breadcrumb", () => {
    const pages = buildPages([article()])
    type Item = {
      "@type": string
      position: number
      name: string
      item: string
    }
    const itemsOf = (path: string) =>
      (pages[path].breadcrumb as { itemListElement: Item[] }).itemListElement

    it("a Home não tem breadcrumb", () => {
      expect(pages["/"].breadcrumb).toBeUndefined()
    })

    it("/ping tem BreadcrumbList com Probekit e a página, nas posições 1 e 2", () => {
      expect(pages["/ping"].breadcrumb).toMatchObject({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
      })
      expect(itemsOf("/ping")).toEqual([
        {
          "@type": "ListItem",
          position: 1,
          name: "Probekit",
          item: "https://probekit.cc/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Ping online a partir de São Paulo",
          item: "https://probekit.cc/ping",
        },
      ])
    })

    it("um artigo tem 3 itens: Probekit, Artigos e o artigo", () => {
      expect(itemsOf("/artigos/latencia-do-ping")).toEqual([
        expect.objectContaining({ position: 1, name: "Probekit" }),
        expect.objectContaining({
          position: 2,
          name: "Artigos",
          item: "https://probekit.cc/artigos",
        }),
        expect.objectContaining({
          position: 3,
          name: "Como o ping mede a latência",
          item: "https://probekit.cc/artigos/latencia-do-ping",
        }),
      ])
    })

    it("a lista de artigos tem 2 itens", () => {
      expect(itemsOf("/artigos").map((i) => i.name)).toEqual([
        "Probekit",
        "Artigos",
      ])
    })

    it("todo item aponta para o canonical de uma página que existe", () => {
      const canonicals = new Set(Object.values(pages).map(canonicalUrl))
      for (const meta of Object.values(pages)) {
        if (!meta.breadcrumb) continue
        const { itemListElement } = meta.breadcrumb as {
          itemListElement: Item[]
        }
        for (const entry of itemListElement)
          expect(canonicals.has(entry.item)).toBe(true)
      }
    })

    it("o último item é a própria página", () => {
      for (const meta of Object.values(pages)) {
        if (!meta.breadcrumb) continue
        const { itemListElement } = meta.breadcrumb as {
          itemListElement: Item[]
        }
        expect(itemListElement.at(-1)?.item).toBe(canonicalUrl(meta))
      }
    })
  })

  it("todo JSON-LD e todo breadcrumb sobrevivem a serializar e ler de volta", () => {
    const evil = article({
      slug: "x",
      title: 'A </script><script>alert(1)</script> & "b"',
    })
    for (const meta of Object.values(buildPages([evil]))) {
      for (const data of [meta.jsonLd, meta.breadcrumb]) {
        if (!data) continue
        const text = serializeJsonLd(data)
        expect(text).not.toContain("</script>")
        expect(JSON.parse(text)).toEqual(data)
      }
    }
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
