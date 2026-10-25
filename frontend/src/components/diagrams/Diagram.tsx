import type { ReactNode } from "react"
import { useDiagramMotion } from "./useDiagramMotion"

export type DiagramStep = { title: string; detail?: string; tag?: string }

type DiagramProps = {
  id: string
  title: string
  summary: string
  steps: DiagramStep[]
  children: ReactNode
}

/**
 * Ids que o `<svg>` filho deve usar: `aria-labelledby="{title} {summary}"`,
 * apontando para um `<title id>` e um `<desc id>` dentro do próprio svg.
 */
export function diagramIds(id: string) {
  return { title: `${id}-title`, summary: `${id}-summary` }
}

/**
 * Figura com duas versões do mesmo conteúdo: no celular a lista ordenada é o
 * diagrama vertical visível; de `sm` para cima a lista fica só para leitores
 * de tela e o svg largo (children) aparece. `data-motion` liga o CSS
 * `.diagram-*` (ver index.css).
 */
export function Diagram({ id, title, summary, steps, children }: DiagramProps) {
  const { ref, on } = useDiagramMotion()
  return (
    <figure
      ref={ref as React.RefObject<HTMLElement>}
      id={id}
      data-motion={on ? "on" : "off"}
      className="my-8"
    >
      <figcaption className="font-sans text-body-sm font-medium text-foreground">
        {title}
      </figcaption>
      <p className="mt-1 font-sans text-caption text-muted-foreground sm:sr-only">
        {summary}
      </p>
      <div className="mt-4 hidden sm:block">{children}</div>
      <ol className="mt-4 flex flex-col font-sans sm:sr-only">
        {steps.map((step, index) => (
          <li key={step.title} className="flex flex-col items-stretch">
            <div className="rounded-md border border-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-body-sm font-medium text-foreground">
                  {step.title}
                </span>
                {step.tag ? (
                  <span className="font-mono text-caption text-muted-foreground">
                    {step.tag}
                  </span>
                ) : null}
              </div>
              {step.detail ? (
                <p className="mt-1 text-caption text-muted-foreground">
                  {step.detail}
                </p>
              ) : null}
            </div>
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className="mx-auto h-5 w-px border-l border-dashed border-highlight"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </figure>
  )
}
