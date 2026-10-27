/*
 * Cria o arquivo de um artigo novo, já no formato certo (modelo em
 * `vite/articleTemplate.ts`). Uso:
 *
 *   npm run new:article -- <slug> "<título>"
 *   npm run new:article -- <slug> --title "<título>" --description "..." --date AAAA-MM-DD
 *   npm run new:article -- <slug> "<título>" --dir <pasta>   # fora da pasta de publicação
 *   npm run new:article -- <slug> "<título>" --force         # sobrescreve um arquivo existente
 *
 * O arquivo vai para `content/articles/<slug>.md` (o que está ali é publicado
 * no próximo deploy). Sai com 1, sem gravar nada, se o slug for inválido, se
 * faltar o título, se a data não existir ou se o arquivo já existir. O
 * TypeScript é carregado pelo servidor do Vite, como em `checkArticles.mjs`.
 */
import { mkdir, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const defaultDir = path.join(root, "content/articles")

// Argumentos: `--chave valor` (valor ausente vira undefined), `--force` e os
// posicionais (slug e título).
const positional = []
const flags = {}
const args = process.argv.slice(2)
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i]
  if (arg === "--force") flags.force = true
  else if (arg.startsWith("--")) flags[arg.slice(2)] = args[(i += 1)]
  else positional.push(arg)
}

const show = (file) => path.relative(process.cwd(), file) || file
const refuse = (message) => {
  console.error(message)
  process.exit(1)
}

const slug = positional[0]
if (!slug)
  refuse(
    'Uso: npm run new:article -- <slug> "<título>" [--description "..."] [--date AAAA-MM-DD] [--dir <pasta>] [--force]',
  )
const title = (flags.title ?? positional[1] ?? "").trim()
const dir = flags.dir ? path.resolve(flags.dir) : defaultDir
const date = flags.date ?? new Date().toISOString().slice(0, 10)

const server = await createServer({
  root,
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: "custom",
  logLevel: "silent",
})
try {
  const { isValidSlug, isRealDate } = await server.ssrLoadModule(
    "/vite/compileArticle.ts",
  )
  const { articleTemplate } = await server.ssrLoadModule(
    "/vite/articleTemplate.ts",
  )
  if (!isValidSlug(slug))
    refuse(
      `slug inválido "${slug}": use só minúsculas, números e hífens (ex.: meu-artigo)`,
    )
  if (!title) refuse('falta o título: npm run new:article -- <slug> "<título>"')
  if (!isRealDate(date))
    refuse(`data inválida "${date}": use AAAA-MM-DD com uma data que exista`)

  const file = path.join(dir, `${slug}.md`)
  if (existsSync(file) && !flags.force)
    refuse(`${show(file)} já existe; use --force para sobrescrever`)

  await mkdir(dir, { recursive: true })
  await writeFile(
    file,
    articleTemplate({ title, description: flags.description, date }),
  )

  console.log(`Criado ${show(file)}`)
  if (dir !== defaultDir)
    console.log(
      `Fora de content/articles: o artigo só vai ao ar quando for movido para lá.`,
    )
  console.log(
    [
      "",
      "Próximos passos:",
      "  1. Preencha os TODO (título, descrição e corpo).",
      `  2. npx prettier --write ${show(dir)}`,
      `  3. npm run check:articles${dir === defaultDir ? "" : ` -- --dir ${show(dir)}`}`,
    ].join("\n"),
  )
} finally {
  await server.close()
}
process.exit(0)
