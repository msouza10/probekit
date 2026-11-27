import type { VoucherItem } from "./api"
import { normalizeText, providerId, providerName } from "./providers"
import { daysLeft, isEnded } from "./vouchers"

/*
 * Filtros e ordenação da página /voucher, sem React. Os filtros se combinam
 * (E); a busca exige todas as palavras, em qualquer ordem.
 */

export type DeadlineFilter = "any" | "7d" | "30d" | "open"
export type SortKey = "newest" | "oldest" | "discount" | "ending"

export interface VoucherFilters {
  query: string
  provider: string
  type: string
  minDiscount: number
  deadline: DeadlineFilter
  showEnded: boolean
}

export const DEFAULT_FILTERS: VoucherFilters = {
  query: "",
  provider: "",
  type: "",
  minDiscount: 0,
  deadline: "any",
  showEnded: false,
}

/** Quantos filtros estão fora do padrão (a busca só com espaços não conta). */
export function activeFilterCount(filters: VoucherFilters): number {
  return [
    filters.query.trim() !== "",
    filters.provider !== "",
    filters.type !== "",
    filters.minDiscount > 0,
    filters.deadline !== "any",
    filters.showEnded,
  ].filter(Boolean).length
}

/** Tudo que a busca olha num item, já normalizado numa linha só. */
function searchable(item: VoucherItem): string {
  return normalizeText(
    [
      item.title,
      item.promotion_name,
      item.vendor ? providerName(item.vendor) : null,
      item.vendor,
      item.voucher_code,
      item.source_name,
      ...item.certifications,
      ...item.regions,
    ]
      .filter(Boolean)
      .join(" "),
  )
}

function matchesDeadline(
  item: VoucherItem,
  deadline: DeadlineFilter,
  today: Date,
): boolean {
  if (deadline === "any") return true
  if (deadline === "open") return item.end_date === null
  const days = daysLeft(item, today)
  return days !== null && days >= 0 && days <= (deadline === "7d" ? 7 : 30)
}

export function filterVouchers(
  items: VoucherItem[],
  filters: VoucherFilters,
  today: Date,
): VoucherItem[] {
  const words = normalizeText(filters.query).split(" ").filter(Boolean)
  return items.filter((item) => {
    if (!filters.showEnded && isEnded(item, today)) return false
    if (filters.provider && providerId(item.vendor) !== filters.provider)
      return false
    if (filters.type && item.promotion_type !== filters.type) return false
    if (
      filters.minDiscount > 0 &&
      (item.discount_percent === null ||
        item.discount_percent < filters.minDiscount)
    )
      return false
    if (!matchesDeadline(item, filters.deadline, today)) return false
    if (words.length > 0) {
      const text = searchable(item)
      if (!words.every((word) => text.includes(word))) return false
    }
    return true
  })
}

const time = (value: string | null): number | null => {
  if (!value) return null
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? null : t
}

/** Compara com "sem valor" sempre por último, qualquer que seja o sentido. */
function byNullable(
  a: number | null,
  b: number | null,
  direction: 1 | -1,
): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return (a - b) * direction
}

/** Uma cópia ordenada; empates mantêm a ordem de entrada (a da API). */
export function sortVouchers(
  items: VoucherItem[],
  sort: SortKey,
  today: Date,
): VoucherItem[] {
  const copy = [...items]
  switch (sort) {
    case "newest":
      return copy.sort((a, b) =>
        byNullable(time(a.published_at), time(b.published_at), -1),
      )
    case "oldest":
      return copy.sort((a, b) =>
        byNullable(time(a.published_at), time(b.published_at), 1),
      )
    case "discount":
      return copy.sort((a, b) =>
        byNullable(a.discount_percent, b.discount_percent, -1),
      )
    case "ending": {
      // Vigentes por data de término; sem data depois; encerrados por último.
      const rank = (i: VoucherItem) =>
        isEnded(i, today) ? 2 : i.end_date === null ? 1 : 0
      return copy.sort((a, b) => {
        const byRank = rank(a) - rank(b)
        if (byRank !== 0) return byRank
        return byNullable(daysLeft(a, today), daysLeft(b, today), 1)
      })
    }
  }
}
