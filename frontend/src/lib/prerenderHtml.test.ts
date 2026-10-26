import { describe, expect, it } from "vitest"
import { applyPageMeta, serializeJsonLd } from "./prerenderHtml"
import { metaFor, notFound, pages, type PageMeta } from "./siteMeta"

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

  it("inclui o JSON-LD da página quando existe, e só ele", () => {
    const html = applyPageMeta(template, pages["/ping"], body)
    const blocks = [
      ...html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ]
    expect(blocks).toHaveLength(1)
    expect(JSON.parse(blocks[0][1])).toEqual(pages["/ping"].jsonLd)
  })

  it("não cria script de JSON-LD em página sem dados estruturados", () => {
    const html = applyPageMeta(template, pages["/arquitetura"], body)
    expect(html).not.toContain("ld+json")
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
