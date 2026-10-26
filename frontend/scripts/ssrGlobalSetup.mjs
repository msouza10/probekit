/*
 * Setup global do vitest: renderiza as rotas no servidor UMA vez, num servidor
 * Vite à parte (processo principal), e entrega o HTML aos testes por `inject`.
 * Servidor e navegador precisam de cópias separadas do React e do React Router,
 * como no build real; na mesma cópia o prerender deixa o contexto do Router
 * sujo e a hidratação acusa "Router dentro de Router".
 */
import { createServer } from "vite"

export const ssrUrls = ["/", "/sobre", "/arquitetura", "/404"]

export default async function setup({ provide }) {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
    logLevel: "silent",
  })
  try {
    const { renderBody } = await server.ssrLoadModule("/src/entry-server.tsx")
    const html = {}
    for (const url of ssrUrls) html[url] = await renderBody(url)
    provide("ssrHtml", html)
  } finally {
    await server.close()
  }
}
