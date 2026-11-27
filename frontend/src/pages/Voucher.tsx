import { useEffect, useMemo, useRef, useState } from "react"
import {
  CircleAlert,
  Inbox,
  LoaderCircle,
  RotateCw,
  SearchX,
} from "lucide-react"
import { useLocation } from "react-router-dom"
import { introText } from "@/components/page/classes"
import { Reveal } from "@/components/Reveal"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/voucher/Pagination"
import { VoucherList } from "@/components/voucher/VoucherList"
import { VoucherToolbar } from "@/components/voucher/VoucherToolbar"
import { getVouchers, type ApiError, type VoucherItem } from "@/lib/api"
import { pageCount, pageSlice } from "@/lib/pagination"
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  filterVouchers,
  sortVouchers,
  type SortKey,
  type VoucherFilters,
} from "@/lib/voucherFilters"
import { isEnded } from "@/lib/vouchers"

// A API entrega no máximo 50 por pedido e só pagina por cursor, sem total.
// A página busca todos os lotes e pagina aqui, o que também faz o filtro valer
// para a lista inteira. O teto de pedidos evita um laço se a API se perder.
const FETCH_SIZE = 50
const MAX_REQUESTS = 20
const PAGE_SIZE = 12

async function fetchAll(): Promise<VoucherItem[]> {
  const seen = new Set<string>()
  const items: VoucherItem[] = []
  let cursor: string | undefined
  for (let request = 0; request < MAX_REQUESTS; request += 1) {
    const data = await getVouchers({ limit: FETCH_SIZE, cursor })
    for (const item of data.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        items.push(item)
      }
    }
    if (!data.next_cursor) break
    cursor = data.next_cursor
  }
  return items
}

type Load =
  | { state: "loading" }
  | { state: "error"; error: ApiError }
  | { state: "ready" }

