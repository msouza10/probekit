const repo = "msouza10/probekit"
const apiBase = `https://api.github.com/repos/${repo}`
const cacheKey = "probekit-repo-pulse"
const cacheTtlMs = 10 * 60 * 1000

export interface PulseItem {
  label: string
  at: string
  href: string
}

export interface RepoPulseData {
  commit: PulseItem | null
  site: PulseItem | null
  api: PulseItem | null
}

interface GithubCommit {
  sha: string
  html_url: string
  commit: { committer: { date: string } }
}

interface GithubRuns {
  workflow_runs: { updated_at: string; html_url: string }[]
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { Accept: "application/vnd.github+json" },
  })
  if (!response.ok) throw new Error(`github ${response.status}`)
  return (await response.json()) as T
}

async function lastCommit(): Promise<PulseItem | null> {
  const [latest] = await getJson<GithubCommit[]>("/commits?per_page=1")
  if (!latest) return null
  return {
    label: latest.sha.slice(0, 7),
    at: latest.commit.committer.date,
    href: latest.html_url,
  }
}

async function lastDeploy(workflow: string): Promise<PulseItem | null> {
  const { workflow_runs } = await getJson<GithubRuns>(
    `/actions/workflows/${workflow}/runs?status=success&per_page=1`,
  )
  const [run] = workflow_runs
  if (!run) return null
  return { label: "", at: run.updated_at, href: run.html_url }
}

function readCache(): RepoPulseData | null {
  try {
    const raw = sessionStorage.getItem(cacheKey)
    if (!raw) return null
    const { savedAt, data } = JSON.parse(raw) as {
      savedAt: number
      data: RepoPulseData
    }
    return Date.now() - savedAt < cacheTtlMs ? data : null
  } catch {
    return null
  }
}

function writeCache(data: RepoPulseData) {
  try {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({ savedAt: Date.now(), data }),
    )
  } catch {
    // Sem sessionStorage (modo privado, por exemplo): só perde o cache.
  }
}

/**
 * Busca o último commit e o último deploy bem-sucedido do site e da API.
 * Cada parte falha sozinha: o que não veio fica `null` e a tela não mostra.
 */
export async function fetchRepoPulse(): Promise<RepoPulseData> {
  const cached = readCache()
  if (cached) return cached

  const [commit, site, api] = await Promise.allSettled([
    lastCommit(),
    lastDeploy("deploy-frontend.yml"),
    lastDeploy("deploy-api-golang.yml"),
  ])
  const value = (result: PromiseSettledResult<PulseItem | null>) =>
    result.status === "fulfilled" ? result.value : null

  const data = { commit: value(commit), site: value(site), api: value(api) }
  // Só guarda se veio alguma coisa, para uma falha não ficar presa por 10 min.
  if (data.commit || data.site || data.api) writeCache(data)
  return data
}

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" })
const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
]

const shortUnits: [string, number][] = [
  ["d", 86_400_000],
  ["h", 3_600_000],
  ["min", 60_000],
]

/** Versão curta para telas estreitas: "3d", "5h", "12min", "agora". */
export function timeAgoShort(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime()
  for (const [unit, size] of shortUnits) {
    if (diff >= size) return `${Math.floor(diff / size)}${unit}`
  }
  return "agora"
}

/** "há 2 dias", "há 3 horas", "ontem", "agora". */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = new Date(iso).getTime() - now
  for (const [unit, size] of units) {
    if (Math.abs(diff) >= size)
      return relative.format(Math.round(diff / size), unit)
  }
  return "agora"
}
