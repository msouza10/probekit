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

export type Problem = { message: string; line?: number }

export type CompileOptions = {
  diagramNames: readonly string[]
  /**
   * Sem ele, o primeiro problema de conteúdo lança `<slug>: <problema>` (o
   * build para). Com ele, cada problema é entregue a quem chamou e a
   * compilação continua, para um relatório mostrar todos de uma vez.
   */
  report?: (problem: Problem) => void
  /**
   * Largura e altura de uma imagem pelo destino escrito no markdown, ou `null`
   * se não houver (destino externo, arquivo que não existe). Com o tamanho no
   * `<img>`, o navegador reserva o espaço antes de baixar a imagem e o texto
   * abaixo dela não é empurrado. Sem a opção, as imagens ficam como estão.
   */
  imageSize?: (src: string) => { width: number; height: number } | null
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const DESCRIPTION_MAX = 160
const WORDS_PER_MINUTE = 200

type Raise = (message: string, line?: number) => void

// Lança no primeiro problema, ou entrega cada um a `report` e segue.
const raiser =
  (slug: string, report?: CompileOptions["report"]): Raise =>
  (message, line) => {
    if (!report) throw new Error(`${slug}: ${message}`)
    report(line === undefined ? { message } : { message, line })
  }

/** O nome do arquivo (sem `.md`) vira o endereço: minúsculas, números e hífens. */
export const isValidSlug = (slug: string) => SLUG.test(slug)

/** `AAAA-MM-DD` com uma data que existe (`2026-02-30` não). */
export function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  )
}

// O meta e todos os problemas do cabeçalho, na ordem das regras.
function readMeta(slug: string, data: Record<string, unknown>, body: string) {
  const problems: string[] = []
  if (!isValidSlug(slug)) problems.push("slug inválido")

  const title = typeof data.title === "string" ? data.title.trim() : ""
  if (!title) problems.push("title vazio")

  const description =
    typeof data.description === "string" ? data.description.trim() : ""
  if (!description) problems.push("description vazia")
  else if (description.length > DESCRIPTION_MAX)
    problems.push(`description com mais de ${DESCRIPTION_MAX} caracteres`)

  const date = String(data.date ?? "")
  const dateOk = isRealDate(date)
  if (!dateOk) problems.push(`date inválida "${date}"`)

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
    if (!isRealDate(updated)) problems.push(`updated inválida "${updated}"`)
    else {
      if (dateOk && updated < date) problems.push("updated anterior a date")
      meta.updated = updated
    }
  }
  return { meta, problems }
}

type DirectiveNode = {
  type: "leafDirective" | "textDirective" | "containerDirective"
  name: string
  attributes?: Record<string, string | null | undefined> | null
  data?: Record<string, unknown>
  position?: { start: { line: number } }
}
type Parent = { children: unknown[] }

// `::diagram{name="..."}` vira o elemento `article-diagram`. Um `:palavra` solto
// no texto (como em "Nota:importante") não é diretiva: volta a ser texto.
function remarkDiagrams(
  raise: Raise,
  options: CompileOptions,
  found: string[],
  lineOffset: number,
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
        const line = lineOf(directive, lineOffset)
        if (
          directive.type === "containerDirective" ||
          directive.name !== "diagram"
        )
          return raise(`diretiva desconhecida "${directive.name}"`, line)

        const name = directive.attributes?.name
        if (!name) return raise("diagrama sem nome", line)
        if (!options.diagramNames.includes(name))
          return raise(`diagrama desconhecido "${name}"`, line)
        if (found.includes(name))
          return raise(`diagrama repetido "${name}"`, line)
        found.push(name)
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

// Acrescenta `width` e `height` às imagens cujo tamanho `imageSize` conhece.
function rehypeImageSizes(imageSize: CompileOptions["imageSize"]) {
  return () => (tree: Root) => {
    if (!imageSize) return
    visit(tree, "element", (node: Element) => {
      const src = node.tagName === "img" ? node.properties?.src : undefined
      if (typeof src !== "string") return
      const size = imageSize(src)
      if (size) Object.assign(node.properties, size)
    })
  }
}

// Ids dos títulos, sumário (só os ##) e recusa de `#` no corpo.
function rehypeHeadings(raise: Raise, toc: TocEntry[], lineOffset: number) {
  return () => (tree: Root) => {
    const slugger = new GithubSlugger()
    visit(tree, "element", (node: Element) => {
      if (!/^h[1-6]$/.test(node.tagName)) return
      if (node.tagName === "h1")
        raise("título # no corpo; use ##", lineOf(node, lineOffset))
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

// A linha do nó no arquivo inteiro (o corpo é lido sem o cabeçalho).
const lineOf = (
  node: { position?: { start: { line: number } } },
  lineOffset: number,
) => (node.position ? node.position.start.line + lineOffset : undefined)

/**
 * Separa o cabeçalho (YAML) do corpo. `lineOffset` é quantas linhas do arquivo
 * vêm antes do corpo, para os problemas do corpo apontarem a linha certa.
 * Lança se o cabeçalho não for YAML legível.
 */
export function splitArticle(source: string) {
  const parsed = matter(source, {
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
  const before = source.slice(0, source.length - parsed.content.length)
  return {
    data: parsed.data as Record<string, unknown>,
    content: parsed.content,
    lineOffset: (before.match(/\n/g) ?? []).length,
  }
}

export async function compileArticle(
  slug: string,
  source: string,
  options: CompileOptions,
): Promise<CompiledArticle> {
  const raise = raiser(slug, options.report)

  let split: ReturnType<typeof splitArticle>
  try {
    split = splitArticle(source)
  } catch (error) {
    raise(error instanceof Error ? error.message : String(error))
    // Só chega aqui com `report`: sem cabeçalho legível não há o que compilar.
    return {
      meta: { slug, title: "", description: "", date: "", readingMinutes: 1 },
      tree: { type: "root", children: [] },
      toc: [],
      diagrams: [],
    }
  }

  const { meta, problems } = readMeta(slug, split.data, split.content)
  for (const problem of problems) raise(problem)
  const toc: TocEntry[] = []
  const diagrams: string[] = []

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkDiagrams(raise, options, diagrams, split.lineOffset))
    .use(remarkRehype)
    .use(rehypeSafeUrls)
    .use(rehypeImageSizes(options.imageSize))
    .use(rehypeHeadings(raise, toc, split.lineOffset))
    .use(rehypeShiki, {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      fallbackLanguage: "text",
    })

  const tree = (await processor.run(processor.parse(split.content))) as Root
  return { meta, tree: withoutPositions(tree), toc, diagrams }
}
