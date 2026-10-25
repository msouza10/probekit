import type { CSSProperties } from "react"

// Peças de SVG compartilhadas pelos diagramas (ver a "linguagem visual" no
// comentário do ArchitectureDiagram): nome do bloco em 15 unidades do viewBox,
// secundário em 13.
export const NAME = 15
export const SUB = 13

export type Box = { x: number; y: number; w: number; h?: number }

export function delay(seconds: number): CSSProperties {
  return { animationDelay: `${seconds}s` }
}

// Seta aberta que termina em (x, y), apontando na direção `dir`.
export function arrow(dir: "right" | "down" | "up", x: number, y: number) {
  if (dir === "right") return `M${x - 6} ${y - 5} L${x} ${y} L${x - 6} ${y + 5}`
  if (dir === "down") return `M${x - 5} ${y - 6} L${x} ${y} L${x + 5} ${y - 6}`
  return `M${x - 5} ${y + 6} L${x} ${y} L${x + 5} ${y + 6}`
}

export type Line = { text: string; mono?: boolean }

export function Node({
  box,
  name,
  monoName = false,
  lines = [],
  gate = false,
  pulse,
  enter,
}: {
  box: Box
  name: string
  monoName?: boolean
  /** Linhas secundárias, de cima para baixo. */
  lines?: Line[]
  /** O portão pulsa e tem o fundo `muted`. */
  gate?: boolean
  /** Atraso da respiração da borda; sem ele (e sem `gate`) o bloco não respira. */
  pulse?: number
  /** Atraso da entrada do bloco. */
  enter: number
}) {
  const h = box.h ?? 64
  const cx = box.x + box.w / 2
  const breathes = gate || pulse !== undefined
  return (
    <g className="diagram-pop" style={delay(enter)}>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={h}
        rx={6}
        className={`${gate ? "fill-muted" : "fill-card"} stroke-border${breathes ? " diagram-pulse" : ""}`}
        style={pulse === undefined ? undefined : delay(pulse)}
      />
      <text
        x={cx}
        y={lines.length === 0 ? box.y + h / 2 + 5 : box.y + 27}
        textAnchor="middle"
        fontSize={NAME}
        className={`fill-foreground font-medium${monoName ? " font-mono" : ""}`}
      >
        {name}
      </text>
      {lines.map(({ text, mono }, index) => (
        <text
          key={text}
          x={cx}
          y={box.y + 46 + index * 18}
          textAnchor="middle"
          fontSize={SUB}
          className={`fill-muted-foreground${mono ? " font-mono" : ""}`}
        >
          {text}
        </text>
      ))}
    </g>
  )
}
