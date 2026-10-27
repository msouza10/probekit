import { render } from "@testing-library/react"
import type { Element, ElementContent, Root } from "hast"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { ArticleBody } from "./ArticleBody"

const text = (value: string): ElementContent => ({ type: "text", value })
const el = (
  tagName: string,
  properties: Element["properties"] = {},
  ...children: ElementContent[]
): Element => ({ type: "element", tagName, properties, children })
const root = (...children: Element[]): Root => ({ type: "root", children })

function renderBody(tree: Root) {
  return render(
    <MemoryRouter>
      <ArticleBody tree={tree} />
    </MemoryRouter>,
  )
}

describe("ArticleBody", () => {
  it("renderiza títulos com o id que o sumário usa", () => {
    const { container } = renderBody(
      root(
        el("h2", { id: "primeiro-passo" }, text("Primeiro passo")),
        el("h3", { id: "detalhe" }, text("Detalhe")),
      ),
    )

    expect(container.querySelector("h2")?.id).toBe("primeiro-passo")
    expect(container.querySelector("h3")?.id).toBe("detalhe")
  })

  it("abre links externos em outra aba com rel=noreferrer", () => {
    const { getByRole } = renderBody(
      root(el("p", {}, el("a", { href: "https://probekit.cc" }, text("site")))),
    )
    const link = getByRole("link", { name: "site" })

    expect(link).toHaveAttribute("href", "https://probekit.cc")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noreferrer")
  })

  it("mantém links internos e âncoras na mesma aba", () => {
    const { getByRole } = renderBody(
      root(
        el(
          "p",
          {},
          el("a", { href: "/ping" }, text("ping")),
          el("a", { href: "#primeiro-passo" }, text("passo")),
        ),
      ),
    )

    expect(getByRole("link", { name: "ping" })).toHaveAttribute("href", "/ping")
    expect(getByRole("link", { name: "ping" })).not.toHaveAttribute("target")
    expect(getByRole("link", { name: "passo" })).not.toHaveAttribute("target")
  })

  describe("conteúdo perigoso na árvore", () => {
    it("não renderiza script, iframe nem style", () => {
      const { container } = renderBody(
        root(
          el("script", {}, text("alert(1)")),
          el("iframe", { src: "https://exemplo.com" }),
          el("style", {}, text("body{display:none}")),
          el("p", {}, text("texto que fica")),
        ),
      )

      expect(container.querySelector("script, iframe, style")).toBeNull()
      expect(container.textContent).toBe("texto que fica")
    })

    it("tira o href de um link javascript: e os atributos on*", () => {
      const { getByText } = renderBody(
        root(
          el(
            "p",
            {},
            el(
              "a",
              { href: "javascript:alert(1)", onClick: "alert(1)" },
              text("perigo"),
            ),
          ),
        ),
      )
      const link = getByText("perigo")

      expect(link).not.toHaveAttribute("href")
      expect(link).not.toHaveAttribute("onclick")
    })

    it("tira o src de uma imagem com protocolo perigoso", () => {
      const { container } = renderBody(
        root(el("img", { src: "javascript:alert(1)", alt: "x" })),
      )

      expect(container.querySelector("img")).not.toHaveAttribute("src")
    })
  })

  it("renderiza o diagrama pelo nome", () => {
    const { container } = renderBody(
      root(el("article-diagram", { name: "pipeline" })),
    )

    expect(container.querySelector("figure#pipeline")).not.toBeNull()
  })

  it("mantém o foco por teclado e as variáveis de tema do bloco de código", () => {
    const { container } = renderBody(
      root(
        el(
          "pre",
          {
            className: ["shiki"],
            tabIndex: 0,
            style: "--shiki-light-bg:#fff;--shiki-dark-bg:#000",
          },
          el("code", {}, text("const a = 1")),
        ),
      ),
    )
    const pre = container.querySelector("pre")!

    expect(pre).toHaveAttribute("tabindex", "0")
    expect(pre.classList.contains("shiki")).toBe(true)
    expect(pre.style.getPropertyValue("--shiki-light-bg")).toBe("#fff")
  })

  it("põe a tabela num contêiner que rola na horizontal", () => {
    const { container } = renderBody(
      root(
        el(
          "table",
          {},
          el("tbody", {}, el("tr", {}, el("td", {}, text("célula")))),
        ),
      ),
    )

    expect(
      container.querySelector("table")?.parentElement?.className,
    ).toContain("overflow-x-auto")
  })
})
