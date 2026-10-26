import { render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { InfrastructureDiagram } from "./InfrastructureDiagram"
import { injectDiagramCss } from "./testUtils"

// Os únicos textos que o svg pode mostrar (a fonte de cada um está em
// comentário no componente). Qualquer rótulo novo precisa entrar aqui.
const allowedLabels = [
  "*.tf",
  "o código",
  "plan → apply",
  "terraform",
  "Oracle Cloud",
  "Rede",
  "2 VMs",
  "Balanceador",
  "Cloudflare",
  "DNS api (proxied)",
  "Estado remoto",
  "bucket na OCI",
]

const stages = [
  /escrever o código/i,
  /plan e apply/i,
  /rede, as duas VMs e o balanceador.*OCI/i,
  /registro DNS da API.*Cloudflare/i,
  /estado.*bucket remoto/i,
]

function svgTexts(container: HTMLElement) {
  return [...container.querySelectorAll("svg text")].map((node) =>
    node.textContent?.trim(),
  )
}

describe("InfrastructureDiagram", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("é uma imagem com nome que fala de infraestrutura", () => {
    render(<InfrastructureDiagram />)
    expect(
      screen.getByRole("img", { name: /infraestrutura/i }),
    ).toBeInTheDocument()
  })

  it("mostra todos os rótulos permitidos, cada um uma vez, e nenhum outro", () => {
    const { container } = render(<InfrastructureDiagram />)
    const texts = svgTexts(container)
    expect(new Set(texts)).toEqual(new Set(allowedLabels))
    expect(texts).toHaveLength(allowedLabels.length)
  })

  it("usa mono só em *.tf, plan → apply e DNS api (proxied)", () => {
    const { container } = render(<InfrastructureDiagram />)
    const mono = [...container.querySelectorAll("svg .font-mono")].map(
      (node) => node.textContent,
    )
    expect(mono.sort()).toEqual(
      ["*.tf", "plan → apply", "DNS api (proxied)"].sort(),
    )
  })

  it("descreve a infraestrutura em cinco passos, na ordem", () => {
    render(<InfrastructureDiagram />)
    const items = within(screen.getByRole("list")).getAllByRole("listitem")
    expect(items).toHaveLength(stages.length)
    stages.forEach((stage, index) => {
      const title = items[index].querySelector("span.text-body-sm")
      expect(title?.textContent).toMatch(stage)
    })
  })

  it("não diz que o apply é automático nem fala de outras nuvens", () => {
    const { container } = render(<InfrastructureDiagram />)
    expect(container.textContent).not.toMatch(/automátic|AWS|Azure/i)
    expect(container.textContent).toMatch(/à mão|manual/i)
  })

  it("com o movimento desligado todos os blocos ficam visíveis", () => {
    vi.stubGlobal("IntersectionObserver", undefined)
    const removeCss = injectDiagramCss()
    try {
      const { container } = render(<InfrastructureDiagram />)
      expect(container.querySelector("figure")).toHaveAttribute(
        "data-motion",
        "off",
      )
      const blocks = container.querySelectorAll("svg .diagram-pop")
      expect(blocks.length).toBeGreaterThan(0)
      for (const block of blocks) expect(block).toBeVisible()
      for (const text of container.querySelectorAll("svg text")) {
        expect(text).toBeVisible()
      }
    } finally {
      removeCss()
    }
  })

  it("o Estado remoto é tracejado e parado", () => {
    const { container } = render(<InfrastructureDiagram />)
    const state = container.querySelector("[data-state]")
    expect(state).not.toBeNull()
    expect(state?.querySelector("[stroke-dasharray]")).not.toBeNull()
    expect(
      state?.querySelectorAll(
        ".diagram-draw, .diagram-pulse, .diagram-pop, .diagram-packet",
      ),
    ).toHaveLength(0)
  })

  it("cada linha desenhada tem pathLength=1 e uma única classe de animação", () => {
    const { container } = render(<InfrastructureDiagram />)
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

describe("InfrastructureDiagram (cores dos provedores)", () => {
  it("a zona de cada provedor tem a cor dele, e o nome continua escrito", () => {
    const { container } = render(<InfrastructureDiagram />)
    expect(container.querySelectorAll("rect.stroke-cloud-oracle")).toHaveLength(
      1,
    )
    expect(
      container.querySelectorAll("rect.stroke-cloud-cloudflare"),
    ).toHaveLength(1)
    // As ligações saem do apply (Terraform), que não é uma cloud: contínuas e
    // cinza. A cor do provedor fica só nas zonas.
    const links = container.querySelectorAll("path.diagram-draw")
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.closest("g.stroke-input")).not.toBeNull()
      expect(link.getAttribute("class")).not.toMatch(/cloud-/)
    }
    expect(container.querySelectorAll(".diagram-flow")).toHaveLength(0)
    const labels = [...container.querySelectorAll("svg text")].map(
      (n) => n.textContent,
    )
    expect(labels).toContain("Oracle Cloud")
    expect(labels).toContain("Cloudflare")
  })
})
