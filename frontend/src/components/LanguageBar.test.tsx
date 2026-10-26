import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LanguageBar } from "./LanguageBar"

const shares = [
  { name: "TypeScript", percent: 47.3 },
  { name: "Go", percent: 26 },
  { name: "Shell", percent: 14.3 },
  { name: "CSS", percent: 5.5 },
  { name: "outras", percent: 6.9 },
]

describe("LanguageBar", () => {
  it("escreve nome e porcentagem de cada linguagem", () => {
    render(<LanguageBar shares={shares} />)
    const group = screen.getByRole("group", {
      name: "Linguagens do repositório",
    })
    const items = within(group).getAllByRole("listitem")
    expect(items.map((item) => item.textContent)).toEqual([
      "TypeScript 47%",
      "Go 26%",
      "Shell 14%",
      "CSS 6%",
      "outras 7%",
    ])
  })

  it("a barra em si é decorativa: a informação está só na legenda", () => {
    const { container } = render(<LanguageBar shares={shares} />)
    const bar = container.querySelector("[role=group] > div")
    expect(bar).toHaveAttribute("aria-hidden", "true")
  })

  it("um trecho por linguagem, cada um mais claro que o anterior", () => {
    const { container } = render(<LanguageBar shares={shares} />)
    const segments = Array.from(
      container.querySelectorAll<HTMLElement>("[role=group] > div > div"),
    )
    expect(segments).toHaveLength(5)
    const opacities = segments.map((s) => Number(s.style.opacity))
    expect(opacities).toEqual([...opacities].sort((a, b) => b - a))
    expect(new Set(opacities).size).toBe(5)
    // A largura de cada trecho segue a porcentagem.
    expect(Number(segments[0].style.flexGrow)).toBeCloseTo(47.3)
  })

  it("usa só a cor do texto do tema, sem cor própria", () => {
    const { container } = render(<LanguageBar shares={shares} />)
    for (const segment of container.querySelectorAll(
      "[role=group] > div > div",
    )) {
      expect(segment).toHaveClass("bg-foreground")
    }
  })
})
