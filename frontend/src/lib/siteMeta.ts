/*
 * Metadados de cada rota, sem React: o mesmo módulo alimenta o hook que atualiza
 * a aba em tempo de execução (`pageMeta.ts`) e o script de pré-renderização que
 * grava o `<head>` de cada página no build (`scripts/prerender.mjs`). Assim o
 * que o navegador mostra e o que um rastreador recebe sem executar JS não
 * divergem. Só afirma o que o site faz.
 */

import { articlePath, articles, type ArticleMeta } from "./articles"

export const SITE_URL = "https://probekit.cc"
export const SITE_NAME = "Probekit"
export const OG_IMAGE = `${SITE_URL}/og.jpg`
export const OG_IMAGE_ALT =
  "Probekit: a coruja do projeto e o nome, com a frase ping e consulta DNS a partir de São Paulo"

export interface PageMeta {
  title: string
  description: string
  // Caminho canônico, sem barra final (a Home é "/").
  path: string
  // Páginas que não devem entrar no índice (a 404).
  noindex?: boolean
  // `og:type` da página; sem ele vale o do template ("website").
  type?: "website" | "article"
  // Imagem de pré-visualização social (URL absoluta); sem ela vale a og.jpg.
  image?: string
  // Dados estruturados (schema.org) da página, se houver.
  jsonLd?: Record<string, unknown>
  // `BreadcrumbList` da página (schema.org); a Home não tem.
  breadcrumb?: Record<string, unknown>
  // Data da última mudança (AAAA-MM-DD), no sitemap. Só os artigos a têm: das
  // páginas fixas não há data honesta (o checkout raso do CI não dá o histórico).
  lastmod?: string
}

const author = {
  "@type": "Person",
  name: "Marcos Souza",
  url: `${SITE_URL}/sobre`,
  image: `${SITE_URL}/brand/marcos.webp`,
  jobTitle: "Infraestrutura, cloud e DevOps",
  sameAs: [
    "https://github.com/msouza10",
    "https://www.linkedin.com/in/marcos-vinicius-3905b1206/",
  ],
}

const tool = (name: string, path: string, description: string) => ({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name,
  url: `${SITE_URL}${path}`,
  description,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  inLanguage: "pt-BR",
  isAccessibleForFree: true,
  author,
})

// A imagem social de uma página (`dist/og/<nome>.png`, gerada no build).
const pageImage = (name: string) => `${SITE_URL}/og/${name}.png`

const pingDescription =
  "Testa se um destino responde e mede a latência, a partir de uma sonda na Oracle Cloud em São Paulo."
const dnsDescription =
  "Consulta os registros DNS de um domínio (A, AAAA, CNAME, MX, TXT, NS e SRV), a partir de uma sonda na Oracle Cloud em São Paulo."

const fixedPages: Record<string, PageMeta> = {
  "/": {
    title: `${SITE_NAME} · Ping e consulta DNS online`,
    description:
      "Ping e consulta DNS feitos por uma sonda em São Paulo. Um laboratório pessoal de infraestrutura, com o código aberto no GitHub.",
    path: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      inLanguage: "pt-BR",
      description:
        "Ferramentas técnicas de rede feitas por uma pessoa, com o código aberto.",
      author,
    },
  },
  "/ping": {
    title: `Ping online a partir de São Paulo · ${SITE_NAME}`,
    description: pingDescription,
    path: "/ping",
    image: pageImage("ping"),
    jsonLd: tool("Ping", "/ping", pingDescription),
  },
  "/dns-lookup": {
    title: `Consulta DNS (DNS Lookup) online · ${SITE_NAME}`,
    description: dnsDescription,
    path: "/dns-lookup",
    image: pageImage("dns-lookup"),
    jsonLd: tool("DNS Lookup", "/dns-lookup", dnsDescription),
  },
  "/arquitetura": {
    title: `Arquitetura · ${SITE_NAME}`,
    description:
      "Do navegador à API, o pipeline de entrega e a infraestrutura do Probekit, explicados com diagramas.",
    path: "/arquitetura",
    image: pageImage("arquitetura"),
  },
  "/sobre": {
    title: `Sobre · ${SITE_NAME}`,
    description:
      "Um laboratório para aprender fazendo: do que o Probekit é feito, o que os resultados dizem, quem faz e como as decisões ficam registradas.",
    path: "/sobre",
    image: pageImage("sobre"),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: `Sobre · ${SITE_NAME}`,
      url: `${SITE_URL}/sobre`,
      inLanguage: "pt-BR",
      mainEntity: author,
    },
  },
}

