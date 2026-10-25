import { useReducedMotion } from "motion/react"
import { useEffect, useRef } from "react"
import art from "@/assets/coruja-ascii.txt?raw"
import { cn } from "@/lib/utils"

const lines = art.replace(/\n+$/, "").split("\n")
const fullText = lines.join("\n")
const width = Math.max(...lines.map((line) => line.length))
const grid = lines.map((line) => line.padEnd(width, " ").split(""))

// Colunas da arte: o corpo da fonte sai daqui (ver `fit` abaixo).
const columns = width

const ramp = ".:-=+*#%@&MXAHSGB35"
const ROW_MS = 38
const SHIMMER_MS = 110
const SWAPS_PER_TICK = 90
const RETURN_CHANCE = 0.22

const pick = (n: number) => Math.floor(Math.random() * n)

/**
 * Desenha a arte linha a linha uma única vez e depois cintila: alguns
 * caracteres trocam por outro da rampa e voltam ao original. O texto do
 * `<pre>` é escrito direto no DOM; o React não renderiza os ~11 mil
 * caracteres a cada tick.
 */
export function AsciiOwl({ className }: { className?: string }) {
  const reduced = useReducedMotion() ?? false
  const preRef = useRef<HTMLPreElement>(null)
  const isStatic = reduced || typeof IntersectionObserver === "undefined"

  useEffect(() => {
    const pre = preRef.current
    if (!pre || isStatic) return

    let visible = false
    let phase: "draw" | "shimmer" = "draw"
    let rows = 0
    let timer: ReturnType<typeof setInterval> | undefined
    const swapped = new Map<number, string>()
    const current = grid.map((row) => row.slice())

    const stop = () => {
      clearInterval(timer)
      timer = undefined
    }

    const drawTick = () => {
      rows++
      pre.textContent = lines.slice(0, rows).join("\n")
      if (rows >= lines.length) {
        phase = "shimmer"
        sync()
      }
    }

    const shimmerTick = () => {
      // Primeiro devolve parte do que estava trocado, depois troca outros:
      // o que acabou de trocar fica visível por pelo menos um tick.
      for (const key of swapped.keys()) {
        if (Math.random() < RETURN_CHANCE) {
          const y = Math.floor(key / width)
          current[y][key % width] = grid[y][key % width]
          swapped.delete(key)
        }
      }
      for (let i = 0; i < SWAPS_PER_TICK; i++) {
        const y = pick(grid.length)
        const x = pick(width)
        if (grid[y][x] === " ") continue
        current[y][x] = ramp[pick(ramp.length)]
        swapped.set(y * width + x, current[y][x])
      }
      pre.textContent = current.map((row) => row.join("").trimEnd()).join("\n")
    }

    // Liga ou desliga o timer conforme a coruja e a aba estão visíveis.
    function sync() {
      stop()
      if (!visible || document.visibilityState === "hidden") return
      timer =
        phase === "draw"
          ? setInterval(drawTick, ROW_MS)
          : setInterval(shimmerTick, SHIMMER_MS)
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sync()
    })
    observer.observe(pre)
    document.addEventListener("visibilitychange", sync)

    return () => {
      stop()
      observer.disconnect()
      document.removeEventListener("visibilitychange", sync)
    }
  }, [isStatic])

  return (
    <div
      aria-hidden="true"
      className={cn("hidden [container-type:inline-size] lg:block", className)}
    >
      <pre
        ref={preRef}
        aria-hidden="true"
        className="pointer-events-none font-mono leading-[1.02] whitespace-pre text-muted-foreground select-none"
        style={{ fontSize: `calc(100cqw / ${columns} / 0.6)` }}
      >
        {isStatic ? fullText : null}
      </pre>
    </div>
  )
}
