// @vitest-environment node
import { spawnSync } from "node:child_process"
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, it, vi } from "vitest"

// Cada execução sobe um servidor do Vite.
vi.setConfig({ testTimeout: 90_000 })

const frontend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
)
const sandbox = mkdtempSync(path.join(tmpdir(), "new-article-"))
afterAll(() => rmSync(sandbox, { recursive: true, force: true }))

let counter = 0
// Uma pasta nova por teste, para um não enxergar o arquivo do outro.
const folder = () => path.join(sandbox, `pasta-${(counter += 1)}`)

function run(...args: string[]) {
  const result = spawnSync("node", ["scripts/newArticle.mjs", ...args], {
    cwd: frontend,
    encoding: "utf8",
  })
  return { code: result.status, out: result.stdout, err: result.stderr }
}

const today = () => new Date().toISOString().slice(0, 10)

describe("npm run new:article", () => {
  it("cria o arquivo com o título dado e a data de hoje", () => {
    const dir = folder()
    const { code, out } = run(
      "meu-artigo",
      "Como o ping mede a latência",
      "--dir",
      dir,
    )
    const file = path.join(dir, "meu-artigo.md")

    expect(code).toBe(0)
    expect(existsSync(file)).toBe(true)
    const text = readFileSync(file, "utf8")
    expect(text).toContain('title: "Como o ping mede a latência"')
    expect(text).toContain(`date: ${today()}`)
    expect(text).toContain("TODO")
    expect(out).toContain("meu-artigo.md")
    expect(out).toContain("check:articles")
  })

  it("aceita o título por --title, a descrição e a data", () => {
    const dir = folder()
    const { code } = run(
      "outro",
      "--title",
      "Outro assunto",
      "--description",
      "Uma descrição já escrita pelo autor.",
      "--date",
      "2026-11-02",
      "--dir",
      dir,
    )
    const text = readFileSync(path.join(dir, "outro.md"), "utf8")

    expect(code).toBe(0)
    expect(text).toContain('title: "Outro assunto"')
    expect(text).toContain(
      'description: "Uma descrição já escrita pelo autor."',
    )
    expect(text).toContain("date: 2026-11-02")
  })

  it("cria a pasta quando ela não existe", () => {
    const dir = path.join(folder(), "fundo", "mais-fundo")

    expect(run("x", "Título", "--dir", dir).code).toBe(0)
    expect(existsSync(path.join(dir, "x.md"))).toBe(true)
  })

  describe("recusa, sem gravar nada", () => {
    it.each([
      ["slug com maiúscula", ["Meu-Artigo", "Título"], "slug inválido"],
      ["slug com sublinhado", ["a_b", "Título"], "slug inválido"],
      ["sem título", ["so-o-slug"], "título"],
      ["título vazio", ["x", "   "], "título"],
      ["data impossível", ["x", "Título", "--date", "2026-02-30"], "data"],
    ])("%s", (_name, args, message) => {
      const dir = folder()
      const { code, err } = run(...args, "--dir", dir)

      expect(code).toBe(1)
      expect(err).toContain(message)
      expect(existsSync(dir)).toBe(false)
    })

    it("um arquivo que já existe, deixando o conteúdo intacto", () => {
      const dir = folder()
      expect(run("repetido", "Primeiro", "--dir", dir).code).toBe(0)
      const file = path.join(dir, "repetido.md")
      const before = readFileSync(file, "utf8")

      const { code, err } = run("repetido", "Segundo", "--dir", dir)

      expect(code).toBe(1)
      expect(err).toContain("já existe")
      expect(readFileSync(file, "utf8")).toBe(before)
    })
  })

  it("com --force sobrescreve um arquivo que já existe", () => {
    const dir = folder()
    run("repetido", "Primeiro", "--dir", dir)
    const file = path.join(dir, "repetido.md")
    writeFileSync(file, "conteúdo antigo")

    const { code } = run("repetido", "Segundo", "--dir", dir, "--force")

    expect(code).toBe(0)
    expect(readFileSync(file, "utf8")).toContain('title: "Segundo"')
  })
})
