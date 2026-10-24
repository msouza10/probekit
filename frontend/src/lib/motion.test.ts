import { describe, expect, it } from "vitest"
import { entrance, routeTransition } from "./motion"

describe("entrance", () => {
  it("starts transparent with opacity 0 when motion is allowed", () => {
    expect(entrance(false).initial).toMatchObject({ opacity: 0 })
  })
  it("translates at most 16px when motion is allowed", () => {
    const y = (entrance(false).initial as { y: number }).y
    expect(y).toBeGreaterThan(0)
    expect(y).toBeLessThanOrEqual(16)
  })
  it("blurs when motion is allowed", () => {
    expect((entrance(false).initial as { filter: string }).filter).toContain(
      "blur(",
    )
  })
  it("lasts between 0.2s and 0.6s when motion is allowed", () => {
    const d = (entrance(false).transition as { duration: number }).duration
    expect(d).toBeGreaterThanOrEqual(0.2)
    expect(d).toBeLessThanOrEqual(0.6)
  })
  it("passes the delay to the transition", () => {
    expect(entrance(false, 0.3).transition).toMatchObject({ delay: 0.3 })
  })
  it("releases the blur filter after the entrance so no stacking context stays", () => {
    const animate = entrance(false).animate as {
      transitionEnd?: { filter?: string }
    }
    expect(animate.transitionEnd).toEqual({ filter: "none" })
  })
  it("only fades when reduced motion is requested", () => {
    expect(entrance(true).initial).toEqual({ opacity: 0 })
  })
  it("lasts at most 0.15s when reduced motion is requested", () => {
    const d = (entrance(true).transition as { duration: number }).duration
    expect(d).toBeLessThanOrEqual(0.15)
  })
})

describe("routeTransition", () => {
  it("blurs and moves on enter and exit when motion is allowed", () => {
    const t = routeTransition(false)
    expect(t.initial).toMatchObject({ opacity: 0 })
    expect((t.initial as { filter: string }).filter).toContain("blur(")
    expect((t.exit as { filter: string }).filter).toContain("blur(")
    expect((t.transition as { duration: number }).duration).toBeLessThanOrEqual(
      0.6,
    )
  })
  it("only fades when reduced motion is requested", () => {
    const t = routeTransition(true)
    expect(t.initial).toEqual({ opacity: 0 })
    expect(t.exit).toEqual({ opacity: 0 })
    expect((t.transition as { duration: number }).duration).toBeLessThanOrEqual(
      0.15,
    )
  })
})
