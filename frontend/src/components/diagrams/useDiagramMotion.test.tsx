import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDiagramMotion } from "./useDiagramMotion"

// O estado de movimento reduzido do Motion é lido uma única vez por módulo,
// então o teste controla o hook por aqui em vez de trocar o matchMedia.
const reduced = vi.hoisted(() => ({ value: false }))
vi.mock("motion/react", () => ({ useReducedMotion: () => reduced.value }))

type Callback = (
  entries: Pick<IntersectionObserverEntry, "isIntersecting">[],
) => void

let fire: Callback | undefined
let threshold: number | number[] | undefined

function installObserver() {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: Callback, options?: IntersectionObserverInit) {
        fire = callback
        threshold = options?.threshold
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
}

function Probe() {
  const { ref, on } = useDiagramMotion()
  return (
    <section ref={ref} data-testid="probe">
      {String(on)}
    </section>
  )
}

describe("useDiagramMotion", () => {
  beforeEach(() => {
    reduced.value = false
    fire = undefined
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("fica desligado sem IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined)
    render(<Probe />)
    expect(screen.getByTestId("probe")).toHaveTextContent("false")
  })

  it("liga ao ficar visível e desliga ao sair da tela", () => {
    installObserver()
    render(<Probe />)
    expect(screen.getByTestId("probe")).toHaveTextContent("false")
    act(() => fire?.([{ isIntersecting: true }]))
    expect(screen.getByTestId("probe")).toHaveTextContent("true")
    act(() => fire?.([{ isIntersecting: false }]))
    expect(screen.getByTestId("probe")).toHaveTextContent("false")
  })

  it("observa com threshold 0.2", () => {
    installObserver()
    render(<Probe />)
    expect(threshold).toBe(0.2)
  })

  it("fica desligado com movimento reduzido, mesmo visível", () => {
    installObserver()
    reduced.value = true
    render(<Probe />)
    act(() => fire?.([{ isIntersecting: true }]))
    expect(screen.getByTestId("probe")).toHaveTextContent("false")
  })
})
