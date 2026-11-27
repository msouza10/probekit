import { describe, expect, it } from "vitest"
import { promotionTypeLabel, vendorLabel } from "./vouchers"

/* O tipo da promoção, como o coletor classifica, em português. */

describe("promotionTypeLabel", () => {
  it.each([
    ["voucher", "Voucher"],
    ["discount", "Desconto"],
    ["free_exam", "Exame grátis"],
    ["beta_exam", "Exame beta"],
    ["other", "Promoção"],
  ])("%s -> %s", (tipo, texto) => {
    expect(promotionTypeLabel(tipo)).toBe(texto)
  })

  it("um tipo que o coletor não conhece vira Promoção", () => {
    expect(promotionTypeLabel("free_retake")).toBe("Promoção")
    expect(promotionTypeLabel("")).toBe("Promoção")
  })
})

describe("vendorLabel", () => {
  it("usa o nome da marca quando o provider é conhecido", () => {
    expect(vendorLabel("google cloud")).toBe("Google Cloud")
    expect(vendorLabel("comptia")).toBe("CompTIA")
  })
})
