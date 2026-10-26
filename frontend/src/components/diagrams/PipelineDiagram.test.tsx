import { render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PipelineDiagram } from "./PipelineDiagram"
import { injectDiagramCss } from "./testUtils"

// Os únicos textos que o svg pode mostrar (a fonte de cada um está em
// comentário no componente). Qualquer rótulo novo precisa entrar aqui.
const allowedLabels = [
  "01 · Pull request e CI",
  "02 · Build e release",
  "03 · Deploy",
  "04 · Recuperação",
  "Pull request",
  "Go",
  "testes",
  "linters",
  "Terraform",
  "fmt",
  "validate",
  "NPM",
  "lint · format",
  "testes · build",
  "merge na main · CI verde",
  "Release da API",
  "backend/** na main",
  "testes → versão → binário",
  "Build do site",
  "frontend/** na main",
  "lint · testes · build",
  "Deploy da API",
  "manual · plan → aprovação",
  "apply → VM 1 → VM 2",
  "Deploy do site",
  "automático · aprovação",
  "wrangler → verifica",
  "Oracle Cloud · sa-saopaulo-1",
  "VM 1 · VM 2",
  "API em Go",
  "Cloudflare · borda",
  "Workers",
  "site estático",
  "Rollback da API",
  "manual · aprovação",
  "marca a release anterior",
  "Rollback do site",
  "volta a versão do Worker",
]

// Quatro fases, na ordem, e o que cada uma é.
const phases = [
  /\bCI\b/,
  /release/i,
  /deploy|production/i,
  /rollback|recupera/i,
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
    expect(new Set(svgTexts(container))).toEqual(new Set(allowedLabels))
  })

  it("tem as quatro fases numeradas, na ordem", () => {
    const { container } = render(<PipelineDiagram />)
    const numbered = svgTexts(container).filter((text) =>
      /^0\d · /.test(text ?? ""),
    )
    expect(numbered).toEqual([
      "01 · Pull request e CI",
      "02 · Build e release",
      "03 · Deploy",
      "04 · Recuperação",
    ])
  })

  it("o CI fica na mesma fase do pull request, e o merge é a seta que sai dela", () => {
    const { container } = render(<PipelineDiagram />)
    const texts = svgTexts(container)
    // Não há mais uma fase "Controle de versão" separada do CI: isso obrigaria
    // a seta a descer ao CI e voltar para a main.
    expect(texts.some((text) => /controle de versão/i.test(text ?? ""))).toBe(
      false,
    )
    expect(texts).toContain("merge na main · CI verde")
    // O rótulo do merge fica entre a fase 1 (abaixo do NPM) e a 2 (acima do
    // Release da API), na vertical.
    const y = (label: string) =>
      Number(
        [...container.querySelectorAll("svg text")]
          .find((node) => node.textContent?.trim() === label)
          ?.getAttribute("y"),
      )
    expect(y("merge na main · CI verde")).toBeGreaterThan(y("NPM"))
    expect(y("merge na main · CI verde")).toBeLessThan(y("Release da API"))
    // O bloco "main" também saiu: a main aparece só no rótulo do merge e nos
    // gatilhos das trilhas.
    expect(texts).not.toContain("main")
  })

  it("usa mono em nenhum rótulo do desenho", () => {
    const { container } = render(<PipelineDiagram />)
    expect(container.querySelectorAll("svg .font-mono")).toHaveLength(0)
  })

  it("descreve o pipeline em quatro passos, um por fase e na ordem", () => {
    render(<PipelineDiagram />)
    const items = within(screen.getByRole("list")).getAllByRole("listitem")
    expect(items).toHaveLength(phases.length)
    const tags = items.map(
      (item) => item.querySelector("span.text-muted-foreground")?.textContent,
    )
    expect(tags).toEqual(["CI", "release", "production", "rollback"])
    phases.forEach((phase, index) => {
      const title = items[index].querySelector("span.text-body-sm")
      expect(`${title?.textContent} ${tags[index]}`).toMatch(phase)
    })
  })

  it("divide a API e o site em duas trilhas nas fases 3 e 4", () => {
    const { container } = render(<PipelineDiagram />)
    const texts = svgTexts(container)
    for (const label of [
      "Release da API",
      "Build do site",
      "Deploy da API",
      "Deploy do site",
      "Rollback da API",
      "Rollback do site",
    ]) {
      expect(texts).toContain(label)
    }
    // O gatilho é diferente: a API é manual; o site, automático.
    expect(texts).toContain("manual · plan → aprovação")
    expect(texts).toContain("automático · aprovação")
  })

  it("só Go e NPM ligam às trilhas; o Terraform não alimenta nenhum release", () => {
    const { container } = render(<PipelineDiagram />)
    const links = [...container.querySelectorAll("path.diagram-draw")].map(
      (path) => path.getAttribute("d"),
    )
    // Do pull request saem três ligações (uma por job) e de dois jobs descem
    // ligações para as trilhas (Go e NPM), nunca do Terraform.
    const fromTerraformDown = links.filter(
      (d) => d?.startsWith("M300 ") && !d.includes("Q"),
    )
    expect(fromTerraformDown).toHaveLength(1) // só a que vai do pull request ao Terraform
  })

  it("cada trilha tem o seu ponto, e os dois saem defasados", () => {
    const { container } = render(<PipelineDiagram />)
    const dots = [
      ...container.querySelectorAll<SVGCircleElement>("circle.diagram-packet"),
    ]
    expect(dots).toHaveLength(2)
    const paths = dots.map((dot) => dot.style.offsetPath)
    // Os dois partem do pull request (x=300) e descem por trilhas diferentes:
    // a da API (x=153, Go) e a do site (x=447, NPM).
    expect(paths.every((path) => path.includes("M300 "))).toBe(true)
    expect(paths.some((path) => path.includes("447"))).toBe(true)
    expect(paths.some((path) => path.includes("153"))).toBe(true)
    // Em fases diferentes: o segundo parte meio ciclo depois do primeiro.
    const delays = dots.map((dot) => parseFloat(dot.style.animationDelay))
    expect(Math.abs(delays[1] - delays[0])).toBe(4)
  })

  it("as zonas de provedor têm a cor da cloud e o nome escrito", () => {
    const { container } = render(<PipelineDiagram />)
    expect(container.querySelectorAll("rect.stroke-cloud-oracle")).toHaveLength(
      1,
    )
    expect(
      container.querySelectorAll("rect.stroke-cloud-cloudflare"),
    ).toHaveLength(1)
    // As ligações saem do GitHub Actions, que não é uma cloud: ficam cinza.
    expect(
      container.querySelectorAll("path[class*='stroke-cloud-']"),
    ).toHaveLength(0)
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

  it("os dois deploys pulsam (esperam aprovação) e o rollback não flui", () => {
    const { container } = render(<PipelineDiagram />)
    expect(container.querySelectorAll(".diagram-pulse")).toHaveLength(2)
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
