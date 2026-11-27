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
 * - filtro de provider: botões-chip num grupo "Provider" (um por provider, com o nome
 *   da marca; "Todos" limpa); "Mostrar encerrados" é uma caixa de marcar;
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

/** Abre a lista suspensa do filtro (pelo rótulo) e escolhe a opção. */
async function escolher(filtro: string, opcao: string) {
  await userEvent.click(
    screen.getByRole("button", { name: new RegExp(`^${filtro}`) }),
  )
  await userEvent.click(
    await screen.findByRole("menuitemradio", { name: opcao }),
  )
}

const busca = () => screen.getByRole("searchbox", { name: "Buscar vouchers" })

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

describe("sem pulo de layout entre os estados", () => {
  // O rodapé não pode aparecer na primeira tela enquanto a lista carrega, nem
  // se mover quando ela chega: cada estado reserva a altura de quase uma tela.
  const reservado = (el: Element) =>
    el.closest('[class*="min-h-[80svh]"]') !== null

  it("carregando reserva a altura", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    )
    renderPagina()

    expect(reservado(screen.getByText(/carregando/i))).toBe(true)
  })

  it("erro reserva a mesma altura", async () => {
    servir({
      corpo: { error: "indisponível", code: "vouchers_unavailable" },
      status: 503,
    })
    renderPagina()

    expect(reservado(await screen.findByRole("alert"))).toBe(true)
  })

  it("sem vouchers também reserva a mesma altura", async () => {
    servir(ok([]))
    renderPagina()

    expect(reservado(await screen.findByText(/nenhum voucher/i))).toBe(true)
  })

  it("com a lista na tela, não há reserva (a lista já é mais alta)", async () => {
    servir(ok([item()]))
    renderPagina()
    await screen.findByRole("article")

    expect(document.querySelector('[class*="min-h-[80svh]"]')).toBeNull()
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

describe("filtro por provider", () => {
  const aws = item({ id: "a", title: "Da AWS", vendor: "aws" })
  const microsoft = item({
    id: "m",
    title: "Da Microsoft",
    vendor: "microsoft",
  })

  it("escolher um provider mostra só os itens dele", async () => {
    servir(ok([aws, microsoft]))
    renderPagina()
    await screen.findAllByRole("article")

    await escolher("Provider", "Microsoft")

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

    await escolher("Provider", "Microsoft")

    expect(screen.getByText(/nenhum resultado/i)).toBeInTheDocument()
    expect(screen.queryByRole("article")).toBeNull()

    await userEvent.click(
      screen.getByRole("button", { name: "Limpar filtros" }),
    )

    expect(titulos()).toEqual(["Da AWS"])
  })
})

describe("busca de todos os lotes da API", () => {
  it("segue o next_cursor até acabar e junta tudo numa lista só", async () => {
    const fetchMock = servir(
      ok([item({ id: "a", title: "Primeiro" })], "c1"),
      ok([item({ id: "b", title: "Segundo" })], "c2"),
      ok([item({ id: "c", title: "Terceiro" })], null),
    )
    renderPagina()
    await screen.findAllByRole("article")

    expect(titulos()).toEqual(["Primeiro", "Segundo", "Terceiro"])
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String((fetchMock.mock.calls[1] as unknown[])[0])).toContain(
      "cursor=c1",
    )
    expect(String((fetchMock.mock.calls[2] as unknown[])[0])).toContain(
      "cursor=c2",
    )
  })

  it("não tem botão Carregar mais, nem contagem, nem hora da coleta", async () => {
    servir(ok([item()]))
    renderPagina()
    await screen.findByRole("article")

    expect(screen.queryByRole("button", { name: /carregar mais/i })).toBeNull()
    expect(screen.queryByText(/promoç(ão|ões)\s+carregadas?/i)).toBeNull()
    expect(screen.queryByText(/última coleta/i)).toBeNull()
  })

  it("um id repetido entre lotes aparece uma vez só", async () => {
    servir(
      ok([item({ id: "a", title: "Repetido" })], "c1"),
      ok([item({ id: "a", title: "Repetido" })], null),
    )
    renderPagina()
    await screen.findAllByRole("article")

    expect(titulos()).toEqual(["Repetido"])
  })
})

describe("paginação", () => {
  // 30 itens vigentes, de "Item 01" a "Item 30"; 12 por página => 3 páginas.
  const trinta = Array.from({ length: 30 }, (_, i) =>
    item({
      id: `i${i + 1}`,
      title: `Item ${String(i + 1).padStart(2, "0")}`,
    }),
  )

  it("mostra 12 itens por página, e o resto nas outras", async () => {
    servir(ok(trinta))
    renderPagina()
    await screen.findAllByRole("article")

    expect(titulos()).toHaveLength(12)
    expect(titulos()[0]).toBe("Item 01")

    await userEvent.click(screen.getByRole("button", { name: "Página 3" }))

    expect(titulos()).toHaveLength(6)
    expect(titulos()[0]).toBe("Item 25")
  })

  it("Próxima e Anterior trocam de página", async () => {
    servir(ok(trinta))
    renderPagina()
    await screen.findAllByRole("article")

    await userEvent.click(
      screen.getByRole("button", { name: "Próxima página" }),
    )
    expect(titulos()[0]).toBe("Item 13")

    await userEvent.click(
      screen.getByRole("button", { name: "Página anterior" }),
    )
    expect(titulos()[0]).toBe("Item 01")
  })

  it("com 12 itens ou menos não há paginação", async () => {
    servir(ok(trinta.slice(0, 12)))
    renderPagina()
    await screen.findAllByRole("article")

    expect(screen.queryByRole("navigation", { name: "Paginação" })).toBeNull()
  })

  it("mudar o filtro volta para a primeira página", async () => {
    const aws = trinta.map((t, i) => ({
      ...t,
      vendor: i < 15 ? "aws" : "microsoft",
    }))
    servir(ok(aws))
    renderPagina()
    await screen.findAllByRole("article")
    await userEvent.click(screen.getByRole("button", { name: "Página 2" }))

    await escolher("Provider", "AWS")

    expect(titulos()[0]).toBe("Item 01")
    expect(titulos()).toHaveLength(12)
  })

  it("abrir /voucher#id de um item que está na página 3 vai para a página 3 e rola até ele", async () => {
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    servir(ok(trinta))
    renderPagina("/voucher#i27")
    await screen.findAllByRole("article")

    await waitFor(() => expect(rolar).toHaveBeenCalled())

    expect(titulos()).toContain("Item 27")
    expect(rolar.mock.contexts[0]).toBe(document.getElementById("i27"))
  })

  it("abrir /voucher#id de um item encerrado mostra os encerrados e rola até ele", async () => {
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    servir(
      ok([
        item({ id: "v", title: "Vigente" }),
        item({ id: "e", title: "Já acabou", end_date: "2026-11-01" }),
      ]),
    )
    renderPagina("/voucher#e")
    await screen.findAllByRole("article")

    await waitFor(() => expect(rolar).toHaveBeenCalled())

    expect(titulos()).toContain("Já acabou")
    expect(
      screen.getByRole("checkbox", { name: "Mostrar encerrados" }),
    ).toBeChecked()
  })
})

describe("lista suspensa de provider", () => {
  const abrirProvider = async () => {
    await userEvent.click(screen.getByRole("button", { name: /^Provider/ }))
    return screen.findAllByRole("menuitemradio")
  }

  it("lista Todos os providers e um item por provider, com logo decorativo", async () => {
    servir(
      ok([
        item({ id: "a", vendor: "aws" }),
        item({ id: "m", vendor: "microsoft" }),
      ]),
    )
    renderPagina()
    await screen.findAllByRole("article")

    const opcoes = await abrirProvider()

    expect(opcoes.map((o) => o.textContent)).toEqual([
      "Todos os providers",
      "AWS",
      "Microsoft",
    ])
    expect(
      within(screen.getByRole("menuitemradio", { name: "AWS" })).getByText(
        "AWS",
      ),
    ).toBeInTheDocument()
    expect(
      screen
        .getByRole("menuitemradio", { name: "AWS" })
        .querySelector("svg[data-provider='aws']"),
    ).not.toBeNull()
  })

  it("nomes diferentes do mesmo provider viram uma opção só, e o filtro pega todos", async () => {
    servir(
      ok([
        item({ id: "g1", title: "Um", vendor: "google" }),
        item({ id: "g2", title: "Dois", vendor: "Google Cloud" }),
        item({ id: "g3", title: "Três", vendor: "GCP" }),
        item({ id: "a", title: "Quatro", vendor: "aws" }),
      ]),
    )
    renderPagina()
    await screen.findAllByRole("article")

    const opcoes = await abrirProvider()
    expect(
      opcoes.filter((o) => /google/i.test(o.textContent ?? "")),
    ).toHaveLength(1)

    await userEvent.click(
      screen.getByRole("menuitemradio", { name: "Google Cloud" }),
    )

    expect(titulos()).toEqual(["Um", "Dois", "Três"])
  })

  it("o mais frequente vem primeiro, depois de Todos", async () => {
    servir(
      ok([
        item({ id: "1", vendor: "microsoft" }),
        item({ id: "2", vendor: "aws" }),
        item({ id: "3", vendor: "aws" }),
      ]),
    )
    renderPagina()
    await screen.findAllByRole("article")

    const opcoes = await abrirProvider()

    expect(opcoes.map((o) => o.textContent)).toEqual([
      "Todos os providers",
      "AWS",
      "Microsoft",
    ])
  })

  it("item sem provider não vira opção, mas aparece em Todos", async () => {
    servir(ok([item({ id: "x", title: "Sem provider", vendor: null })]))
    renderPagina()
    await screen.findAllByRole("article")

    const opcoes = await abrirProvider()

    expect(opcoes.map((o) => o.textContent)).toEqual(["Todos os providers"])
  })

  it("o botão mostra a escolha atual", async () => {
    servir(ok([item({ vendor: "aws" })]))
    renderPagina()
    await screen.findAllByRole("article")

    await escolher("Provider", "AWS")

    expect(screen.getByRole("button", { name: /^Provider/ })).toHaveTextContent(
      "AWS",
    )
  })
})

describe("busca por texto", () => {
  const lista = [
    item({
      id: "1",
      title: "Exame de segurança",
      certifications: ["SY0-701"],
      vendor: "comptia",
    }),
    item({
      id: "2",
      title: "Azure fundamentos",
      certifications: ["AZ-900"],
      vendor: "microsoft",
    }),
    item({
      id: "3",
      title: "Terraform",
      vendor: "hashicorp",
      voucher_code: "TFA25",
    }),
  ]

  it("filtra enquanto digita, no título, na certificação e no código", async () => {
    servir(ok(lista))
    renderPagina()
    await screen.findAllByRole("article")

    await userEvent.type(busca(), "azure")
    expect(titulos()).toEqual(["Azure fundamentos"])

    await userEvent.clear(busca())
    await userEvent.type(busca(), "sy0")
    expect(titulos()).toEqual(["Exame de segurança"])

    await userEvent.clear(busca())
    await userEvent.type(busca(), "tfa25")
    expect(titulos()).toEqual(["Terraform"])
  })

  it("ignora maiúsculas e acentos", async () => {
    servir(ok(lista))
    renderPagina()
    await screen.findAllByRole("article")

    await userEvent.type(busca(), "SEGURANCA")

    expect(titulos()).toEqual(["Exame de segurança"])
  })

  it("sem resultado avisa, e Limpar filtros esvazia a busca", async () => {
    servir(ok(lista))
    renderPagina()
    await screen.findAllByRole("article")

    await userEvent.type(busca(), "zzzz")
    expect(screen.getByText(/nenhum resultado/i)).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole("button", { name: "Limpar filtros" }),
    )

    expect(busca()).toHaveValue("")
    expect(titulos()).toHaveLength(3)
  })
})

