import type { ReactNode } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"

/**
 * Monta o app em `container`. Se o HTML já veio pré-renderizado (build), o
 * React reaproveita esse DOM (`hydrateRoot`); sem conteúdo, como no `vite dev`,
 * renderiza do zero (`createRoot`).
 */
export function mount(container: HTMLElement, app: ReactNode) {
  if (container.hasChildNodes()) return hydrateRoot(container, app)
  const root = createRoot(container)
  root.render(app)
  return root
}
