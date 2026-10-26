import { act, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FactList, InfoPage, InfoSection, SourceLinks } from "./InfoPage"
import { CreditsGrid } from "./CreditsGrid"
import { StackMap } from "./StackMap"
import { AuthorCard } from "./AuthorCard"

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

describe("AuthorCard", () => {
  const base = { name: "Ana Lima", role: "Dev", bio: "Texto.", links: [] }

  it("usa a foto quando existe, com texto alternativo", () => {
    render(<AuthorCard author={{ ...base, photo: "/brand/ana.jpg" }} />)
    expect(
      screen.getByRole("img", { name: "Foto de Ana Lima" }),
    ).toHaveAttribute("src", "/brand/ana.jpg")
  })

  it("sem foto, mostra as iniciais escondidas dos leitores de tela", () => {
    render(<AuthorCard author={base} />)
    expect(screen.queryByRole("img")).toBeNull()
    expect(screen.getByText("AL")).toHaveAttribute("aria-hidden", "true")
  })
})

describe("StackMap", () => {
  const layer = (name: string, logo: string, label?: string) => ({
    name,
    role: `papel de ${name}`,
    detail: `detalhe de ${name}`,
    tech: [{ logo, label }],
  })

  it("mostra cada camada com seus chips e a entrega separada", () => {
    render(
      <StackMap
        layers={[layer("Site", "React", "React 19"), layer("API", "Go")]}
        delivery={layer("Entrega", "GitHub", "GitHub Actions")}
      />,
    )
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
    ).toEqual(["Site", "API", "Entrega"])
    expect(screen.getByText("React 19")).toBeInTheDocument()
    expect(screen.getByText("Go")).toBeInTheDocument()
    expect(screen.getByText(/Publica as três camadas/)).toBeInTheDocument()
    // Parado (sem IntersectionObserver): nenhum ponto viajante decorativo.
    expect(
      document.querySelectorAll("[aria-hidden='true']").length,
    ).toBeGreaterThan(0)
  })

  it("falha alto com um logo que não existe no catálogo", () => {
    expect(() =>
      render(
        <StackMap
          layers={[layer("X", "Inexistente")]}
          delivery={layer("Y", "Go")}
        />,
      ),
    ).toThrow(/logo desconhecido/)
  })
})

describe("CreditsGrid", () => {
  it("mostra só os logos das tecnologias, cada um com o nome", () => {
    render(<CreditsGrid />)
    const list = screen.getByRole("list", {
      name: "Logotipos das tecnologias",
    })
    const items = within(list).getAllByRole("listitem")
    expect(items.map((item) => item.textContent)).toEqual(
      expect.arrayContaining(["Go", "Oracle Cloud", "Cloudflare", "Infisical"]),
    )
    for (const item of items)
      expect(item.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })

  it("cada logo leva à página inicial da tecnologia, em outra aba", () => {
    render(<CreditsGrid />)
    const go = screen.getByRole("link", { name: "Go" })
    expect(go).toHaveAttribute("href", "https://go.dev")
    expect(go).toHaveAttribute("target", "_blank")
    expect(go).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
    for (const link of screen.getAllByRole("link"))
      expect(link.getAttribute("href")).toMatch(/^https:\/\//)
    expect(screen.getAllByRole("link")).toHaveLength(10)
  })
})
