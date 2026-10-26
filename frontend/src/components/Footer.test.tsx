import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { Footer } from "./Footer"

describe("Footer", () => {
  it("renders brand name, navigation links, and GitHub reference", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )

    expect(screen.getAllByText(/probekit/i)[0]).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ping" })).toHaveAttribute(
      "href",
      "/ping",
    )
    expect(screen.getByRole("link", { name: "DNS Lookup" })).toHaveAttribute(
      "href",
      "/dns-lookup",
    )
    expect(
      screen.getByRole("link", { name: "Todas as ferramentas" }),
    ).toHaveAttribute("href", "/#ferramentas")
    expect(screen.getByRole("link", { name: /arquitetura/i })).toHaveAttribute(
      "href",
      "/arquitetura",
    )
    expect(
      screen.getByRole("link", { name: /sobre o projeto/i }),
    ).toHaveAttribute("href", "/sobre")
    expect(
      screen.getByRole("link", { name: /repositório github/i }),
    ).toHaveAttribute("href", "https://github.com/msouza10/probekit")
  })

  it("só aponta para fora com links do repositório, em primeira pessoa", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )
    const external = screen
      .getAllByRole("link")
      .filter((link) => /^https?:/.test(link.getAttribute("href") ?? ""))
    expect(external.length).toBeGreaterThan(0)
    for (const link of external) {
      expect(link.getAttribute("href")).toMatch(
        /^https:\/\/github\.com\/msouza10\/probekit/,
      )
    }
    expect(screen.getByText(/aprender|estudar/i)).toBeInTheDocument()
  })
})
