import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { VoucherItem } from "@/lib/api"
import { LatestVoucher } from "./LatestVoucher"

/*
 * O aviso fechável da Home com o último desconto encontrado. Ele sozinho
 * pergunta à API; se a API falha ou não há nada que sirva, não aparece.
 *
 * Decisões destes testes que o plano não fixava (mude código e teste juntos):
 * - o botão de fechar se chama "Fechar aviso";
 * - o `localStorage` guarda, em `probekit:voucher-dismissed`, o `id` do item fechado;
 * - enquanto carrega, o espaço do aviso já existe (elemento `data-slot="voucher-banner"`
 *   com uma classe `min-h-*`), para a página não pular quando ele chega.
 */

const CHAVE = "probekit:voucher-dismissed"
const TEXTO = "AWS · 50% de desconto · até 30/11"

const item = (over: Partial<VoucherItem> = {}): VoucherItem => ({
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
  ...over,
})

function servir(items: VoucherItem[]) {
  const fetchMock = vi.fn(async () =>
    Response.json({
      last_collected_at: "2026-11-24T14:00:12Z",
      generated_at: "2026-11-24T14:05:00Z",
      items,
      next_cursor: null,
    }),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function renderAviso() {
  return render(
    <MemoryRouter>
      <LatestVoucher />
    </MemoryRouter>,
  )
}

// Espera a chamada à API terminar e o React assentar.
async function esperarAPI(fetchMock: ReturnType<typeof servir>) {
  await waitFor(() => expect(fetchMock).toHaveBeenCalled())
  await new Promise((resolve) => setTimeout(resolve, 20))
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("LatestVoucher", () => {
  it("mostra fornecedor, desconto e data, e leva ao item na página de vouchers", async () => {
    servir([item()])
    renderAviso()

    const link = await screen.findByRole("link", { name: TEXTO })

    expect(link).toHaveAttribute("href", "/voucher#a1")
  })

  it("usa o primeiro item que tem fornecedor e desconto", async () => {
    servir([item({ id: "sem", vendor: null }), item({ id: "b2" })])
    renderAviso()

    const link = await screen.findByRole("link", { name: TEXTO })

    expect(link).toHaveAttribute("href", "/voucher#b2")
  })

  it("enquanto carrega, o espaço do aviso já está reservado", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    )
    const { container } = renderAviso()

    const espaco = container.querySelector('[data-slot="voucher-banner"]')

    expect(espaco).not.toBeNull()
    expect(espaco?.className).toMatch(/min-h-/)
  })

  it("se a API falha, não mostra nada", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError("sem rede")))
    vi.stubGlobal("fetch", fetchMock)
    renderAviso()

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("se a API responde erro (503), não mostra nada", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(
        { error: "indisponível", code: "vouchers_unavailable" },
        { status: 503 },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)
    renderAviso()

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(screen.queryByRole("link")).toBeNull()
  })

  it("se nenhum item tem fornecedor e desconto, não mostra nada", async () => {
    const fetchMock = servir([
      item({ vendor: null }),
      item({ discount_text: null }),
    ])
    renderAviso()

    await esperarAPI(fetchMock)

    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("fechar esconde o aviso e lembra o id no localStorage", async () => {
    servir([item()])
    renderAviso()
    await screen.findByRole("link", { name: TEXTO })

    await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }))

    expect(screen.queryByRole("link", { name: TEXTO })).toBeNull()
    expect(localStorage.getItem(CHAVE)).toBe("a1")
  })

  it("o mesmo item já fechado não volta", async () => {
    localStorage.setItem(CHAVE, "a1")
    const fetchMock = servir([item({ id: "a1" })])
    renderAviso()

    await esperarAPI(fetchMock)

    expect(screen.queryByRole("link")).toBeNull()
  })

  it("um item novo volta a aparecer depois de o anterior ter sido fechado", async () => {
    localStorage.setItem(CHAVE, "velho")
    servir([item({ id: "novo" })])
    renderAviso()

    const link = await screen.findByRole("link", { name: TEXTO })

    expect(link).toHaveAttribute("href", "/voucher#novo")
  })

  it("com o localStorage bloqueado, o aviso aparece e fechar não quebra", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado")
    })
    servir([item()])
    renderAviso()
    await screen.findByRole("link", { name: TEXTO })

    await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }))

    expect(screen.queryByRole("link", { name: TEXTO })).toBeNull()
  })
})
