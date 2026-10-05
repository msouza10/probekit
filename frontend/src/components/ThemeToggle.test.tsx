import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ThemeToggle } from "./ThemeToggle"

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.removeItem("probekit-theme")
  delete document.documentElement.dataset.theme
  document.documentElement.classList.remove("dark")
})

describe("ThemeToggle", () => {
  it("changes the document theme and persists the choice", async () => {
    document.documentElement.dataset.theme = "light"
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const toggle = screen.getByRole("switch", { name: "Modo escuro" })
    expect(toggle).toHaveAttribute("aria-checked", "false")
    await user.click(toggle)
    expect(document.documentElement).toHaveAttribute("data-theme", "dark")
    expect(document.documentElement).toHaveClass("dark")
    expect(localStorage.getItem("probekit-theme")).toBe("dark")
    await user.keyboard(" ")
    expect(toggle).toHaveAttribute("aria-checked", "false")
    expect(document.documentElement).not.toHaveClass("dark")
    expect(localStorage.getItem("probekit-theme")).toBe("light")
  })

  it("still switches when storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage blocked")
    })
    const user = userEvent.setup()
    render(<ThemeToggle />)
    await user.click(screen.getByRole("switch"))
    expect(document.documentElement).toHaveAttribute("data-theme", "light")
  })
})
