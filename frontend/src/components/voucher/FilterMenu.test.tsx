import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Layers } from "lucide-react"
import { describe, expect, it, vi } from "vitest"
import { FilterMenu } from "./FilterMenu"

/*
 * A lista suspensa dos filtros: um botão que mostra o rótulo e o valor atual e
 * abre uma lista de opções (cada uma pode ter um ícone). Uma opção vale por vez.
 */

const options = [
  { value: "", label: "Todos" },
  {
    value: "aws",
    label: "AWS",
    icon: <svg data-testid="logo-aws" aria-hidden="true" />,
  },
  { value: "ms", label: "Microsoft" },
]

function renderMenu(value = "", onChange = vi.fn()) {
  render(
    <FilterMenu
      label="Provider"
      icon={<Layers aria-hidden="true" />}
      value={value}
      options={options}
      onChange={onChange}
    />,
  )
  return onChange
}

const gatilho = () => screen.getByRole("button", { name: /^Provider/ })

describe("FilterMenu", () => {
  it("o botão mostra o rótulo e a opção atual", () => {
    renderMenu("aws")

    expect(gatilho()).toHaveTextContent("Provider")
    expect(gatilho()).toHaveTextContent("AWS")
  })

  it("abre a lista com todas as opções, a atual marcada", async () => {
    renderMenu("aws")

    await userEvent.click(gatilho())

    const itens = await screen.findAllByRole("menuitemradio")
    expect(itens.map((i) => i.textContent)).toEqual([
      "Todos",
      "AWS",
      "Microsoft",
    ])
    expect(screen.getByRole("menuitemradio", { name: "AWS" })).toBeChecked()
    expect(
      screen.getByRole("menuitemradio", { name: "Todos" }),
    ).not.toBeChecked()
  })

  it("escolher uma opção avisa e fecha a lista", async () => {
    const onChange = renderMenu()

    await userEvent.click(gatilho())
    await userEvent.click(
      await screen.findByRole("menuitemradio", { name: "Microsoft" }),
    )

    expect(onChange).toHaveBeenCalledWith("ms")
    expect(screen.queryByRole("menuitemradio")).toBeNull()
  })

  it("a opção pode ter ícone, que é decorativo", async () => {
    renderMenu()

    await userEvent.click(gatilho())

    const aws = await screen.findByRole("menuitemradio", { name: "AWS" })
    expect(within(aws).getByTestId("logo-aws")).toBeInTheDocument()
  })

  it("com uma opção que não é a padrão, o botão fica marcado como ativo", () => {
    renderMenu("aws")

    expect(gatilho()).toHaveAttribute("data-active", "true")
  })

  it("com a opção padrão (a primeira), o botão não está ativo", () => {
    renderMenu("")

    expect(gatilho()).toHaveAttribute("data-active", "false")
  })

  it("funciona pelo teclado: abre com Enter e escolhe com as setas", async () => {
    const onChange = renderMenu()
    const user = userEvent.setup()

    gatilho().focus()
    await user.keyboard("{Enter}")
    await screen.findAllByRole("menuitemradio")
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}")

    expect(onChange).toHaveBeenCalled()
  })
})
