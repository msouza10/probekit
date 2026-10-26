import { render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Diagram } from "./Diagram"
import { diagramIds } from "./diagramIds"

const steps = [
  { title: "Navegador", detail: "envia o pedido" },
  { title: "Cloudflare", tag: "proxy" },
]

function renderDiagram() {
  return render(
    <Diagram
      id="fluxo"
      title="Fluxo do pedido"
      summary="Do navegador à API."
      steps={steps}
    >
      {(ids) => (
        <svg role="img" aria-labelledby={`${ids.title} ${ids.summary}`}>
          <title id={ids.title}>Fluxo do pedido</title>
          <desc id={ids.summary}>Do navegador à API.</desc>
        </svg>
      )}
    </Diagram>,
  )
}

describe("Diagram", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("deriva os ids do prop id", () => {
    expect(diagramIds("fluxo")).toEqual({
      title: "fluxo-title",
      summary: "fluxo-summary",
    })
  })

  it("expõe título, resumo, imagem nomeada e um li por passo", () => {
    renderDiagram()
    expect(
      screen.getByText("Fluxo do pedido", { selector: "figcaption" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: /Fluxo do pedido/ }),
    ).toBeInTheDocument()
    const list = screen.getByRole("list")
    expect(list.tagName).toBe("OL")
    expect(within(list).getAllByRole("listitem")).toHaveLength(steps.length)
  })

  it("usa a lista só no celular e o svg a partir de sm", () => {
    const { container } = renderDiagram()
    expect(screen.getByRole("list")).toHaveClass("sm:sr-only")
    const wide = container.querySelector("svg")?.parentElement
    expect(wide).toHaveClass("hidden", "sm:block")
  })

  it("no modo compacto o resumo e o detalhe dos passos ficam só para leitores de tela", () => {
    const { container } = render(
      <Diagram
        id="fluxo"
        title="Fluxo do pedido"
        summary="Resumo"
        steps={steps}
        compact
      >
        {() => <svg role="img" aria-label="x" />}
      </Diagram>,
    )
    const summary = screen.getByText("Resumo")
    expect(summary).toHaveClass("sr-only")
    expect(summary).not.toHaveClass("sm:sr-only")
    for (const detail of container.querySelectorAll("li p")) {
      expect(detail).toHaveClass("sr-only")
    }
  })

  it("começa com data-motion=off sem IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined)
    const { container } = renderDiagram()
    expect(container.querySelector("figure")).toHaveAttribute(
      "data-motion",
      "off",
    )
  })

  it("numera os passos no celular", () => {
    renderDiagram()
    expect(screen.getByText("01")).toBeInTheDocument()
    expect(screen.getByText("02")).toBeInTheDocument()
  })

  it("mostra a tag do passo", () => {
    renderDiagram()
    expect(screen.getByText("proxy")).toBeInTheDocument()
  })
})
