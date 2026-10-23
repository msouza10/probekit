import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import App from "./App"

describe("App", () => {
  it("renders the home page heading and brand link at the root route", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /probekit/i })).toHaveAttribute(
      "href",
      "/",
    )
  })
})
