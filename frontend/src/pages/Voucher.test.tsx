import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { VoucherItem } from "@/lib/api"
import Voucher from "./Voucher"

/*
 * A página /voucher: a lista de promoções de certificação que o coletor achou.
 * A API é trocada no `fetch` (a fronteira de verdade); nada do React é simulado.
 *
 * Decisões destes testes que o plano não fixava (mude código e teste juntos):
 * - cada item é um <article id="{id}"> com o título num <h2>;
 * - o título é link para a página original quando o endereço é http(s); senão é só texto;
 * - filtro de fornecedor: <select> chamado "Fornecedor" (o valor de cada opção é o
 *   fornecedor como vem da API); "Mostrar encerrados" é uma caixa de marcar;
 * - textos: "Carregando", "Nenhum voucher", "Nenhum resultado", "Encerrado",
 *   "Sem data de término", "Última coleta", botões "Tentar de novo", "Carregar mais"
 *   e "Limpar filtros".
 */

const item = (over: Partial<VoucherItem> = {}): VoucherItem => ({
  id: "a1",
  url: "https://exemplo.com/post-a1",
  title: "Título A",
  vendor: "aws",
  promotion_name: "Promoção A",
  promotion_type: "discount",
  discount_text: "50% off",
  discount_percent: 50,
  certifications: ["SAA-C03"],
  voucher_code: null,
  start_date: "2026-11-20",
  end_date: "2026-11-30",
  regions: ["Global"],
  published_at: "2026-11-20T14:02:00Z",
  source_name: "Blog oficial",
  ...over,
})

const pagina = (items: VoucherItem[], next_cursor: string | null = null) => ({
  last_collected_at: "2026-11-24T14:00:12Z",
  generated_at: "2026-11-24T14:05:00Z",
  items,
  next_cursor,
})

/** Cada chamada ao fetch devolve a próxima resposta; depois da última, repete a última. */
function servir(...respostas: Array<{ corpo: unknown; status?: number }>) {
  let chamada = 0
  const fetchMock = vi.fn(async () => {
    const r = respostas[Math.min(chamada++, respostas.length - 1)]
    return Response.json(r.corpo, { status: r.status ?? 200 })
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const ok = (items: VoucherItem[], next: string | null = null) => ({
  corpo: pagina(items, next),
})

function renderPagina(caminho = "/voucher") {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <Voucher />
    </MemoryRouter>,
  )
}

const titulos = () =>
  screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)

beforeEach(() => {
  // Só o relógio é falso: o `findBy*` e as promessas seguem normais.
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2026, 10, 25, 12))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("cabeçalho e estados", () => {
  it("tem um único h1, Vouchers, com o subtítulo Descontos de certificações", async () => {
    servir(ok([item()]))
    renderPagina()

    const h1 = screen.getAllByRole("heading", { level: 1 })

    expect(h1).toHaveLength(1)
    expect(h1[0]).toHaveTextContent("Vouchers")
    expect(screen.getByText(/descontos de certificações/i)).toBeInTheDocument()
    await screen.findByRole("article")
  })

  it("enquanto carrega, diz que está carregando", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    )
    renderPagina()

    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it("sem itens, diz que não há vouchers", async () => {
    servir(ok([]))
    renderPagina()

    expect(await screen.findByText(/nenhum voucher/i)).toBeInTheDocument()
  })

  it("mostra a hora da última coleta", async () => {
    servir(ok([item()]))
    const { container } = renderPagina()
    await screen.findByRole("article")

    expect(screen.getByText(/última coleta/i)).toBeInTheDocument()
    expect(
      container.querySelector('time[datetime="2026-11-24T14:00:12Z"]'),
    ).not.toBeNull()
  })

  it("com erro, mostra o aviso e o botão Tentar de novo refaz a chamada", async () => {
    const fetchMock = servir(
      {
        corpo: { error: "indisponível", code: "vouchers_unavailable" },
        status: 503,
      },
      ok([item()]),
    )
    renderPagina()

    expect(await screen.findByRole("alert")).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: "Tentar de novo" }),
    )

    expect(await screen.findByRole("article")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe("a lista", () => {
  it("mostra os itens na ordem em que a API mandou (do mais novo ao mais antigo)", async () => {
    servir(
      ok([
        item({ id: "n", title: "O mais novo" }),
        item({ id: "m", title: "O do meio" }),
        item({ id: "v", title: "O mais velho" }),
      ]),
    )
    renderPagina()
    await screen.findAllByRole("article")

    expect(titulos()).toEqual(["O mais novo", "O do meio", "O mais velho"])
  })

  it("cada item mostra fornecedor, desconto, código, certificações e quando termina", async () => {
    servir(ok([item({ voucher_code: "SAVE50" })]))
    renderPagina()
    const artigo = await screen.findByRole("article")

    // `getAllByText`: o mesmo dado pode aparecer em mais de um lugar do item.
    for (const trecho of [/aws/i, /50%/, "SAVE50", "SAA-C03", /30\/11/]) {
      expect(within(artigo).getAllByText(trecho).length).toBeGreaterThan(0)
    }
  })

  it("o título leva à página original, em outra aba e sem passar o referrer", async () => {
    servir(ok([item()]))
    renderPagina()
    const artigo = await screen.findByRole("article")

    const link = within(artigo).getByRole("link", { name: "Título A" })

    expect(link).toHaveAttribute("href", "https://exemplo.com/post-a1")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link.getAttribute("rel")).toMatch(/noopener/)
    expect(link.getAttribute("rel")).toMatch(/noreferrer/)
  })

  it("cada item tem o id como âncora", async () => {
    servir(ok([item({ id: "abc123" })]))
    renderPagina()
    const artigo = await screen.findByRole("article")

    expect(artigo).toHaveAttribute("id", "abc123")
    expect(document.getElementById("abc123")).toBe(artigo)
  })

  it("abrir /voucher#id rola até o item", async () => {
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    servir(ok([item({ id: "a1" }), item({ id: "b2", title: "Título B" })]))
    renderPagina("/voucher#b2")
    await screen.findAllByRole("article")

    await waitFor(() => expect(rolar).toHaveBeenCalled())

    expect(rolar.mock.contexts[0]).toBe(document.getElementById("b2"))
  })
})

describe("o que vem de fora nunca vira código nem link perigoso", () => {
  it("um título com HTML aparece como texto, sem criar elemento", async () => {
    servir(ok([item({ title: "<img src=x onerror=alert(1)>" })]))
    const { container } = renderPagina()

    const titulo = await screen.findByRole("heading", { level: 2 })

    expect(titulo).toHaveTextContent("<img src=x onerror=alert(1)>")
    expect(container.querySelector("img")).toBeNull()
  })

  it("um endereço javascript: não vira link, mas o título continua visível", async () => {
    servir(ok([item({ url: "javascript:alert(1)", title: "Título perigoso" })]))
    const { container } = renderPagina()

    const artigo = await screen.findByRole("article")

    expect(within(artigo).getByText("Título perigoso")).toBeInTheDocument()
    expect(
      within(artigo).queryByRole("link", { name: "Título perigoso" }),
    ).toBeNull()
    expect(container.querySelector('a[href^="javascript"]')).toBeNull()
  })

  it("um título com HTML e um endereço inseguro juntos continuam sendo só texto", async () => {
    servir(
      ok([
        item({
          url: "javascript:alert(1)",
          title: "<img src=x onerror=alert(1)>",
        }),
      ]),
    )
    const { container } = renderPagina()

    const titulo = await screen.findByRole("heading", { level: 2 })

    expect(titulo).toHaveTextContent("<img src=x onerror=alert(1)>")
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector('a[href^="javascript"]')).toBeNull()
  })

  it("um código de voucher com HTML também aparece só como texto", async () => {
    servir(ok([item({ voucher_code: "<b>X</b>" })]))
    const { container } = renderPagina()
    await screen.findByRole("article")

    expect(container.querySelector("article b")).toBeNull()
  })
})

describe("vigentes, encerrados e sem data", () => {
  const vigente = item({ id: "v", title: "Vigente", end_date: "2026-11-30" })
  const encerrado = item({
    id: "e",
    title: "Já encerrado",
    end_date: "2026-11-20",
  })

  it("por padrão só mostra os vigentes", async () => {
    servir(ok([vigente, encerrado]))
    renderPagina()
    await screen.findAllByRole("article")

    expect(titulos()).toEqual(["Vigente"])
  })

  it("a opção Mostrar encerrados traz os encerrados, marcados", async () => {
    servir(ok([vigente, encerrado]))
    renderPagina()
    await screen.findAllByRole("article")

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Mostrar encerrados" }),
    )

    expect(titulos()).toEqual(["Vigente", "Já encerrado"])
    const artigoEncerrado = screen.getAllByRole("article")[1]
    expect(within(artigoEncerrado).getByText("Encerrado")).toBeInTheDocument()
  })

  it("um item sem data de término aparece, marcado", async () => {
    servir(ok([item({ end_date: null })]))
    renderPagina()
    const artigo = await screen.findByRole("article")

    expect(within(artigo).getByText(/sem data de término/i)).toBeInTheDocument()
  })
})

