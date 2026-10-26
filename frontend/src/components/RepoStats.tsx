import {
  CircleDot,
  GitCommitHorizontal,
  GitPullRequest,
  type LucideIcon,
} from "lucide-react"
import {
  languageShares,
  useRepoStats,
  type RepoStats as Stats,
} from "@/lib/stats"
import { LanguageBar } from "./LanguageBar"

const repository = "https://github.com/msouza10/probekit"

const link =
  "text-foreground underline decoration-highlight/50 underline-offset-[0.2em] transition-colors hover:decoration-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

function Entry({
  icon: Icon,
  count,
  label,
  href,
  note,
}: {
  icon: LucideIcon
  count: number
  label: string
  href: string
  note?: string
}) {
  return (
    <li className="flex items-center gap-1.5">
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <a href={href} target="_blank" rel="noreferrer" className={link}>
        {count} {label}
      </a>
      {note ? <span>{note}</span> : null}
    </li>
  )
}

const plural = (count: number, one: string, many: string) =>
  count === 1 ? one : many

/** Linha de números do repositório; some se o /stats.json não existir. */
export function RepoStatsLine({ stats }: { stats: Stats }) {
  const { commits, pull_requests: prs, issues } = stats
  return (
    <ul
      aria-label="Números do repositório"
      className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-caption text-muted-foreground"
    >
      <Entry
        icon={GitCommitHorizontal}
        count={commits}
        label={plural(commits, "commit", "commits")}
        href={`${repository}/commits/main`}
      />
      <Entry
        icon={GitPullRequest}
        count={prs.total}
        label={plural(prs.total, "PR", "PRs")}
        href={`${repository}/pulls?q=is%3Apr`}
        note={
          prs.open > 0
            ? `(${prs.open} ${plural(prs.open, "aberto", "abertos")})`
            : undefined
        }
      />
      <Entry
        icon={CircleDot}
        count={issues.total}
        label={plural(issues.total, "issue", "issues")}
        href={`${repository}/issues?q=is%3Aissue`}
        note={
          issues.open > 0
            ? `(${issues.open} ${plural(issues.open, "aberta", "abertas")})`
            : undefined
        }
      />
    </ul>
  )
}

export function RepoStats() {
  const stats = useRepoStats()
  if (!stats) return null
  const shares = languageShares(stats.languages)
  return (
    <div className="flex flex-col gap-5">
      <RepoStatsLine stats={stats} />
      {shares.length > 0 ? (
        <LanguageBar shares={shares} className="w-fit max-w-full" />
      ) : null}
    </div>
  )
}
