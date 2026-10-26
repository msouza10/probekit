export type Point = { x: number; y: number }

/**
 * Amostra um path SVG feito só de M, V, H e Q absolutos (a gramática que os
 * diagramas usam), de 0,5 em 0,5 unidade nas retas e em 40 passos por curva.
 */
export function samplePath(d: string): Point[] {
  const tokens = d.match(/[MVHQ]|-?\d+(?:\.\d+)?/g) ?? []
  const points: Point[] = []
  let x = 0
  let y = 0
  let command = ""
  const along = (from: number, to: number) => {
    const steps = Math.max(1, Math.round(Math.abs(to - from) / 0.5))
    return Array.from(
      { length: steps },
      (_, k) => from + ((to - from) * (k + 1)) / steps,
    )
  }
  for (let i = 0; i < tokens.length;) {
    if (/[MVHQ]/.test(tokens[i])) command = tokens[i++]
    if (command === "M") {
      x = Number(tokens[i++])
      y = Number(tokens[i++])
      points.push({ x, y })
    } else if (command === "V") {
      const to = Number(tokens[i++])
      for (const value of along(y, to)) points.push({ x, y: value })
      y = to
    } else if (command === "H") {
      const to = Number(tokens[i++])
      for (const value of along(x, to)) points.push({ x: value, y })
      x = to
    } else if (command === "Q") {
      const [cx, cy, ex, ey] = tokens.slice(i, i + 4).map(Number)
      i += 4
      for (let k = 1; k <= 40; k++) {
        const t = k / 40
        points.push({
          x: (1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * ex,
          y: (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t * t * ey,
        })
      }
      x = ex
      y = ey
    }
  }
  return points
}

/** Início de um path: o ponto do `M`. */
export function startOf(d: string): Point {
  const match = /^M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/.exec(d)
  if (!match) throw new Error(`path sem M inicial: ${d}`)
  return { x: Number(match[1]), y: Number(match[2]) }
}

/**
 * Em que % do comprimento do path ele passa por `target` (primeira amostra a
 * menos de `tolerance` unidades). Lança erro se o path não passa por lá, para
 * uma mudança no desenho não deixar a cor do ponto errada em silêncio.
 */
export function percentAt(d: string, target: Point, tolerance = 0.75): number {
  const points = samplePath(d)
  let length = 0
  let found: number | null = null
  const cumulative = points.map((point, index) => {
    if (index > 0) {
      const prev = points[index - 1]
      length += Math.hypot(point.x - prev.x, point.y - prev.y)
    }
    return length
  })
  for (let i = 0; i < points.length; i++) {
    if (
      Math.hypot(points[i].x - target.x, points[i].y - target.y) <= tolerance
    ) {
      found = cumulative[i]
      break
    }
  }
  if (found === null)
    throw new Error(`o path não passa por (${target.x}, ${target.y}): ${d}`)
  return Math.round((found / length) * 1000) / 10
}
