import { BadgeCheck, GitCommitHorizontal } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import {
  fetchRepoPulse,
  timeAgo,
  timeAgoShort,
  type PulseItem,
  type RepoPulseData,
} from "@/lib/github"

const link =
  "text-foreground underline decoration-highlight/50 underline-offset-[0.2em] transition-colors hover:decoration-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

function Entry({
  icon,
  spoken,
  name,
  item,
  title,
}: {
  icon: ReactNode
  spoken: string
  name: string
  item: PulseItem
  title: string
}) {
  return (
    <li className="flex items-center gap-1.5">
      {icon}
      <span>
        <span className="sr-only">{spoken}</span>
        {name}
      </span>
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        title={title}
        className={link}
      >
        <span aria-hidden="true" className="sm:hidden">
          {timeAgoShort(item.at)}
        </span>
        <span className="hidden sm:inline">{timeAgo(item.at)}</span>
      </a>
    </li>
  )
}

const iconClass = "h-3.5 w-3.5 shrink-0"

export function RepoPulse() {
  const [data, setData] = useState<RepoPulseData | null>(null)

  useEffect(() => {
    let active = true
    fetchRepoPulse()
      .then((result) => {
        if (active) setData(result)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const hasAny = data && (data.commit || data.site || data.api)

  // A altura fica reservada para a página não pular quando os dados chegam.
  return (
    <div className="min-h-5">
      {hasAny ? (
        <ul
          aria-label="Atividade do repositório"
          className="flex flex-nowrap items-center gap-x-4 font-mono text-caption whitespace-nowrap text-muted-foreground sm:gap-x-6"
        >
          {data.commit ? (
            <Entry
              icon={
                <GitCommitHorizontal aria-hidden="true" className={iconClass} />
              }
              spoken=""
              name={`commit ${data.commit.label}`}
              item={data.commit}
              title="Último commit"
            />
          ) : null}
          {data.site ? (
            <Entry
              icon={
                <BadgeCheck
                  aria-hidden="true"
                  className={`${iconClass} text-success`}
                />
              }
              spoken="deploy do "
              name="site"
              item={data.site}
              title="Último deploy do site que terminou com sucesso"
            />
          ) : null}
          {data.api ? (
            <Entry
              icon={
                <BadgeCheck
                  aria-hidden="true"
                  className={`${iconClass} text-success`}
                />
              }
              spoken="deploy da "
              name="API"
              item={data.api}
              title="Último deploy da API que terminou com sucesso"
            />
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
