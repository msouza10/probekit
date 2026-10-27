import { describe, expect, it, vi } from "vitest"
import { articlesPlugin } from "./articlesPlugin.ts"

// A primeira compilação de cada worker inicializa o shiki (temas e motor), o
// que passa dos 5 s padrão quando a suíte inteira roda em paralelo.
vi.setConfig({ testTimeout: 30_000 })

const source = `---
title: "Como o ping mede a latência"
description: "O que o tempo de ida e volta diz sobre a rede."
date: 2026-10-26
---

## Primeiro passo

Texto do artigo.
`

function run(id: string, code = source) {
  const plugin = articlesPlugin({ diagramNames: ["pipeline"] })
  const addWatchFile = vi.fn()
  const transform = plugin.transform as unknown as (
    this: { addWatchFile: typeof addWatchFile },
    code: string,
    id: string,
  ) => Promise<{ code: string } | null>
  return { addWatchFile, result: transform.call({ addWatchFile }, code, id) }
}

// O módulo gerado é JS de verdade: carrega e devolve os exports.
async function load(code: string) {
  const url = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  return (await import(/* @vite-ignore */ url)) as {
    meta: { slug: string; title: string; date: string }
    tree: { type: string }
    toc: { id: string; title: string }[]
    diagrams: string[]
  }
}

describe("articlesPlugin", () => {
  it("gera meta, tree, toc e diagrams para um artigo de content/artigos", async () => {
    const { result } = run("/repo/frontend/content/artigos/latencia-do-ping.md")
    const module = await load((await result)!.code)

    expect(module.meta).toMatchObject({
      slug: "latencia-do-ping",
      title: "Como o ping mede a latência",
      date: "2026-10-26",
    })
    expect(module.tree.type).toBe("root")
    expect(module.toc).toEqual([
      { id: "primeiro-passo", title: "Primeiro passo" },
    ])
    expect(module.diagrams).toEqual([])
  })

  it("com ?meta devolve só o meta, para a lista não carregar o corpo", async () => {
    const { result } = run(
      "/repo/frontend/content/artigos/latencia-do-ping.md?meta",
    )
    const code = (await result)!.code
    const module = await load(code)

    expect(module.meta.slug).toBe("latencia-do-ping")
    expect(code).not.toContain("export const tree")
    expect(code).not.toContain("Texto do artigo.")
  })

  it("ignora o que não é artigo", async () => {
    expect(await run("/repo/frontend/README.md").result).toBeNull()
    expect(await run("/repo/frontend/content/artigos/a.ts").result).toBeNull()
  })

  it("ignora a query do id e observa o arquivo para recarregar no dev", async () => {
    const { result, addWatchFile } = run(
      "/repo/frontend/content/artigos/latencia-do-ping.md?import",
    )

    expect(await result).not.toBeNull()
    expect(addWatchFile).toHaveBeenCalledWith(
      "/repo/frontend/content/artigos/latencia-do-ping.md",
    )
  })

  it("deixa o erro de conteúdo derrubar o build", async () => {
    const { result } = run("/repo/frontend/content/artigos/Ruim.md", source)

    await expect(result).rejects.toThrow("Ruim: slug inválido")
  })
})
