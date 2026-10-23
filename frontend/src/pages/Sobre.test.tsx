import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import Sobre from "./Sobre"

const repository = "https://github.com/msouza10/probekit"

describe("Sobre", () => {
  it("tem um h1 e um link para o repositório", () => {
    const { container } = render(<Sobre />)
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    expect(container.querySelector(`a[href="${repository}"]`)).not.toBeNull()
  })

  it("todo link externo aponta para o repositório do projeto", () => {
    const { container } = render(<Sobre />)
    const external =
      container.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')
    expect(external.length).toBeGreaterThan(0)
    for (const anchor of external) {
      expect(anchor.getAttribute("href")).toMatch(
        /^https:\/\/github\.com\/msouza10\/probekit/,
      )
    }
  })
})
