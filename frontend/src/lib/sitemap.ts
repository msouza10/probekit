/*
 * O `sitemap.xml`, gerado no build a partir das páginas do site (`siteMeta.ts`)
 * em vez de mantido à mão: assim ele lista os artigos novos e nunca diverge dos
 * canonicals das páginas. Quem o grava em `dist/` é `scripts/prerender.mjs`
 * (via `entry-server.tsx`).
 */
import { canonicalUrl, type PageMeta } from "./siteMeta"

export type SitemapEntry = { path: string; lastmod?: string }

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")

/** As páginas que podem ir para o índice (sem a 404), na ordem do site. */
export function sitemapEntries(
  pages: Record<string, PageMeta>,
): SitemapEntry[] {
  return Object.values(pages)
    .filter((page) => !page.noindex)
    .map(({ path, lastmod }) => (lastmod ? { path, lastmod } : { path }))
}

export function buildSitemap(entries: SitemapEntry[]): string {
  const urls = entries.map(({ path, lastmod }) => {
    const loc = `<loc>${escapeXml(canonicalUrl({ path }))}</loc>`
    return `  <url>${loc}${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ""}</url>`
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n")
}
