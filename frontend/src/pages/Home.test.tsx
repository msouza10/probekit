import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { tools } from "@/lib/tools"
import Home from "./Home"

describe("Home", () => {
  it("renders one link per tool in the static list, pointing at its route", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    const links = tools.map((tool) =>
      screen.getByRole("link", { name: new RegExp(tool.name, "i") })
    )

    expect(links).toHaveLength(tools.length)
    links.forEach((link, index) => {
      expect(link).toHaveAttribute("href", tools[index].href)
    })
  })
})
