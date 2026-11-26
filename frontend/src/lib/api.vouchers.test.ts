import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getVouchers } from "./api"

/*
 * getVouchers: o cliente de GET /api/vouchers. Mesmo contrato de erro do
 * runPing e do runDnsLookup: a promessa rejeita com `{ error, code }`.
 */

const body = {
  last_collected_at: "2026-11-24T14:00:12Z",
  generated_at: "2026-11-24T14:05:00Z",
  items: [],
  next_cursor: null,
}

function mockFetch(resposta: unknown, status = 200) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(Response.json(resposta, { status })),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const urlChamada = (m: ReturnType<typeof mockFetch>) =>
  String((m.mock.calls[0] as unknown[])[0])

beforeEach(() => {
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("getVouchers", () => {
  it("chama /api/vouchers com a base da API, sem '?' quando não há opções", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.probekit.cc")
    const fetchMock = mockFetch(body)

    await getVouchers()

    expect(urlChamada(fetchMock)).toBe("https://api.probekit.cc/api/vouchers")
  })

  it("usa caminho relativo quando a base está vazia (proxy do dev)", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "")
    const fetchMock = mockFetch(body)

    await getVouchers()

    expect(urlChamada(fetchMock)).toBe("/api/vouchers")
  })

  it("manda limit e cursor, e codifica o cursor", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "")
    const fetchMock = mockFetch(body)

    await getVouchers({ limit: 20, cursor: "a b+c/=" })

    expect(urlChamada(fetchMock)).toBe(
      "/api/vouchers?limit=20&cursor=a+b%2Bc%2F%3D",
    )
  })

  it("só limit, ou só cursor, também funciona", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "")
    const porLimite = mockFetch(body)
    await getVouchers({ limit: 5 })
    expect(urlChamada(porLimite)).toBe("/api/vouchers?limit=5")

    const porCursor = mockFetch(body)
    await getVouchers({ cursor: "abc" })
    expect(urlChamada(porCursor)).toBe("/api/vouchers?cursor=abc")
  })

  it("devolve o corpo da resposta", async () => {
    mockFetch({ ...body, next_cursor: "proximo" })

    const resposta = await getVouchers()

    expect(resposta.last_collected_at).toBe("2026-11-24T14:00:12Z")
    expect(resposta.next_cursor).toBe("proximo")
    expect(resposta.items).toEqual([])
  })

  it("rejeita com o erro padrão da API (503 antes da primeira carga)", async () => {
    mockFetch(
      { error: "Vouchers are not available yet", code: "vouchers_unavailable" },
      503,
    )

    await expect(getVouchers()).rejects.toEqual({
      error: "Vouchers are not available yet",
      code: "vouchers_unavailable",
    })
  })

  it("erro sem código vira unknown_error, com uma mensagem em português", async () => {
    mockFetch({}, 500)

    await expect(getVouchers()).rejects.toMatchObject({
      code: "unknown_error",
      error: expect.stringMatching(/\S/),
    })
  })

  it("sem rede, rejeita como backend_unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("falhou"))),
    )

    await expect(getVouchers()).rejects.toMatchObject({
      code: "backend_unreachable",
    })
  })

  it("resposta que não é JSON também vira backend_unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response("<html>502</html>", { status: 502 })),
      ),
    )

    await expect(getVouchers()).rejects.toMatchObject({
      code: "backend_unreachable",
    })
  })
})
