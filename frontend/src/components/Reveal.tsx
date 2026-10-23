import { motion, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"
import { entrance } from "@/lib/motion"

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
  // Sem IntersectionObserver (jsdom, navegadores antigos) o conteúdo fica visível.
  if (typeof IntersectionObserver === "undefined")
    return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={animate}
      viewport={{ once: true, amount: 0.08 }}
      transition={transition}
    >
      {children}
    </motion.div>
  )
}
