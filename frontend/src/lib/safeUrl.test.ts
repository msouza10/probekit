import { describe, expect, it } from "vitest"
import { isSafeUrl } from "./safeUrl"

describe("isSafeUrl", () => {
  it.each([
    "https://probekit.cc/ping",
    "http://exemplo.com",
    "mailto:alguem@exemplo.com",
    "/artigos/um-artigo",
    "#secao",
    "pagina/relativa",
    "?busca=1",
  ])("aceita %s", (url) => {
    expect(isSafeUrl(url)).toBe(true)
  })

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "  javascript:alert(1)",
    "java\tscript:alert(1)",
    "java\nscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
  ])("recusa %j", (url) => {
    expect(isSafeUrl(url)).toBe(false)
  })
})
