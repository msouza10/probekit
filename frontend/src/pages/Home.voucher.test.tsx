import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import Home from "./Home"

/*
 * O aviso do último desconto dentro da Home. O comportamento do aviso em si
 * está em components/LatestVoucher.test.tsx; aqui só se confere que a Home o
 * mostra e que ele nunca atrapalha o resto da página.
 */

const itens = [
  {
    id: "a1",
    url: "https://exemplo.com/post",
    title: "Título",
    vendor: "aws",
    promotion_name: null,
    promotion_type: "discount",
    discount_text: "50% off",
    discount_percent: 50,
    certifications: [],
    voucher_code: null,
    start_date: "2026-11-20",
    end_date: "2026-11-30",
    regions: [],
    published_at: "2026-11-20T14:02:00Z",
    source_name: "Fonte",
  },
]

/** A Home também consulta a API do GitHub; aqui ela sempre falha. */
function mockApis(vouchers: () => Response) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (entrada) =>
    String(entrada).includes("/api/vouchers")
      ? vouchers()
      : new Response("{}", { status: 500 }),
  )
}

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("Home com o aviso de voucher", () => {
  it("mostra o último desconto e leva ao item", async () => {
    mockApis(() =>
      Response.json({
        last_collected_at: "2026-11-24T14:00:12Z",
        generated_at: "2026-11-24T14:05:00Z",
        items: itens,
        next_cursor: null,
      }),
    )
    renderHome()

    const link = await screen.findByRole("link", {
      name: "AWS · 50% de desconto · até 30/11",
    })

    expect(link).toHaveAttribute("href", "/voucher#a1")
  })

  it("fechar o aviso não tira mais nada da Home e ele não volta ao recarregar", async () => {
    const resposta = () =>
      Response.json({
        last_collected_at: "2026-11-24T14:00:12Z",
        generated_at: "2026-11-24T14:05:00Z",
        items: itens,
        next_cursor: null,
      })
    mockApis(resposta)
    const primeira = renderHome()
    await screen.findByRole("link", { name: /AWS · 50% de desconto/ })

    await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }))
    primeira.unmount()
    renderHome()
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(
      screen.queryByRole("link", { name: /AWS · 50% de desconto/ }),
    ).toBeNull()
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })

  it("se a API de vouchers cai, a Home segue inteira e sem aviso", async () => {
    mockApis(() => new Response("{}", { status: 503 }))
    renderHome()

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(screen.queryByRole("button", { name: "Fechar aviso" })).toBeNull()
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })
})
