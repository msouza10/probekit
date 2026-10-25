import { render, screen } from "@testing-library/react"
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
    const h2 = screen.getAllByRole("heading", { level: 2 })
    expect(h2).toHaveLength(4)
    expect(h2.map((h) => h.textContent)).toEqual([
      expect.stringMatching(/Arquitetura/),
      expect.stringMatching(/Pipeline/),
      expect.stringMatching(/Infraestrutura/),
      "Princípios",
    ])
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

  it("não chama fetch ao montar", () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    renderPage()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
