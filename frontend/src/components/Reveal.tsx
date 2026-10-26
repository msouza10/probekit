import { motion, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"
import { entrance, useHasObserver } from "@/lib/motion"

type RevealProps = {
  delay?: number
  className?: string
  children: ReactNode
}

/** Entra ao rolar para a viewport, uma única vez. */
export function Reveal({ delay = 0, className, children }: RevealProps) {
  const { initial, animate, transition } = entrance(
    useReducedMotion() ?? false,
    delay,
  )
  // Sem IntersectionObserver (jsdom, servidor, hidratação) o conteúdo fica
  // visível e parado: o mesmo `motion.div`, só sem as props de animação.
  const animated = useHasObserver()
  return (
    <motion.div
      className={className}
      {...(animated
        ? {
            initial,
            whileInView: animate,
            viewport: { once: true, amount: 0.08 },
            transition,
          }
        : {})}
    >
      {children}
    </motion.div>
  )
}
