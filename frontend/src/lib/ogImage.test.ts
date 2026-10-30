// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import type { ArticleMeta } from "./articles"
import { ogSvg, ogTargets, renderOgImage } from "./ogImage"
import { buildPages } from "./siteMeta"

// A primeira imagem carrega as fontes e inicia o satori; com a suíte inteira
// em paralelo isso passa dos 5 s padrão.
vi.setConfig({ testTimeout: 30_000 })

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

// O cabeçalho IHDR guarda a largura e a altura, em 4 bytes cada, a partir do byte 16.
const size = (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

describe("ogTargets", () => {
  const article = (slug: string): ArticleMeta => ({
    slug,
    title: `Título de ${slug}`,
    description: `Descrição de ${slug}.`,
    date: "2026-10-26",
    readingMinutes: 1,
  })

  it("lista um og/<nome>.png por página com imagem própria, com o título sem o sufixo do site", () => {
    expect(ogTargets(buildPages([article("um"), article("dois")]))).toEqual([
      { file: "og/ping.png", title: "Ping online a partir de São Paulo" },
      { file: "og/dns-lookup.png", title: "Consulta DNS (DNS Lookup) online" },
      { file: "og/arquitetura.png", title: "Arquitetura" },
      { file: "og/sobre.png", title: "Sobre" },
      { file: "og/um.png", title: "Título de um" },
      { file: "og/dois.png", title: "Título de dois" },
    ])
  })

  it("sem artigos só as páginas fixas têm imagem a gerar", () => {
    expect(ogTargets(buildPages([])).map((t) => t.file)).toEqual([
      "og/ping.png",
      "og/dns-lookup.png",
      "og/arquitetura.png",
      "og/sobre.png",
    ])
  })

  it("o arquivo gerado é o que o og:image da página aponta", () => {
    const pages = buildPages([article("um"), article("dois")])
    const files = new Set(ogTargets(pages).map((t) => `/${t.file}`))

    for (const page of Object.values(pages))
      if (page.image) expect(files.has(new URL(page.image).pathname)).toBe(true)
  })

  it("falha em vez de sobrescrever quando duas páginas gerariam o mesmo arquivo", () => {
    // Um artigo com o slug de uma página fixa colide com a imagem dela.
    expect(() => ogTargets(buildPages([article("ping")]))).toThrow(
      /og\/ping\.png/,
    )
  })
})

// O tamanho do PNG não prova o layout (um fundo de 1360×790 também vira 1200×630
// no resvg): estes testes olham o SVG que o satori desenha.
describe("ogSvg", () => {
  const widths = (svg: string) =>
    [...svg.matchAll(/\bwidth="(\d+(?:\.\d+)?)"/g)].map((m) => Number(m[1]))
  const heights = (svg: string) =>
    [...svg.matchAll(/\bheight="(\d+(?:\.\d+)?)"/g)].map((m) => Number(m[1]))
  // Um <path> por linha de texto desenhada.
  const lines = (svg: string) => (svg.match(/<path/g) ?? []).length

  it("o fundo cobre exatamente a imagem, sem passar de 1200 por 630", async () => {
    const svg = await ogSvg("Como o ping mede a latência")

    expect(svg).toContain(
      '<rect x="0" y="0" width="1200" height="630" fill="#fafafa"/>',
    )
    expect(Math.max(...widths(svg))).toBeLessThanOrEqual(1200)
    expect(Math.max(...heights(svg))).toBeLessThanOrEqual(630)
  })

  it("desenha o título e o rodapé", async () => {
    const svg = await ogSvg("Um título curto")

    // Uma linha de título e a linha "probekit.cc".
    expect(lines(svg)).toBe(2)
    expect(svg).toContain('fill="#171717"')
    expect(svg).toContain('fill="#595959"')
  })

  // A caixa do título: começa em (80, 80) e o satori a recorta (máscara) na
  // largura e na altura reais do texto.
  const titleBox = (svg: string) => {
    const match =
      /<mask id="[^"]*-0"><rect x="80" y="80" width="([\d.]+)" height="([\d.]+)"/.exec(
        svg,
      )
    return { width: Number(match![1]), height: Number(match![2]) }
  }

  it("um título curto ocupa uma linha, dentro da margem", async () => {
    const box = titleBox(await ogSvg("Um título curto"))

    expect(box.width).toBeLessThanOrEqual(1040)
    expect(box.height).toBeLessThan(100)
  })

  it("quebra um título longo em 3 linhas, dentro da margem, e mantém o rodapé", async () => {
    const svg = await ogSvg("Um título muito longo ".repeat(10).trim())
    const box = titleBox(svg)

    // 1200 menos 80 de margem de cada lado; 3 linhas de 76 px × 1,12.
    expect(box.width).toBeLessThanOrEqual(1040)
    expect(box.height).toBeGreaterThan(250)
    expect(box.height).toBeLessThan(260)
    expect(lines(svg)).toBe(2)
  })
})

describe("renderOgImage", () => {
  it("devolve um PNG de 1200 por 630", async () => {
    const png = await renderOgImage("Como o ping mede a latência")

    expect([...png.slice(0, 8)]).toEqual(PNG_SIGNATURE)
    expect(size(png)).toEqual({ width: 1200, height: 630 })
  })

  it("aguenta um título de 200 caracteres sem estourar a imagem", async () => {
    const png = await renderOgImage("Um título muito longo ".repeat(10).trim())

    expect(size(png)).toEqual({ width: 1200, height: 630 })
  })

  it("aguenta acentos e caracteres que o markup trataria à parte", async () => {
    const png = await renderOgImage('Ação & reação: <b>"DNS"</b> não é "ping"')

    expect(size(png)).toEqual({ width: 1200, height: 630 })
  })
})
