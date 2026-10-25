import { render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ArchitectureDiagram } from "./ArchitectureDiagram"
import { injectDiagramCss } from "./testUtils"

// Os únicos textos que o svg pode mostrar (a fonte de cada um está em
// comentário no componente). Qualquer rótulo novo precisa entrar aqui.
const allowedLabels = [
  "Navegador",
  "você",
  "Cloudflare",
  "Worker",
  "este site, estático",
  "Proxy da API",
  "api.probekit.cc",
  "Oracle Cloud · São Paulo",
  "Balanceador",
  "TCP 443",
  "VM 1",
  "VM 2",
  "API em Go",
]

describe("ArchitectureDiagram", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("é uma imagem com nome que fala de arquitetura", () => {
    render(<ArchitectureDiagram />)
    expect(
      screen.getByRole("img", { name: /arquitetura/i }),
    ).toBeInTheDocument()
  })

  it("descreve o caminho em seis passos", () => {
    render(<ArchitectureDiagram />)
    const list = screen.getByRole("list")
    expect(within(list).getAllByRole("listitem")).toHaveLength(6)
  })

  it("mostra todos os rótulos permitidos e nenhum outro", () => {
    const { container } = render(<ArchitectureDiagram />)
    const texts = [...container.querySelectorAll("svg text")].map((node) =>
      node.textContent?.trim(),
    )
    expect(new Set(texts)).toEqual(new Set(allowedLabels))
  })

  it("usa mono só em api.probekit.cc", () => {
    const { container } = render(<ArchitectureDiagram />)
    const mono = [...container.querySelectorAll("svg .font-mono")].map(
      (node) => node.textContent,
    )
    expect(mono).toEqual(["api.probekit.cc"])
  })

  it("sem IntersectionObserver fica parado e sem pontos visíveis", () => {
    vi.stubGlobal("IntersectionObserver", undefined)
    const removeCss = injectDiagramCss()
    try {
      const { container } = render(<ArchitectureDiagram />)
      expect(container.querySelector("figure")).toHaveAttribute(
        "data-motion",
        "off",
      )
      const packets = container.querySelectorAll(".diagram-packet")
      expect(packets.length).toBeGreaterThan(0)
      for (const packet of packets) expect(packet).not.toBeVisible()
    } finally {
      removeCss()
    }
  })

  it("cada linha desenhada tem pathLength=1 e uma única classe de animação", () => {
    const { container } = render(<ArchitectureDiagram />)
    const drawn = container.querySelectorAll(".diagram-draw")
    expect(drawn.length).toBeGreaterThan(0)
    for (const path of drawn) expect(path).toHaveAttribute("pathLength", "1")
    const animated = container.querySelectorAll(
      ".diagram-draw, .diagram-flow, .diagram-pulse, .diagram-pop, .diagram-packet",
    )
    for (const element of animated) {
      const classes = [...element.classList].filter((name) =>
        /^diagram-(draw|flow|pulse|pop|packet)$/.test(name),
      )
      expect(classes).toHaveLength(1)
    }
  })
})
