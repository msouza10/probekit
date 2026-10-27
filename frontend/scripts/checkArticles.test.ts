// @vitest-environment node
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, it, vi } from "vitest"

// Cada execução sobe um servidor do Vite e inicia o shiki.
vi.setConfig({ testTimeout: 90_000 })

const frontend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
)
const sandbox = mkdtempSync(path.join(tmpdir(), "check-articles-"))
afterAll(() => rmSync(sandbox, { recursive: true, force: true }))

const words = (count: number) =>
  Array.from({ length: count }, () => "palavra").join(" ")

const article = (body: string) =>
  `---\ntitle: Como o ping mede a latência\ndescription: Uma explicação direta de como o ping mede o tempo de ida e volta até um servidor.\ndate: 2026-10-01\n---\n\n${body}`

const VALID = article(`## Seção\n\n${words(160)}\n`)

// Uma pasta de artigos com os arquivos dados (nome -> conteúdo).
function folder(name: string, files: Record<string, string>) {
  const dir = path.join(sandbox, name)
  mkdirSync(dir, { recursive: true })
  for (const [file, content] of Object.entries(files))
    writeFileSync(path.join(dir, file), content)
  return dir
}

function run(dir: string, ...extra: string[]) {
  const result = spawnSync(
    "node",
    ["scripts/checkArticles.mjs", "--dir", dir, ...extra],
    { cwd: frontend, encoding: "utf8" },
  )
  return { code: result.status, out: result.stdout }
}

describe("npm run check:articles", () => {
  it("sai com 0 e diz que está tudo certo quando o artigo é válido", () => {
    const { code, out } = run(folder("valido", { "valido.md": VALID }))

    expect(code).toBe(0)
    expect(out).toContain("1 artigo conferido: tudo certo.")
  })

  it("sai com 1 e mostra a linha quando há um erro", () => {
    const dir = folder("erro", {
      "erro.md": article(`# Errado\n\n${words(160)}\n`),
    })
    const { code, out } = run(dir)

    expect(code).toBe(1)
    expect(out).toContain("título # no corpo; use ##")
    expect(out).toMatch(/linha 7/)
    expect(out).toContain("1 erro")
  })

  it("só com aviso sai com 0, e com --strict sai com 1", () => {
    const dir = folder("aviso", {
      "aviso.md": article(`## Seção\n\nTexto curto.\n`),
    })

    const normal = run(dir)
    expect(normal.code).toBe(0)
    expect(normal.out).toContain("aviso")

    expect(run(dir, "--strict").code).toBe(1)
  })

  it("numa pasta sem artigos diz que não há o que conferir e sai com 0", () => {
    const { code, out } = run(folder("vazia", {}))

    expect(code).toBe(0)
    expect(out).toContain("nada a conferir")
  })
})
