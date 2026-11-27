import { describe, expect, it } from "vitest"
import type { VoucherItem } from "./api"
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  filterVouchers,
  sortVouchers,
  type VoucherFilters,
} from "./voucherFilters"

/*
 * Filtros e ordenação da página /voucher, sem React. "Hoje" é 25/11/2026.
 * Datas de término valem até o fim do dia (ver `isEnded`).
 */

const hoje = new Date(2026, 10, 25, 12)

const item = (over: Partial<VoucherItem> = {}): VoucherItem => ({
  id: "a",
  url: "https://exemplo.com/a",
  title: "Título",
  vendor: "aws",
  promotion_name: null,
  promotion_type: "discount",
  discount_text: "50% off",
  discount_percent: 50,
  certifications: [],
  voucher_code: null,
  start_date: "2026-11-20",
  end_date: "2026-12-10",
  regions: ["Global"],
  published_at: "2026-11-20T12:00:00Z",
  source_name: "Fonte",
  ...over,
})

const filtros = (over: Partial<VoucherFilters> = {}): VoucherFilters => ({
  ...DEFAULT_FILTERS,
  ...over,
})

const ids = (lista: VoucherItem[]) => lista.map((i) => i.id)

describe("filterVouchers: encerrados", () => {
  const vigente = item({ id: "v", end_date: "2026-11-30" })
  const encerrado = item({ id: "e", end_date: "2026-11-20" })
  const semData = item({ id: "s", end_date: null })

  it("por padrão esconde os encerrados e mantém vigentes e sem data", () => {
    expect(
      ids(filterVouchers([vigente, encerrado, semData], filtros(), hoje)),
    ).toEqual(["v", "s"])
  })

  it("com showEnded mostra todos", () => {
    expect(
      ids(
        filterVouchers(
          [vigente, encerrado, semData],
          filtros({ showEnded: true }),
          hoje,
        ),
      ),
    ).toEqual(["v", "e", "s"])
  })
})

describe("filterVouchers: busca por texto", () => {
  const lista = [
    item({
      id: "1",
      title: "Exame de Segurança com desconto",
      certifications: ["SY0-701"],
      vendor: "comptia",
    }),
    item({
      id: "2",
      title: "Azure fundamentals",
      certifications: ["AZ-900"],
      vendor: "microsoft",
      voucher_code: "AZURE25",
    }),
    item({
      id: "3",
      title: "Terraform",
      vendor: "hashicorp",
      source_name: "HashiCorp Blog",
    }),
  ]

  it("acha no título, ignorando maiúsculas e acentos", () => {
    expect(
      ids(filterVouchers(lista, filtros({ query: "seguranca" }), hoje)),
    ).toEqual(["1"])
    expect(
      ids(filterVouchers(lista, filtros({ query: "AZURE" }), hoje)),
    ).toEqual(["2"])
  })

  it("acha na certificação, no código, no nome do provider e na fonte", () => {
    expect(ids(filterVouchers(lista, filtros({ query: "sy0" }), hoje))).toEqual(
      ["1"],
    )
    expect(
      ids(filterVouchers(lista, filtros({ query: "azure25" }), hoje)),
    ).toEqual(["2"])
    expect(
      ids(filterVouchers(lista, filtros({ query: "microsoft" }), hoje)),
    ).toEqual(["2"])
    expect(
      ids(filterVouchers(lista, filtros({ query: "hashicorp blog" }), hoje)),
    ).toEqual(["3"])
  })

  it("várias palavras: todas precisam aparecer, em qualquer ordem", () => {
    expect(
      ids(filterVouchers(lista, filtros({ query: "desconto exame" }), hoje)),
    ).toEqual(["1"])
    expect(
      ids(filterVouchers(lista, filtros({ query: "azure terraform" }), hoje)),
    ).toEqual([])
  })

  it("busca vazia ou só espaços não filtra", () => {
    expect(filterVouchers(lista, filtros({ query: "   " }), hoje)).toHaveLength(
      3,
    )
  })

  it("tolera item sem fornecedor, sem certificação e sem código", () => {
    const solto = item({
      id: "x",
      vendor: null,
      certifications: [],
      voucher_code: null,
    })

    expect(
      ids(filterVouchers([solto], filtros({ query: "titulo" }), hoje)),
    ).toEqual(["x"])
  })
})

