/*
 * Tamanho de uma imagem de `public/` pelo destino escrito no markdown
 * (`/articles/a.png`), para `compileArticle` pôr `width` e `height` no `<img>`.
 * Destino externo, arquivo que não existe, que não é imagem ou que fica fora de
 * `public/` dá `null`: a imagem sai como estava.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { imageSize } from "image-size"

export function publicImageSize(publicDir: string) {
  const root = path.resolve(publicDir)
  return (src: string): { width: number; height: number } | null => {
    // Só destinos do próprio site: `/caminho`, sem `//host`.
    if (!src.startsWith("/") || src.startsWith("//")) return null
    const file = path.resolve(root, `.${src.split(/[?#]/)[0]}`)
    if (!file.startsWith(root + path.sep)) return null
    try {
      const { width, height } = imageSize(readFileSync(file))
      return width && height ? { width, height } : null
    } catch {
      return null
    }
  }
}
