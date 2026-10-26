import { describe, expect, it } from "vitest"
import {
  lineCloud,
  lines,
  packetLinks,
  packetPaths,
  tintStops,
  type LineKey,
  type TintStop,
} from "./architectureGeometry"
import { percentAt, samplePath, startOf } from "./pathSampler"

// Cor do ponto numa posição do percurso (% do comprimento), pelos stops.
function colorAt(stops: TintStop[], percent: number) {
  let current = stops[0][0]
  for (const [cloud, from] of stops) if (percent >= from) current = cloud
  return current
}

describe("pathSampler", () => {
  it("mede um path de retas e curvas e acha onde ele passa por um ponto", () => {
    const d = "M0 0 H100 V100"
    expect(percentAt(d, { x: 100, y: 0 })).toBeCloseTo(50, 0)
    expect(percentAt(d, { x: 100, y: 100 })).toBeCloseTo(100, 0)
    expect(startOf("M12 34 H50")).toEqual({ x: 12, y: 34 })
    expect(samplePath("M0 0 Q10 0 10 10").at(-1)).toEqual({ x: 10, y: 10 })
  })

  it("falha alto se o path não passa pelo ponto", () => {
    expect(() => percentAt("M0 0 H10", { x: 50, y: 50 })).toThrow()
  })
})

describe("cor do ponto (ArchitectureDiagram)", () => {
  it("cada stop começa onde o ponto entra na ligação, e o primeiro em 0", () => {
    for (const path of ["frontend", "vm1", "vm2"] as const) {
      const stops = tintStops(path)
      expect(stops).toHaveLength(packetLinks[path].length)
      expect(stops[0][1]).toBe(0)
      const froms = stops.map(([, from]) => from)
      expect(froms).toEqual([...froms].sort((a, b) => a - b))
      packetLinks[path].forEach((key, index) => {
        expect(stops[index][0]).toBe(lineCloud[key])
      })
    }
  })

  it("os dois pontos da API trocam de cor nos mesmos lugares", () => {
    expect(tintStops("vm1")).toEqual(tintStops("vm2"))
  })

  it("o ponto tem a cor da ligação em todo o comprimento dela", () => {
    // O invariante que a primeira versão não tinha: em qualquer ponto de uma
    // ligação, a cor do ponto animado é a cor da própria linha.
    for (const path of ["frontend", "vm1", "vm2"] as const) {
      const stops = tintStops(path)
      for (const key of packetLinks[path] as LineKey[]) {
        const samples = samplePath(lines[key])
        // Ignora a ponta de cada ligação, onde o ponto entra e sai de um bloco.
        for (const point of samples
          .slice(2, -2)
          .filter((_, i) => i % 6 === 0)) {
          const percent = percentAt(packetPaths[path], point)
          expect(colorAt(stops, percent), `${path} em ${key}`).toBe(
            lineCloud[key],
          )
        }
      }
    }
  })

  it("o que sai do cliente é cinza e o resto leva a cor de quem envia", () => {
    expect(lineCloud.frontend).toBeUndefined()
    expect(lineCloud.backend).toBeUndefined()
    expect(lineCloud.entrega).toBe("cloudflare")
    expect(lineCloud.origem).toBe("cloudflare")
    expect(lineCloud.vm1).toBe("oracle")
    expect(lineCloud.vm2).toBe("oracle")
  })
})
