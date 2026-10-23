import type { ReactNode } from "react"
import { cn } from "cn"

type BenchProps = {
  label: string
  meta?: string
  example?: boolean
  className?: string
  children: ReactNode
}

function Bench({ label, meta, example, className, children }: BenchProps) {
  return (
    <section
      data-slot="bench"
      aria-label={label}
      className={cn(
        "bench min-w-0 overflow-hidden rounded-md border border-bench-border bg-bench text-bench-foreground",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-bench-border px-4 py-2 font-mono text-xs">
        <span className="font-medium tracking-wider text-bench-muted uppercase">
          {label}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-3 text-bench-muted">
          {example ? <span>exemplo</span> : null}
          {meta ? <span>{meta}</span> : null}
        </span>
      </header>
      <div
        role="group"
        tabIndex={0}
        aria-label={`${label}, conteúdo`}
        className="overflow-x-auto p-4 font-mono text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bench-highlight"
      >
        {children}
      </div>
    </section>
  )
}

export { Bench }
export type { BenchProps }
