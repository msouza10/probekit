/**
 * Ids que ligam o `<svg>` ao seu nome e à sua descrição. O `Diagram` os passa
 * ao render prop de `children`; use-os em `aria-labelledby="{title} {summary}"`
 * e em `<title id>` / `<desc id>` dentro do svg.
 */
export function diagramIds(id: string) {
  return { title: `${id}-title`, summary: `${id}-summary` }
}
