/*
 * Nomes que um artigo pode usar em `::diagram{name="..."}`. Fica num arquivo
 * sem React porque o `vite.config.ts` o lê (o plugin de artigos recusa nomes
 * fora desta lista no build); o mapa nome -> componente está em
 * `articleDiagrams.tsx`, que o TypeScript obriga a cobrir todos os nomes.
 */
export const diagramNames = [
  "arquitetura",
  "pipeline",
  "infraestrutura",
] as const

export type DiagramName = (typeof diagramNames)[number]
