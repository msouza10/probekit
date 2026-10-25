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

  it("tem um link para a página Arquitetura", () => {
    renderHome()
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
    expect(hrefs).toContain("/arquitetura")
  })

  it("mostra o perfil do laboratório com sete pares, na ordem", () => {
    const { container } = renderHome()
    const dl = container.querySelector("dl")
    expect(dl).not.toBeNull()
    const labels = Array.from((dl as HTMLElement).querySelectorAll("dt")).map(
      (dt) => dt.textContent,
    )
    expect(labels).toEqual([
      "Foco",
      "API",
      "Site",
      "Infraestrutura",
      "Entrega",
      "Decisões",
      "Licença",
    ])
    expect(
      within(dl as HTMLElement).getByRole("link", { name: "ADRs" }),
    ).toHaveAttribute("href", `${repo}/tree/main/docs/adr`)
    expect(
      within(dl as HTMLElement).getByRole("link", { name: "MIT" }),
    ).toHaveAttribute("href", `${repo}/blob/main/LICENSE`)
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
