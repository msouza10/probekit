import { describe, expect, it } from "vitest"
import { mockVouchersPage } from "./mockVouchers.ts"

const now = new Date("2026-11-26T12:00:00Z")

describe("mockVouchersPage", () => {
  it("a primeira página vem cheia e aponta para a próxima", () => {
    const page = mockVouchersPage(now, 50)

    expect(page.items).toHaveLength(50)
    expect(page.next_cursor).not.toBeNull()
  })

  it("seguir o cursor entrega o resto sem repetir ids e termina em null", () => {
    const first = mockVouchersPage(now, 50)
    const second = mockVouchersPage(now, 50, first.next_cursor ?? undefined)

    const ids = [...first.items, ...second.items].map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(second.next_cursor).toBeNull()
  })

  it("cursor inválido volta ao começo em vez de quebrar", () => {
    expect(mockVouchersPage(now, 5, "lixo").items[0].id).toBe(
      mockVouchersPage(now, 5).items[0].id,
    )
  })

  it("tem vigentes e encerrados, e o tipo de dado do contrato", () => {
    const { items } = mockVouchersPage(now, 50)
    const hoje = "2026-11-26"

    expect(items.some((i) => i.end_date && i.end_date >= hoje)).toBe(true)
    expect(items.some((i) => i.end_date && i.end_date < hoje)).toBe(true)
    expect(items.some((i) => i.end_date === null)).toBe(true)
  })
})
