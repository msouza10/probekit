import { describe, expect, it } from "vitest"
import { timeAgo, timeAgoShort } from "./github"

const now = Date.parse("2026-10-26T12:00:00Z")
const ago = (ms: number) => new Date(now - ms).toISOString()

describe("timeAgoShort", () => {
  it("abrevia para caber em tela estreita", () => {
    expect(timeAgoShort(ago(20_000), now)).toBe("agora")
    expect(timeAgoShort(ago(12 * 60_000), now)).toBe("12min")
    expect(timeAgoShort(ago(5 * 3_600_000), now)).toBe("5h")
    expect(timeAgoShort(ago(3 * 86_400_000), now)).toBe("3d")
  })
})

describe("timeAgo", () => {
  it("diz 'agora' para menos de um minuto", () => {
    expect(timeAgo(ago(20_000), now)).toBe("agora")
  })

  it("usa minutos, horas e dias em português", () => {
    expect(timeAgo(ago(5 * 60_000), now)).toBe("há 5 minutos")
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe("há 3 horas")
    expect(timeAgo(ago(4 * 86_400_000), now)).toBe("há 4 dias")
  })

  it("diz 'ontem' para um dia", () => {
    expect(timeAgo(ago(86_400_000), now)).toBe("ontem")
  })
})
