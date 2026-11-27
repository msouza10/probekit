import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Pagination } from "./Pagination"

/* Os controles de página: números, anterior e próxima, com a atual marcada. */

const nav = () => screen.getByRole("navigation", { name: "Paginação" })

describe("Pagination", () => {
  it("com uma página só, não mostra nada", () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onChange={() => {}} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("mostra um botão por página e marca a atual", () => {
    render(<Pagination page={2} totalPages={3} onChange={() => {}} />)

    const atual = within(nav()).getByRole("button", { name: "Página 2" })
    expect(atual).toHaveAttribute("aria-current", "page")
    expect(
      within(nav()).getByRole("button", { name: "Página 1" }),
    ).not.toHaveAttribute("aria-current")
  })

  it("clicar em um número pede aquela página", async () => {
    const onChange = vi.fn()
    render(<Pagination page={1} totalPages={3} onChange={onChange} />)

    await userEvent.click(screen.getByRole("button", { name: "Página 3" }))

    expect(onChange).toHaveBeenCalledWith(3)
  })

  it("próxima e anterior andam uma página", async () => {
    const onChange = vi.fn()
    render(<Pagination page={2} totalPages={3} onChange={onChange} />)

    await userEvent.click(
      screen.getByRole("button", { name: "Próxima página" }),
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Página anterior" }),
    )

    expect(onChange).toHaveBeenNthCalledWith(1, 3)
    expect(onChange).toHaveBeenNthCalledWith(2, 1)
  })

  it("na primeira página a anterior fica desligada, e na última a próxima", () => {
    const { rerender } = render(
      <Pagination page={1} totalPages={3} onChange={() => {}} />,
    )
    expect(
      screen.getByRole("button", { name: "Página anterior" }),
    ).toBeDisabled()
    expect(screen.getByRole("button", { name: "Próxima página" })).toBeEnabled()

    rerender(<Pagination page={3} totalPages={3} onChange={() => {}} />)
    expect(
      screen.getByRole("button", { name: "Próxima página" }),
    ).toBeDisabled()
  })

  it("com muitas páginas, usa reticências e não um botão por página", () => {
    render(<Pagination page={5} totalPages={20} onChange={() => {}} />)

    expect(screen.queryByRole("button", { name: "Página 12" })).toBeNull()
    expect(within(nav()).getAllByText("…")).toHaveLength(2)
  })
})
