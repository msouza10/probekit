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
})
