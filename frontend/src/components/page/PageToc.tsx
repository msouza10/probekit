import { cn } from "@/lib/utils"
import type { TocItem } from "./useActiveId"

function TocList({
  items,
  active,
}: {
  items: TocItem[]
  active: string | null
}) {
  return (
    <ol className="flex flex-col border-l border-border font-sans text-body-sm">
      {items.map(({ id, title }) => {
        const current = id === active
        return (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={current ? "location" : undefined}
              className={cn(
                "-ml-px flex min-h-9 items-center border-l-2 py-1 pl-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:min-h-11",
                current
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {title}
            </a>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Sumário "Nesta página". Na lateral (lg) fica fixo ao rolar; em tela estreita
 * vira um bloco recolhido no topo, para não empurrar o conteúdo.
 */
export function PageToc({
  items,
  active,
  variant,
}: {
  items: TocItem[]
  active: string | null
  variant: "side" | "inline"
}) {
  if (items.length === 0) return null

  if (variant === "inline") {
    return (
      <nav aria-label="Nesta página" className="lg:hidden">
        <details className="group rounded-md border border-border px-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-sans text-body-sm font-medium text-foreground">
            Nesta página
            <span
              aria-hidden="true"
              className="text-muted-foreground transition-transform group-open:rotate-90"
            >
              ›
            </span>
          </summary>
          <div className="pb-3">
            <TocList items={items} active={active} />
          </div>
        </details>
      </nav>
    )
  }

  return (
    <nav aria-label="Nesta página" className="hidden lg:block">
      <p className="mb-3 font-sans text-caption font-medium text-foreground">
        Nesta página
      </p>
      <TocList items={items} active={active} />
    </nav>
  )
}
