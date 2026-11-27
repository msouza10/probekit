import { ChevronLeft, ChevronRight } from "lucide-react"
import { pageWindow } from "@/lib/pagination"

const control =
  "inline-flex h-11 min-w-11 items-center justify-center rounded-md border px-3 font-sans text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 sm:h-10 sm:min-w-10"

/** Anterior, os números das páginas (com a atual marcada) e próxima. */
export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      <button
        type="button"
        aria-label="Página anterior"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={`${control} border-border text-foreground hover:bg-muted`}
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </button>
      {pageWindow(page, totalPages).map((entry, index) =>
        entry === "…" ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className="px-1 text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            aria-label={`Página ${entry}`}
            aria-current={entry === page ? "page" : undefined}
            onClick={() => onChange(entry)}
            className={`${control} ${
              entry === page
                ? "border-foreground bg-foreground font-medium text-background"
                : "border-border text-foreground hover:bg-muted"
            }`}
          >
            {entry}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="Próxima página"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className={`${control} border-border text-foreground hover:bg-muted`}
      >
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </nav>
  )
}
