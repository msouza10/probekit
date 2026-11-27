import { ArrowRight, BadgePercent, Hourglass } from "lucide-react"
import { Link } from "react-router-dom"
import { ProviderLogo } from "@/components/voucher/ProviderLogo"
import { Stamp } from "@/components/voucher/ticketParts"
import { providerKey } from "@/lib/providers"
import type { FeaturedVoucher } from "@/lib/useFeaturedVoucher"
import { daysLeft, remainingShort, vendorLabel } from "@/lib/vouchers"

/*
 * A linha do voucher no herói da Home, colada ao "Último artigo" e no mesmo tom
 * (mono, discreta, à esquerda): o rótulo "Voucher ativo" e, depois dele, o link
 * com o logo do provider, o desconto com cara de etiqueta de promoção (o selo de
 * porcentagem e "−50%") e o carimbo curto do prazo ("5 dias", "hoje"). Sem frase
 * além do rótulo. O nome acessível do link vem do próprio conteúdo (nome do provider
 * só para leitor de tela, "−50%", prazo), de modo que contém o texto visível. A
 * Home a posiciona fora do fluxo, na folga abaixo do herói, para ela aparecer
 * sem empurrar nada.
 */
export function VoucherLine({ featured }: { featured: FeaturedVoucher }) {
  const { item, today } = featured
  const days = daysLeft(item, today)
  const percent = item.discount_percent
  const amount = item.discount_text?.trim()
  // Sem logo cadastrado o ícone genérico não diz quem é: aí vale o nome.
  const hasLogo = providerKey(item.vendor) !== null

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-caption text-muted-foreground">
      <span>Voucher ativo</span>
      <span aria-hidden="true">·</span>
      <Link
        to={`/voucher#${item.id}`}
        className="group inline-flex h-10 max-w-full items-center gap-3 rounded-md border border-border bg-card px-3 text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:animate-[rise-in_160ms_ease-out]"
      >
        {hasLogo ? (
          <>
            <ProviderLogo vendor={item.vendor} className="text-foreground" />
            {/* O logo é decorativo: o nome do provider fica só para leitor de tela. */}
            <span className="sr-only">
              {vendorLabel(item.vendor ?? "")}
            </span>{" "}
          </>
        ) : (
          <span className="type-eyebrow truncate">
            {vendorLabel(item.vendor ?? "Voucher")}
          </span>
        )}
        <span
          aria-hidden="true"
          className="h-5 border-l border-dashed border-foreground/40"
        />
        {percent !== null || amount ? (
          <span className="flex items-center gap-1.5">
            <BadgePercent aria-hidden="true" className="h-5 w-5 shrink-0" />
            {percent !== null ? (
              <span className="font-serif text-xl leading-none font-semibold tabular-nums">
                −{percent}%
              </span>
            ) : (
              <span className="font-serif text-base leading-none font-semibold">
                {amount}
              </span>
            )}
          </span>
        ) : null}{" "}
        {days !== null && days >= 0 ? (
          <Stamp tone={days <= 3 ? "urgent" : "calm"}>
            <Hourglass aria-hidden="true" className="h-3 w-3" />
            {remainingShort(days)}
          </Stamp>
        ) : null}
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-safe:group-hover:translate-x-0.5"
        />
      </Link>
    </p>
  )
}
