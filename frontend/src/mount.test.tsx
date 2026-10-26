import { StrictMode } from "react"
import { act } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, inject, beforeEach, describe, expect, it, vi } from "vitest"
import App from "./App"
import { mount } from "./mount"

const app = (url: string) => (
  <StrictMode>
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>
  </StrictMode>
)

// HTML do servidor, gerado em scripts/ssrGlobalSetup.mjs (outro processo).
declare module "vitest" {
  interface ProvidedContext {
    ssrHtml: Record<string, string>
  }
}
const serverHtml = async (url: string) => inject("ssrHtml")[url]

// IntersectionObserver só existe no navegador: stub para o cliente "animar"
// enquanto o HTML do servidor (sem ele) saiu parado. É o caso real da hidratação.
class FakeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("mount", () => {
  let container: HTMLDivElement
  let errors: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    container = document.createElement("div")
    document.body.append(container)
    errors = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    errors.mockRestore()
    container.remove()
  })

  it("renderiza do zero quando #root está vazio (vite dev)", async () => {
    await act(async () => {
      mount(container, app("/sobre"))
    })
    expect(
      await vi.waitFor(() => {
        const h1 = container.querySelector("h1")
        expect(h1).not.toBeNull()
        return h1!.textContent
      }),
    ).toContain("laboratório")
  })

  it("hidrata o HTML pré-renderizado sem erro e sem refazer o DOM", async () => {
    const html = await serverHtml("/sobre")
    container.innerHTML = html
    const h1 = container.querySelector("h1")!
    vi.stubGlobal("IntersectionObserver", FakeObserver)

    await act(async () => {
      mount(container, app("/sobre"))
    })
    await vi.waitFor(() => expect(container.querySelector("h1")).toBe(h1))

    expect(errors).not.toHaveBeenCalled()
  })

  it("hidrata a Home sem divergência com o cliente animado", async () => {
    container.innerHTML = await serverHtml("/")
    vi.stubGlobal("IntersectionObserver", FakeObserver)

    await act(async () => {
      mount(container, app("/"))
    })

    expect(errors).not.toHaveBeenCalled()
  })

  it("o HTML do servidor sai visível, sem opacity 0 preso", async () => {
    for (const url of ["/", "/sobre", "/arquitetura"]) {
      const html = await serverHtml(url)
      expect(html).not.toMatch(/opacity:\s*0[;"]/)
    }
  })

  it("a view NotFound sai no HTML de uma URL desconhecida", async () => {
    expect(await serverHtml("/404")).toContain("Página não encontrada")
  })
})
