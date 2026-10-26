import { useSyncExternalStore } from "react"
import {
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
} from "motion/react"

const EASE = [0.22, 1, 0.36, 1] as const

type MotionSet = {
  initial: TargetAndTransition
  animate: TargetAndTransition
  transition: Transition
}

/** Entrada suave: fade + blur leve + translate curto. Reduced: só fade. */
export function entrance(reduced: boolean, delay = 0): MotionSet {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.12, delay: 0 },
    }
  }
  return {
    initial: { opacity: 0, y: 14, filter: "blur(6px)" },
    animate: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transitionEnd: { filter: "none" },
    },
    transition: { duration: 0.5, delay, ease: EASE },
  }
}

export function routeTransition(reduced: boolean): MotionSet & {
  exit: TargetAndTransition
} {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.12 },
    }
  }
  return {
    initial: { opacity: 0, y: 12, filter: "blur(4px)" },
    animate: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transitionEnd: { filter: "none" },
    },
    exit: { opacity: 0, y: -8, filter: "blur(4px)" },
    transition: { duration: 0.35, ease: EASE },
  }
}

const noopSubscribe = () => () => {}

/**
 * Verdadeiro quando o ambiente tem IntersectionObserver. No servidor (build
 * pré-renderizado) e na hidratação vale `false`, para o HTML e a primeira
 * renderização do cliente coincidirem; depois o React troca para o valor real.
 */
export function useHasObserver(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof IntersectionObserver !== "undefined",
    () => false,
  )
}

/**
 * Verdadeiro quando o movimento deve ficar desligado: movimento reduzido ou
 * ambiente sem IntersectionObserver (jsdom, servidor, hidratação), onde
 * `whileInView` não funciona e o conteúdo precisa aparecer parado.
 */
export function useStaticMotion(): boolean {
  const reduced = useReducedMotion() ?? false
  const hasObserver = useHasObserver()
  return reduced || !hasObserver
}

/**
 * Props de entrada ao rolar (fade + subida curta), uma única vez. Parado, não
 * devolve nada: o elemento já nasce no estado final e nada observa a viewport.
 */
export function riseInView(isStatic: boolean, delay = 0) {
  if (isStatic) return {}
  return {
    initial: { opacity: 0, y: 12 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: 0.5, delay, ease: EASE },
  }
}
