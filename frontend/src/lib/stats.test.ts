import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchStats, formatPercent, languageShares, parseStats } from "./stats"

const valid = {
  generated_at: "2026-10-26T12:00:00Z",
  commits: 88,
  pull_requests: { total: 29, open: 0 },
  issues: { total: 11, open: 2 },
  languages: [
    { name: "TypeScript", bytes: 120626 },
    { name: "Go", bytes: 66379 },
    { name: "Shell", bytes: 36519 },
    { name: "CSS", bytes: 14005 },
    { name: "Python", bytes: 8627 },
    { name: "HCL", bytes: 7754 },
    { name: "HTML", bytes: 1068 },
  ],
}

describe("parseStats", () => {
  it("aceita o formato do contrato", () => {
    expect(parseStats(valid)).toEqual(valid)
  })

  it.each([
    ["null", null],
    ["texto", "88 commits"],
    ["sem commits", { ...valid, commits: undefined }],
    ["commits negativo", { ...valid, commits: -1 }],
    ["commits em texto", { ...valid, commits: "88" }],
    ["PRs sem 'open'", { ...valid, pull_requests: { total: 29 } }],
    ["issues sem total", { ...valid, issues: { open: 2 } }],
    ["sem data", { ...valid, generated_at: undefined }],
    ["linguagens que não é lista", { ...valid, languages: "Go" }],
  ])("rejeita arquivo inválido: %s", (_nome, value) => {
    expect(parseStats(value)).toBeNull()
  })

  it("descarta só as linguagens malformadas e mantém o resto", () => {
    const parsed = parseStats({
      ...valid,
      languages: [{ name: "Go", bytes: 10 }, { name: "Rust" }, null],
    })
    expect(parsed?.languages).toEqual([{ name: "Go", bytes: 10 }])
  })
})

describe("fetchStats", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("lê /stats.json", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(valid)))
    expect(await fetchStats()).toEqual(valid)
    expect(spy).toHaveBeenCalledWith("/stats.json")
  })

  it("devolve null se o arquivo não existe, é inválido ou a rede falha", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 404 }),
    )
    expect(await fetchStats()).toBeNull()

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response('{"commits": 1}'),
    )
    expect(await fetchStats()).toBeNull()

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("rede"))
    expect(await fetchStats()).toBeNull()
  })
})

describe("languageShares", () => {
  it("mostra as quatro maiores e junta o resto em 'outras'", () => {
    const shares = languageShares(valid.languages)
    expect(shares.map((s) => s.name)).toEqual([
      "TypeScript",
      "Go",
      "Shell",
      "CSS",
      "outras",
    ])
    expect(shares[0].percent).toBeCloseTo(47.3, 1)
    expect(shares[4].percent).toBeCloseTo(6.84, 2)
    expect(shares.reduce((sum, s) => sum + s.percent, 0)).toBeCloseTo(100, 5)
  })

  it("ordena da maior para a menor mesmo se o arquivo vier fora de ordem", () => {
    const shares = languageShares([
      { name: "HCL", bytes: 1 },
      { name: "Go", bytes: 9 },
    ])
    expect(shares.map((s) => s.name)).toEqual(["Go", "HCL"])
  })

  it("não esconde uma única sobra atrás de 'outras'", () => {
    const five = valid.languages.slice(0, 5)
    const names = languageShares(five).map((s) => s.name)
    expect(names).toEqual(["TypeScript", "Go", "Shell", "CSS", "Python"])
  })

  it("devolve lista vazia sem dados", () => {
    expect(languageShares([])).toEqual([])
    expect(languageShares([{ name: "Go", bytes: 0 }])).toEqual([])
  })
})

describe("formatPercent", () => {
  it("arredonda e não mostra 0% para quem tem alguma fatia", () => {
    expect(formatPercent(47.3)).toBe("47%")
    expect(formatPercent(5.5)).toBe("6%")
    expect(formatPercent(0.4)).toBe("<1%")
  })
})
