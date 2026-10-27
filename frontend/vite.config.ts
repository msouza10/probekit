import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"
import { diagramNames } from "./src/components/article/diagramNames.ts"
import { articlesPlugin } from "./vite/articlesPlugin.ts"

const srcDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "./src",
)

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss(), articlesPlugin({ diagramNames })],
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  server: {
    proxy: {
      "/api": {
        // A API só serve HTTPS; em dev ela usa um certificado autoassinado.
        target: "https://localhost:8443",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // O build SSR (src/entry-server.tsx) só alimenta scripts/prerender.mjs: fica
  // fora de dist/ e sem copiar public/.
  build: isSsrBuild
    ? { outDir: "node_modules/.prerender", copyPublicDir: false }
    : {},
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    // Renderiza as rotas no servidor uma vez para os testes de hidratação.
    globalSetup: "./scripts/ssrGlobalSetup.mjs",
    globals: true,
  },
}))
