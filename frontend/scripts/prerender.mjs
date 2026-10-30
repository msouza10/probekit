/*
 * Pré-renderização (SSG): roda depois de `vite build` e de
 * `vite build --ssr src/entry-server.tsx`. Para cada rota grava em `dist/` o
 * HTML com o conteúdo e o <head> próprios, para rastreadores e prévias sociais
 * não dependerem de JavaScript. Com o `html_handling` padrão da Cloudflare,
 * `/ping` serve `ping.html`; rota desconhecida cai em `404.html` com status 404.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const dist = path.join(root, "dist")
const serverEntry = path.join(root, "node_modules/.prerender/entry-server.js")

// "/" -> index.html, "/ping" -> ping.html
export const fileFor = (route) =>
  route === "/" ? "index.html" : `${route.replace(/^\//, "")}.html`

const {
  routePaths,
  NOT_FOUND_PATH,
  renderPage,
  ogFiles,
  renderOgImage,
  sitemapXml,
} = await import(pathToFileURL(serverEntry).href)

// Lido uma vez: index.html é sobrescrito pela Home pré-renderizada.
const template = await readFile(path.join(dist, "index.html"), "utf8")

const targets = [
  ...routePaths.map((route) => [route, fileFor(route)]),
  [NOT_FOUND_PATH, "404.html"],
]

for (const [url, file] of targets) {
  const html = await renderPage(url, template)
  await mkdir(path.dirname(path.join(dist, file)), { recursive: true })
  await writeFile(path.join(dist, file), html)
  console.log(`prerender: ${url} -> dist/${file} (${html.length} bytes)`)
}

// O sitemap sai do mesmo conjunto de páginas, então não diverge dos canonicals.
await writeFile(path.join(dist, "sitemap.xml"), sitemapXml)
console.log(
  `prerender: sitemap -> dist/sitemap.xml (${sitemapXml.length} bytes)`,
)

// Imagem de pré-visualização social de cada página (og:image dela).
for (const { file, title } of ogFiles) {
  const png = await renderOgImage(title)
  await mkdir(path.dirname(path.join(dist, file)), { recursive: true })
  await writeFile(path.join(dist, file), png)
  console.log(`prerender: og -> dist/${file} (${png.length} bytes)`)
}
