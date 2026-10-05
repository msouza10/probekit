import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import Sobre from "./Sobre"

describe("Sobre", () => {
  it("renders the about heading and purpose copy", () => {
    render(<Sobre />)
    expect(
      screen.getByRole("heading", { level: 1, name: /sobre o probekit/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/caixa de ferramentas técnicas/i),
    ).toBeInTheDocument()
  })
})
