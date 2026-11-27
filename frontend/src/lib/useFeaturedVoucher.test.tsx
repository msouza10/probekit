import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { VoucherItem } from "./api"
import { useFeaturedVoucher } from "./useFeaturedVoucher"

/*
 * O voucher em destaque da Home, buscado uma vez e repartido entre o selo, o
 * mini-ingresso e a seção. Regra: o mais recente que tem fornecedor e desconto
 * e ainda está ativo. Hoje, nos testes, é 25/11/2026.
 */

const item = (over: Partial<VoucherItem> = {}): VoucherItem => ({
  id: "a1",
  url: "https://exemplo.com/post",
  title: "Exame com 50% de desconto",
  vendor: "aws",
  promotion_name: null,
  promotion_type: "voucher",
  discount_text: "50% off",
  discount_percent: 50,
  certifications: [],
  voucher_code: null,
  start_date: "2026-11-20",
  end_date: "2026-11-30",
  regions: ["Global"],
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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2026, 10, 25, 12))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const esperar = () => new Promise((resolve) => setTimeout(resolve, 20))

describe("useFeaturedVoucher: qual voucher", () => {
  it("começa sem nada e depois entrega o mais recente que está ativo", async () => {
    servir([item({ id: "novo" }), item({ id: "velho" })])
    const { result } = renderHook(() => useFeaturedVoucher())

    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current?.item.id).toBe("novo"))
  })

  it("entrega também o dia de hoje, para os componentes calcularem o prazo", async () => {
    servir([item()])
    const { result } = renderHook(() => useFeaturedVoucher())

    await waitFor(() => expect(result.current).not.toBeNull())

    expect(result.current?.today.getDate()).toBe(25)
  })

  it("se o mais novo já acabou, vale o próximo que ainda está ativo", async () => {
    servir([
      item({ id: "acabou", end_date: "2026-11-20" }),
      item({ id: "vale" }),
    ])
    const { result } = renderHook(() => useFeaturedVoucher())

    await waitFor(() => expect(result.current?.item.id).toBe("vale"))
  })

  it("pula quem não tem fornecedor ou desconto", async () => {
    servir([
      item({ id: "sem-fornecedor", vendor: null }),
      item({ id: "sem-desconto", discount_text: null }),
      item({ id: "serve" }),
    ])
    const { result } = renderHook(() => useFeaturedVoucher())

    await waitFor(() => expect(result.current?.item.id).toBe("serve"))
  })

  it("busca uma vez só, mesmo que o resultado seja lido várias vezes", async () => {
    const fetchMock = servir([item()])
    const { result, rerender } = renderHook(() => useFeaturedVoucher())
    await waitFor(() => expect(result.current).not.toBeNull())

    rerender()
    rerender()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe("useFeaturedVoucher: quando não há destaque", () => {
  it.each([
    ["todos acabaram", [item({ end_date: "2026-11-01" })]],
    ["a lista é vazia", []],
    ["ninguém tem fornecedor e desconto", [item({ vendor: null })]],
  ])("fica nulo quando %s", async (_nome, lista) => {
    const fetchMock = servir(lista)
    const { result } = renderHook(() => useFeaturedVoucher())

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await esperar()

    expect(result.current).toBeNull()
  })

  it("no dia seguinte ao término ele some", async () => {
    vi.setSystemTime(new Date(2026, 11, 1, 0, 1))
    const fetchMock = servir([item()])
    const { result } = renderHook(() => useFeaturedVoucher())

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await esperar()

    expect(result.current).toBeNull()
  })

  it("fica nulo se a API falha ou responde erro", async () => {
    const falha = vi.fn(() => Promise.reject(new TypeError("sem rede")))
    vi.stubGlobal("fetch", falha)
    const primeiro = renderHook(() => useFeaturedVoucher())
    await waitFor(() => expect(falha).toHaveBeenCalled())
    await esperar()
    expect(primeiro.result.current).toBeNull()

    const erro = vi.fn(async () =>
      Response.json(
        { error: "x", code: "vouchers_unavailable" },
        { status: 503 },
      ),
    )
    vi.stubGlobal("fetch", erro)
    const segundo = renderHook(() => useFeaturedVoucher())
    await waitFor(() => expect(erro).toHaveBeenCalled())
    await esperar()
    expect(segundo.result.current).toBeNull()
  })

  it("se o componente sai da tela antes da resposta, nada quebra", async () => {
    servir([item()])
    const { unmount } = renderHook(() => useFeaturedVoucher())

    unmount()
    await esperar()
  })
})
