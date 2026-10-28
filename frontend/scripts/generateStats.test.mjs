// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterAll, describe, expect, it, vi } from "vitest"
import { parseStats } from "../src/lib/stats.ts"
import { collectStats, runCli } from "./generateStats.mjs"

const REPO = "/repos/msouza10/probekit"
const COMMITS = `${REPO}/commits?sha=main&per_page=1`
const SEARCH = "/search/issues?q=repo:msouza10/probekit"
const LANGUAGES = `${REPO}/languages`

const NOW = new Date("2026-10-28T12:00:00.123Z")

const link = (last) =>
  `<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=${last}>; rel="last"`

// Um getJson falso: caminho exato -> resposta. Caminho desconhecido quebra o teste.
function fakeApi(overrides = {}) {
  const routes = {
    [COMMITS]: { body: [{ sha: "a" }], headers: { link: link(84) } },
    [`${SEARCH}+type:pr`]: { body: { total_count: 30 }, headers: {} },
    [`${SEARCH}+type:pr+state:open`]: { body: { total_count: 1 }, headers: {} },
    [`${SEARCH}+type:issue`]: { body: { total_count: 14 }, headers: {} },
    [`${SEARCH}+type:issue+state:open`]: {
      body: { total_count: 6 },
      headers: {},
    },
    [LANGUAGES]: {
      body: { Go: 500, TypeScript: 9000, HCL: 70 },
      headers: {},
    },
    ...overrides,
  }
  return async (requestPath) => {
    if (!(requestPath in routes))
      throw new Error(`rota inesperada ${requestPath}`)
    const route = routes[requestPath]
    if (route instanceof Error) throw route
    return route
  }
}

describe("collectStats", () => {
  it("devolve um arquivo que passa em parseStats", async () => {
    const stats = await collectStats(fakeApi(), NOW)
    expect(parseStats(stats)).toEqual(stats)
  })

  it("grava generated_at em UTC, sem milissegundos", async () => {
    const stats = await collectStats(fakeApi(), NOW)
    expect(stats.generated_at).toBe("2026-10-28T12:00:00Z")
  })

  it("conta os commits pela última página do Link", async () => {
    const stats = await collectStats(fakeApi(), NOW)
    expect(stats.commits).toBe(84)
  })

  it("conta 1 commit quando não há Link e a resposta tem um item", async () => {
    const api = fakeApi({
      [COMMITS]: { body: [{ sha: "a" }], headers: {} },
    })
    const stats = await collectStats(api, NOW)
    expect(stats.commits).toBe(1)
  })

  it("mantém PRs e issues separados, cada um com total e abertos", async () => {
    const stats = await collectStats(fakeApi(), NOW)
    expect(stats.pull_requests).toEqual({ total: 30, open: 1 })
    expect(stats.issues).toEqual({ total: 14, open: 6 })
  })

  it("ordena as linguagens por bytes, da maior para a menor", async () => {
    const stats = await collectStats(fakeApi(), NOW)
    expect(stats.languages).toEqual([
      { name: "TypeScript", bytes: 9000 },
      { name: "Go", bytes: 500 },
      { name: "HCL", bytes: 70 },
    ])
  })

  it("recusa resposta malformada em vez de gravar zeros", async () => {
    const semTotal = fakeApi({
      [`${SEARCH}+type:pr`]: { body: { message: "oops" }, headers: {} },
    })
    await expect(collectStats(semTotal, NOW)).rejects.toThrow()

    const commitsSemLista = fakeApi({
      [COMMITS]: { body: { message: "oops" }, headers: {} },
    })
    await expect(collectStats(commitsSemLista, NOW)).rejects.toThrow()

    const linguagensTexto = fakeApi({
      [LANGUAGES]: { body: { Go: "muito" }, headers: {} },
    })
    await expect(collectStats(linguagensTexto, NOW)).rejects.toThrow()
  })
})

describe("runCli", () => {
  const sandbox = mkdtempSync(path.join(tmpdir(), "generate-stats-"))
  afterAll(() => rmSync(sandbox, { recursive: true, force: true }))

  const quiet = () => vi.spyOn(console, "error").mockImplementation(() => {})

  it("grava o arquivo com 2 espaços de indentação e sai 0", async () => {
    const out = path.join(sandbox, "ok.json")
    const code = await runCli({ out, getJson: fakeApi(), now: NOW })
    expect(code).toBe(0)
    const written = JSON.parse(readFileSync(out, "utf8"))
    expect(parseStats(written)).not.toBeNull()
    expect(readFileSync(out, "utf8")).toContain('\n  "commits": 84')
  })

  it("com a API falhando, deixa o arquivo intacto e sai 0", async () => {
    const out = path.join(sandbox, "intacto.json")
    writeFileSync(out, '{"antigo":true}')
    const spy = quiet()
    const getJson = fakeApi({ [LANGUAGES]: new Error("rate limit") })
    const code = await runCli({ out, getJson, now: NOW })
    expect(code).toBe(0)
    expect(readFileSync(out, "utf8")).toBe('{"antigo":true}')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it("com STATS_STRICT=1, a falha da API sai 1 e também não toca no arquivo", async () => {
    const out = path.join(sandbox, "estrito.json")
    writeFileSync(out, '{"antigo":true}')
    const spy = quiet()
    const getJson = fakeApi({ [LANGUAGES]: new Error("rate limit") })
    const code = await runCli({ out, strict: true, getJson, now: NOW })
    expect(code).toBe(1)
    expect(readFileSync(out, "utf8")).toBe('{"antigo":true}')
    spy.mockRestore()
  })

  it("não cria o arquivo quando a API falha e ele não existia", async () => {
    const out = path.join(sandbox, "inexistente.json")
    const spy = quiet()
    const getJson = fakeApi({ [COMMITS]: new Error("fora do ar") })
    expect(await runCli({ out, getJson, now: NOW })).toBe(0)
    expect(() => readFileSync(out)).toThrow()
    spy.mockRestore()
  })
})
