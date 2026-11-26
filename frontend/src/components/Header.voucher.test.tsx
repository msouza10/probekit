import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Header } from "./Header"

/*
 * O item "Vouchers" na navegação principal. Ele sempre existe (não depende de
 * haver artigos) e fica antes de "Sobre", depois de "Artigos" quando este existe.
 *
 * ATENÇÃO: quando este item entrar no menu, dois testes de Header.test.tsx
 * mudam de propósito (o que conta os links da navegação e o que confere a
 * ordem "Arquitetura, Artigos, Sobre"), porque o menu passa a ter mais um link.
 */

const catalog = vi.hoisted(() => ({ list: [] as unknown[] }))
vi.mock("@/lib/articles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/articles")>()),
  get articles() {
    return catalog.list
  },
}))

beforeEach(() => {
  catalog.list = []
})

function linksDoMenu() {
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  )
  const nav = screen.getByRole("navigation", { name: "Navegação principal" })
  return { nav, links: within(nav).getAllByRole("link") }
}

describe("Header com Vouchers", () => {
  it("sem artigos, o menu é Arquitetura, Vouchers, Sobre", () => {
    const { links } = linksDoMenu()

    expect(links.map((link) => link.textContent)).toEqual([
      "Arquitetura",
      "Vouchers",
      "Sobre",
    ])
  })

  it("com artigos, o menu é Arquitetura, Artigos, Vouchers, Sobre", () => {
    catalog.list = [{ slug: "um-artigo" }]

    const { links } = linksDoMenu()

    expect(links.map((link) => link.textContent)).toEqual([
      "Arquitetura",
      "Artigos",
      "Vouchers",
      "Sobre",
    ])
  })

  it("o link Vouchers leva a /voucher", () => {
    const { nav } = linksDoMenu()

    expect(within(nav).getByRole("link", { name: "Vouchers" })).toHaveAttribute(
      "href",
      "/voucher",
    )
  })
})
