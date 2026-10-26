import { useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"

/**
 * Liga o movimento de um diagrama só enquanto ele está na tela e só se a
 * pessoa não pediu movimento reduzido. Sem IntersectionObserver (jsdom,
 * navegadores antigos) fica desligado: o diagrama aparece parado, no estado
 * final. Sair da tela desliga de novo, e o CSS pausa fora da vista.
 */
export function useDiagramMotion(): {
  ref: React.RefObject<HTMLElement | null>
  on: boolean
} {
  const ref = useRef<HTMLElement | null>(null)
  const reduced = useReducedMotion() ?? false
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === "undefined") return
    // Threshold 0.2: só começa quando uma parte razoável está à vista. Até o
    // primeiro callback `visible` é false, ou seja, tudo parado e completo.
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.2 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, on: visible && !reduced }
}