describe("tipo, desconto e prazo", () => {
  const lista = [
    item({
      id: "v",
      title: "Voucher grande",
      promotion_type: "voucher",
      discount_percent: 75,
      end_date: "2026-11-28",
    }),
    item({
      id: "d",
      title: "Desconto médio",
      promotion_type: "discount",
      discount_percent: 30,
      end_date: "2026-12-20",
    }),
    item({
      id: "g",
      title: "Exame grátis",
      promotion_type: "free_exam",
      discount_percent: 100,
      end_date: null,
    }),
  ]

  it("o tipo só oferece os que existem nos dados", async () => {
    servir(ok(lista))
    renderPagina()
    await screen.findAllByRole("article")

    await userEvent.click(screen.getByRole("button", { name: /^Tipo/ }))
    const opcoes = await screen.findAllByRole("menuitemradio")

    expect(opcoes.map((o) => o.textContent)).toEqual([
      "Todos os tipos",
      "Voucher",
      "Desconto",
      "Exame grátis",
    ])
  })

  it("filtra por tipo", async () => {
    servir(ok(lista))
    renderPagina()
    await screen.findAllByRole("article")

    await escolher("Tipo", "Desconto")

    expect(titulos()).toEqual(["Desconto médio"])
  })

  it("filtra por desconto mínimo", async () => {
    servir(ok(lista))
    renderPagina()
    await screen.findAllByRole("article")

    await escolher("Desconto", "50% ou mais")

    expect(titulos()).toEqual(["Voucher grande", "Exame grátis"])
  })

  it("filtra por prazo: termina em 7 dias, e sem data de término", async () => {
    servir(ok(lista))
    renderPagina()
    await screen.findAllByRole("article")

    await escolher("Prazo", "Termina em 7 dias")
    expect(titulos()).toEqual(["Voucher grande"])

    await escolher("Prazo", "Sem data de término")
    expect(titulos()).toEqual(["Exame grátis"])
  })

  it("os filtros se combinam", async () => {
    servir(ok(lista))
    renderPagina()
    await screen.findAllByRole("article")

    await escolher("Desconto", "25% ou mais")
    await escolher("Prazo", "Termina em 30 dias")

    expect(titulos()).toEqual(["Voucher grande", "Desconto médio"])
  })

  it("o botão do filtro ativo fica marcado, e Limpar filtros desmarca tudo", async () => {
    servir(ok(lista))
    renderPagina()
    await screen.findAllByRole("article")
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull()

    await escolher("Tipo", "Voucher")

    expect(screen.getByRole("button", { name: /^Tipo/ })).toHaveAttribute(
      "data-active",
      "true",
    )

    await userEvent.click(
      screen.getByRole("button", { name: "Limpar filtros" }),
    )

    expect(screen.getByRole("button", { name: /^Tipo/ })).toHaveAttribute(
      "data-active",
      "false",
    )
    expect(titulos()).toHaveLength(3)
  })
})

