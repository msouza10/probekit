import { act, render, screen, within } from "@testing-library/react"
import type { Root } from "hast"
import { Suspense } from "react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import Artigo from "./Artigo"

const fixture = vi.hoisted(() => {
  const meta = {
    slug: "latencia-do-ping",
    title: "Como o ping mede a latência",
    description: "O que o tempo de ida e volta diz sobre a rede.",
    date: "2026-10-26",
    readingMinutes: 4,
  }
  const tree: Root = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "p",
        properties: {},
        children: [{ type: "text", value: "Texto do corpo do artigo." }],
      },
      {
        type: "element",
        tagName: "h2",
        properties: { id: "primeiro-passo" },
        children: [{ type: "text", value: "Primeiro passo" }],
      },
    ],
  }
  const toc = [
    { id: "primeiro-passo", title: "Primeiro passo" },
    { id: "segundo-passo", title: "Segundo passo" },
  ]
  return { meta, tree, toc }
})

vi.mock("@/lib/articles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/articles")>()
  return {
    ...actual,
    articles: [fixture.meta],
    findArticle: (slug: string) =>
      slug === fixture.meta.slug ? fixture.meta : undefined,
    loadArticle: async (slug: string) =>
      slug === fixture.meta.slug ? fixture : undefined,
  }
})

// O corpo vem de `use(promessa)`: o render precisa estar num `act` assíncrono,
// senão a primeira suspensão (promessa ainda pendente) nunca é retomada.
async function renderAt(path: string) {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/artigos/:slug"
            element={
              <Suspense fallback={null}>
                <Artigo />
              </Suspense>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
  })
}

describe("Artigo", () => {
  it("mostra um único h1 com o título, a descrição, a data e o tempo de leitura", async () => {
    await renderAt("/artigos/latencia-do-ping")

    const h1 = await screen.findByRole("heading", { level: 1 })
    expect(h1).toHaveTextContent("Como o ping mede a latência")
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(
      screen.getByText("O que o tempo de ida e volta diz sobre a rede."),
    ).toBeInTheDocument()

    const time = screen.getByText("26 de outubro de 2026")
    expect(time.tagName).toBe("TIME")
    expect(time).toHaveAttribute("datetime", "2026-10-26")
    expect(screen.getByText(/4 min de leitura/)).toBeInTheDocument()
  })

  it("renderiza o corpo do artigo", async () => {
    await renderAt("/artigos/latencia-do-ping")

    expect(
      await screen.findByText("Texto do corpo do artigo."),
    ).toBeInTheDocument()
  })

  it("monta o sumário com os ## do artigo, no topo e na lateral", async () => {
    await renderAt("/artigos/latencia-do-ping")
    await screen.findByRole("heading", { level: 1 })

    const navs = screen.getAllByRole("navigation", { name: "Nesta página" })
    expect(navs).toHaveLength(2)
    for (const nav of navs) {
      const links = within(nav).getAllByRole("link")
      expect(links.map((link) => link.getAttribute("href"))).toEqual([
        "#primeiro-passo",
        "#segundo-passo",
      ])
    }
  })

  it("tem um link de volta para a lista de artigos", async () => {
    await renderAt("/artigos/latencia-do-ping")
    await screen.findByRole("heading", { level: 1 })

    expect(screen.getByRole("link", { name: "Artigos" })).toHaveAttribute(
      "href",
      "/artigos",
    )
  })

  it("mostra a página não encontrada para um slug que não existe", async () => {
    await renderAt("/artigos/nao-existe")

    expect(
      await screen.findByRole("heading", { name: "Página não encontrada" }),
    ).toBeInTheDocument()
  })
})
