import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { PingResult } from "@/lib/api"
import { runPing } from "@/lib/api"
import { QuickPing } from "./QuickPing"

vi.mock("@/lib/api", () => ({
  runPing: vi.fn(),
}))

const mockedRunPing = vi.mocked(runPing)

const result: PingResult = {
  target: "probekit.cc",
  ip_addr: "172.67.154.227",
  packets_sent: 3,
  packets_recv: 3,
  packet_loss: 0,
  min_rtt: "1.486375ms",
  avg_rtt: "1.564151ms",
  max_rtt: "1.621369ms",
}

// Atenção: nunca usar o código "backend_unreachable" nestes testes. Em
// desenvolvimento (vitest roda com DEV = true) a página Ping o trata como
// simulação, e aqui ele deve aparecer como erro de verdade.
const apiError = { error: "Host inválido", code: "invalid_target" }

// Rota de destino que mostra o que chegou pelo estado da navegação.
function PingPageProbe() {
  const state = useLocation().state as { pingResult?: PingResult } | null
  return <p>pagina ping: {state?.pingResult?.avg_rtt ?? "sem resultado"}</p>
}

function renderQuickPing() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<QuickPing />} />
        <Route path="/ping" element={<PingPageProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function ping(user: ReturnType<typeof userEvent.setup>, host: string) {
  await user.type(screen.getByRole("textbox", { name: "Host ou IP" }), host)
  await user.click(screen.getByRole("button", { name: "Pingar" }))
}

describe("QuickPing", () => {
  beforeEach(() => {
    mockedRunPing.mockReset()
  })

  it("tem o campo rotulado, o botão ativo e diz de onde parte o teste", () => {
    renderQuickPing()
    expect(screen.getByRole("textbox", { name: "Host ou IP" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Pingar" })).toBeEnabled()
    expect(
      screen.getByText(
        "O teste parte do nosso servidor, não do seu navegador.",
      ),
    ).toBeInTheDocument()
    expect(mockedRunPing).not.toHaveBeenCalled()
  })

  it("com o campo vazio ou só de espaços, avisa o que digitar e não chama a API", async () => {
    const user = userEvent.setup()
    renderQuickPing()
    const button = screen.getByRole("button", { name: "Pingar" })

    await user.click(button)
    expect(screen.getByRole("alert")).toHaveTextContent("Digite um host ou IP.")

    await user.type(screen.getByRole("textbox"), "   ")
    await user.click(button)
    expect(screen.getByRole("alert")).toHaveTextContent("Digite um host ou IP.")
    expect(mockedRunPing).not.toHaveBeenCalled()
  })

  it("o aviso some assim que a pessoa começa a digitar", async () => {
    const user = userEvent.setup()
    renderQuickPing()
    await user.click(screen.getByRole("button", { name: "Pingar" }))
    await user.type(screen.getByRole("textbox"), "g")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("envia 3 pacotes e mostra o resultado numa linha só", async () => {
    mockedRunPing.mockResolvedValue(result)
    const user = userEvent.setup()
    renderQuickPing()
    await ping(user, "probekit.cc")

    expect(mockedRunPing).toHaveBeenCalledWith("probekit.cc", 3, 2)
    const line = await screen.findByRole("status")
    // Só o que cabe numa linha na coluna do hero; o IP fica na página completa.
    expect(line).toHaveTextContent("média 1.56ms · 0% de perda · 3/3")
    expect(line).not.toHaveTextContent("172.67.154.227")
  })

  it("mostra que está pingando enquanto espera a API", async () => {
    mockedRunPing.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderQuickPing()
    await ping(user, "probekit.cc")

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Pingando probekit.cc",
    )
    expect(screen.getByRole("button", { name: /pingando/i })).toBeDisabled()
  })

  it("leva o resultado já obtido para a página completa, sem pingar de novo", async () => {
    mockedRunPing.mockResolvedValue(result)
    const user = userEvent.setup()
    renderQuickPing()
    await ping(user, "probekit.cc")

    await user.click(
      await screen.findByRole("link", { name: /ver resultado completo/i }),
    )
    expect(
      await screen.findByText(/pagina ping: 1\.564151ms/),
    ).toBeInTheDocument()
    expect(mockedRunPing).toHaveBeenCalledTimes(1)
  })

  it("no erro mostra só a mensagem da API, sem link: não há resultado para ver na página completa", async () => {
    mockedRunPing.mockRejectedValue(apiError)
    const user = userEvent.setup()
    renderQuickPing()
    await ping(user, "10.0.0.1")

    const line = await screen.findByRole("alert")
    expect(line).toHaveTextContent("Host inválido")
    expect(screen.queryByText(/média/)).not.toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("um novo envio limpa a linha anterior", async () => {
    mockedRunPing.mockResolvedValueOnce(result)
    const user = userEvent.setup()
    renderQuickPing()
    await ping(user, "probekit.cc")
    await screen.findByRole("status")

    mockedRunPing.mockRejectedValueOnce(apiError)
    await user.clear(screen.getByRole("textbox"))
    await user.type(screen.getByRole("textbox"), "10.0.0.1{Enter}")

    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(screen.queryByText("172.67.154.227")).not.toBeInTheDocument()
  })
})
