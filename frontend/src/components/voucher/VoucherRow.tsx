import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, Check, Copy } from "lucide-react"
import type { VoucherItem } from "@/lib/api"
import { deadlineText, isEnded, isSafeLink, vendorLabel } from "@/lib/vouchers"
import { ProviderLogo } from "./ProviderLogo"
import {
  Amount,
  Status,
  TicketShell,
  PublishedDate,
  TypeLabel,
} from "./ticketParts"

/*
 * Uma promoção, num card. De cima para baixo, na ordem de decisão: de quem é e
 * quanto falta, o que é, quanto vale, o que preciso para usar, e as letras
 * miúdas (prazo, região, fonte). Tudo que vem do coletor é texto: o título só
 * vira link quando o endereço é http(s).
 */

const titleLink =
  "group/title decoration-highlight underline-offset-[0.2em] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      // Sem permissão para a área de transferência: o código segue visível.
      return
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }

  const Icon = copied ? Check : Copy
  return (
    <div className="flex w-full flex-col gap-1">
      <button
        type="button"
        onClick={copy}
        aria-label={`Copiar código ${code}`}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-dashed border-foreground/40 bg-background px-3 text-foreground transition-colors hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:min-h-10"
      >
        <code className="min-w-0 font-mono text-body-sm tracking-wide break-all">
          {code}
        </code>
        <Icon
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 ${copied ? "text-status-up" : "text-muted-foreground"}`}
        />
      </button>
      <span
        role="status"
        className="min-h-4 font-sans text-caption text-status-up"
      >
        {copied ? "Código copiado" : ""}
      </span>
    </div>
  )
}

export function VoucherRow({
  item,
  today,
}: {
  item: VoucherItem
  today: Date
}) {
  const ended = isEnded(item, today)
  const where = [deadlineText(item, ended), ...item.regions, item.source_name]
    .filter(Boolean)
    .join(" · ")

  return (
    <TicketShell
      id={item.id}
      columns="lg:grid-cols-[minmax(0,1fr)_12rem]"
      className={`scroll-mt-[calc(var(--header-height)+16px)] ${ended ? "opacity-65" : ""}`}
      body={
        <>
          <header className="flex items-center gap-3">
            <ProviderLogo
              vendor={item.vendor}
              size="lg"
              className="text-foreground"
            />
            <p className="flex min-w-0 flex-col gap-0.5 font-sans text-caption text-muted-foreground">
              {item.vendor ? (
                <span className="type-eyebrow truncate text-foreground">
                  {vendorLabel(item.vendor)}
                </span>
              ) : null}
              <PublishedDate value={item.published_at} />
            </p>
          </header>

          <h2 className="text-subheading leading-snug font-medium text-foreground">
            {isSafeLink(item.url) ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={titleLink}
              >
                {item.title}
                <ArrowUpRight
                  aria-hidden="true"
                  className="ml-1.5 inline h-5 w-5 align-[-0.15em] text-muted-foreground group-hover/title:text-foreground"
                />
              </a>
            ) : (
              item.title
            )}
          </h2>

          {item.certifications.length > 0 ? (
            <ul role="list" className="flex flex-wrap gap-1.5">
              {item.certifications.map((cert) => (
                <li
                  key={cert}
                  className="rounded-sm border border-border bg-background px-2 py-1 font-mono text-[11px] leading-none text-foreground"
                >
                  {cert}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-auto pt-1 font-sans text-caption text-muted-foreground">
            {where}
          </p>
        </>
      }
      stub={
        <>
          <TypeLabel type={item.promotion_type} />
          <Amount item={item} />
          <div className="flex w-full flex-col gap-3">
            {item.voucher_code ? <CopyCode code={item.voucher_code} /> : null}
            <Status item={item} today={today} />
          </div>
        </>
      }
    />
  )
}
