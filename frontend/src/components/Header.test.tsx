import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
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

    await user.click(screen.getByRole("button", { name: /^ferramentas$/i }))

    expect(await screen.findByRole("link", { name: /ping/i })).toHaveAttribute(
      "href",
      "/ping",
    )
    expect(
      await screen.findByRole("link", { name: /dns lookup/i }),
    ).toHaveAttribute("href", "/dns-lookup")
  })
})

describe("Header search", () => {
  it("filters by unaccented terms and opens a result with Enter", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Header />
        <Routes>
          <Route path="/ping" element={<h1>Diagnóstico Ping</h1>} />
          <Route path="/" element={null} />
        </Routes>
      </MemoryRouter>,
    )
    await user.click(screen.getByRole("button", { name: "Buscar ferramentas" }))
    const input = screen.getByRole("textbox", { name: "Pesquisar ferramentas" })
    expect(input).toHaveFocus()
    await user.type(input, "latencia")
    expect(screen.getByRole("button", { name: /Ping/ })).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /DNS Lookup/ }),
    ).not.toBeInTheDocument()
    await user.keyboard("{Enter}")
    expect(
      screen.getByRole("heading", { name: "Diagnóstico Ping" }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows an empty state and restores focus when dismissed", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )
    const trigger = screen.getByRole("button", { name: "Buscar ferramentas" })
    await user.click(trigger)
    await user.type(
      screen.getByRole("textbox", { name: "Pesquisar ferramentas" }),
      "zzzzzz",
    )
    expect(
      screen.getByText(/Nenhuma ferramenta encontrada/),
    ).toBeInTheDocument()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(screen.queryByText("BETA")).not.toBeInTheDocument()
  })
})