describe("filterVouchers: provider, tipo e desconto", () => {
  const lista = [
    item({ id: "g1", vendor: "google" }),
    item({ id: "g2", vendor: "Google Cloud" }),
    item({
      id: "a",
      vendor: "aws",
      promotion_type: "free_exam",
      discount_percent: 100,
    }),
    item({
      id: "m",
      vendor: "microsoft",
      promotion_type: "voucher",
      discount_percent: 20,
    }),
    item({
      id: "t",
      vendor: "microsoft",
      promotion_type: "voucher",
      discount_percent: null,
      discount_text: "US$ 100 off",
    }),
  ]

  it("provider: nomes diferentes do mesmo provider contam juntos", () => {
    expect(
      ids(filterVouchers(lista, filtros({ provider: "google" }), hoje)),
    ).toEqual(["g1", "g2"])
  })

  it("tipo da promoção", () => {
    expect(
      ids(filterVouchers(lista, filtros({ type: "voucher" }), hoje)),
    ).toEqual(["m", "t"])
  })

  it("desconto mínimo: sem porcentagem não passa em nenhum mínimo", () => {
    expect(
      ids(filterVouchers(lista, filtros({ minDiscount: 50 }), hoje)),
    ).toEqual(["g1", "g2", "a"])
    expect(
      ids(filterVouchers(lista, filtros({ minDiscount: 100 }), hoje)),
    ).toEqual(["a"])
    expect(
      ids(filterVouchers(lista, filtros({ minDiscount: 0 }), hoje)),
    ).toHaveLength(5)
  })

  it("os filtros se combinam (E)", () => {
    expect(
      ids(
        filterVouchers(
          lista,
          filtros({ provider: "microsoft", minDiscount: 20 }),
          hoje,
        ),
      ),
    ).toEqual(["m"])
  })
})

describe("filterVouchers: prazo", () => {
  const lista = [
    item({ id: "hoje", end_date: "2026-11-25" }),
    item({ id: "5d", end_date: "2026-11-30" }),
    item({ id: "7d", end_date: "2026-12-02" }),
    item({ id: "8d", end_date: "2026-12-03" }),
    item({ id: "30d", end_date: "2026-12-25" }),
    item({ id: "60d", end_date: "2027-01-24" }),
    item({ id: "sem", end_date: null }),
    item({ id: "fim", end_date: "2026-11-01" }),
  ]

  it("termina em até 7 dias (inclui hoje, exclui encerrados e sem data)", () => {
    expect(
      ids(filterVouchers(lista, filtros({ deadline: "7d" }), hoje)),
    ).toEqual(["hoje", "5d", "7d"])
  })

  it("termina em até 30 dias", () => {
    expect(
      ids(filterVouchers(lista, filtros({ deadline: "30d" }), hoje)),
    ).toEqual(["hoje", "5d", "7d", "8d", "30d"])
  })

  it("sem data de término", () => {
    expect(
      ids(filterVouchers(lista, filtros({ deadline: "open" }), hoje)),
    ).toEqual(["sem"])
  })

  it("um prazo não traz encerrados nem com Mostrar encerrados", () => {
    expect(
      ids(
        filterVouchers(
          lista,
          filtros({ deadline: "7d", showEnded: true }),
          hoje,
        ),
      ),
    ).not.toContain("fim")
  })
})

describe("sortVouchers", () => {
  const lista = [
    item({
      id: "b",
      published_at: "2026-11-22T10:00:00Z",
      discount_percent: 20,
      end_date: "2026-12-20",
    }),
    item({
      id: "a",
      published_at: "2026-11-24T10:00:00Z",
      discount_percent: 50,
      end_date: "2026-11-27",
    }),
    item({
      id: "c",
      published_at: "2026-11-20T10:00:00Z",
      discount_percent: null,
      end_date: null,
    }),
    item({
      id: "d",
      published_at: null,
      discount_percent: 100,
      end_date: "2026-11-10",
    }),
  ]

  it("mais recentes: publicação do mais novo ao mais antigo, sem data por último", () => {
    expect(ids(sortVouchers(lista, "newest", hoje))).toEqual([
      "a",
      "b",
      "c",
      "d",
    ])
  })

  it("mais antigas: o inverso, e sem data continua por último", () => {
    expect(ids(sortVouchers(lista, "oldest", hoje))).toEqual([
      "c",
      "b",
      "a",
      "d",
    ])
  })

  it("maior desconto: porcentagem decrescente, sem porcentagem por último", () => {
    expect(ids(sortVouchers(lista, "discount", hoje))).toEqual([
      "d",
      "a",
      "b",
      "c",
    ])
  })

  it("termina primeiro: vigentes por data, sem data depois, encerrados por último", () => {
    expect(ids(sortVouchers(lista, "ending", hoje))).toEqual([
      "a",
      "b",
      "c",
      "d",
    ])
  })

  it("empates mantêm a ordem em que vieram (a mais nova da API primeiro)", () => {
    const iguais = [
      item({ id: "x", discount_percent: 30 }),
      item({ id: "y", discount_percent: 30 }),
    ]

    expect(ids(sortVouchers(iguais, "discount", hoje))).toEqual(["x", "y"])
  })

  it("não altera a lista original", () => {
    const copia = [...lista]
    sortVouchers(lista, "oldest", hoje)

    expect(lista).toEqual(copia)
  })
})

describe("activeFilterCount", () => {
  it("padrão não conta nada", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0)
  })

  it("conta cada filtro mexido, inclusive a busca e os encerrados", () => {
    expect(
      activeFilterCount(
        filtros({
          query: "aws",
          provider: "aws",
          type: "voucher",
          minDiscount: 25,
          deadline: "7d",
          showEnded: true,
        }),
      ),
    ).toBe(6)
  })

  it("busca só com espaços não conta", () => {
    expect(activeFilterCount(filtros({ query: "  " }))).toBe(0)
  })
})
