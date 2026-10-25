/// <reference types="node" />
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

// O jsdom não carrega o index.css. Para conferir o estado dos elementos com o
// movimento desligado, os testes injetam as regras reais dos diagramas (o
// bloco `.diagram-*` do index.css, sem os @keyframes). Falha alto se os
// marcadores mudarem de lugar, em vez de injetar um trecho errado.
export function injectDiagramCss() {
  const css = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../../index.css"),
    "utf8",
  )
  const start = css.indexOf(".diagram-flow {")
  const end = css.indexOf("@keyframes diagram-flow")
  if (start === -1)
    throw new Error("marcador '.diagram-flow {' ausente no index.css")
  if (end === -1)
    throw new Error("marcador '@keyframes diagram-flow' ausente no index.css")
  if (end <= start) throw new Error("marcadores do index.css fora de ordem")
  const style = document.createElement("style")
  style.textContent = css.slice(start, end)
  document.head.append(style)
  return () => style.remove()
}
