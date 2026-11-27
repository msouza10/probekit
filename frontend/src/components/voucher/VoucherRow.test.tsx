import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { VoucherItem } from "@/lib/api"
import { VoucherRow } from "./VoucherRow"

/*
 * Uma linha da lista: o que o visitante precisa para decidir e agir sem abrir
 * nada: quanto é o desconto, até quando vale (e quanto falta) e o código, que
 * se copia com um clique.
 */

const item = (over: Partial<VoucherItem> = {}): VoucherItem => ({
  id: "a1",
  url: "https://exemplo.com/post",
  title: "Título A",
  vendor: "aws",
  promotion_name: null,
  promotion_type: "discount",
  discount_text: "50% off",
  discount_percent: 50,
  certifications: ["SAA-C03"],
  voucher_code: "SAVE50",
  start_date: "2026-11-20",
  end_date: "2026-11-30",
  regions: [],
  published_at: "2026-11-20T14:02:00Z",
  source_name: "Fonte",
  ...over,
})

const hoje = new Date(2026, 10, 25, 12)

function renderLinha(over: Partial<VoucherItem> = {}) {
  return render(<VoucherRow item={item(over)} today={hoje} />)
}

describe("VoucherRow", () => {
  it("diz quanto falta para acabar", () => {
    renderLinha()

    expect(screen.getByText("faltam 5 dias")).toBeInTheDocument()
  })

  it("no último dia avisa que termina hoje", () => {
    render(<VoucherRow item={item()} today={new Date(2026, 10, 30, 9)} />)

    expect(screen.getByText("termina hoje")).toBeInTheDocument()
  })

  it("encerrada não mostra contagem, só Encerrado e a data", () => {
    render(<VoucherRow item={item()} today={new Date(2026, 11, 3)} />)
    const artigo = screen.getByRole("article")

    expect(within(artigo).getByText("Encerrado")).toBeInTheDocument()
    expect(within(artigo).queryByText(/faltam|termina/)).toBeNull()
  })

  it("o botão copia o código e avisa que copiou", async () => {
    const user = userEvent.setup()
    renderLinha()

    await user.click(
      screen.getByRole("button", { name: "Copiar código SAVE50" }),
    )

    expect(await navigator.clipboard.readText()).toBe("SAVE50")
    expect(screen.getByRole("status")).toHaveTextContent("Código copiado")
  })

  it("se a área de transferência falha, não quebra e não diz que copiou", async () => {
    const user = userEvent.setup()
    renderLinha()
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("x"))

    await user.click(
      screen.getByRole("button", { name: "Copiar código SAVE50" }),
    )

    expect(screen.queryByText("Código copiado")).toBeNull()
  })

  it("sem código não há botão de copiar", () => {
    renderLinha({ voucher_code: null })

    expect(screen.queryByRole("button")).toBeNull()
  })
})
