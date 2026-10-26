import { render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RepoPulse } from "./RepoPulse"

const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 3_600_000).toISOString()

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 })
}

function mockGithub(routes: Record<string, () => Response>) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input)
    const key = Object.keys(routes).find((route) => url.includes(route))
    return key ? routes[key]() : new Response("{}", { status: 500 })
  })
}

const commit = () =>
  json([
    {
      sha: "a1b2c3d4e5f6",
      html_url: "https://github.com/msouza10/probekit/commit/a1b2c3d",
      commit: { committer: { date: hoursAgo(72) } },
    },
  ])

const run = (hours: number, url: string) => () =>
  json({ workflow_runs: [{ updated_at: hoursAgo(hours), html_url: url }] })

describe("RepoPulse", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("mostra o último commit e o deploy do site e da API, cada um com seu link", async () => {
    mockGithub({
      "/commits": commit,
      "deploy-frontend.yml": run(
        3,
        "https://github.com/msouza10/probekit/actions/runs/1",
      ),
      "deploy-api-golang.yml": run(
        120,
        "https://github.com/msouza10/probekit/actions/runs/2",
      ),
    })
    render(<RepoPulse />)

    const list = await screen.findByRole("list", {
      name: "Atividade do repositório",
    })
    expect(list).toHaveTextContent("commit a1b2c3d")
    expect(list).toHaveTextContent("deploy do site")
    expect(list).toHaveTextContent("deploy da API")
    expect(
      screen.getByRole("link", { name: "há 3 dias", description: /commit/i }),
    ).toHaveAttribute(
      "href",
      "https://github.com/msouza10/probekit/commit/a1b2c3d",
    )
    expect(screen.getByRole("link", { name: /há 3 horas/ })).toHaveAttribute(
      "href",
      "https://github.com/msouza10/probekit/actions/runs/1",
    )
    expect(screen.getByRole("link", { name: /há 5 dias/ })).toHaveAttribute(
      "href",
      "https://github.com/msouza10/probekit/actions/runs/2",
    )
  })

  it("marca cada deploy com o ícone de ok e fica numa linha só", async () => {
    mockGithub({
      "/commits": commit,
      "deploy-frontend.yml": run(
        3,
        "https://github.com/msouza10/probekit/actions/runs/1",
      ),
      "deploy-api-golang.yml": run(
        120,
        "https://github.com/msouza10/probekit/actions/runs/2",
      ),
    })
    render(<RepoPulse />)

    const list = await screen.findByRole("list")
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(3)
    // Commit: ícone neutro. Os dois deploys: ícone de ok na cor de sucesso.
    expect(items[0].querySelector("svg.text-success")).toBeNull()
    expect(items[1].querySelector("svg.text-success")).not.toBeNull()
    expect(items[2].querySelector("svg.text-success")).not.toBeNull()
    // O ícone é decorativo: o texto falado já diz "deploy do site".
    for (const item of items) {
      expect(item.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
    }
    expect(list.className).toContain("flex-nowrap")
    expect(list.className).not.toContain("flex-wrap")
    expect(list.className).toContain("whitespace-nowrap")
  })

  it("não mostra estrela nem licença", async () => {
    mockGithub({ "/commits": commit })
    const { container } = render(<RepoPulse />)
    await screen.findByRole("list")
    expect(container.textContent).not.toMatch(/estrela|star|licen|\bMIT\b/)
  })

  it("omite só o que falhou e mostra o resto", async () => {
    mockGithub({
      "/commits": commit,
      "deploy-frontend.yml": run(
        3,
        "https://github.com/msouza10/probekit/actions/runs/1",
      ),
    })
    render(<RepoPulse />)

    const list = await screen.findByRole("list")
    expect(list).toHaveTextContent("commit a1b2c3d")
    expect(list).toHaveTextContent("deploy do site")
    expect(list).not.toHaveTextContent("deploy da API")
  })

  it("não mostra nada quando o GitHub falha por completo", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 403 }))
    const { container } = render(<RepoPulse />)

    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3))
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
    expect(container.textContent).toBe("")
  })

  it("não mostra o deploy de uma API que nunca teve execução com sucesso", async () => {
    mockGithub({
      "/commits": commit,
      "deploy-frontend.yml": run(
        3,
        "https://github.com/msouza10/probekit/actions/runs/1",
      ),
      "deploy-api-golang.yml": () => json({ workflow_runs: [] }),
    })
    render(<RepoPulse />)

    const list = await screen.findByRole("list")
    expect(list).not.toHaveTextContent("deploy da API")
  })

  it("só pede os dados uma vez enquanto o cache da sessão vale", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    mockGithub({ "/commits": commit })
    const first = render(<RepoPulse />)
    await screen.findByRole("list")
    first.unmount()
    const callsAfterFirst = fetchSpy.mock.calls.length

    render(<RepoPulse />)
    await screen.findByRole("list")
    expect(fetchSpy.mock.calls.length).toBe(callsAfterFirst)
  })
})
