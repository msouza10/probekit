import { useEffect, useState } from "react"

export type TocItem = { id: string; title: string }

// Linha de leitura, em px do topo da tela: logo abaixo do cabeçalho fixo.
const READING_LINE = 160

/**
 * Id da seção em destaque: a última cujo topo já passou da linha de leitura.
 * No fim da página, a última seção ganha, mesmo curta demais para chegar à
 * linha. Antes da primeira seção, nenhuma.
 */
export function useActiveId(items: TocItem[]) {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (items.length === 0) return
    let frame = 0

    const update = () => {
      frame = 0
      let current: string | null = null
      for (const item of items) {
        const top = document
          .getElementById(item.id)
          ?.getBoundingClientRect().top
        if (top !== undefined && top <= READING_LINE) current = item.id
      }
      const atEnd =
        window.scrollY > 0 &&
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 2
      setActive(atEnd ? items[items.length - 1].id : current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [items])

  return active
}
