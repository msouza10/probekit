import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { PingResult } from "@/lib/api"
import { runPing } from "@/lib/api"
import Ping from "./Ping"

vi.mock("@/lib/api", () => ({
  PROBE_PROVIDER: "Oracle Cloud",
  PROBE_PROVIDER_SHORT: "OCI",
  PROBE_LOCATION: "São Paulo",
  runPing: vi.fn(),
}))

const mockedRunPing = vi.mocked(runPing)

const result: PingResult = {
  target: "example.com",
  ip_addr: "192.0.2.10",
  packets_sent: 5,
  packets_recv: 4,
  packet_loss: 20,
  min_rtt: "11.9ms",
  avg_rtt: "12.1ms",
  max_rtt: "12.4ms",
  origin_region: "sa-saopaulo-1",
}

// Atenção: nunca usar o código "backend_unreachable" nos erros destes testes.
// Em desenvolvimento (vitest roda com DEV = true) ele dispara a simulação local.
const apiError = {
  error: "Endereço privado não permitido",
  code: "private_ip_not_allowed",
}

async function submit(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.type(screen.getByRole("textbox"), value)
  await user.click(screen.getByRole("button", { name: /disparar ping/i }))
}

describe("Ping (vindo do ping rápido da Home)", () => {
  beforeEach(() => {
    mockedRunPing.mockReset()
  })

  it("abre direto com o resultado recebido, sem chamar a API", () => {
    render(<Ping initialResult={result} />)

    expect(screen.getByText("12.1ms")).toBeInTheDocument()
    expect(screen.getByText("20%")).toBeInTheDocument()
    expect(screen.getByRole("textbox")).toHaveValue("example.com")
    expect(mockedRunPing).not.toHaveBeenCalled()
  })

  it("sem nada, abre vazia como sempre", () => {
    render(<Ping />)

    expect(screen.getByRole("textbox")).toHaveValue("")
    expect(screen.queryByText("Latência média")).not.toBeInTheDocument()
  })
})

