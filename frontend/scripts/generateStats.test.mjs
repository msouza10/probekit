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

const SITE_RUNS = `${REPO}/actions/workflows/deploy-frontend.yml/runs?status=success&per_page=1`
const API_RUNS = `${REPO}/actions/workflows/deploy-api-golang.yml/runs?status=success&per_page=1`

const NOW = new Date("2026-10-28T12:00:00.123Z")

// Um item de /commits como o GitHub devolve (só o que o script usa).
const COMMIT = {
  sha: "a1b2c3d4e5f6a7b8c9d0",
  html_url: "https://github.com/msouza10/probekit/commit/a1b2c3d4e5f6a7b8c9d0",
  commit: { committer: { date: "2026-10-28T11:30:00Z" } },
}

const run = (updated_at, id) => ({
  updated_at,
  html_url: `https://github.com/msouza10/probekit/actions/runs/${id}`,
})

const link = (last) =>
  `<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=${last}>; rel="last"`

// Um getJson falso: caminho exato -> resposta. Caminho desconhecido quebra o teste.
function fakeApi(overrides = {}) {
  const routes = {
    [COMMITS]: { body: [COMMIT], headers: { link: link(84) } },
    [SITE_RUNS]: {
      body: { workflow_runs: [run("2026-10-28T09:00:00Z", 1)] },
      headers: {},
    },
    [API_RUNS]: {
      body: { workflow_runs: [run("2026-10-27T18:00:00Z", 2)] },
      headers: {},
    },
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
    // O site ainda não lê o `pulse`; o parseStats o ignora.
    expect(parseStats(stats)).toEqual({ ...stats, pulse: undefined })
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
      [COMMITS]: { body: [COMMIT], headers: {} },
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

describe("collectStats (pulse: último commit e deploys)", () => {
  it("monta o último commit a partir da mesma resposta que conta os commits", async () => {
    const stats = await collectStats(fakeApi(), NOW)
    expect(stats.pulse.commit).toEqual({
      label: "a1b2c3d",
      at: "2026-10-28T11:30:00Z",
      href: COMMIT.html_url,
    })
  })

  it("monta o último deploy bem-sucedido do site e o da API", async () => {
    const stats = await collectStats(fakeApi(), NOW)
    expect(stats.pulse.site).toEqual({
      label: "",
      at: "2026-10-28T09:00:00Z",
      href: "https://github.com/msouza10/probekit/actions/runs/1",
    })
    expect(stats.pulse.api).toEqual({
      label: "",
      at: "2026-10-27T18:00:00Z",
      href: "https://github.com/msouza10/probekit/actions/runs/2",
    })
  })

  it("sem nenhum deploy bem-sucedido, essa parte é null e o resto segue", async () => {
    const api = fakeApi({
      [API_RUNS]: { body: { workflow_runs: [] }, headers: {} },
    })
    const stats = await collectStats(api, NOW)
    expect(stats.pulse.api).toBeNull()
    expect(stats.pulse.site).not.toBeNull()
    expect(stats.pulse.commit).not.toBeNull()
  })

  it("sem nenhum commit, o commit é null", async () => {
    const api = fakeApi({ [COMMITS]: { body: [], headers: {} } })
    const stats = await collectStats(api, NOW)
    expect(stats.commits).toBe(0)
    expect(stats.pulse.commit).toBeNull()
  })

  it("recusa resposta de deploys ou de commit fora do formato, em vez de gravar null", async () => {
    const runsSemLista = fakeApi({
      [SITE_RUNS]: { body: { message: "oops" }, headers: {} },
    })
    await expect(collectStats(runsSemLista, NOW)).rejects.toThrow()

    const runSemData = fakeApi({
      [API_RUNS]: {
        body: { workflow_runs: [{ html_url: "https://x" }] },
        headers: {},
      },
    })
    await expect(collectStats(runSemData, NOW)).rejects.toThrow()

    const commitSemData = fakeApi({
      [COMMITS]: { body: [{ sha: "abc" }], headers: { link: link(84) } },
    })
    await expect(collectStats(commitSemData, NOW)).rejects.toThrow()
  })
})

describe("collectStats (links do pulse)", () => {
  it("recusa um link que não seja do GitHub, porque ele vira um href no site", async () => {
    const runFora = fakeApi({
      [SITE_RUNS]: {
        body: {
          workflow_runs: [
            {
              updated_at: "2026-10-28T09:00:00Z",
              html_url: "https://evil.example/x",
            },
          ],
        },
        headers: {},
      },
    })
    await expect(collectStats(runFora, NOW)).rejects.toThrow(/link/)

    const commitFora = fakeApi({
      [COMMITS]: {
        body: [{ ...COMMIT, html_url: "javascript:alert(1)" }],
        headers: {},
      },
    })
    await expect(collectStats(commitFora, NOW)).rejects.toThrow(/link/)
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

  it("com a API de deploys falhando, deixa o arquivo intacto", async () => {
    const out = path.join(sandbox, "deploys.json")
    writeFileSync(out, '{"antigo":true}')
    const spy = quiet()
    const getJson = fakeApi({ [SITE_RUNS]: new Error("rate limit") })
    expect(await runCli({ out, getJson, now: NOW })).toBe(0)
    expect(readFileSync(out, "utf8")).toBe('{"antigo":true}')
    spy.mockRestore()
  })
})
