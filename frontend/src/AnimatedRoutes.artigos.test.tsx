import { act, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AnimatedRoutes } from "./AnimatedRoutes"

const state = vi.hoisted(() => ({
  list: [] as {
    slug: string
    title: string
    description: string
    date: string
    readingMinutes: number
  }[],
}))

vi.mock("@/lib/articles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/articles")>()
  const meta = (slug: string) => state.list.find((a) => a.slug === slug)
  return {
    ...actual,
    get articles() {
      return state.list
    },
    findArticle: meta,
    loadArticle: async (slug: string) => {
      const found = meta(slug)
      return found
        ? { meta: found, tree: { type: "root", children: [] }, toc: [] }
        : undefined
    },
  }
})

const article = {
  slug: "latencia-do-ping",
  title: "Como o ping mede a latência",
  description: "O que o tempo de ida e volta diz sobre a rede.",
  date: "2026-10-26",
  readingMinutes: 2,
}

async function renderAt(path: string) {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AnimatedRoutes />
      </MemoryRouter>,
    )
  })
}

describe("rotas de artigos", () => {
  beforeEach(() => {
    state.list = []
  })

  it("com artigos, /artigos mostra a lista", async () => {
    state.list = [article]
    await renderAt("/artigos")

    expect(
      await screen.findByRole("heading", { level: 1, name: "Artigos" }),
    ).toBeInTheDocument()
  })

  it("com artigos, /artigos/<slug> mostra o artigo", async () => {
    state.list = [article]
    await renderAt("/artigos/latencia-do-ping")

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Como o ping mede a latência",
      }),
    ).toBeInTheDocument()
  })

  it("sem artigos, /artigos e /artigos/<slug> são páginas não encontradas", async () => {
    await renderAt("/artigos")
    expect(
      await screen.findByRole("heading", { name: "Página não encontrada" }),
    ).toBeInTheDocument()
  })

  it("sem artigos, um artigo avulso também não existe", async () => {
    await renderAt("/artigos/latencia-do-ping")
    expect(
      await screen.findByRole("heading", { name: "Página não encontrada" }),
    ).toBeInTheDocument()
  })
})
