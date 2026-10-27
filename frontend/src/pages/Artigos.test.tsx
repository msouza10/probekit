import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import Artigos from "./Artigos"

const fixture = vi.hoisted(() => ({
  articles: [
    {
      slug: "mais-novo",
      title: "O artigo mais novo",
      description: "Descrição do mais novo.",
      date: "2026-10-26",
      readingMinutes: 3,
    },
    {
      slug: "mais-antigo",
      title: "O artigo mais antigo",
      description: "Descrição do mais antigo.",
      date: "2026-01-10",
      readingMinutes: 7,
    },
  ],
}))

vi.mock("@/lib/articles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/articles")>()
  return { ...actual, articles: fixture.articles }
})

function renderList() {
  return render(
    <MemoryRouter>
      <Artigos />
    </MemoryRouter>,
  )
}

describe("Artigos", () => {
  it("tem um único h1 chamado Artigos", () => {
    renderList()

    const headings = screen.getAllByRole("heading", { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent("Artigos")
  })

  it("lista os artigos na ordem do catálogo, cada um com link para a página", () => {
    renderList()

    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(2)

    const first = within(items[0])
    expect(
      first.getByRole("link", { name: "O artigo mais novo" }),
    ).toHaveAttribute("href", "/artigos/mais-novo")
    expect(first.getByText("Descrição do mais novo.")).toBeInTheDocument()
    expect(first.getByText("26 de outubro de 2026").tagName).toBe("TIME")

    expect(
      within(items[1]).getByRole("link", { name: "O artigo mais antigo" }),
    ).toHaveAttribute("href", "/artigos/mais-antigo")
  })
})
