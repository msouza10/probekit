import type { VoucherItem } from "./api"
import { providerName } from "./providers"

/*
 * Funções puras da página /voucher e do aviso da Home. Datas de término vêm
 * como "AAAA-MM-DD" (sem hora): valem até o fim desse dia, no fuso de quem vê.
 */

/** `true` quando o dia de término já passou. Sem data de término, nunca encerra. */
export function isEnded(item: VoucherItem, today: Date): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(item.end_date ?? "")
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  const firstInstantAfter = new Date(year, month - 1, day + 1)
  return today.getTime() >= firstInstantAfter.getTime()
}

/**
 * Dias inteiros até o dia do término (0 = termina hoje, negativo = já acabou),
 * no fuso de quem vê. `null` sem data de término. Conta por dia de calendário,
 * então a virada do horário de verão não desloca o resultado.
 */
export function daysLeft(item: VoucherItem, today: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(item.end_date ?? "")
  if (!match) return null
  const [, year, month, day] = match.map(Number)
  const end = Date.UTC(year, month - 1, day)
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((end - now) / 86_400_000)
}

/** "termina hoje", "termina amanhã", "faltam 5 dias". */
export function remainingText(days: number): string {
  if (days === 0) return "termina hoje"
  if (days === 1) return "termina amanhã"
  return `faltam ${days} dias`
}

/** O prazo em uma ou duas palavras, para o carimbo do selo: "hoje", "amanhã", "5 dias". */
export function remainingShort(days: number): string {
  if (days === 0) return "hoje"
  if (days === 1) return "amanhã"
  return `${days} dias`
}

/**
 * Só http e https absolutos viram link. Diferente do `isSafeUrl` dos artigos, que
 * aceita caminhos relativos e `mailto:`: aqui o endereço vem de um site de fora.
 */
export function isSafeLink(url: string): boolean {
  // Caracteres de controle no endereço não são legítimos: a regex os recusa de propósito.
  // eslint-disable-next-line no-control-regex
  return /^https?:\/\/[^\s\u0000-\u001f]/i.test(url)
}

/** Nome do provider para mostrar ("AWS", "Google Cloud", "Tutorials Dojo"). */
export const vendorLabel = providerName

const TYPE_LABELS: Record<string, string> = {
  voucher: "Voucher",
  discount: "Desconto",
  free_exam: "Exame grátis",
  beta_exam: "Exame beta",
}

/** O tipo da promoção em português; o que não é conhecido vira "Promoção". */
export function promotionTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? "Promoção"
}

/** "2026-11-30" -> "30/11". */
export function formatDayMonth(isoDay: string): string {
  const match = /^\d{4}-(\d{2})-(\d{2})/.exec(isoDay)
  return match ? `${match[2]}/${match[1]}` : isoDay
}

/** "Até 30/11", "Terminou em 30/11" ou "Sem data de término". */
export function deadlineText(item: VoucherItem, ended: boolean): string {
  if (!item.end_date) return "Sem data de término"
  return `${ended ? "Terminou em" : "Até"} ${formatDayMonth(item.end_date)}`
}

const hasText = (value: string | null) => (value ?? "").trim() !== ""

/**
 * O voucher para o destaque da Home: o primeiro da lista (o mais novo) que tem
 * fornecedor e desconto **e ainda está ativo**. Passou do término, ele sai do
 * destaque; se um mais antigo ainda vale, ele ocupa o lugar.
 */
export function pickBannerItem(
  items: VoucherItem[],
  today: Date,
): VoucherItem | null {
  return (
    items.find(
      (i) =>
        hasText(i.vendor) && hasText(i.discount_text) && !isEnded(i, today),
    ) ?? null
  )
}
