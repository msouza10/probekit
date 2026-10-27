/*
 * Imagem de pré-visualização social (Open Graph) de um artigo: PNG 1200×630 com
 * o título e o endereço do site, nas cores e fontes do Probekit. Código só de
 * Node, usado no build (`entry-server.tsx` -> `scripts/prerender.mjs`); não
 * entra no JavaScript do navegador. O satori desenha o texto como caminhos no
 * SVG, então o resvg não precisa de fontes instaladas no computador.
 */
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { Resvg } from "@resvg/resvg-js"
import satori from "satori"
import type { ArticleMeta } from "./articles"

const WIDTH = 1200
const HEIGHT = 630

// Tokens do tema claro (src/index.css): --background, --foreground e --muted-foreground.
const BACKGROUND = "#fafafa"
const FOREGROUND = "#171717"
const MUTED = "#595959"

const require = createRequire(import.meta.url)
const fontFile = (path: string) => readFileSync(require.resolve(path))

// O satori lê ttf, otf e woff (não woff2 nem fontes variáveis): usamos as
// versões estáticas, de peso 500, dos pacotes @fontsource.
let fonts: Parameters<typeof satori>[1]["fonts"] | undefined
function loadFonts() {
  fonts ??= [
    {
      name: "Newsreader",
      data: fontFile(
        "@fontsource/newsreader/files/newsreader-latin-500-normal.woff",
      ),
      weight: 500,
      style: "normal",
    },
    {
      name: "Inter",
      data: fontFile("@fontsource/inter/files/inter-latin-500-normal.woff"),
      weight: 500,
      style: "normal",
    },
  ]
  return fonts
}

const layout = (title: string) => ({
  type: "div",
  props: {
    style: {
      width: "100%",
      height: "100%",
      // Sem isto o satori soma o padding por fora dos 100% (fundo de 1360×790,
      // título fora da margem e rodapé fora da imagem).
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: 80,
      background: BACKGROUND,
      color: FOREGROUND,
    },
    children: [
      {
        type: "div",
        props: {
          style: {
            fontFamily: "Newsreader",
            fontSize: 76,
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            // Até 3 linhas; o que passar vira reticências.
            lineClamp: 3,
          },
          children: title,
        },
      },
      {
        type: "div",
        props: {
          style: {
            fontFamily: "Inter",
            fontSize: 32,
            color: MUTED,
          },
          children: "probekit.cc",
        },
      },
    ],
  },
})

/**
 * As imagens a gravar em `dist/`: uma por artigo, em `og/<slug>.png`, o mesmo
 * caminho que `siteMeta.ts` usa no `og:image` da página do artigo.
 */
export const ogTargets = (list: ArticleMeta[]) =>
  list.map((article) => ({
    file: `og/${article.slug}.png`,
    title: article.title,
  }))

/** O SVG da imagem; separado do PNG para os testes olharem o layout. */
export function ogSvg(title: string): Promise<string> {
  return satori(layout(title) as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: loadFonts(),
  })
}

export async function renderOgImage(title: string): Promise<Uint8Array> {
  const svg = await ogSvg(title)
  return new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } })
    .render()
    .asPng()
}