const articleImage = pageImage

function articlePage(article: ArticleMeta): PageMeta {
  const path = articlePath(article.slug)
  return {
    title: `${article.seoTitle ?? article.title} · ${SITE_NAME}`,
    description: article.description,
    path,
    type: "article",
    image: articleImage(article.slug),
    lastmod: article.updated ?? article.date,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      description: article.description,
      datePublished: article.date,
      dateModified: article.updated ?? article.date,
      image: articleImage(article.slug),
      inLanguage: "pt-BR",
      mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${path}` },
      author,
    },
  }
}

const TITLE_SUFFIX = ` · ${SITE_NAME}`

/** O título da página sem o sufixo do site (o nome curto dela). */
export const pageName = (meta: PageMeta) =>
  meta.title.endsWith(TITLE_SUFFIX)
    ? meta.title.slice(0, -TITLE_SUFFIX.length)
    : meta.title

/**
 * `BreadcrumbList` da página: Probekit, "Artigos" (só nos artigos) e a própria
 * página, que usa o título sem o sufixo do site. Todo `item` é um canonical.
 */
export function breadcrumb(meta: PageMeta): Record<string, unknown> {
  const trail = [{ name: SITE_NAME, url: `${SITE_URL}/` }]
  if (meta.type === "article")
    trail.push({ name: "Artigos", url: `${SITE_URL}/artigos` })
  trail.push({ name: pageName(meta), url: canonicalUrl(meta) })
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map(({ name, url }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: url,
    })),
  }
}

// A Home é a raiz do site: não tem trilha.
const withBreadcrumb = (meta: PageMeta): PageMeta =>
  meta.path === "/" ? meta : { ...meta, breadcrumb: breadcrumb(meta) }

/**
 * As páginas do site: as fixas e, só quando há artigos, a lista e uma página
 * por artigo (a seção de artigos não existe sem artigo).
 */
export function buildPages(list: ArticleMeta[]): Record<string, PageMeta> {
  const all: Record<string, PageMeta> =
    list.length === 0
      ? { ...fixedPages }
      : {
          ...fixedPages,
          "/artigos": {
            title: `Artigos · ${SITE_NAME}`,
            description: "Textos do Probekit, do mais novo para o mais antigo.",
            path: "/artigos",
          },
          ...Object.fromEntries(
            list.map((article) => [
              articlePath(article.slug),
              articlePage(article),
            ]),
          ),
        }
  return Object.fromEntries(
    Object.entries(all).map(([path, meta]) => [path, withBreadcrumb(meta)]),
  )
}

export const pages = buildPages(articles)

export const notFound: PageMeta = {
  title: `Página não encontrada · ${SITE_NAME}`,
  description: "Esse endereço não existe no Probekit.",
  path: "/404",
  noindex: true,
}

/** Meta da rota; `/ping/` e `/ping` valem o mesmo. */
export function metaFor(pathname: string): PageMeta {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
  return pages[clean] ?? notFound
}

// Declaração de função (sobe no escopo): `pages` é calculado acima, no topo do
// módulo, e o breadcrumb já precisa dela.
export function canonicalUrl(meta: Pick<PageMeta, "path">) {
  return meta.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${meta.path}`
}
