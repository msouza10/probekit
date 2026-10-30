import { describe, expect, it } from "vitest"
import type { ArticleMeta } from "./articles"
import { applyPageMeta, serializeJsonLd } from "./prerenderHtml"
import { buildPages, metaFor, notFound, pages, type PageMeta } from "./siteMeta"

// Parecido com o index.html que o Vite gera (tags em várias linhas).
const template = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="canonical" href="https://probekit.cc/" />
    <title>Probekit · Ping e consulta DNS online</title>
    <meta
      name="description"
      content="Descrição da Home."
    />
    <meta property="og:title" content="Título da Home" />
    <meta
      property="og:description"
      content="Descrição da Home."
    />
    <meta property="og:url" content="https://probekit.cc/" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://probekit.cc/og.jpg" />
    <meta property="og:image:alt" content="Alt da marca" />
    <script type="module" crossorigin src="/assets/index-abc.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

const body = "<main><h1>Conteúdo</h1></main>"

describe("applyPageMeta", () => {
  it("troca título, descrição, canonical e og: pelos da rota", () => {
    const meta = pages["/ping"]
    const html = applyPageMeta(template, meta, body)
    expect(html).toContain(`<title>${meta.title}</title>`)
    expect(html).toContain(`content="${meta.description}"`)
    expect(html).toContain(
      '<link rel="canonical" href="https://probekit.cc/ping" />',
    )
    expect(html).toContain(
      `<meta property="og:title" content="${meta.title}" />`,
    )
    expect(html).toContain(
      '<meta property="og:url" content="https://probekit.cc/ping" />',
    )
    expect(html).not.toContain("Descrição da Home")
    expect(html).not.toContain("Título da Home")
  })

  it("mantém uma só ocorrência de cada tag", () => {
    const html = applyPageMeta(template, pages["/sobre"], body)
    for (const pattern of [
      /<title>/g,
      /rel="canonical"/g,
      /name="description"/g,
      /property="og:title"/g,
      /property="og:description"/g,
      /property="og:url"/g,
    ])
      expect(html.match(pattern)).toHaveLength(1)
  })

  it("cria as tags que o template não tem", () => {
    const minimal = `<html><head><title>x</title></head><body><div id="root"></div></body></html>`
    const html = applyPageMeta(minimal, pages["/ping"], body)
    expect(html).toContain(
      '<link rel="canonical" href="https://probekit.cc/ping" />',
    )
    expect(html).toContain('name="description"')
    expect(html).toContain('property="og:url"')
  })

  it("coloca o corpo dentro de #root e preserva os scripts com hash", () => {
    const html = applyPageMeta(template, pages["/"], body)
    expect(html).toContain(`<div id="root">${body}</div>`)
    expect(html).toContain('src="/assets/index-abc.js"')
  })

  it("não interpreta $ do conteúdo como padrão de substituição", () => {
    const html = applyPageMeta(template, pages["/"], "<p>custa $& e $1</p>")
    expect(html).toContain("<p>custa $& e $1</p>")
  })

  it("escapa aspas, & e < no título e na descrição", () => {
    const meta: PageMeta = {
      title: 'A & B <i> "c"',
      description: 'Diz "oi" & <vai>',
      path: "/x",
    }
    const html = applyPageMeta(template, meta, body)
    expect(html).toContain('<title>A &amp; B &lt;i&gt; "c"</title>')
    expect(html).toContain('content="Diz &quot;oi&quot; &amp; &lt;vai&gt;"')
  })

  it("não marca noindex nas páginas normais", () => {
    for (const meta of Object.values(pages))
      expect(applyPageMeta(template, meta, body)).not.toContain("noindex")
  })

  it("marca a 404 como noindex, uma vez só", () => {
    const html = applyPageMeta(template, notFound, body)
    expect(
      html.match(/<meta name="robots" content="noindex" \/>/g),
    ).toHaveLength(1)
    expect(html).toContain(`<title>${notFound.title}</title>`)
  })

  it("inclui o JSON-LD da página e o breadcrumb, cada um no seu script", () => {
    const html = applyPageMeta(template, pages["/ping"], body)
    const blocks = [
      ...html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ]
    expect(blocks).toHaveLength(2)
    expect(JSON.parse(blocks[0][1])).toEqual(pages["/ping"].jsonLd)
    expect(JSON.parse(blocks[1][1])).toEqual(pages["/ping"].breadcrumb)
  })

  it("toda página, a 404 inclusive, tem twitter:card e twitter:* iguais aos og:*", () => {
    const content = (html: string, attr: string, key: string) =>
      new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`).exec(
        html,
      )?.[1]
    for (const meta of [...Object.values(pages), notFound]) {
      const html = applyPageMeta(template, meta, body)
      expect(content(html, "name", "twitter:card")).toBe("summary_large_image")
      for (const key of ["title", "description", "image"])
        expect(content(html, "name", `twitter:${key}`)).toBe(
          content(html, "property", `og:${key}`),
        )
    }
  })

  it("a Home leva só o JSON-LD dela, sem breadcrumb", () => {
    const html = applyPageMeta(template, pages["/"], body)
    expect(html.match(/application\/ld\+json/g)).toHaveLength(1)
    expect(html).not.toContain("BreadcrumbList")
  })

  it("página sem JSON-LD próprio leva só o breadcrumb", () => {
    const html = applyPageMeta(template, pages["/arquitetura"], body)
    expect(html.match(/application\/ld\+json/g)).toHaveLength(1)
    expect(html).toContain("BreadcrumbList")
  })

  it("não cria script de JSON-LD na 404, que não tem dados estruturados", () => {
    const html = applyPageMeta(template, notFound, body)
    expect(html).not.toContain("ld+json")
  })

  describe("imagem e tipo por página", () => {
    const meta: PageMeta = {
      title: "Um artigo",
      description: "Descrição do artigo.",
      path: "/artigos/um-artigo",
      type: "article",
      image: "https://probekit.cc/og/um-artigo.png",
    }

    it("troca og:type, og:image e og:image:alt quando a página os define", () => {
      const html = applyPageMeta(template, meta, body)

      expect(html).toContain('<meta property="og:type" content="article" />')
      expect(html).toContain(
        '<meta property="og:image" content="https://probekit.cc/og/um-artigo.png" />',
      )
      expect(html).toContain(
        '<meta property="og:image:alt" content="Um artigo" />',
      )
      expect(html).not.toContain("og.jpg")
      expect(html).not.toContain("Alt da marca")
    })

    it("mantém a imagem e o tipo do template quando a página não os define", () => {
      // A Home não define imagem própria; as outras páginas fixas já definem.
      const html = applyPageMeta(template, pages["/"], body)

      expect(html).toContain('content="https://probekit.cc/og.jpg"')
      expect(html).toContain('<meta property="og:type" content="website" />')
      expect(html).toContain("Alt da marca")
    })

    it("mantém uma só ocorrência de og:type, og:image e og:image:alt", () => {
      const html = applyPageMeta(template, meta, body)

      for (const pattern of [
        /property="og:type"/g,
        /property="og:image"/g,
        /property="og:image:alt"/g,
      ])
        expect(html.match(pattern)).toHaveLength(1)
    })
  })

  it("título de artigo com </script> e & sai escapado no head e no JSON-LD", () => {
    const evil: ArticleMeta = {
      slug: "x",
      title: 'A </script><script>alert(1)</script> & "b"',
      description: "Descrição.",
      date: "2026-10-26",
      readingMinutes: 1,
    }
    const html = applyPageMeta(template, buildPages([evil])["/artigos/x"], body)
    const blocks = [
      ...html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ]

    expect(html).not.toContain("<script>alert(1)")
    expect(html).toContain("A &lt;/script&gt;&lt;script&gt;alert(1)")
    expect(blocks).toHaveLength(2)
    expect(JSON.parse(blocks[0][1])).toMatchObject({ headline: evil.title })
    // O título perigoso também vai no nome do breadcrumb e volta igual.
    expect(JSON.parse(blocks[1][1])).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [{}, {}, { name: evil.title }],
    })
  })

  it("usa a meta da rota desconhecida (404) via metaFor", () => {
    expect(metaFor("/nao-existe")).toBe(notFound)
  })
})

describe("serializeJsonLd", () => {
  it("escapa < para não fechar o <script> antes da hora", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" })
    expect(out).not.toContain("<")
    expect(out).toContain("\\u003c/script>")
  })

  it("o JSON escapado volta ao mesmo objeto no JSON.parse", () => {
    const data = { a: "<b>x</b> & \u2028 \u2029", n: [1, { c: "</" }] }
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data)
  })

  it("escapa os separadores de linha U+2028 e U+2029", () => {
    const out = serializeJsonLd({ a: "\u2028\u2029" })
    expect(out).not.toMatch(/[\u2028\u2029]/)
  })
})
