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
import { pageName, SITE_URL, type PageMeta } from "./siteMeta"

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
 * As imagens a gravar em `dist/`: uma por página que tem imagem própria, em
 * `og/<nome>.png`, o mesmo caminho que `siteMeta.ts` usa no `og:image` dela. O
 * título é o da página sem o sufixo do site. Falha se duas páginas gerariam o
 * mesmo arquivo (um artigo com o slug de uma página fixa, por exemplo), em vez
 * de uma imagem sobrescrever a outra.
 */
export function ogTargets(pages: Record<string, PageMeta>) {
  const targets: { file: string; title: string }[] = []
  for (const page of Object.values(pages)) {
    if (!page.image?.startsWith(`${SITE_URL}/`)) continue
    const file = page.image.slice(SITE_URL.length + 1)
    if (targets.some((target) => target.file === file))
      throw new Error(`duas páginas gerariam a mesma imagem social: ${file}`)
    targets.push({ file, title: pageName(page) })
  }
  return targets
}

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
