import { render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ArchitectureDiagram } from "./ArchitectureDiagram"
import { injectDiagramCss } from "./testUtils"

// Os únicos textos que o svg pode mostrar (a fonte de cada um está em
// comentário no componente). Qualquer rótulo novo precisa entrar aqui.
const allowedLabels = [
  "Cliente",
  "navegador",
  "Frontend",
  "Cloudflare · borda",
  "Cloudflare Workers",
  "probekit.cc",
  "Interface Web",
  "roda no navegador",
  "Backend",
  "Cloudflare Proxy",
  "api.probekit.cc",
  "Oracle Cloud · sa-saopaulo-1",
  "NLB",
  "L4 · TCP 443",
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

  it("colore só a borda das zonas de provedor, e o texto continua cinza", () => {
    const { container } = render(<ArchitectureDiagram />)
    const cloudflare = container.querySelectorAll(
      "rect.stroke-cloud-cloudflare",
    )
    const oracle = container.querySelectorAll("rect.stroke-cloud-oracle")
    expect(cloudflare).toHaveLength(2)
    expect(oracle).toHaveLength(1)
    // Frontend e Backend (papéis) ficam neutros.
    expect(container.querySelectorAll("rect.stroke-input")).not.toHaveLength(0)
    for (const text of container.querySelectorAll("svg text")) {
      expect(text.getAttribute("class") ?? "").not.toMatch(/cloud-/)
    }
    // A bolinha do rótulo repete a cor da zona.
    expect(
      container.querySelectorAll("circle.fill-cloud-cloudflare"),
    ).toHaveLength(2)
    expect(container.querySelectorAll("circle.fill-cloud-oracle")).toHaveLength(
      1,
    )
  })

  it("ligações são linhas contínuas, na cor da cloud de destino", () => {
    const { container } = render(<ArchitectureDiagram />)
    // 3 ligações Cloudflare (cliente->Workers, Workers->interface, cliente->Proxy)
    // e 3 Oracle (Proxy->NLB, NLB->VM 1, NLB->VM 2).
    const base = (cloud: string) =>
      container.querySelectorAll(`path.diagram-draw.stroke-cloud-${cloud}`)
    expect(base("cloudflare")).toHaveLength(3)
    expect(base("oracle")).toHaveLength(3)
    // Nenhuma ligação é tracejada nem anda depois de desenhada: quem mostra o
    // tráfego é o ponto. O tracejado fica só nas zonas.
    for (const path of container.querySelectorAll("path.diagram-draw")) {
      expect(path).not.toHaveAttribute("stroke-dasharray")
    }
    expect(container.querySelectorAll(".diagram-flow")).toHaveLength(0)
    expect(container.querySelectorAll("path.stroke-highlight")).toHaveLength(0)
  })

  it("o ponto troca de cor ao atravessar cada zona", () => {
    const { container } = render(<ArchitectureDiagram />)
    const css = container.querySelector("svg style")?.textContent ?? ""
    expect(css).toMatch(/@keyframes arq-tint-api/)
    expect(css).toMatch(/var\(--cloud-cloudflare\)/)
    expect(css).toMatch(/var\(--cloud-oracle\)/)
    // Cada ponto roda a viagem e a troca de cor juntas, no mesmo ritmo.
    const dots = container.querySelectorAll<SVGCircleElement>(
      "circle.diagram-packet",
    )
    expect(dots).toHaveLength(3)
    for (const dot of dots) {
      expect(dot.style.animationName).toMatch(
        /^diagram-travel, arq-tint-(frontend|api)$/,
      )
      expect(dot.style.animationDirection).toBe("alternate, alternate")
    }
  })

  it("usa mono só nos endereços (probekit.cc e api.probekit.cc)", () => {
    const { container } = render(<ArchitectureDiagram />)
    const mono = [...container.querySelectorAll("svg .font-mono")].map(
      (node) => node.textContent,
    )
    expect(mono).toEqual(["probekit.cc", "api.probekit.cc"])
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
      ".diagram-draw, .diagram-pulse, .diagram-pop, .diagram-packet",
    )
    for (const element of animated) {
      const classes = [...element.classList].filter((name) =>
        /^diagram-(draw|flow|pulse|pop|packet)$/.test(name),
      )
      expect(classes).toHaveLength(1)
    }
  })
})
