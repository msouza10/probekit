import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Bench } from "./Bench"

describe("Bench", () => {
  it("renderiza label, meta e filhos", () => {
    render(
      <Bench label="Saída" meta="3 pacotes">
        <pre>64 bytes from 1.1.1.1</pre>
      </Bench>,
    )
    expect(screen.getAllByText("Saída").length).toBeGreaterThan(0)
    expect(screen.getByText("3 pacotes")).toBeInTheDocument()
    expect(screen.getByText("64 bytes from 1.1.1.1")).toBeInTheDocument()
  })

  it("mostra 'exemplo' só quando example é verdadeiro", () => {
    const { rerender } = render(
      <Bench label="Saída" example>
        x
      </Bench>,
    )
    expect(screen.getByText("exemplo")).toBeInTheDocument()
    rerender(<Bench label="Saída">x</Bench>)
    expect(screen.queryByText("exemplo")).not.toBeInTheDocument()
  })

  it("a área de conteúdo rola na horizontal dentro do painel", () => {
    render(
      <Bench label="Saída">
        <pre>conteúdo longo</pre>
      </Bench>,
    )
    const content = screen.getByText("conteúdo longo").parentElement
    expect(content).toHaveClass("overflow-x-auto")
  })

  it("o section expõe o nome acessível igual a label", () => {
    render(<Bench label="Resultado do ping">x</Bench>)
    expect(
      screen.getByRole("region", { name: "Resultado do ping" }),
    ).toHaveAttribute("data-slot", "bench")
  })

  it("a área de conteúdo é focável por teclado e tem nome", () => {
    render(
      <Bench label="Saída">
        <pre>conteúdo longo</pre>
      </Bench>,
    )
    const content = screen.getByRole("group", { name: "Saída, conteúdo" })
    expect(content).toHaveAttribute("tabindex", "0")
    expect(content).toHaveClass("overflow-x-auto")
  })
})
