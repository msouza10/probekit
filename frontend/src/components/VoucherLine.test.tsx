import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import type { VoucherItem } from "@/lib/api"
import { VoucherLine } from "./VoucherLine"

/*
 * A linha do voucher no herói da Home, colada ao "Último artigo": o rótulo
 * "Voucher ativo" e, depois dele, o link com o logo do provider, o desconto com
 * cara de etiqueta e o carimbo curto do prazo. Sem frase além do rótulo.
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
  regions: [],
  published_at: "2026-11-20T14:02:00Z",
  source_name: "Fonte",
  ...over,
})

const hoje = new Date(2026, 10, 25, 12)

const renderSelo = (over: Partial<VoucherItem> = {}, today = hoje) =>
  render(
    <MemoryRouter>
      <VoucherLine featured={{ item: item(over), today }} />
    </MemoryRouter>,
  )

const link = () => screen.getByRole("link")
const linha = () => link().closest("p") as HTMLElement

describe("VoucherLine", () => {
  it("leva ao item", () => {
    renderSelo()

    expect(link()).toHaveAttribute("href", "/voucher#a1")
  })

  it("o nome acessível vem do conteúdo e inclui o texto visível (WCAG 2.5.3, comando de voz)", () => {
    renderSelo()

    // Sem aria-label: com ele, o nome não conteria "−50%" nem "5 dias" como estão na tela.
    expect(link()).not.toHaveAttribute("aria-label")
    // Com espaço entre as partes: sem ele o nome sairia "AWS−50%5 dias".
    expect(link()).toHaveAccessibleName("AWS −50% 5 dias")
  })

  it("o nome do provider só para leitor de tela quando há logo; sem logo, o nome visível basta", () => {
    const comLogo = renderSelo()
    expect(within(link()).getByText("AWS").className).toMatch(/sr-only/)
    comLogo.unmount()

    renderSelo({ vendor: "Tutorials Dojo" })
    expect(within(link()).getByText("Tutorials Dojo").className).not.toMatch(
      /sr-only/,
    )
    expect(within(link()).getAllByText("Tutorials Dojo")).toHaveLength(1)
  })

  it("tem o rótulo Voucher ativo antes do link, para dizer o que é", () => {
    renderSelo()

    expect(within(linha()).getByText("Voucher ativo")).toBeInTheDocument()
    expect(link()).not.toHaveTextContent("Voucher ativo")
    expect(
      within(linha())
        .getByText("Voucher ativo")
        .compareDocumentPosition(link()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it("visualmente é só o logo, o número com cara de desconto e o carimbo, sem frase", () => {
    renderSelo()

    // "−50%" (sinal de menos de verdade), como uma etiqueta de promoção.
    expect(within(link()).getByText("−50%")).toBeInTheDocument()
    expect(within(link()).queryByText("50%")).toBeNull()
    expect(within(link()).getByText("5 dias")).toBeInTheDocument()
    expect(within(link()).queryByText(/de desconto|faltam|termina/)).toBeNull()
  })

  it("no último dia o carimbo diz hoje, e no anterior, amanhã", () => {
    const hojeUltimo = renderSelo({}, new Date(2026, 10, 30, 9))
    expect(within(link()).getByText("hoje")).toBeInTheDocument()
    hojeUltimo.unmount()

    renderSelo({}, new Date(2026, 10, 29, 9))
    expect(within(link()).getByText("amanhã")).toBeInTheDocument()
  })

  it("quando é urgente o carimbo fica invertido; com folga, não", () => {
    const urgente = renderSelo({}, new Date(2026, 10, 30, 9))
    expect(within(link()).getByText("hoje").className).toMatch(/bg-foreground/)
    urgente.unmount()

    renderSelo({ end_date: "2026-12-20" })
    expect(within(link()).getByText("25 dias").className).not.toMatch(
      /bg-foreground/,
    )
  })

  it("desconto que não é porcentagem aparece como veio", () => {
    renderSelo({ discount_percent: null, discount_text: "US$ 100 off" })

    expect(within(link()).getByText("US$ 100 off")).toBeInTheDocument()
  })

  it("sem data de término, não mostra carimbo", () => {
    renderSelo({ end_date: null })

    expect(within(link()).getByText("−50%")).toBeInTheDocument()
    expect(within(link()).queryByText(/dias|hoje|amanhã/)).toBeNull()
  })

  it("tem o selo de porcentagem como ícone de desconto, decorativo", () => {
    const { container } = renderSelo()

    expect(container.querySelector("svg.lucide-badge-percent")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("desconto sem porcentagem (texto livre) também leva o selo de desconto", () => {
    const { container } = renderSelo({
      discount_percent: null,
      discount_text: "US$ 100 off",
    })

    expect(container.querySelector("svg.lucide-badge-percent")).not.toBeNull()
  })

  it("o logo do provider é decorativo", () => {
    const { container } = renderSelo()

    expect(container.querySelector("svg[data-provider='aws']")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("provider sem logo cadastrado mostra o nome, porque o ícone genérico não diz nada", () => {
    const { container } = renderSelo({ vendor: "Tutorials Dojo" })

    expect(container.querySelector("svg[data-provider='generic']")).toBeNull()
    expect(within(link()).getByText("Tutorials Dojo")).toBeInTheDocument()
  })

  it("não tem botão (não fecha) e é um único link", () => {
    renderSelo()

    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getAllByRole("link")).toHaveLength(1)
  })
})
