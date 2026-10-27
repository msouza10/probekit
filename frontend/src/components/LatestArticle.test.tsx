import { render, screen, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import type { ArticleMeta } from "@/lib/articles"
import { LatestArticleCard, LatestArticleLine } from "./LatestArticle"

const article: ArticleMeta = {
  slug: "latencia-do-ping",
  title: "Como o ping mede a latência",
  description: "O que o tempo de ida e volta diz sobre a rede.",
  date: "2026-10-26",
  readingMinutes: 4,
}

const inRouter = (node: ReactNode) =>
  render(<MemoryRouter>{node}</MemoryRouter>)

describe("LatestArticleLine", () => {
  it("diz 'Último artigo' e leva ao artigo pelo título", () => {
    inRouter(<LatestArticleLine article={article} />)

    expect(screen.getByText("Último artigo")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Como o ping mede a latência" }),
    ).toHaveAttribute("href", "/artigos/latencia-do-ping")
  })

  it("não diz 'Novo', que ficaria desatualizado", () => {
    const { container } = inRouter(<LatestArticleLine article={article} />)

    expect(container.textContent).not.toMatch(/\bnovo\b/i)
  })
})

describe("LatestArticleCard", () => {
  it("é a região Artigos, com o título como link para o artigo", () => {
    inRouter(<LatestArticleCard article={article} />)
    const region = screen.getByRole("region", { name: "Artigos" })

    expect(
      within(region).getByRole("link", { name: "Como o ping mede a latência" }),
    ).toHaveAttribute("href", "/artigos/latencia-do-ping")
  })

  it("mostra a descrição, a data por extenso e o tempo de leitura", () => {
    inRouter(<LatestArticleCard article={article} />)

    expect(
      screen.getByText("O que o tempo de ida e volta diz sobre a rede."),
    ).toBeInTheDocument()
    const time = screen.getByText("26 de outubro de 2026")
    expect(time.tagName).toBe("TIME")
    expect(time).toHaveAttribute("datetime", "2026-10-26")
    expect(screen.getByText(/4 min de leitura/)).toBeInTheDocument()
  })

  it("tem o link Todos os artigos para a lista", () => {
    inRouter(<LatestArticleCard article={article} />)

    expect(
      screen.getByRole("link", { name: "Todos os artigos" }),
    ).toHaveAttribute("href", "/artigos")
  })
})
