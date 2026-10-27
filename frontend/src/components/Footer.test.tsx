import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Footer } from "./Footer"

// O link "Artigos" só existe quando há artigos: cada teste escolhe o catálogo.
const catalog = vi.hoisted(() => ({ list: [] as unknown[] }))
vi.mock("@/lib/articles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/articles")>()),
  get articles() {
    return catalog.list
  },
}))
beforeEach(() => {
  catalog.list = []
})

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

  it("sem artigos, não tem o link Artigos", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )

    expect(screen.queryByRole("link", { name: "Artigos" })).toBeNull()
  })

  it("com artigos, tem o link Artigos na coluna do projeto", () => {
    catalog.list = [{ slug: "um-artigo" }]
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )
    const project = screen.getByRole("navigation", {
      name: "Projeto no rodapé",
    })

    expect(
      within(project).getByRole("link", { name: "Artigos" }),
    ).toHaveAttribute("href", "/artigos")
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
    expect(screen.getByText(/feitas por mim/i)).toBeInTheDocument()
  })

  it("as duas colunas de links têm a mesma quantidade e a licença fica na base", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )
    const tools = screen.getByRole("navigation", {
      name: "Ferramentas no rodapé",
    })
    const project = screen.getByRole("navigation", {
      name: "Projeto no rodapé",
    })
    expect(within(tools).getAllByRole("link")).toHaveLength(3)
    expect(within(project).getAllByRole("link")).toHaveLength(3)
    expect(screen.getByRole("link", { name: "Licença MIT" })).toHaveAttribute(
      "href",
      "https://github.com/msouza10/probekit/blob/main/LICENSE",
    )
    expect(
      within(project).queryByRole("link", { name: "Licença MIT" }),
    ).toBeNull()
  })
})
