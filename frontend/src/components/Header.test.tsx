import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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

  it("renders a link to the Sobre page", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )
    const link = screen.getByRole("link", { name: /sobre/i })
    expect(link).toHaveAttribute("href", "/sobre")
  })

  it("opens the Ferramentas dropdown and links to each tool", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: /ferramentas/i }))

    expect(await screen.findByRole("link", { name: /ping/i })).toHaveAttribute(
      "href",
      "/ping",
    )
    expect(
      await screen.findByRole("link", { name: /dns lookup/i }),
    ).toHaveAttribute("href", "/dns-lookup")
  })
})
