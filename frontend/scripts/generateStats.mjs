/*
 * Gera o `stats.json` que a Home lê (formato em `src/lib/stats.ts`) a partir da
 * API pública do GitHub. Uso:
 *
 *   npm run stats                              # grava dist/stats.json
 *   npm run stats -- --out outro/stats.json
 *   STATS_STRICT=1 npm run stats               # falha de verdade (sai 1)
 *
 * O arquivo só é gravado quando todos os números chegam completos: se a API
 * falhar (limite de requisições, rede fora, resposta fora do formato), o
 * arquivo que já existia fica como está, o motivo vai para o stderr e o script
 * sai 0, para não derrubar o deploy. Com `STATS_STRICT=1` sai 1. Usa o
 * `GITHUB_TOKEN` quando existir (só leitura).
 */
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const REPO = "msouza10/probekit"
const API = "https://api.github.com"

const isCount = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0

function ensureCount(value, what) {
  if (!isCount(value)) throw new Error(`resposta sem ${what} válido`)
  return value
}

// Número de commits: a última página do `Link` (com `per_page=1`, página = commit).
// Com um commit só a API não manda o `Link`; então conta os itens da resposta.
function countCommits({ body, headers }) {
  const last = /[?&]page=(\d+)>;\s*rel="last"/.exec(headers.link ?? "")
  if (last) return Number(last[1])
  if (!Array.isArray(body))
    throw new Error("resposta de commits fora do formato")
  return body.length
}

// A busca de issues também devolve PRs; `type:` separa os dois.
async function countSearch(getJson, type, extra = "") {
  const { body } = await getJson(
    `/search/issues?q=repo:${REPO}+type:${type}${extra}`,
  )
  return ensureCount(body?.total_count, `total de ${type}`)
}

function parseLanguages(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    throw new Error("resposta de linguagens fora do formato")
  return Object.entries(body)
    .map(([name, bytes]) => ({
      name,
      bytes: ensureCount(bytes, `bytes de ${name}`),
    }))
    .sort((a, b) => b.bytes - a.bytes)
}

/**
 * Monta o objeto `RepoStats`. `getJson(path)` devolve `{ body, headers }` (as
 * chaves de `headers` em minúsculas); lança se a requisição falhar.
 */
export async function collectStats(getJson, now = new Date()) {
  const [commits, prTotal, prOpen, issueTotal, issueOpen, languages] =
    await Promise.all([
      getJson(`/repos/${REPO}/commits?sha=main&per_page=1`).then(countCommits),
      countSearch(getJson, "pr"),
      countSearch(getJson, "pr", "+state:open"),
      countSearch(getJson, "issue"),
      countSearch(getJson, "issue", "+state:open"),
      getJson(`/repos/${REPO}/languages`).then(({ body }) =>
        parseLanguages(body),
      ),
    ])
  return {
    generated_at: now.toISOString().replace(/\.\d{3}Z$/, "Z"),
    commits,
    pull_requests: { total: prTotal, open: prOpen },
    issues: { total: issueTotal, open: issueOpen },
    languages,
  }
}

export function githubGetJson(token) {
  return async (requestPath) => {
    const response = await fetch(`${API}${requestPath}`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!response.ok)
      throw new Error(`GitHub respondeu ${response.status} em ${requestPath}`)
    return {
      body: await response.json(),
      headers: Object.fromEntries(response.headers),
    }
  }
}

/** Devolve o código de saída; só grava `out` se tudo tiver chegado. */
export async function runCli({ out, strict = false, getJson, now }) {
  let stats
  try {
    stats = await collectStats(getJson, now)
  } catch (error) {
    console.error(`stats.json não atualizado: ${error.message}`)
    return strict ? 1 : 0
  }
  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, `${JSON.stringify(stats, null, 2)}\n`)
  console.log(`Gravado ${out}`)
  return 0
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
  const flag = process.argv.indexOf("--out")
  const out = path.resolve(
    flag === -1 ? path.join(root, "dist/stats.json") : process.argv[flag + 1],
  )
  process.exit(
    await runCli({
      out,
      strict: process.env.STATS_STRICT === "1",
      getJson: githubGetJson(process.env.GITHUB_TOKEN),
    }),
  )
}
