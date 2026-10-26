import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { tools } from "@/lib/tools"
import Home from "./Home"

const repo = "https://github.com/msouza10/probekit"

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

describe("Home", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("lista um link para cada ferramenta disponível, com o href da rota", () => {
    renderHome()
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
    const available = tools.filter((tool) => tool.status !== "Planejado")

    expect(available.length).toBeGreaterThan(0)
    for (const tool of available) {
      expect(hrefs).toContain(tool.href)
    }
  })

  it("não lista ferramentas planejadas", () => {
    renderHome()
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
    for (const tool of tools.filter((t) => t.status === "Planejado")) {
      expect(hrefs).not.toContain(tool.href)
    }
  })

  it("não mostra bancada nem texto de exemplo", () => {
    const { container } = renderHome()
    const bench = screen
      .queryAllByRole("region")
      .find((region) => region.getAttribute("data-slot") === "bench")
    expect(bench).toBeUndefined()
    expect(container.textContent).not.toMatch(/exemplo/i)
  })

  it("fecha com duas portas: Arquitetura é um link do site e Artigos ainda é só texto", () => {
    renderHome()
    const section = screen.getByRole("region", {
      name: "Arquitetura e artigos",
    })

    const arquitetura = within(section).getByRole("link", {
      name: "Arquitetura",
    })
    // Rota interna do site, não o GitHub.
    expect(arquitetura).toHaveAttribute("href", "/arquitetura")
    expect(arquitetura).not.toHaveAttribute("target")

    // Enquanto a parte de artigos não existe, não há link nem promessa de data.
    expect(within(section).getByText("Artigos")).toBeInTheDocument()
    expect(within(section).getByText(/em breve/i)).toBeInTheDocument()
    expect(within(section).getAllByRole("link")).toHaveLength(1)
  })

  it("não tem mais o perfil do laboratório", () => {
    renderHome()
    expect(
      screen.queryByRole("region", { name: "Perfil do laboratório" }),
    ).not.toBeInTheDocument()
  })

  it("todo link externo aponta para o repositório do projeto", () => {
    const { container } = renderHome()
    const external = Array.from(container.querySelectorAll('a[href^="http"]'))
    expect(external.length).toBeGreaterThan(0)
    for (const link of external) {
      expect(link.getAttribute("href")).toMatch(
        /^https:\/\/github\.com\/msouza10\/probekit/,
      )
    }
  })

  it("mostra a coruja decorativa no herói, sem tirar título, textos e links", () => {
    const { container } = renderHome()
    const hero = container.querySelector(
      'section[aria-labelledby="home-title"]',
    )
    expect(hero).not.toBeNull()
    const owl = (hero as HTMLElement).querySelector(
      "div[aria-hidden='true'] pre",
    )
    expect(owl).not.toBeNull()
    expect(
      within(hero as HTMLElement).getByRole("heading", { level: 1 }),
    ).toHaveTextContent(/Teste se um host responde/)
    expect((hero as HTMLElement).textContent).toMatch(
      /laboratório feito para mim/,
    )
    expect((hero as HTMLElement).querySelectorAll("p")).toHaveLength(1)
    expect(
      within(hero as HTMLElement).getByRole("link", { name: "no GitHub" }),
    ).toHaveAttribute("href", repo)
  })

  it("oferece no herói só o ping rápido, sem botões de ferramenta", () => {
    const { container } = renderHome()
    const hero = container.querySelector(
      'section[aria-labelledby="home-title"]',
    ) as HTMLElement
    expect(
      within(hero).getByRole("textbox", { name: "Host ou IP" }),
    ).toBeInTheDocument()
    expect(
      within(hero).getByRole("button", { name: "Pingar" }),
    ).toBeInTheDocument()
    // O hero só tem o campo: nenhum atalho para outra ferramenta.
    expect(within(hero).queryAllByRole("button")).toHaveLength(1)
    expect(
      within(hero).queryByRole("link", { name: /DNS/ }),
    ).not.toBeInTheDocument()
    // O campo substitui os botões "Pingar um host" e "Consultar DNS".
    expect(
      within(hero).queryByRole("link", { name: "Pingar um host" }),
    ).not.toBeInTheDocument()
    expect(
      within(hero).queryByRole("link", { name: "Consultar DNS" }),
    ).not.toBeInTheDocument()
  })

  it("não chama a API ao montar", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    renderHome()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("nenhum texto começa com '//'", () => {
    const { container } = renderHome()
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    const offenders: string[] = []
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? ""
      if (text.startsWith("//")) offenders.push(text)
    }
    expect(offenders).toEqual([])
  })
})
