// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterAll, describe, expect, it, vi } from "vitest"
import { parseStats } from "../src/lib/stats.ts"
import {
  decideChanged,
  readStats,
  runCli,
  sameNumbers,
} from "./statsChanged.mjs"

const base = () => ({
  generated_at: "2026-10-28T12:00:00Z",
  commits: 88,
  pull_requests: { total: 30, open: 1 },
  issues: { total: 14, open: 6 },
  languages: [
    { name: "TypeScript", bytes: 9000 },
    { name: "Go", bytes: 500 },
    { name: "HCL", bytes: 70 },
  ],
})

const tmp = mkdtempSync(path.join(tmpdir(), "stats-changed-"))
afterAll(() => rmSync(tmp, { recursive: true, force: true }))

describe("sameNumbers", () => {
  it("ignora só o generated_at", () => {
    const later = { ...base(), generated_at: "2026-10-29T09:17:00Z" }
    expect(sameNumbers(base(), later)).toBe(true)
  })

  it("um commit a mais já é diferente", () => {
    expect(sameNumbers(base(), { ...base(), commits: 89 })).toBe(false)
  })

  it("PR ou issue abertos a mais são diferentes", () => {
    const morePrs = { ...base(), pull_requests: { total: 30, open: 2 } }
    const moreIssues = { ...base(), issues: { total: 15, open: 6 } }
    expect(sameNumbers(base(), morePrs)).toBe(false)
    expect(sameNumbers(base(), moreIssues)).toBe(false)
  })

  it("bytes de uma linguagem diferentes são diferentes", () => {
    const changed = base()
    changed.languages[1].bytes = 501
    expect(sameNumbers(base(), changed)).toBe(false)
  })

  it("uma linguagem nova é diferente", () => {
    const more = base()
    more.languages.push({ name: "Shell", bytes: 10 })
    expect(sameNumbers(base(), more)).toBe(false)
  })

  it("a ordem das linguagens não importa", () => {
    const reordered = { ...base(), languages: [...base().languages].reverse() }
    expect(sameNumbers(base(), reordered)).toBe(true)
  })
})

describe("readStats", () => {
  it("aceita o que o parseStats aceita", () => {
    expect(readStats(base())).toEqual(parseStats(base()))
  })

  it.each([
    ["null", null],
    ["texto", "oi"],
    ["sem commits", { ...base(), commits: undefined }],
    ["commits negativo", { ...base(), commits: -1 }],
    ["PRs sem open", { ...base(), pull_requests: { total: 1 } }],
    ["languages que não é lista", { ...base(), languages: {} }],
    ["linguagem sem bytes", { ...base(), languages: [{ name: "Go" }] }],
  ])("recusa %s", (_, value) => {
    expect(readStats(value)).toBeNull()
  })
})

describe("decideChanged", () => {
  const fresh = () => Promise.resolve(base())

  it("números iguais aos do ar: não publica", async () => {
    const live = () => Promise.resolve({ ...base(), generated_at: "antes" })
    const result = await decideChanged({ fetchLive: live, collectFresh: fresh })
    expect(result.changed).toBe(false)
  })

  it("números diferentes dos do ar: publica", async () => {
    const live = () => Promise.resolve({ ...base(), commits: 80 })
    const result = await decideChanged({ fetchLive: live, collectFresh: fresh })
    expect(result.changed).toBe(true)
  })

  it("arquivo no ar fora do ar (erro): publica", async () => {
    const live = () => Promise.reject(new Error("HTTP 404"))
    const result = await decideChanged({ fetchLive: live, collectFresh: fresh })
    expect(result.changed).toBe(true)
  })

  it("arquivo no ar com lixo: publica", async () => {
    const live = () => Promise.resolve({ foo: 1 })
    const result = await decideChanged({ fetchLive: live, collectFresh: fresh })
    expect(result.changed).toBe(true)
  })

  it("não conseguiu os números novos: não publica, mesmo sem arquivo no ar", async () => {
    const live = () => Promise.reject(new Error("HTTP 404"))
    const broken = () => Promise.reject(new Error("GitHub respondeu 403"))
    const result = await decideChanged({
      fetchLive: live,
      collectFresh: broken,
    })
    expect(result.changed).toBe(false)
    expect(result.reason).toMatch(/403/)
  })
})

describe("runCli", () => {
  const live = () => Promise.resolve({ ...base(), commits: 80 })

  it("escreve changed=true no arquivo de saída do GitHub", async () => {
    const output = path.join(tmp, "out-true")
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    const code = await runCli({
      fetchLive: live,
      collectFresh: () => Promise.resolve(base()),
      outputFile: output,
    })
    log.mockRestore()
    expect(code).toBe(0)
    expect(readFileSync(output, "utf8")).toBe("changed=true\n")
  })

  it("sem arquivo de saída só imprime, sem quebrar", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    const code = await runCli({
      fetchLive: live,
      collectFresh: () => Promise.resolve(base()),
    })
    expect(code).toBe(0)
    expect(log).toHaveBeenCalledWith(expect.stringContaining("changed=true"))
    log.mockRestore()
  })

  it("falha nos números novos: avisa no stderr, changed=false e sai 0", async () => {
    const output = path.join(tmp, "out-false")
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    const warn = vi.spyOn(console, "error").mockImplementation(() => {})
    const code = await runCli({
      fetchLive: live,
      collectFresh: () => Promise.reject(new Error("rede fora")),
      outputFile: output,
    })
    expect(code).toBe(0)
    expect(readFileSync(output, "utf8")).toBe("changed=false\n")
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("rede fora"))
    log.mockRestore()
    warn.mockRestore()
  })
})
