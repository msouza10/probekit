import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Badge } from "./badge"

describe("Badge", () => {
  it("renders its label text", () => {
    render(<Badge>Em breve</Badge>)
    expect(screen.getByText("Em breve")).toBeInTheDocument()
  })
})
