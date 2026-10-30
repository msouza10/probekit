import { describe, expect, it } from "vitest"
import type { ArticleMeta } from "./articles"
import { buildSitemap, sitemapEntries } from "./sitemap"
import { buildPages, canonicalUrl, notFound, type PageMeta } from "./siteMeta"

const article = (extra: Partial<ArticleMeta> = {}): ArticleMeta => ({
  slug: "latencia-do-ping",
  title: "Como o ping mede a latência",
  description: "O que o tempo de ida e volta diz sobre a rede.",
  date: "2026-10-26",
  readingMinutes: 3,
  ...extra,
})

const locs = (xml: string) =>
  [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1])

describe("sitemapEntries", () => {
  it("não lista a página noindex (a 404)", () => {
    const entries = sitemapEntries({ ...buildPages([]), "/404": notFound })
    expect(entries.map((entry) => entry.path)).not.toContain("/404")
  })

  it("lista só as páginas indexáveis, na ordem em que o site as declara", () => {
    expect(
      sitemapEntries(buildPages([article()])).map((entry) => entry.path),
    ).toEqual([
      "/",
      "/ping",
      "/dns-lookup",
      "/arquitetura",
      "/sobre",
      "/artigos",
      "/artigos/latencia-do-ping",
    ])
  })

  it("só os artigos têm lastmod: updated, ou a data de publicação", () => {
    const entries = sitemapEntries(
      buildPages([
        article(),
        article({ slug: "outro", updated: "2026-11-02" }),
      ]),
    )
    const lastmod = Object.fromEntries(
      entries.map((entry) => [entry.path, entry.lastmod]),
    )
    expect(lastmod["/artigos/latencia-do-ping"]).toBe("2026-10-26")
    expect(lastmod["/artigos/outro"]).toBe("2026-11-02")
    for (const path of ["/", "/ping", "/dns-lookup", "/arquitetura", "/sobre"])
      expect(lastmod[path]).toBeUndefined()
    expect(lastmod["/artigos"]).toBeUndefined()
  })
})

describe("buildSitemap", () => {
  it("as URLs são exatamente os canonicals das páginas indexáveis, sem duplicata", () => {
    const pages = buildPages([article(), article({ slug: "outro" })])
    const xml = buildSitemap(sitemapEntries(pages))
    const canonicals = Object.values(pages)
      .filter((page: PageMeta) => !page.noindex)
      .map(canonicalUrl)

    expect(locs(xml)).toEqual(canonicals)
    expect(new Set(locs(xml)).size).toBe(locs(xml).length)
  })

  it("começa com a declaração XML e o xmlns do sitemap", () => {
    const xml = buildSitemap([{ path: "/" }])
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    )
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true)
  })

  it("a Home é https://probekit.cc/ e as outras não levam barra final", () => {
    expect(locs(buildSitemap([{ path: "/" }, { path: "/ping" }]))).toEqual([
      "https://probekit.cc/",
      "https://probekit.cc/ping",
    ])
  })

  it("entrada sem lastmod não tem a tag, e com lastmod tem no formato AAAA-MM-DD", () => {
    const xml = buildSitemap([
      { path: "/ping" },
      { path: "/artigos/x", lastmod: "2026-10-26" },
    ])
    expect(xml.match(/<lastmod>/g)).toHaveLength(1)
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/)
    expect(xml).toContain(
      "<loc>https://probekit.cc/artigos/x</loc><lastmod>2026-10-26</lastmod>",
    )
  })

  it("escapa & e < no caminho para o XML continuar válido", () => {
    const xml = buildSitemap([{ path: "/a&b<c" }])
    expect(xml).toContain("<loc>https://probekit.cc/a&amp;b&lt;c</loc>")
    expect(xml).not.toContain("a&b")
  })
})
