/// <reference types="node" />
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

/*
 * Guarda do redesign (ver docs/superpowers/specs/2026-10-23-probekit-frontend-redesign-design.md).
 * Cada task do redesign acrescenta aqui os arquivos que migrou para a nova
 * linguagem visual; a partir daí eles não podem voltar a usar gradiente,
 * sombra, hover que levanta ou os nomes antigos de token.
 */
const redesigned: string[] = [
  "src/components/ui/button.tsx",
  "src/components/ui/card.tsx",
  "src/components/ui/badge.tsx",
  "src/components/ui/separator.tsx",
  "src/components/Bench.tsx",
  "src/components/Header.tsx",
  "src/components/Footer.tsx",
  "src/components/ThemeToggle.tsx",
]

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const read = (relativePath: string) =>
  readFileSync(resolve(frontendRoot, relativePath), "utf8")

const surfaceDecoration =
  /linear-gradient|radial-gradient|box-shadow|\bshadow(-\w+)?\b/
const liftingHover = /hover:-?translate-y|hover:scale/
const legacyTokenClass =
  /\b(text|bg|border|ring|fill|stroke)-(snow|ash|fog|graphite|page-ink|card-carbon|deep-coal|steel-border|blue-cornflower)\b/

describe("design guard", () => {
  it("index.html não carrega fontes do Google e mantém o script de tema", () => {
    const html = read("index.html")
    expect(html).not.toContain("fonts.googleapis.com")
    expect(html).toContain("probekit-theme")
  })

  it("a fonte sans da interface não é a JetBrains Mono", () => {
    const css = read("src/index.css")
    const declarations = css.match(/--font-sans:[^;]*;/g) ?? []
    expect(declarations.length).toBeGreaterThan(0)
    for (const declaration of declarations) {
      expect(declaration.toLowerCase()).not.toContain("jetbrains")
    }
  })

  it.each(redesigned.length > 0 ? redesigned : ["(nenhum ainda)"])(
    "%s segue a linguagem visual do redesign",
    (relativePath) => {
      if (relativePath === "(nenhum ainda)") return
      const content = read(relativePath)
      expect(content).not.toMatch(surfaceDecoration)
      expect(content).not.toMatch(liftingHover)
      expect(content).not.toMatch(legacyTokenClass)
    },
  )
})
