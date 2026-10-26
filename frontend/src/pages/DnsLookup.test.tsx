import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { DnsLookupResult } from "@/lib/api"
import { runDnsLookup } from "@/lib/api"
import DnsLookup from "./DnsLookup"

vi.mock("@/lib/api", () => ({
  PROBE_PROVIDER: "Oracle Cloud",
  PROBE_PROVIDER_SHORT: "OCI",
  PROBE_LOCATION: "São Paulo",
  runDnsLookup: vi.fn(),
}))

const mockedRun = vi.mocked(runDnsLookup)

const result: DnsLookupResult = {
  domain: "example.com",
  addrs: ["192.0.2.10", "2001:db8::10"],
  cname: "",
  mx: [{ host: "mail.example.com", priority: 42 }],
  txt: ["v=spf1 include:_spf.example.com ~all"],
  ns: ["ns1.example.com"],
  srv: [{ name: "sip.example.com", port: 5060, priority: 7, weight: 13 }],
  ip: ["192.0.2.10"],
  origin_region: "sa-saopaulo-1",
}

// Atenção: nunca usar o código "backend_unreachable" nos erros destes testes.
// Em desenvolvimento (vitest roda com DEV = true) ele dispara a simulação local.
const apiError = { error: "Domínio inválido", code: "invalid_domain" }

const submitButton = () =>
  screen.getByRole("button", { name: /consultar dns/i })

async function submit(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.type(screen.getByRole("textbox"), value)
  await user.click(submitButton())
}

