import { useEffect } from "react"
import { canonicalUrl, metaFor, OG_IMAGE } from "./siteMeta"

export { metaFor } from "./siteMeta"
export type { PageMeta } from "./siteMeta"

// Cria (ou reaproveita) uma tag do <head> e define seus atributos.
function upsert(
  selector: string,
  create: () => HTMLElement,
  attrs: Record<string, string>,
) {
  let tag = document.head.querySelector<HTMLElement>(selector)
  if (!tag) {
    tag = create()
    document.head.append(tag)
  }
  for (const [name, value] of Object.entries(attrs))
    tag.setAttribute(name, value)
}

const meta = (name: string, attr: "name" | "property" = "name") => ({
  selector: `meta[${attr}="${name}"]`,
  create: () => {
    const tag = document.createElement("meta")
    tag.setAttribute(attr, name)
    return tag
  },
})

/** Atualiza título, descrição, canonical, og:, twitter: e robots conforme a rota. */
export function usePageMeta(pathname: string) {
  useEffect(() => {
    const page = metaFor(pathname)
    const url = canonicalUrl(page)
    document.title = page.title

    const description = meta("description")
    upsert(description.selector, description.create, {
      content: page.description,
    })
    const ogTitle = meta("og:title", "property")
    upsert(ogTitle.selector, ogTitle.create, { content: page.title })
    const ogDescription = meta("og:description", "property")
    upsert(ogDescription.selector, ogDescription.create, {
      content: page.description,
    })
    const ogUrl = meta("og:url", "property")
    upsert(ogUrl.selector, ogUrl.create, { content: url })
    // Sem imagem própria vale a da marca. og:image e twitter:image andam juntos.
    const image = page.image ?? OG_IMAGE
    const ogImage = meta("og:image", "property")
    upsert(ogImage.selector, ogImage.create, { content: image })

    // O cartão do Twitter/X repete os og: da página.
    const twitter = {
      "twitter:card": "summary_large_image",
      "twitter:title": page.title,
      "twitter:description": page.description,
      "twitter:image": image,
    }
    for (const [name, content] of Object.entries(twitter)) {
      const tag = meta(name)
      upsert(tag.selector, tag.create, { content })
    }

    upsert(
      'link[rel="canonical"]',
      () => {
        const link = document.createElement("link")
        link.rel = "canonical"
        return link
      },
      { href: url },
    )

    const robots = document.head.querySelector('meta[name="robots"]')
    if (page.noindex) {
      const r = meta("robots")
      upsert(r.selector, r.create, { content: "noindex" })
    } else {
      robots?.remove()
    }
  }, [pathname])
}
