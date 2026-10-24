import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { PingResult } from "@/lib/api"
import { runPing } from "@/lib/api"
import Ping from "./Ping"

vi.mock("@/lib/api", () => ({
  PROBE_PROVIDER: "Oracle Cloud",
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
const apiError = { error: "Host inválido", code: "invalid_target" }

async function submit(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.type(screen.getByRole("textbox"), value)
  await user.click(screen.getByRole("button", { name: /disparar ping/i }))
}

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

  it("erro mostra mensagem e código, e o atalho tenta 1.1.1.1", async () => {
    mockedRunPing.mockRejectedValueOnce(apiError)
    const user = userEvent.setup()
    render(<Ping />)
    await submit(user, "10.0.0.1")

    expect(await screen.findByText("Host inválido")).toBeInTheDocument()
    expect(screen.getByText("invalid_target")).toBeInTheDocument()

    mockedRunPing.mockResolvedValueOnce(result)
    await user.click(
      screen.getByRole("button", {
        name: "Tentar com destino público (1.1.1.1)",
      }),
    )
    expect(mockedRunPing).toHaveBeenLastCalledWith("1.1.1.1", 5, 2)
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
})
