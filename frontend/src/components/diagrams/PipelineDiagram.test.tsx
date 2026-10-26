import { render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PipelineDiagram } from "./PipelineDiagram"
import { injectDiagramCss } from "./testUtils"

// Os únicos textos que o svg pode mostrar (a fonte de cada um está em
// comentário no componente). Qualquer rótulo novo precisa entrar aqui.
const allowedLabels = [
  "Pull request",
  "CI",
  "Go · NPM · Terraform",
  "main",
  "Release da API",
  "mudança em",
  "backend/api-service-golang/**",
  "Build do site",
  "frontend/**",
  "Deploy da API",
  "manual",
  "Aprovação",
  "ambiente production",
  "Deploy",
  "Rollback",
  "API e site",
]

// Rótulos que aparecem exatamente uma vez (os dois ramos repetem só
// "mudança em", que aparece duas vezes).
const onceLabels = allowedLabels.filter((label) => label !== "mudança em")

const stages = [
  /pull request/i,
  /^CI\b/,
  /main/,
  /release da API/i,
  /build do site/i,
  /aprovação/i,
  /^deploy\b/i,
  /rollback/i,
]

function svgTexts(container: HTMLElement) {
  return [...container.querySelectorAll("svg text")].map((node) =>
    node.textContent?.trim(),
  )
}

describe("PipelineDiagram", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("é uma imagem com nome que fala de pipeline", () => {
    render(<PipelineDiagram />)
    expect(screen.getByRole("img", { name: /pipeline/i })).toBeInTheDocument()
  })

  it("mostra todos os rótulos permitidos e nenhum outro", () => {
    const { container } = render(<PipelineDiagram />)
    const texts = svgTexts(container)
    expect(new Set(texts)).toEqual(new Set(allowedLabels))
    for (const label of onceLabels) {
      expect(texts.filter((text) => text === label)).toHaveLength(1)
    }
    expect(texts.filter((text) => text === "mudança em")).toHaveLength(2)
  })

  it("usa mono só em main e nos caminhos", () => {
    const { container } = render(<PipelineDiagram />)
    const mono = [...container.querySelectorAll("svg .font-mono")].map(
      (node) => node.textContent,
    )
    expect(mono.sort()).toEqual(
      ["main", "backend/api-service-golang/**", "frontend/**"].sort(),
    )
  })

  it("descreve o pipeline em oito passos, um por etapa e na ordem", () => {
    render(<PipelineDiagram />)
    const items = within(screen.getByRole("list")).getAllByRole("listitem")
    expect(items).toHaveLength(stages.length)
    stages.forEach((stage, index) => {
      const title = items[index].querySelector("span.text-body-sm")
      expect(title?.textContent).toMatch(stage)
    })
  })

  it("não diz que toda mudança no backend gera release", () => {
    const { container } = render(<PipelineDiagram />)
    expect(container.textContent).toMatch(/só publica|só se|se as mensagens/i)
    expect(container.textContent).not.toMatch(/atualizam sozinhas/i)
  })

  it("sem IntersectionObserver fica parado e sem pontos visíveis", () => {
    vi.stubGlobal("IntersectionObserver", undefined)
    const removeCss = injectDiagramCss()
    try {
      const { container } = render(<PipelineDiagram />)
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

  it("o portão pulsa e o rollback não flui", () => {
    const { container } = render(<PipelineDiagram />)
    expect(container.querySelectorAll(".diagram-pulse")).toHaveLength(1)
    const dashed = container.querySelectorAll("[data-rollback]")
    expect(dashed.length).toBeGreaterThan(0)
    for (const path of dashed) {
      expect(path.getAttribute("class") ?? "").not.toMatch(/diagram-/)
    }
  })

  it("cada linha desenhada tem pathLength=1 e uma única classe de animação", () => {
    const { container } = render(<PipelineDiagram />)
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

describe("PipelineDiagram (linhas)", () => {
  it("ligação é contínua; só o rollback é tracejado, e parado", () => {
    const { container } = render(<PipelineDiagram />)
    for (const path of container.querySelectorAll("path.diagram-draw")) {
      expect(path).not.toHaveAttribute("stroke-dasharray")
    }
    expect(container.querySelectorAll(".diagram-flow")).toHaveLength(0)
    const rollback = container.querySelectorAll("path[data-rollback]")
    expect(rollback.length).toBeGreaterThan(0)
    expect(rollback[0].closest("[stroke-dasharray]")).not.toBeNull()
  })
})
