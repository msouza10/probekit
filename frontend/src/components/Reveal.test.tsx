import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Reveal } from "./Reveal"

describe("Reveal", () => {
  it("renders children without IntersectionObserver support", () => {
    render(<Reveal className="x">conteúdo visível</Reveal>)
    expect(screen.getByText("conteúdo visível")).toBeInTheDocument()
  })
})
