import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { ToolCard } from "./ToolCard"

describe("ToolCard", () => {
  it("renders the tool name, description, an 'Em breve' badge, and links to its route", () => {
    render(
      <MemoryRouter>
        <ToolCard name="Ping" description="Measure latency" href="/ping" />
      </MemoryRouter>
    )
    expect(screen.getByText("Ping")).toBeInTheDocument()
    expect(screen.getByText("Measure latency")).toBeInTheDocument()
    expect(screen.getByText(/em breve/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /ping/i })).toHaveAttribute("href", "/ping")
  })
})
