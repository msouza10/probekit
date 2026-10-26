export type ResultStat = {
  label: string
  value: string
  note?: string
  // Valor em destaque (peso maior), para o número que merece o primeiro olhar.
  strong?: boolean
}

/** Os números do resultado, em grade de rótulo pequeno e valor em mono. */
export function ResultStats({ items }: { items: ResultStat[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-5 border-t border-border pt-5 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-1">
          <dt className="font-sans text-caption text-muted-foreground">
            {item.label}
          </dt>
          <dd
            className={`font-mono text-subheading text-foreground ${item.strong ? "font-medium" : ""}`}
          >
            {item.value}
          </dd>
          {item.note ? (
            <dd className="font-sans text-caption text-muted-foreground">
              {item.note}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  )
}