export default function Voucher() {
  const [load, setLoad] = useState<Load>({ state: "loading" })
  const [items, setItems] = useState<VoucherItem[]>([])
  const [filters, setFilters] = useState<VoucherFilters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<SortKey>("newest")
  const [page, setPage] = useState(1)
  const [scrollTo, setScrollTo] = useState<string | null>(null)
  const listTop = useRef<HTMLDivElement>(null)
  const handledHash = useRef("")
  const { hash } = useLocation()
  const today = useMemo(() => new Date(), [])

  const loadAll = () => {
    setLoad({ state: "loading" })
    fetchAll().then(
      (all) => {
        setItems(all)
        setLoad({ state: "ready" })
      },
      (error: ApiError) => setLoad({ state: "error", error }),
    )
  }

  useEffect(() => {
    loadAll()
  }, [])

  const visible = useMemo(
    () => sortVouchers(filterVouchers(items, filters, today), sort, today),
    [items, filters, sort, today],
  )
  const totalPages = pageCount(visible.length, PAGE_SIZE)
  const current = Math.min(page, Math.max(totalPages, 1))

  // /voucher#<id> (o link do aviso da Home): mostra o item, mesmo que esteja
  // encerrado, filtrado ou em outra página, e rola até ele.
  const ready = load.state === "ready"
  useEffect(() => {
    if (!ready || !hash || handledHash.current === hash) return
    handledHash.current = hash
    let id = hash.slice(1)
    try {
      id = decodeURIComponent(id)
    } catch {
      // Hash malformado: usa como veio.
    }
    const target = items.find((item) => item.id === id)
    if (!target) return
    const showEnded = filters.showEnded || isEnded(target, today)
    const reset = { ...DEFAULT_FILTERS, showEnded }
    const pool = sortVouchers(filterVouchers(items, reset, today), sort, today)
    setFilters(reset)
    setPage(Math.floor(pool.findIndex((i) => i.id === id) / PAGE_SIZE) + 1)
    setScrollTo(id)
  }, [ready, hash, items, filters.showEnded, sort, today])

  useEffect(() => {
    if (!scrollTo) return
    document.getElementById(scrollTo)?.scrollIntoView()
    setScrollTo(null)
  }, [scrollTo, current, filters, sort])

  const changePage = (next: number) => {
    setPage(next)
    listTop.current?.scrollIntoView?.({ block: "start" })
  }

  const changeFilters = (change: Partial<VoucherFilters>) => {
    setFilters((current) => ({ ...current, ...change }))
    setPage(1)
  }

  const changeSort = (next: SortKey) => {
    setSort(next)
    setPage(1)
  }

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  return (
    <main className="flex flex-col gap-10 pt-10 pb-8 sm:gap-12 sm:pt-14">
      <section
        aria-labelledby="voucher-title"
        className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end lg:gap-x-16"
      >
        <div className="flex flex-col gap-4">
          <Reveal>
            <h1
              id="voucher-title"
              className="max-w-[20ch] text-[2.125rem] leading-[1.12] font-medium tracking-[-0.02em] text-foreground sm:text-heading-lg"
            >
              Vouchers
            </h1>
          </Reveal>
          <Reveal delay={0.08}>
            <p className={introText}>Descontos de certificações.</p>
          </Reveal>
        </div>
        <Reveal delay={0.16}>
          <p className="border-l border-border pl-4 font-sans text-body-sm text-muted-foreground">
            Coletado dos blogs e feeds oficiais dos providers, de hora em hora.
            Confirme as condições na página original.
          </p>
        </Reveal>
      </section>

      {/* Carregando, erro e vazio reservam quase uma tela: o rodapé não aparece
          na primeira tela enquanto a lista carrega nem se move quando ela chega. */}
      {!ready || items.length === 0 ? (
        <div className="min-h-[80svh]">
          {load.state === "loading" ? (
            <p
              role="status"
              className="flex items-start gap-3 font-sans text-body-sm text-muted-foreground"
            >
              <LoaderCircle
                aria-hidden="true"
                className="h-5 w-5 motion-safe:animate-spin"
              />
              Carregando vouchers…
            </p>
          ) : null}

          {load.state === "error" ? (
            <div
              role="alert"
              className="flex max-w-[40rem] flex-col items-start gap-4"
            >
              <p className="flex items-start gap-3 text-body text-foreground">
                <CircleAlert
                  aria-hidden="true"
                  className="mt-1 h-5 w-5 shrink-0 text-muted-foreground"
                />
                {load.error.error}
              </p>
              <Button variant="outline" onClick={loadAll}>
                <RotateCw aria-hidden="true" />
                Tentar de novo
              </Button>
            </div>
          ) : null}

          {ready && items.length === 0 ? (
            <p className="flex max-w-[40rem] items-start gap-3 text-body text-muted-foreground">
              <Inbox aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
              Nenhum voucher encontrado por enquanto. O coletor roda de hora em
              hora.
            </p>
          ) : null}
        </div>
      ) : null}

      {ready && items.length > 0 ? (
        <>
          <div
            ref={listTop}
            className="scroll-mt-[calc(var(--header-height)+16px)]"
          >
            <VoucherToolbar
              items={items}
              filters={filters}
              sort={sort}
              onFilters={changeFilters}
              onSort={changeSort}
              onClear={clearFilters}
            />
          </div>

          {visible.length > 0 ? (
            <>
              <VoucherList
                items={pageSlice(visible, current, PAGE_SIZE)}
                today={today}
              />
              <Pagination
                page={current}
                totalPages={totalPages}
                onChange={changePage}
              />
            </>
          ) : (
            <p className="flex max-w-[40rem] items-start gap-3 text-body text-muted-foreground">
              <SearchX aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
              {activeFilterCount(filters) > 0
                ? "Nenhum resultado para esses filtros."
                : "Todas as promoções carregadas já terminaram. Marque “Mostrar encerrados” para vê-las."}
            </p>
          )}
        </>
      ) : null}
    </main>
  )
}
