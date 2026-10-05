import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import App from "./App"

describe("App", () => {
  it("renders the Probekit heading at the root route", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole("heading", { level: 1, name: /probekit/i }),
    ).toBeInTheDocument()
  })
})
