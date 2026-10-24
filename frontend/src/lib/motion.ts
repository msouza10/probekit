import type { TargetAndTransition, Transition } from "motion/react"

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
