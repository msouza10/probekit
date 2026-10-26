import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { RepoStats, RepoStatsLine } from "./RepoStats"

const stats = {
  generated_at: "2026-10-26T12:00:00Z",
  commits: 88,
  pull_requests: { total: 29, open: 0 },
  issues: { total: 11, open: 2 },
  languages: [],
}

const repo = "https://github.com/msouza10/probekit"

describe("RepoStatsLine", () => {
  it("mostra commits, PRs e issues, cada um levando à listagem no GitHub", () => {
    render(<RepoStatsLine stats={stats} />)

    expect(screen.getByRole("link", { name: "88 commits" })).toHaveAttribute(
      "href",
      `${repo}/commits/main`,
    )
    expect(screen.getByRole("link", { name: "29 PRs" })).toHaveAttribute(
      "href",
      `${repo}/pulls?q=is%3Apr`,
    )
    expect(screen.getByRole("link", { name: "11 issues" })).toHaveAttribute(
      "href",
      `${repo}/issues?q=is%3Aissue`,
    )
  })

  it("só fala de abertas quando existe alguma", () => {
    render(<RepoStatsLine stats={stats} />)
    const list = screen.getByRole("list", { name: "Números do repositório" })
    expect(list).toHaveTextContent("(2 abertas)")
    expect(list).not.toHaveTextContent("abertos")
  })

  it("usa o singular quando é um só", () => {
    render(
      <RepoStatsLine
        stats={{
          ...stats,
          commits: 1,
          pull_requests: { total: 1, open: 1 },
          issues: { total: 1, open: 1 },
        }}
      />,
    )
    expect(screen.getByRole("link", { name: "1 commit" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "1 PR" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "1 issue" })).toBeInTheDocument()
    expect(screen.getByRole("list")).toHaveTextContent("(1 aberto)")
    expect(screen.getByRole("list")).toHaveTextContent("(1 aberta)")
  })
})

describe("RepoStats", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("carrega o /stats.json e mostra a linha", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(stats)),
    )
    render(<RepoStats />)
    expect(
      await screen.findByRole("link", { name: "88 commits" }),
    ).toBeInTheDocument()
  })

  it("não mostra nada se o arquivo não existe", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("", { status: 404 }))
    const { container } = render(<RepoStats />)
    await vi.waitFor(() => expect(spy).toHaveBeenCalled())
    expect(container.textContent).toBe("")
  })
})
