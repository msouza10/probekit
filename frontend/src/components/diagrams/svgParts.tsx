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
  external = false,
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
  /** Ator fora do sistema (o cliente): fundo da página e traço de campo. */
  external?: boolean
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
        className={`${gate ? "fill-muted" : external ? "fill-background" : "fill-card"} ${external ? "stroke-input" : "stroke-border"}${breathes ? " diagram-pulse" : ""}`}
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

export type Cloud = "cloudflare" | "oracle"

// Cor de cada provedor: só na borda da zona e na bolinha do rótulo; o texto e
// os blocos ficam em cinza. O nome do provedor está sempre escrito no rótulo.
export const cloudStroke: Record<Cloud, string> = {
  cloudflare: "stroke-cloud-cloudflare",
  oracle: "stroke-cloud-oracle",
}
const cloudFill: Record<Cloud, string> = {
  cloudflare: "fill-cloud-cloudflare",
  oracle: "fill-cloud-oracle",
}

/**
 * Zona tracejada com rótulo no canto. Com `cloud`, a borda ganha a cor do
 * provedor e o rótulo uma bolinha da mesma cor.
 */
export function Zone({
  x,
  y,
  width,
  height,
  label,
  labelY,
  cloud,
}: {
  x: number
  y: number
  width: number
  height: number
  label: string
  /** Linha de base do rótulo. */
  labelY: number
  cloud?: Cloud
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={10}
        strokeDasharray="3 5"
        className={`fill-none ${cloud ? cloudStroke[cloud] : "stroke-input"}`}
      />
      {cloud ? (
        <circle
          cx={x + 19}
          cy={labelY - 4.5}
          r={4}
          className={cloudFill[cloud]}
        />
      ) : null}
      <text
        x={x + (cloud ? 31 : 14)}
        y={labelY}
        fontSize={SUB}
        className="fill-muted-foreground font-medium"
      >
        {label}
      </text>
    </g>
  )
}
