import type { VoucherItem } from "@/lib/api"
import { VoucherRow } from "./VoucherRow"

/**
 * As promoções em grade: uma coluna até o tablet e duas no computador (cada ingresso é largo), na ordem em que a API mandou (do mais novo ao mais antigo).
 */
export function VoucherList({
  items,
  today,
}: {
  items: VoucherItem[]
  today: Date
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {items.map((item) => (
        <VoucherRow key={item.id} item={item} today={today} />
      ))}
    </div>
  )
}
