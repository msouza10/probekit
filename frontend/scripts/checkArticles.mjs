/*
 * Confere todos os artigos de `content/articles/*.md` e imprime o relatório
 * (ver `vite/articleChecks.ts`). Uso:
 *
 *   npm run check:articles                  # confere content/articles
 *   npm run check:articles -- --strict      # avisos também falham
 *   npm run check:articles -- --dir <pasta> # confere outra pasta
 *
 * Sai com 1 se houver erro (com --strict, também se houver aviso) e com 0 nos
 * outros casos, inclusive quando não há artigos. O TypeScript é carregado pelo
 * servidor do Vite, com a mesma configuração do build.
 */
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
const dirFlag = args.indexOf("--dir")
const dir =
  dirFlag >= 0
    ? path.resolve(args[dirFlag + 1] ?? "")
    : path.join(root, "content/articles")
const strict = args.includes("--strict")
const show = (file) => path.relative(process.cwd(), file) || file

const names = (await readdir(dir).catch(() => []))
  .filter((name) => name.endsWith(".md"))
  .sort()

if (names.length === 0) {
  console.log(`Nenhum artigo em ${show(dir)}: nada a conferir.`)
  process.exit(0)
}

const server = await createServer({
  root,
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: "custom",
  logLevel: "silent",
})
let code = 0
try {
  const { checkAll, formatReport } = await server.ssrLoadModule(
    "/vite/articleChecks.ts",
  )
  const { diagramNames } = await server.ssrLoadModule(
    "/src/components/article/diagramNames.ts",
  )
  const articles = await Promise.all(
    names.map(async (name) => ({
      slug: name.replace(/\.md$/, ""),
      file: show(path.join(dir, name)),
      source: await readFile(path.join(dir, name), "utf8"),
    })),
  )
  const { text, errors, warnings } = formatReport(
    await checkAll(articles, { diagramNames }),
  )
  console.log(text)
  code = errors > 0 || (strict && warnings > 0) ? 1 : 0
} finally {
  await server.close()
}
process.exit(code)
