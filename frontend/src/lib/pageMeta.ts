import { useEffect } from "react"

export interface PageMeta {
  title: string
  description: string
}

const SITE = "Probekit"

// Título e descrição de cada rota: aparecem na aba, nos resultados de busca e
// na prévia de quem compartilha o link. Só afirmam o que o site faz.
const pages: Record<string, PageMeta> = {
  "/": {
    title: `${SITE} · Ping e DNS a partir de São Paulo`,
    description:
      "Ping e consulta DNS feitos por uma sonda em São Paulo. Um laboratório pessoal de infraestrutura, com o código aberto no GitHub.",
  },
  "/ping": {
    title: `Ping · ${SITE}`,
    description:
      "Testa se um destino responde e mede a latência, a partir de uma sonda na Oracle Cloud em São Paulo.",
  },
  "/dns-lookup": {
    title: `DNS Lookup · ${SITE}`,
    description:
      "Consulta os registros DNS de um domínio, a partir de uma sonda na Oracle Cloud em São Paulo.",
  },
  "/arquitetura": {
    title: `Arquitetura · ${SITE}`,
    description:
      "Do navegador à API, o pipeline de entrega e a infraestrutura do Probekit, explicados com diagramas.",
  },
  "/sobre": {
    title: `Sobre · ${SITE}`,
    description:
      "Um laboratório para aprender fazendo: do que o Probekit é feito, o que os resultados dizem, quem faz e como as decisões ficam registradas.",
  },
}

const notFound: PageMeta = {
  title: `Página não encontrada · ${SITE}`,
  description: "Esse endereço não existe no Probekit.",
}

/** Meta da rota; `/ping/` e `/ping` valem o mesmo. */
export function metaFor(pathname: string): PageMeta {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
  return pages[clean] ?? notFound
}

function setDescription(content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  )
  if (!tag) {
    tag = document.createElement("meta")
    tag.name = "description"
    document.head.append(tag)
  }
  tag.content = content
}

/** Atualiza o título e a descrição do documento conforme a rota. */
export function usePageMeta(pathname: string) {
  useEffect(() => {
    const { title, description } = metaFor(pathname)
    document.title = title
    setDescription(description)
  }, [pathname])
}
