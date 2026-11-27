import { describe, expect, it } from "vitest"
import type { VoucherItem } from "./api"
import { daysLeft, remainingText } from "./vouchers"

/* Quantos dias faltam para a promoção acabar, no fuso de quem vê. */

const item = (end_date: string | null) =>
  ({ end_date }) as unknown as VoucherItem

describe("daysLeft", () => {
  it("conta os dias inteiros até o dia do término", () => {
    expect(daysLeft(item("2026-11-30"), new Date(2026, 10, 25, 12))).toBe(5)
  })

  it("no dia do término são 0 dias, mesmo no fim do dia", () => {
    expect(daysLeft(item("2026-11-30"), new Date(2026, 10, 30, 23, 59))).toBe(0)
  })

  it("depois do término é negativo", () => {
    expect(daysLeft(item("2026-11-30"), new Date(2026, 11, 1, 0, 1))).toBe(-1)
  })

  it("sem data de término ou com data inválida, não há contagem", () => {
    expect(daysLeft(item(null), new Date(2026, 10, 25))).toBeNull()
    expect(daysLeft(item("30/11"), new Date(2026, 10, 25))).toBeNull()
  })

  it("atravessa a virada de mês e de ano", () => {
    expect(daysLeft(item("2027-01-02"), new Date(2026, 11, 30, 8))).toBe(3)
  })
})

describe("remainingText", () => {
  it.each([
    [0, "termina hoje"],
    [1, "termina amanhã"],
    [2, "faltam 2 dias"],
    [12, "faltam 12 dias"],
  ])("%i dias -> %s", (dias, texto) => {
    expect(remainingText(dias)).toBe(texto)
  })
})
