import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

describe("Card", () => {
  it("renders header title and content together", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Ping</CardTitle>
        </CardHeader>
        <CardContent>Check latency to a host</CardContent>
      </Card>
    )
    expect(screen.getByText("Ping")).toBeInTheDocument()
    expect(screen.getByText("Check latency to a host")).toBeInTheDocument()
  })

  it("has no box-shadow utility classes (Probekit's design system forbids shadows)", () => {
    render(<Card data-testid="card" />)
    expect(screen.getByTestId("card").className).not.toMatch(/shadow/)
  })
})
