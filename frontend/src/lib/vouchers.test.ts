import { describe, expect, it } from "vitest"
import type { VoucherItem } from "./api"
import { isEnded, isSafeLink, pickBannerItem } from "./vouchers"

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
  // Hoje é 25/11/2026; o item de teste termina em 30/11, então está ativo.
  const hoje = new Date(2026, 10, 25, 12)

  it("devolve o primeiro item (o mais novo) que tem fornecedor e desconto", () => {
    const itens = [item({ id: "novo" }), item({ id: "velho" })]

    expect(pickBannerItem(itens, hoje)?.id).toBe("novo")
  })

  it("pula os itens sem fornecedor ou sem texto de desconto", () => {
    const itens = [
      item({ id: "sem-fornecedor", vendor: null }),
      item({ id: "sem-desconto", discount_text: null }),
      item({ id: "fornecedor-em-branco", vendor: "   " }),
      item({ id: "desconto-em-branco", discount_text: "" }),
      item({ id: "serve" }),
    ]

    expect(pickBannerItem(itens, hoje)?.id).toBe("serve")
  })

  it("pula os encerrados: o destaque some quando a promoção acaba", () => {
    const itens = [
      item({ id: "acabou", end_date: "2026-11-20" }),
      item({ id: "ativo" }),
    ]

    expect(pickBannerItem(itens, hoje)?.id).toBe("ativo")
  })

  it("no último dia a promoção ainda está ativa", () => {
    const ultimoDia = new Date(2026, 10, 30, 23, 59)

    expect(pickBannerItem([item({ id: "hoje" })], ultimoDia)?.id).toBe("hoje")
  })

  it("no dia seguinte ao término, não serve mais", () => {
    expect(
      pickBannerItem([item({ id: "x" })], new Date(2026, 11, 1, 0, 1)),
    ).toBeNull()
  })

  it("sem data de término continua valendo", () => {
    expect(
      pickBannerItem([item({ id: "aberta", end_date: null })], hoje)?.id,
    ).toBe("aberta")
  })

  it("devolve null quando nenhum serve ou a lista é vazia", () => {
    expect(pickBannerItem([], hoje)).toBeNull()
    expect(pickBannerItem([item({ vendor: null })], hoje)).toBeNull()
    expect(pickBannerItem([item({ end_date: "2026-11-01" })], hoje)).toBeNull()
  })
})
