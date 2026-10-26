import { act, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
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

describe("sumário Nesta página", () => {
  afterEach(() => vi.unstubAllGlobals())

  function renderPage() {
    return render(
      <InfoPage title="Sobre" intro={<p>abertura</p>}>
        <InfoSection id="primeira" title="Primeira seção">
          <p>a</p>
        </InfoSection>
        <InfoSection
          id="segunda"
          title="Uma segunda seção com título comprido"
          tocTitle="Segunda"
        >
          <p>b</p>
        </InfoSection>
      </InfoPage>,
    )
  }

  it("monta o sumário a partir das seções, com o nome curto quando houver", () => {
    renderPage()
    // Duas navegações com o mesmo nome (lateral e recolhida); o CSS mostra uma.
    const navs = screen.getAllByRole("navigation", { name: "Nesta página" })
    expect(navs).toHaveLength(2)
    for (const nav of navs) {
      const links = within(nav).getAllByRole("link")
      expect(links.map((a) => a.textContent)).toEqual([
        "Primeira seção",
        "Segunda",
      ])
      expect(links.map((a) => a.getAttribute("href"))).toEqual([
        "#primeira",
        "#segunda",
      ])
    }
    // Em tela estreita o sumário fica recolhido, para não empurrar o conteúdo.
    expect(navs[0].querySelector("details")).not.toHaveAttribute("open")
  })

  it("destaca a última seção que passou da linha de leitura, e nenhuma antes da primeira", () => {
    renderPage()
    const top = (id: string, value: number) =>
      vi
        .spyOn(
          document.getElementById(id) as HTMLElement,
          "getBoundingClientRect",
        )
        .mockReturnValue({ top: value } as DOMRect)
    const marked = () =>
      screen
        .getAllByRole("link", { current: "location" })
        .map((a) => a.textContent)

    // Rolou até a primeira seção chegar na linha; a segunda ainda está longe.
    top("primeira", 100)
    top("segunda", 900)
    act(() => {
      window.dispatchEvent(new Event("scroll"))
    })
    return waitFor(() =>
      expect(marked()).toEqual(["Primeira seção", "Primeira seção"]),
    )
      .then(() => {
        top("primeira", -700)
        top("segunda", 120)
        act(() => {
          window.dispatchEvent(new Event("scroll"))
        })
        return waitFor(() => expect(marked()).toEqual(["Segunda", "Segunda"]))
      })
      .then(() => {
        top("primeira", 300)
        top("segunda", 1200)
        act(() => {
          window.dispatchEvent(new Event("scroll"))
        })
        return waitFor(() =>
          expect(
            screen.queryAllByRole("link", { current: "location" }),
          ).toEqual([]),
        )
      })
  })
})
