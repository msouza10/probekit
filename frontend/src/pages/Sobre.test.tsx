import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import Sobre from "./Sobre"

const repository = "https://github.com/msouza10/probekit"

function renderPage() {
  return render(
    <MemoryRouter>
      <Sobre />
    </MemoryRouter>,
  )
}

describe("Sobre", () => {
  it("tem um h1 e um link para o repositório", () => {
    const { container } = renderPage()
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(container.querySelector(`a[href="${repository}"]`)).not.toBeNull()
  })

  it("todo link externo aponta para o repositório do projeto", () => {
    const { container } = renderPage()
    const external =
      container.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')
    expect(external.length).toBeGreaterThan(0)
    for (const anchor of external) {
      expect(anchor.getAttribute("href")).toMatch(
        /^https:\/\/github\.com\/msouza10\/probekit/,
      )
    }
  })

  it("liga as ferramentas e a Arquitetura por rotas do próprio site", () => {
    renderPage()
    expect(screen.getByRole("link", { name: "Ping" })).toHaveAttribute(
      "href",
      "/ping",
    )
    expect(screen.getByRole("link", { name: "DNS Lookup" })).toHaveAttribute(
      "href",
      "/dns-lookup",
    )
    expect(screen.getByRole("link", { name: "Arquitetura" })).toHaveAttribute(
      "href",
      "/arquitetura",
    )
  })

  it("diz de onde parte o teste e o limite de uso", () => {
    renderPage()
    const section = screen
      .getByRole("heading", { level: 2, name: "Como funciona o uso" })
      .closest("section") as HTMLElement
    expect(
      within(section).getByText(/não do seu navegador/),
    ).toBeInTheDocument()
    expect(
      within(section).getByText(/50 pedidos a cada 5 minutos/),
    ).toBeInTheDocument()
  })

  it("oferece o caminho para enviar sugestão e não promete multicloud", () => {
    const { container } = renderPage()
    expect(
      screen.getByRole("link", { name: /Enviar sugestão/ }),
    ).toHaveAttribute("href", `${repository}/issues`)
    expect(container.textContent).not.toMatch(/multicloud|\b(AWS|Azure)\b/i)
  })

  it("não repete nenhum id", () => {
    const { container } = renderPage()
    const ids = [...container.querySelectorAll("[id]")].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
