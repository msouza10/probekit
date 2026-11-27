import { render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import Home from "./Home"

/*
 * O destaque do voucher dentro da Home. O comportamento dele em si está em
 * components/VoucherSpotlight.test.tsx; aqui só se confere que a Home o mostra
 * no lugar certo e que ele nunca atrapalha o resto da página.
 */

const item = (over: Record<string, unknown> = {}) => ({
  id: "a1",
  url: "https://exemplo.com/post",
  title: "Exame de certificação com 50% de desconto",
  vendor: "aws",
  promotion_name: null,
  promotion_type: "voucher",
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

/** A Home também consulta a API do GitHub; aqui ela sempre falha. */
function mockApis(vouchers: () => Response) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (entrada) =>
    String(entrada).includes("/api/vouchers")
      ? vouchers()
      : new Response("{}", { status: 500 }),
  )
}

const resposta = (items: unknown[]) => () =>
  Response.json({
    last_collected_at: "2026-11-24T14:00:12Z",
    generated_at: "2026-11-24T14:05:00Z",
    items,
    next_cursor: null,
  })

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )

const esperarAPI = async () => {
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
  await new Promise((resolve) => setTimeout(resolve, 20))
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  // Só o relógio é falso. Hoje: 25/11/2026.
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2026, 10, 25, 12))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const links = (name: RegExp) =>
  screen.getAllByRole("link", { name }).map((l) => l.getAttribute("href"))

describe("Home com o destaque de voucher", () => {
  it("mostra a linha do herói e a seção abaixo, com o mesmo voucher", async () => {
    mockApis(resposta([item()]))
    renderHome()

    await screen.findByRole("region", { name: "Voucher em destaque" })

    expect(
      screen.getByRole("link", {
        name: /AWS.*−50%.*5 dias/,
      }),
    ).toHaveAttribute("href", "/voucher#a1")
    expect(
      screen.getByRole("region", { name: "Voucher em destaque" }),
    ).toBeInTheDocument()
    expect(new Set(links(/AWS.*−50%|Exame de certificação/))).toEqual(
      new Set(["/voucher#a1"]),
    )
  })

  it("não existe mais o mini-ingresso ao lado da coruja", async () => {
    mockApis(resposta([item()]))
    renderHome()
    await screen.findByRole("region", { name: "Voucher em destaque" })

    expect(
      screen.queryByRole("complementary", { name: "Último voucher ativo" }),
    ).toBeNull()
  })

  it("consulta a API de vouchers uma vez só, não uma por componente", async () => {
    mockApis(resposta([item()]))
    renderHome()
    await screen.findByRole("region", { name: "Voucher em destaque" })

    const chamadas = vi
      .mocked(globalThis.fetch)
      .mock.calls.filter(([entrada]) =>
        String(entrada).includes("/api/vouchers"),
      )

    expect(chamadas).toHaveLength(1)
  })

  it("a linha fica no herói, logo depois do Último artigo, com o rótulo Voucher ativo", async () => {
    mockApis(resposta([item()]))
    renderHome()
    await screen.findByRole("region", { name: "Voucher em destaque" })
    const heroi = screen.getByRole("region", {
      name: /Teste se um host responde/,
    })
    const linha = within(heroi).getByRole("link", {
      name: /AWS.*−50%/,
    })
    const artigo = within(heroi).getByRole("link", { name: /Olá, mundo/ })

    expect(within(heroi).getByText("Voucher ativo")).toBeInTheDocument()
    expect(
      artigo.compareDocumentPosition(linha) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it("a linha fica fora do fluxo, para aparecer sem empurrar a página", async () => {
    mockApis(resposta([item()]))
    renderHome()
    await screen.findByRole("region", { name: "Voucher em destaque" })
    const linha = screen.getByRole("link", { name: /AWS.*−50%/ })

    expect(linha.closest(".absolute")).not.toBeNull()
  })

  it("a seção fica depois de O que já funciona e antes do fechamento da Home", async () => {
    mockApis(resposta([item()]))
    renderHome()
    const secao = await screen.findByRole("region", {
      name: "Voucher em destaque",
    })
    const ferramentas = screen.getByRole("heading", {
      name: "O que já funciona",
    })
    const arquitetura = screen.getByRole("region", { name: "Arquitetura" })

    expect(
      ferramentas.compareDocumentPosition(secao) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      secao.compareDocumentPosition(arquitetura) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it("quando o voucher acaba, nada do destaque aparece e a Home segue inteira", async () => {
    mockApis(resposta([item({ end_date: "2026-11-20" })]))
    renderHome()

    await esperarAPI()

    expect(
      screen.queryByRole("region", { name: "Voucher em destaque" }),
    ).toBeNull()
    expect(screen.queryByRole("link", { name: /50% de desconto/ })).toBeNull()
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(
      screen.getByRole("heading", { name: "O que já funciona" }),
    ).toBeInTheDocument()
  })

  it("se a API de vouchers cai, a Home segue inteira e sem destaque", async () => {
    mockApis(() => new Response("{}", { status: 503 }))
    renderHome()

    await esperarAPI()

    expect(
      screen.queryByRole("region", { name: "Voucher em destaque" }),
    ).toBeNull()
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })

  it("o destaque não tem botão de fechar em lugar nenhum", async () => {
    mockApis(resposta([item()]))
    renderHome()
    const secao = await screen.findByRole("region", {
      name: "Voucher em destaque",
    })

    expect(within(secao).queryByRole("button")).toBeNull()
  })
})
