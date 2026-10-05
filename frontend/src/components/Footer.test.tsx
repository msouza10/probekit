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
    expect(screen.getByRole("link", { name: /ping icmp/i })).toHaveAttribute(
      "href",
      "/ping",
    )
    expect(screen.getByRole("link", { name: /consulta dns/i })).toHaveAttribute(
      "href",
      "/dns-lookup",
    )
    expect(
      screen.getByRole("link", { name: /sobre o projeto/i }),
    ).toHaveAttribute("href", "/sobre")
    expect(
      screen.getByRole("link", { name: /repositório github/i }),
    ).toHaveAttribute("href", "https://github.com/msouza10/probekit")
  })
})