describe("DnsLookup (comportamento)", () => {
  beforeEach(() => {
    mockedRun.mockReset()
  })

  it("sucesso lista endereços, MX com prioridade, TXT e NS", async () => {
    mockedRun.mockResolvedValue(result)
    const user = userEvent.setup()
    render(<DnsLookup />)
    await submit(user, "example.com")

    expect(mockedRun).toHaveBeenCalledWith("example.com", undefined, undefined)
    expect(await screen.findByText("192.0.2.10")).toBeInTheDocument()
    expect(screen.getByText("2001:db8::10")).toBeInTheDocument()
    expect(screen.getByText("mail.example.com")).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "42" })).toBeInTheDocument()
    expect(
      screen.getByText("v=spf1 include:_spf.example.com ~all"),
    ).toBeInTheDocument()
    expect(screen.getByText("ns1.example.com")).toBeInTheDocument()
    expect(
      screen.getByRole("cell", { name: "sip.example.com" }),
    ).toBeInTheDocument()
  })

  it("o veredicto vem primeiro: resolvendo, com o resumo do que existe", async () => {
    mockedRun.mockResolvedValue(result)
    const user = userEvent.setup()
    render(<DnsLookup />)
    await submit(user, "example.com")

    const heading = await screen.findByRole("heading", { level: 2 })
    expect(heading).toHaveTextContent("example.com está resolvendo")
    expect(heading.parentElement?.querySelector("svg")).toHaveClass(
      "text-status-up",
    )
    expect(
      screen.getByText("2 endereços · 1 MX · 1 NS · 1 TXT · 1 SRV"),
    ).toBeInTheDocument()
  })

  it("só com MX e sem endereço, diz que tem registros mas nenhum endereço", async () => {
    mockedRun.mockResolvedValue({ ...result, addrs: [], ip: [], srv: [] })
    const user = userEvent.setup()
    render(<DnsLookup />)
    await submit(user, "example.com")

    expect(await screen.findByRole("heading", { level: 2 })).toHaveTextContent(
      "example.com tem registros, mas nenhum endereço",
    )
  })

  it("sem nenhum registro aparece em vermelho", async () => {
    mockedRun.mockResolvedValue({
      ...result,
      addrs: [],
      ip: [],
      mx: [],
      txt: [],
      ns: [],
      srv: [],
    })
    const user = userEvent.setup()
    render(<DnsLookup />)
    await submit(user, "example.com")

    const heading = await screen.findByRole("heading", { level: 2 })
    expect(heading).toHaveTextContent("example.com não tem registros")
    expect(heading.parentElement?.querySelector("svg")).toHaveClass(
      "text-status-down",
    )
  })

  it("domínio inexistente (domain_not_found) é vermelho; outros erros são cinza", async () => {
    mockedRun.mockRejectedValueOnce({
      error: "Domain not found",
      code: "domain_not_found",
    })
    const user = userEvent.setup()
    render(<DnsLookup />)
    await submit(user, "naoexiste.invalid")

    const heading = await screen.findByRole("heading", { level: 2 })
    expect(heading).toHaveTextContent("naoexiste.invalid não foi encontrado")
    expect(screen.queryByText("Domain not found")).not.toBeInTheDocument()
    expect(
      screen.getByText("O domínio não existe ou não tem nenhum registro."),
    ).toBeInTheDocument()
    expect(heading.parentElement?.querySelector("svg")).toHaveClass(
      "text-status-down",
    )
  })

  it("resultado fica no papel e o JSON só aparece quando pedido", async () => {
    mockedRun.mockResolvedValue(result)
    const user = userEvent.setup()
    const { container } = render(<DnsLookup />)
    await submit(user, "example.com")
    await screen.findByText("ns1.example.com")

    expect(container.querySelector("[data-slot=bench]")).toBeNull()
    expect(
      screen.queryByText(/"domain": "example.com"/),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Ver JSON" }))
    expect(screen.getByText(/"domain": "example.com"/)).toBeInTheDocument()
  })

  it("o selo de origem diz de onde sai a consulta, antes e depois", async () => {
    mockedRun.mockResolvedValue(result)
    const user = userEvent.setup()
    render(<DnsLookup />)
    expect(screen.getByText("OCI · São Paulo")).toBeInTheDocument()

    await submit(user, "example.com")
    expect(await screen.findByText("OCI · sa-saopaulo-1")).toBeInTheDocument()
  })

  it("com service e proto preenchidos, runDnsLookup recebe os três argumentos", async () => {
    mockedRun.mockResolvedValue(result)
    const user = userEvent.setup()
    render(<DnsLookup />)
    await user.click(screen.getByRole("button", { name: /srv/i }))
    await user.type(screen.getByPlaceholderText("_sip"), "_sip")
    await user.type(screen.getByPlaceholderText("_tcp"), "_tcp")
    await user.type(
      screen.getByPlaceholderText(/cloudflare\.com/i),
      "example.com",
    )
    await user.click(submitButton())

    expect(mockedRun).toHaveBeenCalledWith("example.com", "_sip", "_tcp")
  })

  it("erro mostra mensagem e código, e o atalho tenta cloudflare.com", async () => {
    mockedRun.mockRejectedValueOnce(apiError)
    const user = userEvent.setup()
    render(<DnsLookup />)
    await submit(user, "invalido")

    expect(await screen.findByText("Domínio inválido")).toBeInTheDocument()
    expect(screen.getByText("invalid_domain")).toBeInTheDocument()
    // Falha nossa ou do pedido: aviso cinza, nunca o vermelho de "domínio fora".
    expect(screen.getByRole("alert").querySelector("svg")).toHaveClass(
      "text-muted-foreground",
    )

    mockedRun.mockResolvedValueOnce(result)
    await user.click(
      screen.getByRole("button", { name: /tentar com domínio padrão/i }),
    )
    expect(mockedRun).toHaveBeenLastCalledWith(
      "cloudflare.com",
      undefined,
      undefined,
    )
  })

  it("domínio vazio não chama runDnsLookup (botão desabilitado)", async () => {
    const user = userEvent.setup()
    render(<DnsLookup />)
    expect(submitButton()).toBeDisabled()
    await user.click(submitButton())
    await user.type(screen.getByRole("textbox"), "   ")
    await user.click(submitButton())
    expect(mockedRun).not.toHaveBeenCalled()
  })

  it("Copiar JSON escreve o resultado formatado no clipboard", async () => {
    mockedRun.mockResolvedValue(result)
    const user = userEvent.setup()
    render(<DnsLookup />)
    await submit(user, "example.com")
    const writeText = vi.spyOn(navigator.clipboard, "writeText")

    await user.click(
      await screen.findByRole("button", { name: /copiar json/i }),
    )
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(JSON.stringify(result, null, 2)),
    )
  })
})

describe("DnsLookup (acessibilidade)", () => {
  beforeEach(() => {
    mockedRun.mockReset()
  })

  it("campo de domínio tem rótulo e o aviso de carregamento fica numa região viva sempre montada", async () => {
    let resolve!: (value: DnsLookupResult) => void
    mockedRun.mockReturnValue(new Promise((r) => (resolve = r)))
    const user = userEvent.setup()
    render(<DnsLookup />)

    expect(screen.getByLabelText(/domínio/i)).toBeInTheDocument()
    const live = document.querySelector('[aria-live="polite"]')
    expect(live).not.toBeNull()
    expect(screen.queryByRole("status")).toBeNull()

    await submit(user, "example.com")
    const status = await screen.findByRole("status")
    expect(live).toContainElement(status)
    expect(status).toHaveTextContent("example.com")

    resolve(result)
    await screen.findByText("ns1.example.com")
    expect(document.querySelector('[aria-live="polite"]')).toBe(live)
  })
})
