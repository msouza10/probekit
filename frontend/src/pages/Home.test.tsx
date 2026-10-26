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

  it("mostra o resultado real de ping e de DNS em duas bancadas, sem rótulo de exemplo nem provedor", () => {
    renderHome()
    const benches = screen
      .getAllByRole("region")
      .filter((region) => region.getAttribute("data-slot") === "bench")

    expect(benches.map((bench) => bench.getAttribute("aria-label"))).toEqual([
      "Ping",
      "DNS Lookup",
    ])
    for (const bench of benches) {
      expect(within(bench).queryByText("exemplo")).not.toBeInTheDocument()
      expect(within(bench).queryByText("Oracle Cloud")).not.toBeInTheDocument()
    }
    expect(within(benches[0]).getByText("1.564151ms")).toBeInTheDocument()
    expect(within(benches[1]).getByText("172.67.154.227")).toBeInTheDocument()
  })

  it("não chama a API ao abrir: o exemplo é estático", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    renderHome()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("tem um link para a página Arquitetura", () => {
    renderHome()
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
    expect(hrefs).toContain("/arquitetura")
  })

  it("mostra o perfil do laboratório com quatro pares, na ordem", () => {
    renderHome()
    const dl = screen
      .getByRole("region", { name: "Perfil do laboratório" })
      .querySelector("dl")
    expect(dl).not.toBeNull()
    const labels = Array.from((dl as HTMLElement).querySelectorAll("dt")).map(
      (dt) => dt.textContent,
    )
    expect(labels).toEqual(["API", "Site", "Decisões", "Licença"])
    expect(
      within(dl as HTMLElement).getByRole("link", { name: "ADRs" }),
    ).toHaveAttribute("href", `${repo}/tree/main/docs/adr`)
    expect(
      within(dl as HTMLElement).getByRole("link", { name: "MIT" }),
    ).toHaveAttribute("href", `${repo}/blob/main/LICENSE`)
    expect(
      within(dl as HTMLElement).getByRole("link", { name: "specs" }),
    ).toHaveAttribute("href", `${repo}/tree/main/docs/superpowers/specs`)
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
    ).toHaveTextContent(/Teste um host ou consulte o DNS de um domínio/)
    expect((hero as HTMLElement).textContent).toMatch(
      /laboratório feito para mim/,
    )
    expect((hero as HTMLElement).querySelectorAll("p")).toHaveLength(1)
    expect(
      within(hero as HTMLElement).getByRole("link", { name: "no GitHub" }),
    ).toHaveAttribute("href", repo)
  })

  it("oferece no herói as entradas diretas para Ping e DNS Lookup", () => {
    const { container } = renderHome()
    const hero = container.querySelector(
      'section[aria-labelledby="home-title"]',
    ) as HTMLElement
    expect(
      within(hero).getByRole("link", { name: "Pingar um host" }),
    ).toHaveAttribute("href", "/ping")
    expect(
      within(hero).getByRole("link", { name: "Consultar DNS" }),
    ).toHaveAttribute("href", "/dns-lookup")
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
