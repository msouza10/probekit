import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Button } from "./button"

describe("Button", () => {
  it("renders as a button with its label", () => {
    render(<Button>Run ping</Button>)
    expect(screen.getByRole("button", { name: "Run ping" })).toBeInTheDocument()
  })
})
