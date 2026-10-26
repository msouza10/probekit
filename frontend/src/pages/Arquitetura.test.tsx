import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import Arquitetura from "./Arquitetura"

function renderPage() {
  return render(
    <MemoryRouter>
      <Arquitetura />
    </MemoryRouter>,
  )
}

describe("Arquitetura", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("tem um único h1", () => {
    renderPage()
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(
      screen.getByRole("heading", { level: 1, name: "Arquitetura" }),
    ).toBeInTheDocument()
  })

  it("tem três seções numeradas mais Princípios", () => {
    renderPage()
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(4)
    for (const name of [
      "Do cliente à API",
      "Pipeline",
      "Infraestrutura",
      "Princípios",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name }),
      ).toBeInTheDocument()
    }
  })

  it("não repete nenhum id", () => {
    const { container } = renderPage()
    const ids = [...container.querySelectorAll("[id]")].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("só aponta para fora com links do repositório", () => {
    const { container } = renderPage()
    const external = container.querySelectorAll('a[href^="http"]')
    expect(external.length).toBeGreaterThan(0)
    for (const link of external) {
      expect(link.getAttribute("href")).toMatch(
        /^https:\/\/github\.com\/msouza10\/probekit/,
      )
    }
  })

  it("não usa rótulos com // no começo", () => {
    const { container } = renderPage()
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      expect(walker.currentNode.textContent?.trim()).not.toMatch(/^\/\//)
    }
  })

  it("mostra o diagrama de arquitetura na seção 01", () => {
    renderPage()
    const section = screen
      .getByRole("heading", { level: 2, name: "Do cliente à API" })
      .closest("section")
    expect(section).not.toBeNull()
    expect(
      within(section as HTMLElement).getByRole("img", {
        name: /arquitetura/i,
      }),
    ).toBeInTheDocument()
  })

  it("mostra o diagrama do pipeline na seção 02", () => {
    renderPage()
    const section = screen
      .getByRole("heading", { level: 2, name: "Pipeline" })
      .closest("section")
    expect(section).not.toBeNull()
    expect(
      within(section as HTMLElement).getByRole("img", { name: /pipeline/i }),
    ).toBeInTheDocument()
  })

  it("mostra o diagrama da infraestrutura na seção 03", () => {
    renderPage()
    const section = screen
      .getByRole("heading", { level: 2, name: "Infraestrutura" })
      .closest("section")
    expect(section).not.toBeNull()
    expect(
      within(section as HTMLElement).getByRole("img", {
        name: /infraestrutura/i,
      }),
    ).toBeInTheDocument()
  })

  it("liga cada seção às fontes certas, com ADRs específicos", () => {
    const { container } = renderPage()
    const hrefs = [...container.querySelectorAll("a")].map((a) =>
      a.getAttribute("href"),
    )
    const adrs = hrefs.filter((h) => h?.includes("/docs/adr/0"))
    expect(adrs).toEqual([
      expect.stringContaining("0001-oci-network-load-balancer.md"),
      expect.stringContaining("0002-terminacao-tls-cloudflare-full-strict.md"),
      expect.stringContaining("0008-deploy-do-site-pelo-github-actions.md"),
      expect.stringContaining("0005-atualizacao-das-vms-e-deploy-inicial.md"),
    ])
  })

  it("descreve o limite por visitante, sem dizer que todos dividem o IP da borda", () => {
    const { container } = renderPage()
    expect(container.textContent).toMatch(/CF-Connecting-IP/)
    expect(container.textContent).not.toMatch(/dividem? o limite/)
  })

  it("explica as quatro fases do pipeline, na ordem, com as duas trilhas", () => {
    renderPage()
    const section = screen
      .getByRole("heading", { level: 2, name: "Pipeline" })
      .closest("section") as HTMLElement
    const terms = [...section.querySelectorAll("dt")].map(
      (dt) => dt.textContent,
    )
    expect(terms).toEqual([
      "01 · Pull request e CI",
      "02 · Build e release",
      "03 · Deploy",
      "04 · Recuperação",
    ])
    const text = section.textContent ?? ""
    // As duas trilhas divergem de verdade, e o texto não as mistura.
    // O CI roda no pull request, antes do merge (não há fase separada de CI).
    expect(text).toMatch(/o CI roda nele, antes do merge/i)
    expect(text).toMatch(
      /só deixa o merge acontecer com esses três checks verdes/i,
    )
    expect(text).toMatch(/deploy da API é manual/i)
    expect(text).toMatch(/deploy do site é automático/i)
    expect(text).toMatch(/só se as mensagens de commit pedirem/i)
    expect(text).toMatch(/marca uma release anterior como a mais recente/i)
  })

  it("em toda seção o diagrama vem depois do texto e antes das fontes", () => {
    const { container } = renderPage()
    const after = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    const sections = [...container.querySelectorAll("section[id^=secao-]")]
    expect(sections).toHaveLength(3)
    for (const section of sections) {
      const figure = section.querySelector("figure") as Element
      const links = section.querySelector("ul:last-of-type") as Element
      for (const text of section.querySelectorAll(
        ":scope > div > p, :scope > div > dl",
      )) {
        expect(
          after(text, figure),
          `${section.id}: texto antes do diagrama`,
        ).toBe(true)
      }
      expect(
        after(figure, links),
        `${section.id}: fontes depois do diagrama`,
      ).toBe(true)
    }
  })

  it("a abertura do Pipeline se entende sem ter visto o diagrama", () => {
    renderPage()
    const section = screen
      .getByRole("heading", { level: 2, name: "Pipeline" })
      .closest("section") as HTMLElement
    const intro = section.querySelector("p") as HTMLElement
    // Nomeia as fases e as trilhas em palavras, em vez de apontar para números
    // que só o desenho define.
    expect(intro.textContent).toMatch(/quatro fases/)
    expect(intro.textContent).toMatch(
      /pull request e CI, build e release, deploy e recuperação/,
    )
    expect(intro.textContent).not.toMatch(/fases 2 e 3/)
  })

  it("não menciona AWS nem Azure em lugar nenhum", () => {
    const { container } = renderPage()
    expect(container.textContent).not.toMatch(/\b(AWS|Azure)\b/i)
  })

  it("não afirma que as VMs se atualizam sozinhas", () => {
    const { container } = renderPage()
    expect(container.textContent).not.toMatch(/atualizam sozinhas/i)
  })

  it("não chama fetch ao montar", () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    renderPage()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
