/*
 * Transforma o `index.html` gerado pelo Vite no HTML de uma rota: troca o
 * `<head>` (título, descrição, canonical, og:, robots, JSON-LD) e coloca o
 * corpo já renderizado dentro de `#root`. É uma função pura, sem React nem
 * disco, para poder ser testada; quem a chama no build é `scripts/prerender.mjs`
 * (via `src/entry-server.tsx`).
 */
import { canonicalUrl, type PageMeta } from "./siteMeta"

const escapeText = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const escapeAttr = (value: string) => escapeText(value).replace(/"/g, "&quot;")

/**
 * Serializa o JSON-LD para ir dentro de um `<script>`. Um `<` no texto (como
 * em `</script>`) fecharia a tag antes da hora, então vira `<`, que o
 * JSON.parse devolve como o mesmo `<`. U+2028 e U+2029 também são escapados.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

// Usa função como substituto para que `$&` e similares no conteúdo não sejam
// interpretados pelo `String.replace`.
function replaceOnce(html: string, pattern: RegExp, replacement: string) {
  return html.replace(pattern, () => replacement)
}

function insertInHead(html: string, tag: string) {
  return replaceOnce(html, /<\/head>/, `    ${tag}\n  </head>`)
}

// Troca o `content` de uma <meta> existente ou cria a tag no fim do <head>.
function setMeta(
  html: string,
  attr: "name" | "property",
  key: string,
  content: string,
) {
  const tag = `<meta ${attr}="${key}" content="${escapeAttr(content)}" />`
  const existing = new RegExp(`<meta\\s+${attr}="${key}"[^>]*>`)
  return existing.test(html)
    ? replaceOnce(html, existing, tag)
    : insertInHead(html, tag)
}

function setCanonical(html: string, url: string) {
  const tag = `<link rel="canonical" href="${escapeAttr(url)}" />`
  const existing = /<link\s+rel="canonical"[^>]*>/
  return existing.test(html)
    ? replaceOnce(html, existing, tag)
    : insertInHead(html, tag)
}

/**
 * Devolve o HTML da página: `template` (o index.html do Vite) com o `<head>`
 * da rota e `body` dentro de `<div id="root">`.
 */
export function applyPageMeta(
  template: string,
  meta: PageMeta,
  body: string,
): string {
  let html = template
  html = replaceOnce(
    html,
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeText(meta.title)}</title>`,
  )
  html = setMeta(html, "name", "description", meta.description)
  html = setMeta(html, "property", "og:title", meta.title)
  html = setMeta(html, "property", "og:description", meta.description)
  html = setMeta(html, "property", "og:url", canonicalUrl(meta))
  // Sem tipo ou imagem próprios, ficam os do template (website e a og.jpg).
  if (meta.type) html = setMeta(html, "property", "og:type", meta.type)
  if (meta.image) {
    html = setMeta(html, "property", "og:image", meta.image)
    html = setMeta(html, "property", "og:image:alt", meta.title)
  }
  html = setCanonical(html, canonicalUrl(meta))

  // O template não deve ter robots; se tiver, a página decide.
  html = html.replace(/<meta\s+name="robots"[^>]*>\s*/g, "")
  if (meta.noindex)
    html = insertInHead(html, '<meta name="robots" content="noindex" />')

  if (meta.jsonLd)
    html = insertInHead(
      html,
      `<script type="application/ld+json">${serializeJsonLd(meta.jsonLd)}</script>`,
    )

  return replaceOnce(
    html,
    /<div id="root">\s*<\/div>/,
    `<div id="root">${body}</div>`,
  )
}
