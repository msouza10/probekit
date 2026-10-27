/*
 * Confere artigos em markdown de uma vez só, para o autor ver tudo o que está
 * errado ou faltando antes do pull request. Erros são o que o build recusa
 * (`compileArticle`, em modo `report`, mais corpo vazio); avisos são o que não
 * quebra, mas deixa o artigo pior ou diferente do que o autor imagina. Usado
 * por `scripts/checkArticles.mjs`. Os limites dos avisos são escolhas de
 * edição, não regra do site: ajuste as constantes abaixo.
 */
import remarkDirective from "remark-directive"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import { unified } from "unified"
import { visit } from "unist-util-visit"
import { isSafeUrl } from "../src/lib/safeUrl.ts"
import { compileArticle, splitArticle } from "./compileArticle.ts"

export type Finding = {
  level: "error" | "warning"
  message: string
  line?: number
}
export type ArticleReport = { slug: string; file: string; findings: Finding[] }
export type CheckOptions = {
  diagramNames: readonly string[]
  /** AAAA-MM-DD; o padrão é hoje, em UTC. */
  today?: string
}

const TITLE_MAX = 60
const DESCRIPTION_MIN = 70
const BODY_MIN_WORDS = 150
const USED_FIELDS = new Set(["title", "description", "date", "updated"])
// Aspas e travessões "inteligentes" quebram um comando copiado do bloco.
const TYPOGRAPHIC = /[“”‘’–—]/
// O marcador do modelo; "todos" e "TODOS" no texto não contam.
const TODO = /\bTODO\b/

type MdNode = {
  type: string
  depth?: number
  lang?: string | null
  value?: string
  url?: string
  position?: { start: { line: number } }
}

const rank = (finding: Finding) => (finding.level === "error" ? 0 : 1)
const sorted = (findings: Finding[]) =>
  [...findings].sort(
    (a, b) => rank(a) - rank(b) || (a.line ?? 0) - (b.line ?? 0),
  )

export async function checkArticle(
  slug: string,
  source: string,
  options: CheckOptions,
): Promise<Finding[]> {
  const findings: Finding[] = []
  await compileArticle(slug, source, {
    diagramNames: options.diagramNames,
    report: (problem) => findings.push({ level: "error", ...problem }),
  })

  let split: ReturnType<typeof splitArticle>
  try {
    split = splitArticle(source)
  } catch {
    return sorted(findings) // o cabeçalho ilegível já foi reportado
  }
  const { data, content, lineOffset } = split
  const warn = (message: string, line?: number) =>
    findings.push(
      line === undefined
        ? { level: "warning", message }
        : { level: "warning", message, line: line + lineOffset },
    )

  if (content.trim() === "") {
    findings.push({ level: "error", message: "corpo vazio" })
    return sorted(findings)
  }

  const title = typeof data.title === "string" ? data.title.trim() : ""
  if (title.length > TITLE_MAX)
    warn(
      `title com ${title.length} caracteres (o buscador mostra até cerca de ${TITLE_MAX})`,
    )
  const description =
    typeof data.description === "string" ? data.description.trim() : ""
  if (description && description.length < DESCRIPTION_MIN)
    warn(
      `description com ${description.length} caracteres (abaixo de ${DESCRIPTION_MIN}, curta para o resultado de busca)`,
    )

  // Texto de modelo (`npm run new:article`) que ninguém trocou iria ao ar.
  const todoNote = '"TODO" (parte do modelo sem preencher)'
  if (TODO.test(title)) warn(`title contém ${todoNote}`)
  if (TODO.test(description)) warn(`description contém ${todoNote}`)
  const todoLine = content.split("\n").findIndex((line) => TODO.test(line))
  if (todoLine >= 0) warn(`corpo contém ${todoNote}`, todoLine + 1)

  const today = options.today ?? new Date().toISOString().slice(0, 10)
  const date = String(data.date ?? "")
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date > today)
    warn(
      `date ${date} é posterior a hoje (${today}); o artigo aparece no site mesmo assim`,
    )

  for (const key of Object.keys(data))
    if (!USED_FIELDS.has(key))
      warn(
        key === "draft"
          ? 'campo "draft" não é usado pelo site: o artigo é publicado mesmo assim'
          : `campo "${key}" não é usado pelo site (será ignorado)`,
      )

  const words = content.split(/\s+/).filter(Boolean).length
  if (words < BODY_MIN_WORDS)
    warn(`corpo com ${words} palavras (menos de ${BODY_MIN_WORDS})`)

  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .parse(content)
  let sections = 0
  visit(tree as never, (raw: unknown) => {
    const node = raw as MdNode
    const line = node.position?.start.line
    if (node.type === "heading" && node.depth === 2) sections += 1
    if (node.type === "html") warn("HTML cru no corpo (será descartado)", line)
    if (node.type === "code") {
      if (!node.lang) warn("bloco de código sem linguagem (fica sem cor)", line)
      const char = TYPOGRAPHIC.exec(node.value ?? "")?.[0]
      if (char)
        warn(
          `bloco de código com "${char}" (caractere tipográfico): use o ASCII, senão o comando copiado quebra`,
          line,
        )
    }
    if (
      (node.type === "link" || node.type === "image") &&
      node.url !== undefined &&
      !isSafeUrl(node.url)
    )
      warn(
        `${node.type === "link" ? "link" : "imagem"} com destino não permitido (perde o destino): ${node.url}`,
        line,
      )
  })
  if (sections === 0)
    warn('nenhuma seção ## (o artigo fica sem o sumário "Nesta página")')

  return sorted(findings)
}

const normalize = (title: string) =>
  title.trim().toLowerCase().replace(/\s+/g, " ")

export async function checkAll(
  articles: { slug: string; file: string; source: string }[],
  options: CheckOptions,
): Promise<ArticleReport[]> {
  const reports: ArticleReport[] = []
  const titles = new Map<string, ArticleReport[]>()
  for (const { slug, file, source } of articles) {
    const report = {
      slug,
      file,
      findings: await checkArticle(slug, source, options),
    }
    reports.push(report)
    try {
      const { title } = splitArticle(source).data
      if (typeof title === "string" && title.trim()) {
        const key = normalize(title)
        titles.set(key, [...(titles.get(key) ?? []), report])
      }
    } catch {
      // cabeçalho ilegível: já é erro no relatório do arquivo
    }
  }
  for (const group of titles.values())
    if (group.length > 1)
      for (const report of group)
        for (const other of group)
          if (other !== report)
            report.findings.push({
              level: "warning",
              message: `title igual ao de ${other.file}`,
            })
  return reports
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

export function formatReport(reports: ArticleReport[]) {
  let errors = 0
  let warnings = 0
  const blocks: string[] = []
  for (const { file, findings } of reports) {
    if (findings.length === 0) continue
    const lines = findings.map((finding) => {
      if (finding.level === "error") errors += 1
      else warnings += 1
      const level = finding.level === "error" ? "erro" : "aviso"
      const where = finding.line === undefined ? "" : `linha ${finding.line}`
      return `  ${level.padEnd(5)}  ${where.padEnd(9)} ${finding.message}`
    })
    blocks.push([file, ...lines].join("\n"))
  }
  const counts = [
    errors > 0 ? plural(errors, "erro", "erros") : "",
    warnings > 0 ? plural(warnings, "aviso", "avisos") : "",
  ].filter(Boolean)
  const summary = `${plural(reports.length, "artigo conferido", "artigos conferidos")}: ${
    counts.length > 0 ? counts.join(" e ") : "tudo certo"
  }.`
  return { text: [...blocks, summary].join("\n\n"), errors, warnings }
}
