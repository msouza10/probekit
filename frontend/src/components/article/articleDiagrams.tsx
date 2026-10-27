import type { ComponentType } from "react"
import { ArchitectureDiagram } from "@/components/diagrams/ArchitectureDiagram"
import { InfrastructureDiagram } from "@/components/diagrams/InfrastructureDiagram"
import { PipelineDiagram } from "@/components/diagrams/PipelineDiagram"
import { type DiagramName, diagramNames } from "./diagramNames"

/**
 * Diagramas que um artigo pode incluir por nome. O tipo `Record<DiagramName, …>`
 * faz o TypeScript recusar um nome sem componente (e um componente sem nome).
 * Um diagrama novo é um componente novo, na linguagem visual de /arquitetura,
 * mais uma linha aqui e em `diagramNames.ts`.
 */
export const articleDiagrams: Record<DiagramName, ComponentType> = {
  arquitetura: ArchitectureDiagram,
  pipeline: PipelineDiagram,
  infraestrutura: InfrastructureDiagram,
}

const isDiagramName = (name: string): name is DiagramName =>
  (diagramNames as readonly string[]).includes(name)

/** O nó `::diagram{name="..."}` de um artigo; nome fora do registro é erro. */
export function ArticleDiagram({ name }: { name: string }) {
  if (!isDiagramName(name)) throw new Error(`diagrama desconhecido "${name}"`)
  const Diagram = articleDiagrams[name]
  return <Diagram />
}
