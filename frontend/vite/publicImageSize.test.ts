import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { beforeAll, describe, expect, it } from "vitest"
import { publicImageSize } from "./publicImageSize.ts"

// PNG de 2 × 3 pixels (o menor possível: assinatura, IHDR, IDAT e IEND).
const PNG_2X3 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAYAAAC56t6BAAAAEklEQVR4nGP8z8Dwn4EIwAhiAAAkLAIBM+k0EwAAAABJRU5ErkJggg==",
  "base64",
)

let publicDir: string
let imageSize: ReturnType<typeof publicImageSize>

beforeAll(() => {
  const root = mkdtempSync(path.join(tmpdir(), "public-image-size-"))
  publicDir = path.join(root, "public")
  mkdirSync(path.join(publicDir, "articles"), { recursive: true })
  writeFileSync(path.join(publicDir, "articles", "a.png"), PNG_2X3)
  writeFileSync(path.join(publicDir, "articles", "nota.txt"), "não é imagem")
  writeFileSync(path.join(root, "segredo.png"), PNG_2X3)
  imageSize = publicImageSize(publicDir)
})

describe("publicImageSize", () => {
  it("lê a largura e a altura de uma imagem de public/", () => {
    expect(imageSize("/articles/a.png")).toEqual({ width: 2, height: 3 })
  })

  it("devolve null para arquivo que não existe", () => {
    expect(imageSize("/articles/nao-existe.png")).toBeNull()
  })

  it("devolve null para arquivo que não é imagem", () => {
    expect(imageSize("/articles/nota.txt")).toBeNull()
  })

  it("devolve null para destino externo ou relativo", () => {
    expect(imageSize("https://exemplo.com/a.png")).toBeNull()
    expect(imageSize("//exemplo.com/a.png")).toBeNull()
    expect(imageSize("articles/a.png")).toBeNull()
  })

  it("não lê arquivo fora de public/", () => {
    expect(imageSize("/../segredo.png")).toBeNull()
    expect(imageSize("/articles/../../segredo.png")).toBeNull()
  })

  it("ignora a query e o fragmento do destino", () => {
    expect(imageSize("/articles/a.png?v=2#topo")).toEqual({
      width: 2,
      height: 3,
    })
  })
})
