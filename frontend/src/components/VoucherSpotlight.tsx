import { ArrowRight, Ticket } from "lucide-react"
import { Link } from "react-router-dom"
import { Reveal } from "@/components/Reveal"
import { ProviderLogo } from "@/components/voucher/ProviderLogo"
import {
  Amount,
  PublishedDate,
  Status,
  TicketShell,
  TypeLabel,
} from "@/components/voucher/ticketParts"
import type { FeaturedVoucher } from "@/lib/useFeaturedVoucher"
import { deadlineText, vendorLabel } from "@/lib/vouchers"

/*
 * A seção "Voucher em destaque" da Home, abaixo da primeira tela: o ingresso
 * completo do voucher mais recente que ainda está ativo, igual ao da página
 * /voucher (a faixa do topo é o resumo dele). Quem
 * busca e escolhe o voucher é `useFeaturedVoucher`. Não tem botão de fechar: sai
 * sozinho quando a promoção termina.
 */

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

export function VoucherSpotlight({ featured }: { featured: FeaturedVoucher }) {
  const { item, today } = featured
  const where = [deadlineText(item, false), ...item.regions, item.source_name]
    .filter(Boolean)
    .join(" · ")

  return (
    <section
      aria-labelledby="voucher-destaque-title"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2
          id="voucher-destaque-title"
          className="type-eyebrow flex items-center gap-2 font-sans text-muted-foreground"
        >
          <Ticket aria-hidden="true" className="h-4 w-4" />
          Voucher em destaque
        </h2>
        <Link
          to="/voucher"
          className={`inline-flex min-h-11 items-center gap-2 text-body-sm text-foreground underline decoration-highlight/50 underline-offset-[0.2em] transition-colors hover:decoration-highlight ${focusRing}`}
        >
          Ver todos os vouchers
          <ArrowRight aria-hidden="true" className="h-4 w-4 text-highlight" />
        </Link>
      </div>

      <Reveal>
        <TicketShell
          as="div"
          columns="lg:grid-cols-[minmax(0,1fr)_17rem]"
          className="group transition-colors hover:border-foreground/40"
          body={
            <>
              <div className="flex items-center gap-3">
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
              </div>

              <h3 className="max-w-[26ch] text-heading-sm leading-[1.2] font-medium text-foreground sm:text-heading">
                <Link
                  to={`/voucher#${item.id}`}
                  className={`decoration-highlight underline-offset-[0.2em] group-hover:underline after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring`}
                >
                  {item.title}
                </Link>
              </h3>

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
                <Status item={item} today={today} />
                <span
                  aria-hidden="true"
                  className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-foreground"
                >
                  Ver voucher
                  <ArrowRight className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5" />
                </span>
              </div>
            </>
          }
        />
      </Reveal>
    </section>
  )
}
