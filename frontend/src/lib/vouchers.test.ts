import { describe, expect, it } from "vitest"
import type { VoucherItem } from "./api"
import { bannerText, isEnded, isSafeLink, pickBannerItem } from "./vouchers"

/*
 * Funções puras da página /voucher e do aviso da Home.
 *
 * Decisões destes testes que o plano não fixava (mude código e teste juntos):
 * - o nome do fornecedor no aviso: até 4 letras vira MAIÚSCULAS ("aws" -> "AWS"),
 *   acima disso só a primeira letra ("microsoft" -> "Microsoft");
 * - sem data de término, o aviso diz "publicado em dd/mm" (a data da publicação).
 */

const item = (over: Partial<VoucherItem> = {}): VoucherItem => ({
  id: "a1",
  url: "https://exemplo.com/post",
  title: "Título do post",
  vendor: "aws",
  promotion_name: "Promoção",
  promotion_type: "discount",
  discount_text: "50% off",
  discount_percent: 50,
  certifications: ["SAA-C03"],
  voucher_code: null,
  start_date: "2026-11-20",
  end_date: "2026-11-30",
  regions: ["Global"],
  published_at: "2026-11-20T14:02:00Z",
  source_name: "Fonte",
  ...over,
})

describe("isEnded", () => {
  // `new Date(ano, mês, dia, hora)` é no fuso do computador, como o visitante vê.
  it("no próprio dia do término a promoção ainda vale, até o fim do dia", () => {
    expect(isEnded(item(), new Date(2026, 10, 30, 0, 0, 1))).toBe(false)
    expect(isEnded(item(), new Date(2026, 10, 30, 23, 59, 59))).toBe(false)
  })

  it("no dia seguinte ao término ela está encerrada", () => {
    expect(isEnded(item(), new Date(2026, 11, 1, 0, 0, 1))).toBe(true)
  })

  it("antes do término vale", () => {
    expect(isEnded(item(), new Date(2026, 10, 1, 12))).toBe(false)
  })

  it("sem data de término nunca está encerrada", () => {
    expect(isEnded(item({ end_date: null }), new Date(2030, 0, 1))).toBe(false)
  })
})

describe("isSafeLink", () => {
  it.each(["https://exemplo.com/a", "http://exemplo.com/a?x=1#y"])(
    "aceita %s",
    (url) => {
      expect(isSafeLink(url)).toBe(true)
    },
  )

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "mailto:alguem@exemplo.com", // seguro para artigos, mas aqui só vale http e https
    "/caminho/relativo",
    "//evil.example/x",
    "ftp://exemplo.com/a",
    "",
  ])("recusa %j", (url) => {
    expect(isSafeLink(url)).toBe(false)
  })
})

describe("pickBannerItem", () => {
  it("devolve o primeiro item (o mais novo) que tem fornecedor e desconto", () => {
    const itens = [item({ id: "novo" }), item({ id: "velho" })]

    expect(pickBannerItem(itens)?.id).toBe("novo")
  })

  it("pula os itens sem fornecedor ou sem texto de desconto", () => {
    const itens = [
      item({ id: "sem-fornecedor", vendor: null }),
      item({ id: "sem-desconto", discount_text: null }),
      item({ id: "fornecedor-em-branco", vendor: "   " }),
      item({ id: "desconto-em-branco", discount_text: "" }),
      item({ id: "serve" }),
    ]

    expect(pickBannerItem(itens)?.id).toBe("serve")
  })

  it("devolve null quando nenhum serve ou a lista é vazia", () => {
    expect(pickBannerItem([])).toBeNull()
    expect(pickBannerItem([item({ vendor: null })])).toBeNull()
  })
})

describe("bannerText", () => {
  it("monta fornecedor, desconto e até quando vale", () => {
    expect(bannerText(item())).toBe("AWS · 50% de desconto · até 30/11")
  })

  it("fornecedor com mais de 4 letras leva só a inicial maiúscula", () => {
    expect(bannerText(item({ vendor: "microsoft" }))).toBe(
      "Microsoft · 50% de desconto · até 30/11",
    )
  })

  it("sem porcentagem usa o texto do desconto como veio", () => {
    expect(
      bannerText(
        item({ discount_percent: null, discount_text: "US$ 100 off" }),
      ),
    ).toBe("AWS · US$ 100 off · até 30/11")
  })

  it("sem data de término usa a data da publicação", () => {
    expect(bannerText(item({ end_date: null }))).toBe(
      "AWS · 50% de desconto · publicado em 20/11",
    )
  })

  it("sem nenhuma das duas datas, não inventa data", () => {
    expect(bannerText(item({ end_date: null, published_at: null }))).toBe(
      "AWS · 50% de desconto",
    )
  })
})
