import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ProviderLogo } from "./ProviderLogo"

/* O logo do provider: um desenho decorativo em cor única, ou um ícone genérico. */

const marca = (vendor: string | null) => {
  const { container } = render(<ProviderLogo vendor={vendor} />)
  return container.querySelector("svg")
}

describe("ProviderLogo", () => {
  it.each([
    ["aws", "aws"],
    ["Microsoft Azure", "microsoft"],
    ["Google Cloud", "google"],
    ["Oracle", "oracle"],
    ["cisco", "cisco"],
    ["Red Hat", "red-hat"],
  ])("%s mostra o logo de %s", (vendor, chave) => {
    const svg = marca(vendor)

    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute("data-provider", chave)
  })

  it("é decorativo: escondido de leitores de tela", () => {
    expect(marca("aws")).toHaveAttribute("aria-hidden", "true")
  })

  it("segue a cor do texto (cor única), sem cor própria", () => {
    const svg = marca("google")

    expect(svg?.getAttribute("fill")).toBe("currentColor")
  })

  it("provider desconhecido, vazio ou ausente cai no ícone genérico", () => {
    for (const vendor of ["Tutorials Dojo", "", null]) {
      expect(marca(vendor)).toHaveAttribute("data-provider", "generic")
    }
  })
})
