import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { AnimatedRoutes } from "./AnimatedRoutes"

describe("AnimatedRoutes", () => {
  it("renders the Ping placeholder page at /ping", () => {
    render(
      <MemoryRouter initialEntries={["/ping"]}>
        <AnimatedRoutes />
      </MemoryRouter>
    )
    expect(screen.getByRole("heading", { name: /ping/i })).toBeInTheDocument()
  })

  it("renders the DNS Lookup placeholder page at /dns-lookup", () => {
    render(
      <MemoryRouter initialEntries={["/dns-lookup"]}>
        <AnimatedRoutes />
      </MemoryRouter>
    )
    expect(screen.getByRole("heading", { name: /dns lookup/i })).toBeInTheDocument()
  })

  it("does not leave two pages mounted after navigating between routes in sequence", () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={["/ping"]}>
        <AnimatedRoutes />
      </MemoryRouter>
    )
    rerender(
      <MemoryRouter initialEntries={["/dns-lookup"]}>
        <AnimatedRoutes />
      </MemoryRouter>
    )
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })
})
