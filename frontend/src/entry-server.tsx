/*
 * Entrada do build SSR (`vite build --ssr`), usada só por `scripts/prerender.mjs`.
 * Renderiza o mesmo App do cliente numa URL fixa e devolve o HTML da página.
 */
import { StrictMode } from "react"
import { prerender } from "react-dom/static"
import { MemoryRouter } from "react-router-dom"
import App from "./App.tsx"
import { applyPageMeta } from "./lib/prerenderHtml"
import { metaFor, pages } from "./lib/siteMeta"

/** Rotas que viram arquivo próprio no build (a 404 é tratada à parte). */
export const routePaths = Object.keys(pages)

/** URL que não existe em nenhuma rota, para renderizar a view NotFound. */
export const NOT_FOUND_PATH = "/404"

/** HTML do corpo do app na URL; espera os `lazy()` resolverem. */
export async function renderBody(url: string): Promise<string> {
  const { prelude } = await prerender(
    <StrictMode>
      <MemoryRouter initialEntries={[url]}>
        <App />
      </MemoryRouter>
    </StrictMode>,
    // Sem isso, boundaries grandes (as páginas lazy) saem "outlined": o HTML
    // fica num <div hidden> revelado por um script inline, e sem JavaScript o
    // rastreador veria só o espaço reservado do fallback.
    { progressiveChunkSize: Infinity },
  )
  return new Response(prelude).text()
}

/** Página completa: o `template` (index.html do Vite) com head e corpo da rota. */
export async function renderPage(url: string, template: string) {
  return applyPageMeta(template, metaFor(url), await renderBody(url))
}
