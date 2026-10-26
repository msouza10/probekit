import type { ReactNode } from "react"

/**
 * Um grupo de registros do resultado (por exemplo, MX): título pequeno em sans
 * com a contagem, e o conteúdo em mono logo abaixo. Grupos seguidos se separam
 * por uma linha fina; o primeiro não leva linha.
 */
export function RecordGroup({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <h3 className="font-sans text-caption font-medium text-muted-foreground">
        {title}
        {count !== undefined ? ` (${count})` : ""}
      </h3>
      <div className="flex flex-col gap-1 font-mono text-body-sm text-foreground">
        {children}
      </div>
    </section>
  )
}

/** Texto de grupo vazio ("Nenhum registro MX encontrado."). */
export function EmptyRecords({ children }: { children: ReactNode }) {
  return (
    <p className="font-sans text-body-sm text-muted-foreground">{children}</p>
  )
}
