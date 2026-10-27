import { render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ArticleDiagram, articleDiagrams } from "./articleDiagrams"
import { diagramNames } from "./diagramNames"

describe("diagramNames", () => {
  it("lista os três diagramas de /arquitetura", () => {
    expect([...diagramNames]).toEqual([
      "arquitetura",
      "pipeline",
      "infraestrutura",
    ])
  })
})

describe("articleDiagrams", () => {
  it("tem um componente para cada nome, e só para eles", () => {
    expect(Object.keys(articleDiagrams).sort()).toEqual(
      [...diagramNames].sort(),
    )
  })

  it.each(diagramNames)("renderiza o diagrama %s como figura", (name) => {
    const { container } = render(<ArticleDiagram name={name} />)
    const figure = container.querySelector("figure")

    expect(figure).not.toBeNull()
    expect(figure?.id).toBe(name)
    expect(figure?.querySelector("figcaption")?.textContent).toBeTruthy()
  })
})

describe("ArticleDiagram", () => {
  afterEach(() => vi.restoreAllMocks())

  it("lança erro para um nome fora do registro", () => {
    // O React registra o erro no console antes de repassá-lo.
    vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() => render(<ArticleDiagram name="nada" />)).toThrow(
      'diagrama desconhecido "nada"',
    )
  })
})
