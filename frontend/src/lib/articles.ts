/*
 * Catálogo dos artigos de `content/articles/*.md`. Os módulos vêm do plugin do
 * Vite (`vite/articlesPlugin.ts`). A lista usa só o export `meta`, para o
 * bundle principal não carregar o texto dos artigos; o corpo de cada um é um
 * `import()` à parte, feito quando a página abre. As funções `create*` recebem
 * os módulos por argumento para os testes não dependerem de arquivos reais.
 */
import type { ArticleMeta, CompiledArticle } from "../../vite/compileArticle.ts"

export type { ArticleMeta }
export type LoadedArticle = Pick<CompiledArticle, "meta" | "tree" | "toc">

/** Do mais novo para o mais antigo; a mesma data desempata pelo slug. */
export function createCatalog(
  metaModules: Record<string, ArticleMeta>,
): ArticleMeta[] {
  return Object.values(metaModules).sort(
    (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug),
  )
}

export const articlePath = (slug: string) => `/artigos/${slug}`

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  // Em UTC para o dia não mudar com o fuso de quem lê (nem no HTML do build).
  timeZone: "UTC",
})

/** "2026-10-26" -> "26 de outubro de 2026". */
export const formatDate = (isoDate: string) =>
  dateFormat.format(new Date(`${isoDate}T00:00:00Z`))

export function createFinder(list: ArticleMeta[]) {
  const bySlug = new Map(list.map((article) => [article.slug, article]))
  return (slug: string): ArticleMeta | undefined => bySlug.get(slug)
}

// "/content/articles/meu-artigo.md" -> "meu-artigo"
const slugOf = (path: string) => path.replace(/^.*\/([^/]+)\.md$/, "$1")

export function createLoader(
  importers: Record<string, () => Promise<CompiledArticle>>,
) {
  const bySlug = new Map(
    Object.entries(importers).map(([path, load]) => [slugOf(path), load]),
  )
  return async (slug: string): Promise<LoadedArticle | undefined> => {
    const load = bySlug.get(slug)
    if (!load) return undefined
    const { meta, tree, toc } = await load()
    return { meta, tree, toc }
  }
}

export const articles = createCatalog(
  // `?meta`: variante do módulo só com os metadados (ver articlesPlugin.ts);
  // sem ela, o corpo de cada artigo iria junto no bundle principal.
  import.meta.glob<ArticleMeta>("/content/articles/*.md", {
    query: "?meta",
    import: "meta",
    eager: true,
  }),
)

export const findArticle = createFinder(articles)

export const loadArticle = createLoader(
  import.meta.glob<CompiledArticle>("/content/articles/*.md"),
)
