import { describe, expect, it } from "vitest"
import { buildSitemap, sitemapEntries } from "./sitemap"
import { canonicalUrl, metaFor, pages } from "./siteMeta"

/*
 * A página /voucher no `siteMeta` (título, descrição, canonical) e no sitemap.
 * Os limites de tamanho são os do critério de SEO do projeto: título até 60
 * caracteres e descrição até 160.
 */

describe("siteMeta de /voucher", () => {
  it("a página existe, é indexável e se chama Vouchers", () => {
    const meta = pages["/voucher"]

    expect(meta).toBeDefined()
    expect(meta.path).toBe("/voucher")
    expect(meta.noindex).toBeFalsy()
    expect(meta.title).toMatch(/vouchers/i)
  })

  it("título até 60 e descrição até 160 caracteres, e a descrição fala de certificações", () => {
    const meta = pages["/voucher"]

    expect(meta.title.length).toBeLessThanOrEqual(60)
    expect(meta.description.length).toBeGreaterThan(40)
    expect(meta.description.length).toBeLessThanOrEqual(160)
    expect(meta.description).toMatch(/certifica/i)
  })

  it("metaFor aceita /voucher com ou sem barra no fim", () => {
    expect(metaFor("/voucher")).toBe(pages["/voucher"])
    expect(metaFor("/voucher/")).toBe(pages["/voucher"])
  })

  it("o endereço canônico é https://probekit.cc/voucher", () => {
    expect(canonicalUrl(pages["/voucher"])).toBe("https://probekit.cc/voucher")
  })

  it("tem a trilha de navegação (breadcrumb) como as outras páginas", () => {
    expect(pages["/voucher"].breadcrumb).toBeDefined()
  })

  it("entra no sitemap", () => {
    const caminhos = sitemapEntries(pages).map((e) => e.path)

    expect(caminhos).toContain("/voucher")
    expect(buildSitemap(sitemapEntries(pages))).toContain(
      "<loc>https://probekit.cc/voucher</loc>",
    )
  })
})
