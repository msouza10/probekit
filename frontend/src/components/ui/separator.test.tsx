import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Separator } from "./separator"

describe("Separator", () => {
  it("renders a divider element", () => {
    render(<Separator data-testid="divider" />)
    expect(screen.getByTestId("divider")).toBeInTheDocument()
  })
})
