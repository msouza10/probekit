import { act, render } from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import art from "@/assets/coruja-ascii.txt?raw"
import { AsciiOwl } from "./AsciiOwl"

const reduced = vi.hoisted(() => ({ value: false }))
vi.mock("motion/react", () => ({ useReducedMotion: () => reduced.value }))

type Callback = (
  entries: Pick<IntersectionObserverEntry, "isIntersecting">[],
) => void

let fire: Callback | undefined
let disconnected = 0

function installObserver() {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: Callback) {
        fire = callback
      }
      observe() {}
      unobserve() {}
      disconnect() {
        disconnected++
      }
    },
  )
}

const lines = art.replace(/\n$/, "").split("\n")
const ROW_MS = 16
const TICK_MS = 110

function renderOwl() {
  const view = render(<AsciiOwl className="extra" />)
  const pre = view.container.querySelector("pre") as HTMLPreElement
  return { ...view, pre }
}

function diffCount(a: string, b: string) {
  let n = 0
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) n++
  return n
}

function lcg(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe("AsciiOwl", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    reduced.value = false
    fire = undefined
    disconnected = 0
    installObserver()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("é decorativa e só aparece a partir de lg", () => {
    const { container, pre } = renderOwl()
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper).toHaveAttribute("aria-hidden", "true")
    expect(wrapper).toHaveClass("hidden", "lg:block", "extra")
    expect(pre).toHaveAttribute("aria-hidden", "true")
    expect(pre).toHaveClass("select-none", "pointer-events-none", "font-mono")
  })

  it("com movimento reduzido mostra a arte completa e não agenda timers", () => {
    reduced.value = true
    const { pre } = renderOwl()
    act(() => fire?.([{ isIntersecting: true }]))
    expect(pre.textContent).toBe(art.replace(/\n$/, ""))
    expect(vi.getTimerCount()).toBe(0)
  })

  it("sem IntersectionObserver mostra a arte completa e não agenda timers", () => {
    vi.stubGlobal("IntersectionObserver", undefined)
    const { pre } = renderOwl()
    expect(pre.textContent).toBe(art.replace(/\n$/, ""))
    expect(vi.getTimerCount()).toBe(0)
  })

  it("desenha de cima para baixo e termina com a arte completa", () => {
    const { pre } = renderOwl()
    expect(pre.textContent).toBe("")
    act(() => fire?.([{ isIntersecting: true }]))
    act(() => void vi.advanceTimersByTime(ROW_MS * 3))
    const early = pre.textContent ?? ""
    expect(early.length).toBeGreaterThan(0)
    expect(early.length).toBeLessThan(art.length / 4)
    expect(early.split("\n")).toEqual(lines.slice(0, early.split("\n").length))
    act(() => void vi.advanceTimersByTime(ROW_MS * (lines.length - 3)))
    expect(pre.textContent).toBe(art.replace(/\n$/, ""))
  })

  describe("depois do desenho", () => {
    function drawn() {
      const view = renderOwl()
      act(() => fire?.([{ isIntersecting: true }]))
      act(() => void vi.advanceTimersByTime(ROW_MS * (lines.length + 2)))
      return view
    }

    it("troca alguns caracteres e depois volta para perto do original", () => {
      const random = vi.spyOn(Math, "random").mockImplementation(lcg(7))
      const { pre } = drawn()
      const original = art.replace(/\n$/, "")
      act(() => void vi.advanceTimersByTime(TICK_MS * 5))
      const shimmering = diffCount(pre.textContent ?? "", original)
      expect(shimmering).toBeGreaterThan(1)
      // espaços da arte original nunca mudam
      const now = (pre.textContent ?? "").split("")
      original.split("").forEach((ch, i) => {
        if (ch === " " || ch === "\n") expect(now[i]).toBe(ch)
        else {
          const tones = "░▒▓█"
          expect(tones).toContain(now[i])
          expect(
            Math.abs(tones.indexOf(ch) - tones.indexOf(now[i])),
          ).toBeLessThanOrEqual(1)
        }
      })
      random.mockReturnValue(0)
      act(() => void vi.advanceTimersByTime(TICK_MS * 3))
      expect(diffCount(pre.textContent ?? "", original)).toBeLessThan(
        shimmering,
      )
    })

    it("não faz nada quando a coruja sai da tela", () => {
      vi.spyOn(Math, "random").mockImplementation(lcg(3))
      const { pre } = drawn()
      act(() => fire?.([{ isIntersecting: false }]))
      const frozen = pre.textContent
      act(() => void vi.advanceTimersByTime(TICK_MS * 10))
      expect(pre.textContent).toBe(frozen)
      expect(vi.getTimerCount()).toBe(0)
      act(() => fire?.([{ isIntersecting: true }]))
      act(() => void vi.advanceTimersByTime(TICK_MS * 3))
      expect(pre.textContent).not.toBe(frozen)
    })

    it("pausa com a aba escondida e retoma ao voltar, sem redesenhar", () => {
      vi.spyOn(Math, "random").mockImplementation(lcg(5))
      const { pre } = drawn()
      const hidden = vi
        .spyOn(document, "visibilityState", "get")
        .mockReturnValue("hidden")
      act(() => void document.dispatchEvent(new Event("visibilitychange")))
      expect(vi.getTimerCount()).toBe(0)
      hidden.mockReturnValue("visible")
      act(() => void document.dispatchEvent(new Event("visibilitychange")))
      act(() => void vi.advanceTimersByTime(TICK_MS * 2))
      expect((pre.textContent ?? "").split("\n").length).toBe(lines.length)
      expect(vi.getTimerCount()).toBe(1)
    })
  })

  it("pausa no meio do desenho e retoma sem encolher", () => {
    const { pre } = renderOwl()
    act(() => fire?.([{ isIntersecting: true }]))
    act(() => void vi.advanceTimersByTime(ROW_MS * 10))
    const rowsAt = () => (pre.textContent ?? "").split("\n").length
    const paused = rowsAt()
    expect(paused).toBeGreaterThanOrEqual(10)
    expect(paused).toBeLessThan(lines.length)
    act(() => fire?.([{ isIntersecting: false }]))
    act(() => void vi.advanceTimersByTime(ROW_MS * 10))
    expect(rowsAt()).toBe(paused)
    act(() => fire?.([{ isIntersecting: true }]))
    act(() => void vi.advanceTimersByTime(ROW_MS))
    expect(rowsAt()).toBeGreaterThanOrEqual(paused)
    act(() => void vi.advanceTimersByTime(ROW_MS * lines.length))
    expect(rowsAt()).toBe(lines.length)
  })

  it("visível duas vezes seguidas deixa um único timer", () => {
    renderOwl()
    act(() => fire?.([{ isIntersecting: true }]))
    act(() => fire?.([{ isIntersecting: true }]))
    expect(vi.getTimerCount()).toBe(1)
  })

  it("usa a última entrada quando o observador entrega várias de uma vez", () => {
    renderOwl()
    act(() => fire?.([{ isIntersecting: true }, { isIntersecting: false }]))
    expect(vi.getTimerCount()).toBe(0)
  })

  it("no StrictMode (monta, limpa, monta) fica com um timer e desenha", () => {
    const { container } = render(
      <StrictMode>
        <AsciiOwl />
      </StrictMode>,
    )
    const pre = container.querySelector("pre") as HTMLPreElement
    act(() => fire?.([{ isIntersecting: true }]))
    expect(vi.getTimerCount()).toBe(1)
    act(() => void vi.advanceTimersByTime(ROW_MS * (lines.length + 1)))
    expect((pre.textContent ?? "").split("\n")).toHaveLength(lines.length)
  })

  it.each([
    ["com movimento", false],
    ["estática", true],
  ])("reserva a altura final do pre (%s)", (_name, isReduced) => {
    reduced.value = isReduced
    const { pre } = renderOwl()
    // Sem isso o hero desloca enquanto a coruja é desenhada.
    // O jsdom simplifica o calc: 100cqw / colunas / 0.6 * 1.02 * linhas.
    const columns = Math.max(...lines.map((line) => line.length))
    const expected = ((100 / columns / 0.6) * 1.02 * lines.length).toFixed(2)
    const match = /([\d.]+)cqw/.exec(pre.style.minHeight)
    expect(match).not.toBeNull()
    expect(Number(match?.[1])).toBeCloseTo(Number(expected), 1)
    expect(pre.style.lineHeight).toBe("1.02")
  })

  describe("olhos e bico protegidos", () => {
    // Mantenha em sincronia com AsciiOwl.tsx.
    const rects = [
      { rows: [8, 15], cols: [82, 92] },
      { rows: [8, 16], cols: [101, 119] },
      { rows: [15, 19], cols: [99, 105] },
    ]
    const cells = rects.flatMap(({ rows, cols }) =>
      Array.from(
        { length: rows[1] - rows[0] + 1 },
        (_, i) => rows[0] + i,
      ).flatMap((y) =>
        Array.from({ length: cols[1] - cols[0] + 1 }, (_, j) => [
          y,
          cols[0] + j,
        ]),
      ),
    )

    it("cada retângulo está dentro da arte e tem caracteres visíveis", () => {
      const columns = Math.max(...lines.map((line) => line.length))
      for (const { rows, cols } of rects) {
        expect(rows[0]).toBeGreaterThanOrEqual(0)
        expect(rows[1]).toBeLessThan(lines.length)
        expect(cols[1]).toBeLessThan(columns)
        let visible = 0
        for (let y = rows[0]; y <= rows[1]; y++)
          for (let x = cols[0]; x <= cols[1]; x++)
            if ((lines[y][x] ?? " ") !== " ") visible++
        expect(visible).toBeGreaterThan(0)
      }
    })

    it.each([
      ["sempre 0", () => 0],
      ["sempre 0.999", () => 0.999],
      ["sequência fixa", lcg(11)],
    ])("a cintilação nunca altera essas células (%s)", (_n, rnd) => {
      vi.spyOn(Math, "random").mockImplementation(rnd)
      const { pre } = renderOwl()
      act(() => fire?.([{ isIntersecting: true }]))
      act(() => void vi.advanceTimersByTime(ROW_MS * (lines.length + 1)))
      expect(pre.textContent).toBe(art.replace(/\n$/, ""))
      for (let tick = 0; tick < 60; tick++) {
        act(() => void vi.advanceTimersByTime(TICK_MS))
        const now = (pre.textContent ?? "").split("\n")
        for (const [y, x] of cells)
          expect(now[y][x] ?? " ").toBe(lines[y][x] ?? " ")
      }
    })
  })

  describe("sorteio forçado sobre uma célula", () => {
    const wide = Math.max(...lines.map((line) => line.length))
    const firstTone: Record<string, string> = {
      "░": "▒",
      "▒": "░",
      "▓": "▒",
      "█": "▓",
    }
    const rects = [
      { rows: [8, 15], cols: [82, 92] },
      { rows: [8, 16], cols: [101, 119] },
      { rows: [15, 19], cols: [99, 105] },
    ]
    const inside = (y: number, x: number) =>
      rects.some(
        ({ rows, cols }) =>
          y >= rows[0] && y <= rows[1] && x >= cols[0] && x <= cols[1],
      )

    // Primeira célula visível dentro ou fora da região protegida.
    function firstCell(test: (y: number, x: number) => boolean) {
      for (let y = 0; y < lines.length; y++)
        for (let x = 0; x < lines[y].length; x++)
          if (lines[y][x] !== " " && test(y, x)) return [y, x] as const
      throw new Error("sem célula")
    }

    // Cada sorteio consome (linha, coluna, rampa); sem trocas pendentes não
    // há sorteios de retorno no meio, então a ordem se mantém alinhada.
    function aim(y: number, x: number) {
      const values = [(y + 0.5) / lines.length, (x + 0.5) / wide, 0]
      const hits = { picks: 0 }
      let n = 0
      vi.spyOn(Math, "random").mockImplementation(() => {
        const value = values[n % 3]
        if (n % 3 === 0) hits.picks++
        n++
        return value
      })
      return hits
    }

    function runAimed(y: number, x: number, ticks: number) {
      const hits = aim(y, x)
      const { pre } = renderOwl()
      act(() => fire?.([{ isIntersecting: true }]))
      act(() => void vi.advanceTimersByTime(ROW_MS * (lines.length + 1)))
      const seen: string[] = []
      for (let i = 0; i < ticks; i++) {
        act(() => void vi.advanceTimersByTime(TICK_MS))
        seen.push((pre.textContent ?? "").split("\n")[y][x])
      }
      return { hits, seen }
    }

    it.each(rects.map((rect, i) => [i, rect] as const))(
      "o sorteio mirado no retângulo %i não altera a célula",
      (_i, rect) => {
        const [y, x] = firstCell(
          (cy, cx) =>
            cy >= rect.rows[0] &&
            cy <= rect.rows[1] &&
            cx >= rect.cols[0] &&
            cx <= rect.cols[1],
        )
        const { hits, seen } = runAimed(y, x, 10)
        expect(hits.picks).toBeGreaterThan(0)
        for (const ch of seen) expect(ch).toBe(lines[y][x])
      },
    )

    it("controle: o mesmo sorteio numa célula fora dos retângulos troca o caractere", () => {
      const [y, x] = firstCell((cy, cx) => !inside(cy, cx))
      const { hits, seen } = runAimed(y, x, 2)
      expect(hits.picks).toBeGreaterThan(0)
      expect(seen[0]).toBe(firstTone[lines[y][x]])
      expect(seen[0]).not.toBe(lines[y][x])
    })
  })

  it("fora da tela, nada muda desde o início", () => {
    const { pre } = renderOwl()
    act(() => fire?.([{ isIntersecting: false }]))
    act(() => void vi.advanceTimersByTime(5000))
    expect(pre.textContent).toBe("")
  })

  it("ao desmontar limpa os timers e desconecta o observador", () => {
    const { unmount } = renderOwl()
    act(() => fire?.([{ isIntersecting: true }]))
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    expect(disconnected).toBe(1)
  })
})
