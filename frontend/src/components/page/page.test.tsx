import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FactList, InfoPage, InfoSection, SourceLinks } from "./InfoPage"

describe("InfoPage", () => {
  it("monta h1, abertura e seções rotuladas pelo próprio título", () => {
    render(
      <InfoPage title="Sobre" intro={<p>abertura</p>}>
        <InfoSection id="a" title="Primeira" number="01">
          <p>conteúdo</p>
        </InfoSection>
      </InfoPage>,
    )
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sobre")
    expect(screen.getByText("abertura")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: /Primeira/ })).toBeInTheDocument()
    // O número é decorativo: não entra no nome da seção para leitores de tela.
    expect(screen.getByRole("heading", { level: 2 })).toHaveAccessibleName(
      "Primeira",
    )
  })
})

describe("FactList e SourceLinks", () => {
  it("lista termo e detalhe, e os links abrem em outra aba", () => {
    render(
      <>
        <FactList items={[{ term: "API", detail: "Go." }]} termWidth="10rem" />
        <SourceLinks sources={[{ href: "https://x.test/a", label: "Fonte" }]} />
      </>,
    )
    expect(screen.getByText("API").tagName).toBe("DT")
    expect(screen.getByText("Go.").tagName).toBe("DD")
    const link = screen.getByRole("link", { name: "Fonte" })
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noreferrer")
  })
})
