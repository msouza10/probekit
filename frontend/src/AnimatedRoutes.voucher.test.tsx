import { act, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AnimatedRoutes } from "./AnimatedRoutes"

/* A rota /voucher: abre a página (carregada sob demanda) e lê a API. */

afterEach(() => {
  vi.unstubAllGlobals()
})

async function abrir(caminho: string) {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[caminho]}>
        <AnimatedRoutes />
      </MemoryRouter>,
    )
  })
}

describe("AnimatedRoutes em /voucher", () => {
  it("abre a página Vouchers e lista o que a API devolveu", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          last_collected_at: "2026-11-24T14:00:12Z",
          generated_at: "2026-11-24T14:05:00Z",
          items: [
            {
              id: "a1",
              url: "https://exemplo.com/post",
              title: "Título do post",
              vendor: "aws",
              promotion_name: null,
              promotion_type: "discount",
              discount_text: "50% off",
              discount_percent: 50,
              certifications: [],
              voucher_code: null,
              start_date: null,
              end_date: null,
              regions: [],
              published_at: "2026-11-20T14:02:00Z",
              source_name: "Fonte",
            },
          ],
          next_cursor: null,
        }),
      ),
    )

    await abrir("/voucher")

    expect(
      await screen.findByRole("heading", { level: 1, name: "Vouchers" }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("heading", { level: 2, name: "Título do post" }),
    ).toBeInTheDocument()
  })

  it("/voucher/ com barra no fim abre a mesma página", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    )

    await abrir("/voucher/")

    expect(
      await screen.findByRole("heading", { level: 1, name: "Vouchers" }),
    ).toBeInTheDocument()
  })
})
