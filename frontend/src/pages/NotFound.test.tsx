import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import NotFound from "./NotFound"

describe("NotFound", () => {
  it("renders the not-found heading and a link back to home", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole("heading", { name: /página não encontrada/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /voltar para a página inicial/i }),
    ).toHaveAttribute("href", "/")
  })

  it("não usa o jargão de erro do visual antigo", () => {
    const { container } = render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    )
    const text = container.textContent ?? ""
    expect(text).not.toContain("404_ROUTE")
    expect(text.trim().startsWith("//")).toBe(false)
    expect(screen.queryByText(/^\s*\/\//)).toBeNull()
  })

  it("o link de volta se chama Voltar para a página inicial", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole("link", { name: "Voltar para a página inicial" }),
    ).toHaveAttribute("href", "/")
  })
})