describe("filtro por fornecedor", () => {
  const aws = item({ id: "a", title: "Da AWS", vendor: "aws" })
  const microsoft = item({
    id: "m",
    title: "Da Microsoft",
    vendor: "microsoft",
  })

  it("escolher um fornecedor mostra só os itens dele", async () => {
    servir(ok([aws, microsoft]))
    renderPagina()
    await screen.findAllByRole("article")

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Fornecedor" }),
      "microsoft",
    )

    expect(titulos()).toEqual(["Da Microsoft"])
  })

  it("sem resultado para o filtro, avisa e Limpar filtros traz tudo de volta", async () => {
    const microsoftEncerrada = item({
      id: "m",
      title: "Da Microsoft",
      vendor: "microsoft",
      end_date: "2026-11-01",
    })
    servir(ok([aws, microsoftEncerrada]))
    renderPagina()
    await screen.findAllByRole("article")

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Fornecedor" }),
      "microsoft",
    )

    expect(screen.getByText(/nenhum resultado/i)).toBeInTheDocument()
    expect(screen.queryByRole("article")).toBeNull()

    await userEvent.click(
      screen.getByRole("button", { name: "Limpar filtros" }),
    )

    expect(titulos()).toEqual(["Da AWS"])
  })
})

describe("carregar mais", () => {
  it("o botão usa o next_cursor, junta os itens e some quando acaba", async () => {
    const fetchMock = servir(
      ok([item({ id: "a", title: "Primeiro" })], "c1"),
      ok([item({ id: "b", title: "Segundo" })], null),
    )
    renderPagina()
    await screen.findAllByRole("article")

    await userEvent.click(screen.getByRole("button", { name: "Carregar mais" }))

    await waitFor(() => expect(titulos()).toEqual(["Primeiro", "Segundo"]))
    expect(String((fetchMock.mock.calls[1] as unknown[])[0])).toContain(
      "cursor=c1",
    )
    expect(screen.queryByRole("button", { name: "Carregar mais" })).toBeNull()
  })

  it("sem next_cursor não há botão Carregar mais", async () => {
    servir(ok([item()], null))
    renderPagina()
    await screen.findByRole("article")

    expect(screen.queryByRole("button", { name: "Carregar mais" })).toBeNull()
  })
})
