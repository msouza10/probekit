/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

/*
 * Guarda do redesign (ver docs/superpowers/specs/2026-10-23-probekit-frontend-redesign-design.md).
 * Vale para src/index.css e para todo .tsx de produção em src: nenhum pode
 * usar gradiente, sombra, hover que levanta ou os nomes antigos de token.
 */
const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const redesigned: string[] = [
  "src/index.css",
  ...readdirSync(resolve(frontendRoot, "src"), {
    recursive: true,
    encoding: "utf8",
  })
    .filter((file) => file.endsWith(".tsx") && !file.endsWith(".test.tsx"))
    .map((file) => `src/${file}`)
    .sort(),
]

const read = (relativePath: string) =>
  readFileSync(resolve(frontendRoot, relativePath), "utf8")

/*
 * Componente de terceiros (21st.dev) usado como veio: o gradiente dele é uma
 * máscara que apaga as pontas da faixa de tecnologias, não decoração de fundo.
 */
const gradientAllowed = ["src/components/ui/logo-cloud-3.tsx"]

const surfaceDecoration =
  /linear-gradient|radial-gradient|box-shadow|\bshadow(-\w+)?\b/
const liftingHover = /hover:-?translate-y|hover:scale/
const legacyTokenClass =
  /\b(text|bg|border|ring|fill|stroke)-(snow|ash|fog|graphite|page-ink|card-carbon|deep-coal|steel-border|blue-cornflower)\b/

const legacyTokenDefinition =
  /--color-(snow|ash|fog|graphite|page-ink|card-carbon|deep-coal|onyx|steel-border|blue-cornflower|signal-red(-surface)?)\b/

describe("design guard", () => {
  it("index.css não define mais os aliases dos nomes antigos de token", () => {
    expect(read("src/index.css")).not.toMatch(legacyTokenDefinition)
  })

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

  it("a lista computada cobre as páginas e os diagramas novos", () => {
    expect(redesigned).toEqual(
      expect.arrayContaining([
        "src/pages/Arquitetura.tsx",
        "src/components/diagrams/Diagram.tsx",
        "src/components/diagrams/svgParts.tsx",
        "src/pages/Ping.tsx",
      ]),
    )
  })

  it.each(redesigned.length > 0 ? redesigned : ["(nenhum ainda)"])(
    "%s segue a linguagem visual do redesign",
    (relativePath) => {
      if (relativePath === "(nenhum ainda)") return
      const content = read(relativePath)
      if (!gradientAllowed.includes(relativePath)) {
        expect(content).not.toMatch(surfaceDecoration)
      }
      expect(content).not.toMatch(liftingHover)
      expect(content).not.toMatch(legacyTokenClass)
    },
  )
})