describe("Ping (comportamento)", () => {
  beforeEach(() => {
    mockedRunPing.mockReset()
  })

  it("sucesso mostra as latências e a perda em %", async () => {
    mockedRunPing.mockResolvedValue(result)
    const user = userEvent.setup()
    render(<Ping />)
    await submit(user, "example.com")

    expect(mockedRunPing).toHaveBeenCalledWith("example.com", 5, 2)
    expect(await screen.findByText("12.1ms")).toBeInTheDocument()
    expect(screen.getByText("11.9ms")).toBeInTheDocument()
    expect(screen.getByText("12.4ms")).toBeInTheDocument()
    expect(screen.getByText("20%")).toBeInTheDocument()
    expect(screen.getByText(/4\/5/)).toBeInTheDocument()
  })

  it("a primeira coisa do resultado é o veredicto: respondendo", async () => {
    mockedRunPing.mockResolvedValue({
      ...result,
      packet_loss: 0,
      packets_recv: 5,
    })
    const user = userEvent.setup()
    render(<Ping />)
    await submit(user, "example.com")

    const heading = await screen.findByRole("heading", {
      level: 2,
      name: /^(?!Como ler o resultado)/,
    })
    expect(heading).toHaveTextContent("example.com está respondendo")
    expect(heading).not.toHaveTextContent("perda")
    expect(heading.parentElement?.querySelector("svg")).toHaveClass(
      "text-status-up",
    )
  })

  it("perda parcial continua respondendo, com a perda dita no veredicto", async () => {
    mockedRunPing.mockResolvedValue(result)
    const user = userEvent.setup()
    render(<Ping />)
    await submit(user, "example.com")

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /^(?!Como ler o resultado)/,
      }),
    ).toHaveTextContent("example.com está respondendo, com 20% de perda")
  })

  it("host que não devolveu nenhum pacote aparece em vermelho, sem latências", async () => {
    mockedRunPing.mockResolvedValue({
      ...result,
      packets_recv: 0,
      packet_loss: 100,
      min_rtt: "0s",
      avg_rtt: "0s",
      max_rtt: "0s",
    })
    const user = userEvent.setup()
    render(<Ping />)
    await submit(user, "example.com")

    const heading = await screen.findByRole("heading", {
      level: 2,
      name: /^(?!Como ler o resultado)/,
    })
    expect(heading).toHaveTextContent("example.com não respondeu")
    expect(heading.parentElement?.querySelector("svg")).toHaveClass(
      "text-status-down",
    )
    expect(screen.getByText(/Nenhum dos 5 pacotes voltou/)).toBeInTheDocument()
    expect(screen.queryByText("0s")).not.toBeInTheDocument()
    expect(screen.getByText("100%")).toBeInTheDocument()
  })

  it("não mostra o quadro escuro do resultado nem o JSON antes de pedir", async () => {
    mockedRunPing.mockResolvedValue(result)
    const user = userEvent.setup()
    const { container } = render(<Ping />)
    await submit(user, "example.com")
    await screen.findByText("12.1ms")

    expect(container.querySelector("[data-slot=bench]")).toBeNull()
    expect(screen.queryByText(/"packets_sent"/)).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Ver JSON" }))
    expect(screen.getByText(/"packets_sent": 5/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Ocultar JSON" }))
    expect(screen.queryByText(/"packets_sent"/)).not.toBeInTheDocument()
  })

  it("a faixa de origem diz de onde sai o teste, antes e depois", async () => {
    mockedRunPing.mockResolvedValue(result)
    const user = userEvent.setup()
    render(<Ping />)
    expect(screen.getByText(/OCI · São Paulo/)).toBeInTheDocument()

    await submit(user, "example.com")
    expect(await screen.findByText(/OCI · sa-saopaulo-1/)).toBeInTheDocument()
  })

  it("erro mostra mensagem e código, e o atalho tenta 1.1.1.1", async () => {
    mockedRunPing.mockRejectedValueOnce(apiError)
    const user = userEvent.setup()
    render(<Ping />)
    await submit(user, "10.0.0.1")

    expect(
      await screen.findByText("Endereço privado não permitido"),
    ).toBeInTheDocument()
    expect(screen.getByText("private_ip_not_allowed")).toBeInTheDocument()
    // Falha nossa ou do pedido: aviso cinza, nunca o vermelho de "host fora".
    const alert = screen.getByRole("alert")
    expect(alert.querySelector("svg")).toHaveClass("text-muted-foreground")
    expect(alert.querySelector("svg")).not.toHaveClass("text-status-down")

    mockedRunPing.mockResolvedValueOnce(result)
    await user.click(
      screen.getByRole("button", {
        name: "Tentar com destino público (1.1.1.1)",
      }),
    )
    expect(mockedRunPing).toHaveBeenLastCalledWith("1.1.1.1", 5, 2)
  })

  it("nome que não resolve (invalid_target) é vermelho, com texto em português", async () => {
    mockedRunPing.mockRejectedValueOnce({
      error: "Invalid target",
      code: "invalid_target",
    })
    const user = userEvent.setup()
    render(<Ping />)
    await submit(user, "naoexiste.invalid")

    const heading = await screen.findByRole("heading", {
      level: 2,
      name: /^(?!Como ler o resultado)/,
    })
    expect(heading).toHaveTextContent("naoexiste.invalid não foi encontrado")
    expect(heading.parentElement?.querySelector("svg")).toHaveClass(
      "text-status-down",
    )
    expect(
      screen.getByText(/não resolve para nenhum endereço/),
    ).toBeInTheDocument()
    expect(screen.queryByText("Invalid target")).not.toBeInTheDocument()
    expect(screen.getByText("invalid_target")).toBeInTheDocument()
  })

  it("alvo vazio não chama runPing", async () => {
    const user = userEvent.setup()
    render(<Ping />)
    const button = screen.getByRole("button", { name: /disparar ping/i })
    expect(button).toBeDisabled()
    await user.click(button)
    await user.type(screen.getByRole("textbox"), "   ")
    await user.click(button)
    expect(mockedRunPing).not.toHaveBeenCalled()
  })

  it("Copiar JSON escreve o resultado formatado no clipboard", async () => {
    mockedRunPing.mockResolvedValue(result)
    const user = userEvent.setup()
    render(<Ping />)
    await submit(user, "example.com")
    // userEvent.setup() instala um clipboard próprio (getter, não dá para
    // atribuir); espiona o writeText dele.
    const writeText = vi.spyOn(navigator.clipboard, "writeText")

    await user.click(
      await screen.findByRole("button", { name: /copiar json/i }),
    )
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(JSON.stringify(result, null, 2)),
    )
  })

  it("explica como ler o resultado, também antes de usar a ferramenta", () => {
    render(<Ping />)
    expect(
      screen.getByRole("heading", { level: 2, name: "Como ler o resultado" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Sem resposta")).toBeInTheDocument()
    expect(
      screen.getByText(/Não prova que o destino está fora do ar/),
    ).toBeInTheDocument()
  })
})
