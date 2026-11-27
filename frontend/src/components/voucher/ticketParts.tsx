import type { ReactNode } from "react"
import { Hourglass } from "lucide-react"
import type { VoucherItem } from "@/lib/api"
import {
  daysLeft,
  isEnded,
  promotionTypeLabel,
  remainingText,
} from "@/lib/vouchers"
import { FALLBACK_TYPE_ICON, TYPE_ICONS } from "./typeIcons"

/*
 * As peças do ingresso de voucher, usadas na lista (/voucher) e no destaque da
 * Home: o invólucro com o picote e os recortes, o numeral do desconto, o rótulo
 * do tipo e o carimbo do prazo. Assim os dois ficam sempre iguais.
 */

const stamp =
  "inline-flex w-fit items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[11px] leading-none tracking-[0.1em] whitespace-nowrap uppercase"

// Os dois recortes do ingresso, onde a linha tracejada encontra a borda do
// card (o card corta a metade de fora). No computador o picote é vertical; no
// celular, horizontal, entre o corpo e o canhoto.
const notch = "absolute h-5 w-5 rounded-full border border-border bg-background"

/**
 * O ingresso: corpo à esquerda, canhoto à direita (embaixo no celular), com o
 * picote tracejado e os recortes. `columns` é a classe da grade no computador,
 * por exemplo "lg:grid-cols-[minmax(0,1fr)_12rem]".
 */
export function TicketShell({
  as: Tag = "article",
  id,
  columns,
  className = "",
  body,
  stub,
}: {
  as?: "article" | "div"
  id?: string
  columns: string
  className?: string
  body: ReactNode
  stub: ReactNode
}) {
  return (
    <Tag
      id={id}
      className={`relative grid overflow-hidden rounded-lg border border-border bg-card ${columns} ${className}`}
    >
      <div className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">{body}</div>
      <aside
        className={`relative flex flex-wrap items-end justify-between gap-x-4 gap-y-4 border-t border-dashed border-foreground/40 p-5 sm:p-6 lg:flex-col lg:items-start lg:justify-between lg:border-t-0 lg:border-l`}
      >
        <span aria-hidden="true" className={`${notch} -top-2.5 -left-2.5`} />
        <span
          aria-hidden="true"
          className={`${notch} -top-2.5 -right-2.5 lg:top-auto lg:right-auto lg:-bottom-2.5 lg:-left-2.5`}
        />
        {stub}
      </aside>
    </Tag>
  )
}

/** "27/11": o dia da publicação, ou nada se a data falta ou é inválida. */
export function PublishedDate({ value }: { value: string | null }) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return (
    <time dateTime={value}>
      {date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
    </time>
  )
}

/** O tipo da promoção, em mono maiúsculo, com o ícone dele. */
export function TypeLabel({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type] ?? FALLBACK_TYPE_ICON
  return (
    <p className="flex w-full items-center gap-1.5 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {promotionTypeLabel(type)}
    </p>
  )
}

/** O número que o visitante procura: enorme, em serifa, no canhoto. */
export function Amount({ item }: { item: VoucherItem }) {
  if (item.discount_percent !== null) {
    return (
      <p className="flex flex-col leading-none">
        <span className="font-serif text-heading-lg leading-[0.9] tabular-nums text-foreground">
          {item.discount_percent}%
        </span>
        <span className="mt-1.5 font-sans text-caption text-muted-foreground">
          de desconto
        </span>
      </p>
    )
  }
  const text = item.discount_text?.trim()
  return text ? (
    <p className="font-serif text-subheading leading-tight text-foreground">
      {text}
    </p>
  ) : null
}

/** O carimbo: invertido (urgente), discreto (com folga) ou apagado (encerrado). */
export function Stamp({
  tone,
  children,
}: {
  tone: "urgent" | "calm" | "ended"
  children: ReactNode
}) {
  const colors =
    tone === "urgent"
      ? "border-foreground bg-foreground text-background"
      : "border-border text-muted-foreground"
  return <span className={`${stamp} ${colors}`}>{children}</span>
}

/** O carimbo do prazo: quanto falta (invertido quando é urgente) ou "Encerrado". */
export function Status({ item, today }: { item: VoucherItem; today: Date }) {
  if (isEnded(item, today)) return <Stamp tone="ended">Encerrado</Stamp>
  const days = daysLeft(item, today)
  if (days === null) return null
  return (
    <Stamp tone={days <= 3 ? "urgent" : "calm"}>
      <Hourglass aria-hidden="true" className="h-3 w-3" />
      {remainingText(days)}
    </Stamp>
  )
}
