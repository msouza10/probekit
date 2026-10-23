import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { tools } from "@/lib/tools"
import Home from "./Home"

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

// A bancada da Home é um Bench (section com aria-label → role "region")
// marcado como exemplo.
function exampleBench() {
  const bench = screen
    .getAllByRole("region")
    .find((region) => region.getAttribute("data-slot") === "bench")
  expect(bench).toBeDefined()
  return bench as HTMLElement
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

  it("tem um link 'Rodar de verdade' que leva ao ping", () => {
    renderHome()
    expect(
      screen.getByRole("link", { name: /rodar de verdade/i }),
    ).toHaveAttribute("href", "/ping")
  })

  it("mostra uma bancada rotulada como exemplo, só com endereços de documentação", () => {
    renderHome()
    const bench = exampleBench()

    expect(within(bench).getByText(/exemplo/i)).toBeInTheDocument()

    const ipv4s = bench.textContent?.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) ?? []
    expect(ipv4s.length).toBeGreaterThan(0)
    for (const ip of ipv4s) {
      expect(ip).toMatch(/^192\.0\.2\./)
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
