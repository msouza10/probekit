import { FactList, InfoSection } from "@/components/page/InfoPage"

/**
 * "Como ler o resultado": texto curto e estático no fim de uma página de
 * ferramenta. Explica o que cada dado significa e o que o teste não prova.
 * Fica sempre na página (também no HTML pré-renderizado), então quem chega por
 * uma busca encontra a explicação mesmo antes de usar a ferramenta.
 */
export function ToolNotes({
  id,
  items,
}: {
  id: string
  items: { term: string; detail: string }[]
}) {
  return (
    <div className="max-w-[44rem]">
      <InfoSection id={id} title="Como ler o resultado">
        <FactList items={items} termWidth="9rem" />
      </InfoSection>
    </div>
  )
}
