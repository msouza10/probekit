/*
 * Diz se vale publicar o site de novo por causa dos números: compara os números
 * novos do GitHub com o `stats.json` que está no ar. Uso:
 *
 *   npm run stats:changed -- --live https://probekit.cc/stats.json
 *
 * Escreve `changed=true` ou `changed=false` em `$GITHUB_OUTPUT` (fora do GitHub,
 * só imprime). Sai sempre 0: a resposta está no `changed`, não no código.
 *
 *   - arquivo no ar ausente ou inválido -> `true` (publicar corrige);
 *   - falha ao obter os números novos   -> `false` com aviso, para não trocar
 *     números bons por nada nem publicar às cegas.
 *
 * Não importa `src/lib/stats.ts`: o `node` puro não garante ler TypeScript.
 * `readStats` repete a validação e o teste confere que as duas concordam.
 */
import { appendFile } from "node:fs/promises"
import { pathToFileURL } from "node:url"
import { collectStats, githubGetJson } from "./generateStats.mjs"

const isCount = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0

const isObject = (value) => typeof value === "object" && value !== null

const isTotals = (value) =>
  isObject(value) && isCount(value.total) && isCount(value.open)

const isLanguage = (value) =>
  isObject(value) && typeof value.name === "string" && isCount(value.bytes)

/** Devolve o objeto no formato `RepoStats` ou `null` se qualquer parte falhar. */
export function readStats(value) {
  if (!isObject(value)) return null
  if (
    typeof value.generated_at !== "string" ||
    !isCount(value.commits) ||
    !isTotals(value.pull_requests) ||
    !isTotals(value.issues) ||
    !Array.isArray(value.languages) ||
    !value.languages.every(isLanguage)
  )
    return null
  return value
}

// Uma forma só para comparar: a ordem das linguagens e das chaves não conta.
function comparable(stats) {
  return JSON.stringify([
    stats.commits,
    stats.pull_requests.total,
    stats.pull_requests.open,
    stats.issues.total,
    stats.issues.open,
    stats.languages.map(({ name, bytes }) => `${name}:${bytes}`).sort(),
  ])
}

/** Igual em tudo menos `generated_at`. */
export function sameNumbers(a, b) {
  return comparable(a) === comparable(b)
}

/**
 * `fetchLive()` devolve o JSON do ar (ou lança); `collectFresh()` devolve os
 * números novos (ou lança). Devolve `{ changed, reason }`.
 */
export async function decideChanged({ fetchLive, collectFresh }) {
  let fresh
  try {
    fresh = await collectFresh()
  } catch (error) {
    return {
      changed: false,
      failed: true,
      reason: `não consegui os números novos: ${error.message}`,
    }
  }
  let live = null
  try {
    live = readStats(await fetchLive())
  } catch {
    // arquivo fora do ar: cai no `null` abaixo
  }
  if (!live)
    return { changed: true, reason: "arquivo no ar ausente ou inválido" }
  return sameNumbers(live, fresh)
    ? { changed: false, reason: "números iguais aos do ar" }
    : { changed: true, reason: "números diferentes dos do ar" }
}

/** Devolve o código de saída (sempre 0). */
export async function runCli({ fetchLive, collectFresh, outputFile }) {
  const { changed, failed, reason } = await decideChanged({
    fetchLive,
    collectFresh,
  })
  if (failed) console.error(`aviso: ${reason}`)
  else console.log(reason)
  console.log(`changed=${changed}`)
  if (outputFile) await appendFile(outputFile, `changed=${changed}\n`)
  return 0
}

async function fetchLiveJson(url) {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error(`HTTP ${response.status} em ${url}`)
  return response.json()
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const flag = process.argv.indexOf("--live")
  const url = flag === -1 ? undefined : process.argv[flag + 1]
  if (!url) {
    console.error("uso: statsChanged.mjs --live <url do stats.json no ar>")
    process.exit(2)
  }
  const getJson = githubGetJson(process.env.GITHUB_TOKEN)
  process.exit(
    await runCli({
      fetchLive: () => fetchLiveJson(url),
      collectFresh: () => collectStats(getJson),
      outputFile: process.env.GITHUB_OUTPUT,
    }),
  )
}
