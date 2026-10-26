import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { JsonDisclosure } from "./JsonDisclosure"
import { OriginStrip } from "./OriginStrip"
import { EmptyRecords, RecordGroup } from "./RecordGroup"
import { ResultStats } from "./ResultStats"
import { ResultStatus } from "./ResultStatus"
import { ToolPage } from "./ToolPage"

vi.mock("@/lib/api", () => ({
  PROBE_PROVIDER_SHORT: "OCI",
  PROBE_LOCATION: "São Paulo",
}))

describe("ToolPage", () => {
  it("tem um h1, a descrição e o conteúdo da página", () => {
    render(
      <ToolPage title="Ping" description="Mede o tempo.">
        <p>conteúdo</p>
      </ToolPage>,
    )
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ping")
    expect(screen.getByText("Mede o tempo.")).toBeInTheDocument()
    expect(screen.getByText("conteúdo")).toBeInTheDocument()
    expect(screen.getByRole("main")).toBeInTheDocument()
  })

  it("põe o detalhe na mesma linha do título", () => {
    render(
      <ToolPage title="Ping" description="x" meta={<span>detalhe</span>}>
        <p>conteúdo</p>
      </ToolPage>,
    )
    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading.parentElement).toContainElement(screen.getByText("detalhe"))
  })
})

describe("OriginStrip", () => {
  it("usa o local fixo e troca pela região da resposta", () => {
    const { rerender, container } = render(<OriginStrip />)
    expect(screen.getByText("OCI · São Paulo")).toBeInTheDocument()
    rerender(<OriginStrip region="sa-saopaulo-1" />)
    expect(screen.getByText("OCI · sa-saopaulo-1")).toBeInTheDocument()
    // Selo com ícone de localização decorativo; o texto diz "Sonda:".
    expect(container.querySelector("[data-slot=badge]")).not.toBeNull()
    expect(screen.getByText("Sonda:")).toBeInTheDocument()
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })
})

describe("ResultStatus", () => {
  it.each([
    ["up", "text-status-up", "status"],
    ["down", "text-status-down", "status"],
    ["notice", "text-muted-foreground", "alert"],
  ] as const)("tom %s: ícone %s e role %s", (tone, color, role) => {
    render(<ResultStatus tone={tone} title="Título" />)
    const box = screen.getByRole(role)
    const icon = box.querySelector("svg")
    expect(icon).toHaveClass(color)
    expect(icon).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Título",
    )
  })
})

describe("ResultStats", () => {
  it("lista rótulo, valor e nota de cada número", () => {
    render(
      <ResultStats
        items={[
          { label: "Média", value: "12ms", strong: true },
          { label: "Perda", value: "20%", note: "4/5 recebidos" },
        ]}
      />,
    )
    expect(screen.getByText("Média").tagName).toBe("DT")
    expect(screen.getByText("12ms")).toHaveClass("font-medium")
    expect(screen.getByText("20%")).not.toHaveClass("font-medium")
    expect(screen.getByText("4/5 recebidos")).toBeInTheDocument()
  })
})

describe("JsonDisclosure", () => {
  it("começa fechado, abre e fecha, e copia mesmo fechado", async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, "writeText")
    render(<JsonDisclosure data={{ a: 1 }} />)
    const toggle = screen.getByRole("button", { name: "Ver JSON" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText(/"a": 1/)).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Copiar JSON" }))
    expect(writeText).toHaveBeenCalledWith('{\n  "a": 1\n}')
    expect(
      await screen.findByRole("button", { name: "Copiado!" }),
    ).toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText(/"a": 1/)).toBeInTheDocument()
  })
})

describe("RecordGroup", () => {
  it("mostra o título com a contagem e o conteúdo; o vazio fica em texto apagado", () => {
    render(
      <>
        <RecordGroup title="MX" count={2}>
          <p>mail.example.com</p>
        </RecordGroup>
        <RecordGroup title="NS" count={0}>
          <EmptyRecords>Nenhum registro NS encontrado.</EmptyRecords>
        </RecordGroup>
      </>,
    )
    expect(
      screen.getByRole("heading", { level: 3, name: "MX (2)" }),
    ).toBeInTheDocument()
    expect(screen.getByText("mail.example.com")).toBeInTheDocument()
    expect(screen.getByText("Nenhum registro NS encontrado.")).toHaveClass(
      "text-muted-foreground",
    )
  })
})
