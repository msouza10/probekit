/*
 * Metadados de cada rota, sem React: o mesmo módulo alimenta o hook que atualiza
 * a aba em tempo de execução (`pageMeta.ts`) e o script de pré-renderização que
 * grava o `<head>` de cada página no build (`scripts/prerender.mjs`). Assim o
 * que o navegador mostra e o que um rastreador recebe sem executar JS não
 * divergem. Só afirma o que o site faz.
 */

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
  // Dados estruturados (schema.org) da página, se houver.
  jsonLd?: Record<string, unknown>
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

const pingDescription =
  "Testa se um destino responde e mede a latência, a partir de uma sonda na Oracle Cloud em São Paulo."
const dnsDescription =
  "Consulta os registros DNS de um domínio (A, AAAA, CNAME, MX, TXT, NS e SRV), a partir de uma sonda na Oracle Cloud em São Paulo."

export const pages: Record<string, PageMeta> = {
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
    jsonLd: tool("Ping", "/ping", pingDescription),
  },
  "/dns-lookup": {
    title: `Consulta DNS (DNS Lookup) online · ${SITE_NAME}`,
    description: dnsDescription,
    path: "/dns-lookup",
    jsonLd: tool("DNS Lookup", "/dns-lookup", dnsDescription),
  },
  "/arquitetura": {
    title: `Arquitetura · ${SITE_NAME}`,
    description:
      "Do navegador à API, o pipeline de entrega e a infraestrutura do Probekit, explicados com diagramas.",
    path: "/arquitetura",
  },
  "/sobre": {
    title: `Sobre · ${SITE_NAME}`,
    description:
      "Um laboratório para aprender fazendo: do que o Probekit é feito, o que os resultados dizem, quem faz e como as decisões ficam registradas.",
    path: "/sobre",
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

export const canonicalUrl = (meta: PageMeta) =>
  meta.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${meta.path}`
