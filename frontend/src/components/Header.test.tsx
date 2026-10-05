import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { Header } from "./Header"

describe("Header", () => {
  it("renders the Probekit site name as a link to the home page", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )
    const link = screen.getByRole("link", { name: /probekit/i })
    expect(link).toHaveAttribute("href", "/")
  })
})
