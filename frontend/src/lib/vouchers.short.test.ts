import { describe, expect, it } from "vitest"
import { remainingShort } from "./vouchers"

/* O prazo em uma ou duas palavras, para o carimbo do selo (sem frase). */

describe("remainingShort", () => {
  it.each([
    [0, "hoje"],
    [1, "amanhã"],
    [2, "2 dias"],
    [12, "12 dias"],
  ])("%i dias -> %s", (dias, texto) => {
    expect(remainingShort(dias)).toBe(texto)
  })
})
