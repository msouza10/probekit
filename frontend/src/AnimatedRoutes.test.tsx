import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, useNavigate } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { AnimatedRoutes } from "./AnimatedRoutes"

function NavigateButton({ to }: { to: string }) {
  const navigate = useNavigate()
  return <button onClick={() => navigate(to)}>go to {to}</button>
}

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
    render(
      <MemoryRouter initialEntries={["/ping"]}>
        <NavigateButton to="/dns-lookup" />
        <AnimatedRoutes />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole("button", { name: /go to \/dns-lookup/i }))

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })
})
