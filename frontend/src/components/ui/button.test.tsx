import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Button } from "./button"

describe("Button", () => {
  it("renders as a button with its label", () => {
    render(<Button>Run ping</Button>)
    expect(screen.getByRole("button", { name: "Run ping" })).toBeInTheDocument()
  })

  it("has no box-shadow utility classes (Probekit's design system forbids shadows)", () => {
    render(<Button>Run ping</Button>)
    expect(screen.getByRole("button").className).not.toMatch(/shadow/)
  })

  it("has no box-shadow utility classes on the outline variant (Probekit's design system forbids shadows)", () => {
    render(<Button variant="outline">Run ping</Button>)
    expect(screen.getByRole("button").className).not.toMatch(/shadow/)
  })

  it("keeps data-variant and renders the child with asChild", () => {
    render(
      <Button asChild variant="outline">
        <a href="/ping">Ping</a>
      </Button>,
    )
    const link = screen.getByRole("link", { name: "Ping" })
    expect(link).toHaveAttribute("data-variant", "outline")
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
