import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import type { VoucherItem } from "@/lib/api"
import { VoucherSpotlight } from "./VoucherSpotlight"

/*
 * A seção "Voucher em destaque", abaixo da primeira tela: o ingresso completo. Quem
 * escolhe o voucher é `useFeaturedVoucher`; aqui só se confere como ele aparece.
 *
 * Decisões destes testes que o plano não fixava (mude código e teste juntos):
 * - a seção é uma região chamada "Voucher em destaque";
 * - o título do voucher é o link para /voucher#<id>, e o ingresso inteiro clica;
 * - "Ver todos os vouchers" leva a /voucher.
 */

const item = (over: Partial<VoucherItem> = {}): VoucherItem => ({
  id: "a1",
  url: "https://exemplo.com/post",
  title: "Exame de certificação com 50% de desconto",
  vendor: "aws",
  promotion_name: null,
  promotion_type: "voucher",
  discount_text: "50% off",
  discount_percent: 50,
  certifications: ["SAA-C03", "DVA-C02"],
  voucher_code: "SAVE50",
  start_date: "2026-11-20",
  end_date: "2026-11-30",
  regions: ["Global"],
  published_at: "2026-11-20T14:02:00Z",
  source_name: "Blog oficial",
  ...over,
})

const hoje = new Date(2026, 10, 25, 12)

const renderSecao = (over: Partial<VoucherItem> = {}, today = hoje) =>
  render(
    <MemoryRouter>
      <VoucherSpotlight featured={{ item: item(over), today }} />
    </MemoryRouter>,
  )

const regiao = () => screen.getByRole("region", { name: "Voucher em destaque" })

describe("VoucherSpotlight", () => {
  it("mostra provider, título, desconto, certificações e quanto falta", () => {
    renderSecao()

    expect(within(regiao()).getByText("AWS")).toBeInTheDocument()
    expect(within(regiao()).getByText("50%")).toBeInTheDocument()
    expect(within(regiao()).getByText("SAA-C03")).toBeInTheDocument()
    expect(within(regiao()).getByText("faltam 5 dias")).toBeInTheDocument()
    expect(
      within(regiao()).getByRole("heading", { name: /50% de desconto/ }),
    ).toBeInTheDocument()
  })

  it("o título leva ao item na página de vouchers", () => {
    renderSecao()

    expect(
      within(regiao()).getByRole("link", { name: /Exame de certificação/ }),
    ).toHaveAttribute("href", "/voucher#a1")
  })

  it("tem o link Ver todos os vouchers", () => {
    renderSecao()

    expect(
      within(regiao()).getByRole("link", { name: /Ver todos os vouchers/ }),
    ).toHaveAttribute("href", "/voucher")
  })

  it("no último dia, avisa que termina hoje", () => {
    renderSecao({}, new Date(2026, 10, 30, 9))

    expect(within(regiao()).getByText("termina hoje")).toBeInTheDocument()
  })

  it("sem data de término, não mostra contagem mas o voucher aparece", () => {
    renderSecao({ end_date: null })

    expect(within(regiao()).queryByText(/faltam|termina/)).toBeNull()
  })

  it("um título com HTML aparece como texto", () => {
    const { container } = renderSecao({ title: "<img src=x onerror=alert(1)>" })

    expect(container.querySelector("img")).toBeNull()
    expect(
      screen.getByRole("heading", { name: "<img src=x onerror=alert(1)>" }),
    ).toBeInTheDocument()
  })

  it("não tem botão de fechar", () => {
    renderSecao()

    expect(screen.queryByRole("button")).toBeNull()
  })
})
