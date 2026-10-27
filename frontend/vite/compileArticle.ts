/*
 * Compila um artigo em markdown (front matter + corpo) para o que o site usa:
 * `meta`, a árvore do corpo (hast, serializável em JSON), o sumário e os
 * diagramas citados. Roda só no build (Node), chamado pelo plugin do Vite.
 * Todo erro de conteúdo sai como `<slug>: <problema>`, para o build apontar o
 * arquivo. HTML cru do `.md` é descartado e links com protocolo perigoso
 * perdem o destino: o corpo só vira o que o renderizador do site conhece.
 */
import rehypeShiki from "@shikijs/rehype"
import GithubSlugger from "github-slugger"
import matter from "gray-matter"
import type { Element, Root } from "hast"
import { toString as textOf } from "hast-util-to-string"
import { CORE_SCHEMA, load } from "js-yaml"
import remarkDirective from "remark-directive"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"
import { visit } from "unist-util-visit"
import { isSafeUrl } from "../src/lib/safeUrl.ts"

export type ArticleMeta = {
  slug: string
  title: string
  description: string
  date: string
  updated?: string
  readingMinutes: number
}

export type TocEntry = { id: string; title: string }

export type CompiledArticle = {
  meta: ArticleMeta
  tree: Root
  toc: TocEntry[]
  diagrams: string[]
}

export type CompileOptions = { diagramNames: readonly string[] }

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const DESCRIPTION_MAX = 160
const WORDS_PER_MINUTE = 200

const fail = (slug: string, problem: string): never => {
  throw new Error(`${slug}: ${problem}`)
}

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  )
}

function readMeta(slug: string, data: Record<string, unknown>, body: string) {
  if (!SLUG.test(slug)) fail(slug, "slug inválido")

  const title = typeof data.title === "string" ? data.title.trim() : ""
  if (!title) fail(slug, "title vazio")

  const description =
    typeof data.description === "string" ? data.description.trim() : ""
  if (!description) fail(slug, "description vazia")
  if (description.length > DESCRIPTION_MAX)
    fail(slug, `description com mais de ${DESCRIPTION_MAX} caracteres`)

  const date = String(data.date ?? "")
  if (!isRealDate(date)) fail(slug, `date inválida "${date}"`)

  const meta: ArticleMeta = {
    slug,
    title,
    description,
    date,
    readingMinutes: Math.max(
      1,
      Math.ceil(body.split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE),
    ),
  }
  if (data.updated !== undefined) {
    const updated = String(data.updated)
    if (!isRealDate(updated)) fail(slug, `updated inválida "${updated}"`)
    if (updated < date) fail(slug, "updated anterior a date")
    meta.updated = updated
  }
  return meta
}

type DirectiveNode = {
  type: "leafDirective" | "textDirective" | "containerDirective"
  name: string
  attributes?: Record<string, string | null | undefined> | null
  data?: Record<string, unknown>
}
type Parent = { children: unknown[] }

// `::diagram{name="..."}` vira o elemento `article-diagram`. Um `:palavra` solto
// no texto (como em "Nota:importante") não é diretiva: volta a ser texto.
function remarkDiagrams(
  slug: string,
  options: CompileOptions,
  found: string[],
) {
  return () => (tree: unknown) => {
    visit(
      tree as never,
      (
        node: unknown,
        index: number | undefined,
        parent: Parent | undefined,
      ) => {
        const directive = node as DirectiveNode
        if (
          directive.type === "textDirective" &&
          parent &&
          index !== undefined
        ) {
          parent.children[index] = { type: "text", value: `:${directive.name}` }
          return
        }
        if (
          directive.type !== "leafDirective" &&
          directive.type !== "containerDirective"
        )
          return
        if (
          directive.type === "containerDirective" ||
          directive.name !== "diagram"
        )
          fail(slug, `diretiva desconhecida "${directive.name}"`)

        const name = directive.attributes?.name
        if (!name) fail(slug, "diagrama sem nome")
        if (!options.diagramNames.includes(name as string))
          fail(slug, `diagrama desconhecido "${name}"`)
        if (found.includes(name as string))
          fail(slug, `diagrama repetido "${name}"`)
        found.push(name as string)
        directive.data = {
          hName: "article-diagram",
          hProperties: { name },
        }
      },
    )
  }
}

// Remove o destino de links e imagens que não passam em `isSafeUrl`.
function rehypeSafeUrls() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      const key =
        node.tagName === "a" ? "href" : node.tagName === "img" ? "src" : null
      const value = key ? node.properties?.[key] : undefined
      if (key && typeof value === "string" && !isSafeUrl(value))
        delete node.properties[key]
    })
  }
}

// Ids dos títulos, sumário (só os ##) e recusa de `#` no corpo.
function rehypeHeadings(slug: string, toc: TocEntry[]) {
  return () => (tree: Root) => {
    const slugger = new GithubSlugger()
    visit(tree, "element", (node: Element) => {
      if (!/^h[1-6]$/.test(node.tagName)) return
      if (node.tagName === "h1") fail(slug, "título # no corpo; use ##")
      const title = textOf(node)
      // Âncoras só em ASCII ("Títulos" -> "titulos"): URLs fáceis de digitar.
      const id = slugger.slug(title.normalize("NFD").replace(/\p{M}/gu, ""))
      node.properties = { ...node.properties, id }
      if (node.tagName === "h2") toc.push({ id, title })
    })
  }
}

// A árvore sem `position`, que só pesaria no JSON gerado no build.
function withoutPositions<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (key, item) =>
      key === "position" ? undefined : item,
    ),
  )
}

const unsupported = () => {
  throw new Error("front matter deve ser YAML")
}

export async function compileArticle(
  slug: string,
  source: string,
  options: CompileOptions,
): Promise<CompiledArticle> {
  let parsed: matter.GrayMatterFile<string>
  try {
    parsed = matter(source, {
      // `---js` executaria código do arquivo; só YAML é aceito.
      engines: {
        // Sem o tipo "data" do YAML: `date: 2026-02-30` ficaria 2 de março,
        // em silêncio. Como texto, a validação abaixo recusa a data impossível.
        yaml: (text: string) => load(text, { schema: CORE_SCHEMA }) as object,
        js: unsupported,
        javascript: unsupported,
        json: unsupported,
      },
    })
  } catch (error) {
    return fail(slug, error instanceof Error ? error.message : String(error))
  }

  const meta = readMeta(slug, parsed.data, parsed.content)
  const toc: TocEntry[] = []
  const diagrams: string[] = []

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkDiagrams(slug, options, diagrams))
    .use(remarkRehype)
    .use(rehypeSafeUrls)
    .use(rehypeHeadings(slug, toc))
    .use(rehypeShiki, {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      fallbackLanguage: "text",
    })

  const tree = (await processor.run(processor.parse(parsed.content))) as Root
  return { meta, tree: withoutPositions(tree), toc, diagrams }
}
