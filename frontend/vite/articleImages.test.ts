import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// Confere os artigos de verdade (não texto de exemplo): cada imagem local que
// um artigo usa existe em public/ e cabe no orçamento de peso. Imagem pesada
// atrasa o LCP do artigo; o limite sai do achado 4 da auditoria de SEO
// (docs/runbook-seo.md). Para uma imagem que precise de mais, suba o limite aqui.
const KB = 1024
const WEIGHT_LIMIT = 100 * KB

const root = path.resolve(import.meta.dirname, "..")
const articlesDir = path.join(root, "content/articles")
const publicDir = path.join(root, "public")

// `![alt](/caminho/da/imagem.ext)`: só destinos do próprio site, sem `//host`.
const LOCAL_IMAGE = /!\[[^\]]*\]\((\/(?!\/)[^)\s]+)\)/g

const images = readdirSync(articlesDir)
  .filter((file) => file.endsWith(".md"))
  .flatMap((file) =>
    [
      ...readFileSync(path.join(articlesDir, file), "utf8").matchAll(
        LOCAL_IMAGE,
      ),
    ].map((match) => ({ article: file, src: match[1] })),
  )

describe("imagens dos artigos", () => {
  it("há ao menos uma imagem local para conferir", () => {
    expect(images.length).toBeGreaterThan(0)
  })

  it.each(images)("$article: $src existe em public/", ({ src }) => {
    expect(existsSync(path.join(publicDir, src))).toBe(true)
  })

  it.each(images)("$article: $src pesa até 100 kB", ({ src }) => {
    const file = path.join(publicDir, src)
    expect(existsSync(file)).toBe(true)
    expect(statSync(file).size).toBeLessThanOrEqual(WEIGHT_LIMIT)
  })
})
