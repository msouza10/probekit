import { useEffect, useState } from "react"

/*
 * Números do repositório, lidos de /stats.json (servido pelo próprio site).
 * Quem gera o arquivo é o workflow de deploy; o site só lê. Formato:
 *
 *   {
 *     "generated_at": "2026-10-26T12:00:00Z",
 *     "commits": 88,
 *     "pull_requests": { "total": 29, "open": 0 },
 *     "issues": { "total": 11, "open": 2 },
 *     "languages": [{ "name": "TypeScript", "bytes": 120626 }]
 *   }
 */
export interface RepoStats {
  generated_at: string
  commits: number
  pull_requests: { total: number; open: number }
  issues: { total: number; open: number }
  languages: { name: string; bytes: number }[]
}

export interface LanguageShare {
  name: string
  percent: number
}

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0

function isTotals(value: unknown): value is { total: number; open: number } {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return isCount(v.total) && isCount(v.open)
}

function isLanguage(value: unknown): value is { name: string; bytes: number } {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.name === "string" && isCount(v.bytes)
}

/** Aceita só um arquivo no formato acima; qualquer outra coisa vira `null`. */
export function parseStats(value: unknown): RepoStats | null {
  if (typeof value !== "object" || value === null) return null
  const v = value as Record<string, unknown>
  if (
    typeof v.generated_at !== "string" ||
    !isCount(v.commits) ||
    !isTotals(v.pull_requests) ||
    !isTotals(v.issues) ||
    !Array.isArray(v.languages)
  ) {
    return null
  }
  return {
    generated_at: v.generated_at,
    commits: v.commits,
    pull_requests: v.pull_requests,
    issues: v.issues,
    languages: v.languages.filter(isLanguage),
  }
}

export async function fetchStats(): Promise<RepoStats | null> {
  try {
    const response = await fetch("/stats.json")
    if (!response.ok) return null
    return parseStats(await response.json())
  } catch {
    return null
  }
}

/** `undefined` enquanto carrega, `null` se o arquivo não veio ou é inválido. */
export function useRepoStats(): RepoStats | null | undefined {
  const [stats, setStats] = useState<RepoStats | null | undefined>(undefined)
  useEffect(() => {
    let active = true
    fetchStats().then((result) => {
      if (active) setStats(result)
    })
    return () => {
      active = false
    }
  }, [])
  return stats
}

/**
 * Porcentagem por linguagem, da maior para a menor. Só as `top` maiores têm
 * nome; o resto vira "outras" (a não ser que sobre uma só, que aparece pelo nome).
 */
export function languageShares(
  languages: RepoStats["languages"],
  top = 4,
): LanguageShare[] {
  const total = languages.reduce((sum, item) => sum + item.bytes, 0)
  if (total === 0) return []
  const sorted = [...languages].sort((a, b) => b.bytes - a.bytes)
  const keep = sorted.length === top + 1 ? top + 1 : top
  const shares = sorted.slice(0, keep).map(({ name, bytes }) => ({
    name,
    percent: (100 * bytes) / total,
  }))
  const rest = sorted.slice(keep)
  if (rest.length > 0) {
    const restBytes = rest.reduce((sum, item) => sum + item.bytes, 0)
    shares.push({ name: "outras", percent: (100 * restBytes) / total })
  }
  return shares
}

export function formatPercent(percent: number): string {
  return percent < 1 ? "<1%" : `${Math.round(percent)}%`
}
