import "@testing-library/jest-dom/vitest"

// jsdom doesn't implement ResizeObserver; Radix's NavigationMenu (and other
// size-aware primitives) use it to measure the active item/viewport.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??=
  ResizeObserverStub as unknown as typeof ResizeObserver
