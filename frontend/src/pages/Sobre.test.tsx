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

  it("todo link externo da seção de decisões aponta para o repositório", () => {
    renderPage()
    const section = screen
      .getByRole("heading", { level: 2, name: /decisões ficam registradas/ })
      .closest("section") as HTMLElement
    const external =
      section.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')
    expect(external.length).toBeGreaterThan(0)
    for (const anchor of external) {
      expect(anchor.getAttribute("href")).toMatch(
        /^https:\/\/github\.com\/msouza10\/probekit/,
      )
    }
  })

  it("avisa que um ping sem resposta não prova que o destino caiu", () => {
    renderPage()
    const section = screen
      .getByRole("heading", { level: 2, name: /o que não diz/ })
      .closest("section") as HTMLElement
    expect(
      within(section).getByText(/única sonda, em São Paulo/),
    ).toBeInTheDocument()
    expect(
      within(section).getByText(/não prova que o destino/),
    ).toBeInTheDocument()
    expect(
      within(section).getByText(/não dos servidores autoritativos/),
    ).toBeInTheDocument()
  })

  it("mantém a ordem: feito, limites, uso, quem faz, decisões, créditos", () => {
    renderPage()
    const titles = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent)
    expect(titles).toEqual([
      "Do que é feito",
      "O que o resultado diz e o que não diz",
      "Como funciona o uso",
      "Quem faz",
      "Como as decisões ficam registradas",
      "Créditos",
    ])
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
    // AWS e Azure só aparecem na biografia (experiência de quem faz), nunca
    // como parte do projeto.
    const outsideAuthor = [...container.querySelectorAll("section")]
      .filter(
        (section) => section.getAttribute("aria-labelledby") !== "quem-title",
      )
      .map((section) => section.textContent)
      .join(" ")
    expect(outsideAuthor).not.toMatch(/multicloud|\b(AWS|Azure)\b/i)
  })

  it("não repete nenhum id", () => {
    const { container } = renderPage()
    const ids = [...container.querySelectorAll("[id]")].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("mostra quem faz, com a foto e os links", () => {
    renderPage()
    const section = screen
      .getByRole("heading", { level: 2, name: "Quem faz" })
      .closest("section") as HTMLElement
    expect(
      within(section).getByRole("img", { name: "Foto de Marcos Souza" }),
    ).toHaveAttribute("src", "/brand/marcos.webp")
    expect(
      within(section).getByRole("link", { name: "GitHub" }),
    ).toHaveAttribute("href", "https://github.com/msouza10")
    expect(
      within(section).getByRole("link", { name: "LinkedIn" }),
    ).toBeInTheDocument()
  })

  it("mantém o papel de cada camada e a apresentação de quem faz", () => {
    renderPage()
    expect(screen.getByText("O que você abre no navegador")).toBeInTheDocument()
    expect(
      screen.getByText("Infraestrutura · Cloud · DevOps"),
    ).toBeInTheDocument()
    expect(screen.getByText(/Linux Essentials/)).toBeInTheDocument()
  })
})
