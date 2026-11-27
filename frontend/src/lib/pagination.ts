/* A conta das páginas de uma lista que já está toda na memória. */

/** Quantas páginas são necessárias (0 para lista vazia). */
export function pageCount(total: number, pageSize: number): number {
  return total <= 0 ? 0 : Math.ceil(total / pageSize)
}

/** Os itens da página `page` (começa em 1). Página fora do intervalo vira a mais próxima. */
export function pageSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const last = Math.max(pageCount(items.length, pageSize), 1)
  const safe = Math.min(Math.max(page, 1), last)
  return items.slice((safe - 1) * pageSize, safe * pageSize)
}

/**
 * Os números a mostrar nos controles: a primeira, a última e a atual com uma
 * vizinha de cada lado, com "…" onde pula páginas. Um buraco de uma página só
 * mostra a própria página, porque as reticências ocupariam o mesmo lugar.
 */
export function pageWindow(page: number, total: number): Array<number | "…"> {
  if (total <= 0) return []
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const shown = [
    ...new Set(
      [1, total, page - 1, page, page + 1].filter((n) => n >= 1 && n <= total),
    ),
  ].sort((a, b) => a - b)

  const out: Array<number | "…"> = []
  shown.forEach((n, i) => {
    const previous = shown[i - 1]
    if (previous !== undefined && n - previous === 2) out.push(previous + 1)
    else if (previous !== undefined && n - previous > 2) out.push("…")
    out.push(n)
  })
  return out
}