describe("ordenação", () => {
  const lista = [
    item({
      id: "b",
      title: "B recente",
      published_at: "2026-11-24T10:00:00Z",
      discount_percent: 20,
      end_date: "2026-12-20",
    }),
    item({
      id: "a",
      title: "A antiga",
      published_at: "2026-11-10T10:00:00Z",
      discount_percent: 90,
      end_date: "2026-11-27",
    }),
    item({
      id: "c",
      title: "C sem prazo",
      published_at: "2026-11-20T10:00:00Z",
      discount_percent: 50,
      end_date: null,
    }),
  ]

  it("começa em Mais recentes", async () => {
    servir(ok(lista))
    renderPagina()
    await screen.findAllByRole("article")

    expect(screen.getByRole("button", { name: /^Ordenar/ })).toHaveTextContent(
      "Mais recentes",
    )
    expect(titulos()).toEqual(["B recente", "C sem prazo", "A antiga"])
  })

  it.each([
    ["Mais antigas", ["A antiga", "C sem prazo", "B recente"]],
    ["Maior desconto", ["A antiga", "C sem prazo", "B recente"]],
    ["Termina primeiro", ["A antiga", "B recente", "C sem prazo"]],
  ])("%s reordena a lista", async (opcao, esperado) => {
    servir(ok(lista))
    renderPagina()
    await screen.findAllByRole("article")

    await escolher("Ordenar", opcao)

    expect(titulos()).toEqual(esperado)
  })

  it("mudar a ordem volta para a primeira página", async () => {
    const muitos = Array.from({ length: 30 }, (_, i) =>
      item({
        id: `i${i}`,
        title: `Item ${String(i + 1).padStart(2, "0")}`,
        published_at: `2026-11-${String(30 - i).padStart(2, "0")}T10:00:00Z`,
      }),
    )
    servir(ok(muitos))
    renderPagina()
    await screen.findAllByRole("article")
    await userEvent.click(screen.getByRole("button", { name: "Página 2" }))

    await escolher("Ordenar", "Mais antigas")

    expect(titulos()).toHaveLength(12)
    expect(screen.getByRole("button", { name: "Página 1" })).toHaveAttribute(
      "aria-current",
      "page",
    )
  })
})
