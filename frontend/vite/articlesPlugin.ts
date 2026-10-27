/*
 * Plugin do Vite: cada `content/articles/<slug>.md` importado vira um módulo com
 * `meta`, `tree`, `toc` e `diagrams` (ver `compileArticle`). O slug é o nome do
 * arquivo. Erro de conteúdo derruba o build (e aparece no overlay do dev).
 */
import type { Plugin } from "vite"
import { compileArticle, type CompileOptions } from "./compileArticle.ts"

const ARTICLE = /\/content\/articles\/([^/]+)\.md$/

export function articlesPlugin(options: CompileOptions): Plugin {
  return {
    name: "probekit-articles",
    // Antes dos plugins de assets, que não conhecem a extensão `.md`.
    enforce: "pre",
    async transform(source, id) {
      const [file, query = ""] = id.split("?")
      const match = ARTICLE.exec(file)
      if (!match) return null

      this.addWatchFile(file)
      const { meta, tree, toc, diagrams } = await compileArticle(
        match[1],
        source,
        options,
      )
      // `?meta` é o módulo da lista de artigos: sem o corpo, que ficaria no
      // bundle principal (o mesmo módulo, importado inteiro, carrega a árvore).
      if (query.split("&").includes("meta"))
        return {
          code: `export const meta = ${JSON.stringify(meta)}`,
          map: null,
        }
      const code = [
        `export const meta = ${JSON.stringify(meta)}`,
        `export const tree = ${JSON.stringify(tree)}`,
        `export const toc = ${JSON.stringify(toc)}`,
        `export const diagrams = ${JSON.stringify(diagrams)}`,
      ].join("\n")
      return { code, map: null }
    },
  }
}
