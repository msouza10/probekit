import type { ReactNode } from "react"
import { diagramIds } from "./diagramIds"
import { useDiagramMotion } from "./useDiagramMotion"

export type DiagramStep = { title: string; detail?: string; tag?: string }

type DiagramProps = {
  id: string
  title: string
  summary: string
  steps: DiagramStep[]
  children: (ids: { title: string; summary: string }) => ReactNode
}

/**
 * Figura com duas versões do mesmo conteúdo: no celular a lista ordenada é o
 * diagrama vertical visível; de `sm` para cima a lista fica só para leitores
 * de tela e o svg largo aparece. `data-motion` liga o CSS `.diagram-*` (ver
 * index.css).
 *
 * `children` é um render prop, chamado com os ids derivados de `id`
 * (`{ title, summary }`, de `diagramIds`). O svg devolvido deve ter
 * `role="img"` e `aria-labelledby={`${ids.title} ${ids.summary}`}`, com
 * `<title id={ids.title}>` e `<desc id={ids.summary}>` dentro.
 * Contrato de movimento: cada linha desenhada (`diagram-draw`) leva
 * `pathLength="1"`; `diagram-draw`, `diagram-pulse` e
 * `diagram-pop` vão em elementos diferentes (uma animação por elemento).
 */
export function Diagram({ id, title, summary, steps, children }: DiagramProps) {
  const { ref, on } = useDiagramMotion()
  return (
    <figure ref={ref} id={id} data-motion={on ? "on" : "off"} className="my-8">
      <figcaption className="font-sans text-body-sm font-medium text-foreground">
        {title}
      </figcaption>
      <p className="mt-1 font-sans text-caption text-muted-foreground sm:sr-only">
        {summary}
      </p>
      <div className="mt-4 hidden sm:block">{children(diagramIds(id))}</div>
      <ol role="list" className="mt-4 flex flex-col font-sans sm:sr-only">
        {steps.map((step, index) => (
          <li key={index} className="flex flex-col items-stretch">
            <div className="rounded-md border border-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono text-caption text-highlight">
                  {String(index + 1).padStart(2, "0")}
                </span>
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
                className="mx-auto flex flex-col items-center"
              >
                <span className="h-4 w-px bg-border" />
                <span className="-mt-1.5 size-2 rotate-45 border-r border-b border-highlight" />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </figure>
  )
}
