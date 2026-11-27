import { useMemo } from "react"
import {
  ArrowDownUp,
  BadgePercent,
  Building2,
  CalendarClock,
  CalendarDays,
  Clock3,
  History,
  Hourglass,
  Infinity as InfinityIcon,
  Layers,
  Search,
  Tag,
  X,
} from "lucide-react"
import type { VoucherItem } from "@/lib/api"
import { providerId } from "@/lib/providers"
import {
  activeFilterCount,
  type DeadlineFilter,
  type SortKey,
  type VoucherFilters,
} from "@/lib/voucherFilters"
import { promotionTypeLabel, vendorLabel } from "@/lib/vouchers"
import { FilterMenu, type FilterOption } from "./FilterMenu"
import { ProviderLogo } from "./ProviderLogo"
import { FALLBACK_TYPE_ICON, TYPE_ICONS } from "./typeIcons"

const icon = "h-4 w-4"

const SORT_OPTIONS: FilterOption[] = [
  {
    value: "newest",
    label: "Mais recentes",
    icon: <Clock3 className={icon} />,
  },
  {
    value: "oldest",
    label: "Mais antigas",
    icon: <History className={icon} />,
  },
  {
    value: "discount",
    label: "Maior desconto",
    icon: <BadgePercent className={icon} />,
  },
  {
    value: "ending",
    label: "Termina primeiro",
    icon: <Hourglass className={icon} />,
  },
]

const DISCOUNT_OPTIONS: FilterOption[] = [
  { value: "0", label: "Qualquer desconto" },
  { value: "10", label: "10% ou mais" },
  { value: "25", label: "25% ou mais" },
  { value: "50", label: "50% ou mais" },
  { value: "75", label: "75% ou mais" },
  { value: "100", label: "100% (exame grátis)" },
]

const DEADLINE_OPTIONS: FilterOption[] = [
  {
    value: "any",
    label: "Qualquer prazo",
    icon: <CalendarDays className={icon} />,
  },
  {
    value: "7d",
    label: "Termina em 7 dias",
    icon: <Hourglass className={icon} />,
  },
  {
    value: "30d",
    label: "Termina em 30 dias",
    icon: <CalendarClock className={icon} />,
  },
  {
    value: "open",
    label: "Sem data de término",
    icon: <InfinityIcon className={icon} />,
  },
]

// A ordem fixa dos tipos na lista; só entram os que existem nos dados.
const TYPE_ORDER = ["voucher", "discount", "free_exam", "beta_exam", "other"]

/**
 * Tudo que filtra e ordena a lista: busca, ordenação, provider (com logo), tipo,
 * desconto mínimo, prazo, "Mostrar encerrados" e "Limpar filtros". As opções de
 * provider e de tipo saem dos próprios itens carregados.
 */
export function VoucherToolbar({
  items,
  filters,
  sort,
  onFilters,
  onSort,
  onClear,
}: {
  items: VoucherItem[]
  filters: VoucherFilters
  sort: SortKey
  onFilters: (change: Partial<VoucherFilters>) => void
  onSort: (sort: SortKey) => void
  onClear: () => void
}) {
  // Providers por frequência (o mais comum primeiro); "Google" e "GCP" contam juntos.
  const providerOptions = useMemo<FilterOption[]>(() => {
    const found = new Map<string, { vendor: string; count: number }>()
    for (const item of items) {
      const id = providerId(item.vendor)
      if (!id || !item.vendor) continue
      const entry = found.get(id)
      if (entry) entry.count += 1
      else found.set(id, { vendor: item.vendor, count: 1 })
    }
    return [
      {
        value: "",
        label: "Todos os providers",
        icon: <Layers className={icon} />,
      },
      ...[...found.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .map(([id, { vendor }]) => ({
          value: id,
          label: vendorLabel(vendor),
          icon: <ProviderLogo vendor={vendor} />,
        })),
    ]
  }, [items])

  const typeOptions = useMemo<FilterOption[]>(() => {
    const present = new Set(items.map((i) => i.promotion_type))
    return [
      { value: "", label: "Todos os tipos", icon: <Tag className={icon} /> },
      ...TYPE_ORDER.filter((type) => present.has(type)).map((type) => {
        const Icon = TYPE_ICONS[type] ?? FALLBACK_TYPE_ICON
        return {
          value: type,
          label: promotionTypeLabel(type),
          icon: <Icon className={icon} />,
        }
      }),
    ]
  }, [items])

  const active = activeFilterCount(filters)

  return (
    <div className="flex flex-col gap-3 border-y border-border py-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative block min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            aria-label="Buscar vouchers"
            placeholder="Buscar por título, certificação, provider ou código"
            value={filters.query}
            onChange={(event) => onFilters({ query: event.target.value })}
            className="h-12 w-full rounded-md border border-border bg-background pr-3 pl-10 font-sans text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </label>
        <FilterMenu
          label="Ordenar"
          icon={<ArrowDownUp />}
          value={sort}
          options={SORT_OPTIONS}
          onChange={(value) => onSort(value as SortKey)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
        <FilterMenu
          label="Provider"
          icon={<Building2 />}
          value={filters.provider}
          options={providerOptions}
          onChange={(provider) => onFilters({ provider })}
        />
        <FilterMenu
          label="Tipo"
          icon={<Tag />}
          value={filters.type}
          options={typeOptions}
          onChange={(type) => onFilters({ type })}
        />
        <FilterMenu
          label="Desconto"
          icon={<BadgePercent />}
          value={String(filters.minDiscount)}
          options={DISCOUNT_OPTIONS}
          onChange={(value) => onFilters({ minDiscount: Number(value) })}
        />
        <FilterMenu
          label="Prazo"
          icon={<CalendarDays />}
          value={filters.deadline}
          options={DEADLINE_OPTIONS}
          onChange={(value) => onFilters({ deadline: value as DeadlineFilter })}
        />
        <label className="col-span-2 inline-flex min-h-12 cursor-pointer items-center gap-2 font-sans text-sm text-muted-foreground has-checked:text-foreground sm:col-span-1 sm:ml-auto">
          <input
            type="checkbox"
            checked={filters.showEnded}
            onChange={(event) => onFilters({ showEnded: event.target.checked })}
            className="h-4 w-4 accent-[var(--color-highlight)]"
          />
          <History
            aria-hidden="true"
            className={`${icon} text-muted-foreground`}
          />
          Mostrar encerrados
        </label>
        {active > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-3 font-sans text-sm text-foreground underline decoration-border underline-offset-4 hover:bg-muted hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:col-span-1"
          >
            <X aria-hidden="true" className={icon} />
            Limpar filtros
          </button>
        ) : null}
      </div>
    </div>
  )
}
