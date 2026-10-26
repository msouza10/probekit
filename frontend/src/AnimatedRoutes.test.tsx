import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, useNavigate } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { AnimatedRoutes } from "./AnimatedRoutes"

function NavigateButton({ to }: { to: string }) {
  const navigate = useNavigate()
  return <button onClick={() => navigate(to)}>go to {to}</button>
}

describe("AnimatedRoutes", () => {
  it("renders the Ping placeholder page at /ping", async () => {
    render(
      <MemoryRouter initialEntries={["/ping"]}>
        <AnimatedRoutes />
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole("heading", { name: /ping/i }),
    ).toBeInTheDocument()
  })

  it("abre /ping já com o resultado que veio do ping rápido da Home", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/ping",
            state: {
              pingResult: {
                target: "probekit.cc",
                ip_addr: "172.67.154.227",
                packets_sent: 3,
                packets_recv: 3,
                packet_loss: 0,
                min_rtt: "1.486375ms",
                avg_rtt: "1.564151ms",
                max_rtt: "1.621369ms",
              },
            },
          },
        ]}
      >
        <AnimatedRoutes />
      </MemoryRouter>,
    )
    expect(await screen.findByText("1.564151ms")).toBeInTheDocument()
    expect(screen.getByRole("textbox")).toHaveValue("probekit.cc")
  })

  it("ignora um estado de navegação que não é um resultado de ping", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: "/ping", state: { pingResult: "qualquer coisa" } },
        ]}
      >
        <AnimatedRoutes />
      </MemoryRouter>,
    )
    expect(await screen.findByRole("textbox")).toHaveValue("")
    expect(screen.queryByText("Latência média")).not.toBeInTheDocument()
  })

  it("renders the DNS Lookup placeholder page at /dns-lookup", async () => {
    render(
      <MemoryRouter initialEntries={["/dns-lookup"]}>
        <AnimatedRoutes />
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole("heading", { name: /dns lookup/i }),
    ).toBeInTheDocument()
  })

  it("renders the Sobre page at /sobre", async () => {
    render(
      <MemoryRouter initialEntries={["/sobre"]}>
        <AnimatedRoutes />
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /laboratório para aprender fazendo/i,
      }),
    ).toBeInTheDocument()
  })

  it("renders the Arquitetura page at /arquitetura", async () => {
    render(
      <MemoryRouter initialEntries={["/arquitetura"]}>
        <AnimatedRoutes />
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole("heading", { level: 1, name: "Arquitetura" }),
    ).toBeInTheDocument()
  })

  it("renders the NotFound page for an unknown route", async () => {
    render(
      <MemoryRouter initialEntries={["/this-route-does-not-exist"]}>
        <AnimatedRoutes />
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole("heading", { name: /página não encontrada/i }),
    ).toBeInTheDocument()
  })

  it("keeps a single page while the exit animation runs", async () => {
    render(
      <MemoryRouter initialEntries={["/ping"]}>
        <NavigateButton to="/sobre" />
        <AnimatedRoutes />
      </MemoryRouter>,
    )
    await screen.findByRole("heading", { level: 1 })
    fireEvent.click(screen.getByRole("button", { name: /go to \/sobre/i }))
    await screen.findByRole("heading", { level: 1 })
    expect(screen.getAllByRole("heading", { level: 1 }).length).toBe(1)
  })

  it("does not leave two pages mounted after navigating between routes in sequence", async () => {
    render(
      <MemoryRouter initialEntries={["/ping"]}>
        <NavigateButton to="/dns-lookup" />
        <AnimatedRoutes />
      </MemoryRouter>,
    )

    await screen.findByRole("heading", { level: 1 })
    fireEvent.click(screen.getByRole("button", { name: /go to \/dns-lookup/i }))
    await screen.findByRole("heading", { name: /dns lookup/i })

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })

  it("atualiza o título da aba conforme a rota", async () => {
    render(
      <MemoryRouter initialEntries={["/sobre"]}>
        <AnimatedRoutes />
      </MemoryRouter>,
    )
    await screen.findByRole("heading", { level: 1 })
    expect(document.title).toBe("Sobre · Probekit")
  })
})
