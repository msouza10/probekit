import type { ReactNode } from "react"
import { Reveal } from "@/components/Reveal"

type ToolPageProps = {
  title: string
  description: string
  // Selo na linha do título, na ponta direita (por exemplo, a origem do teste).
  meta?: ReactNode
  children: ReactNode
}

/**
 * Esqueleto de toda página de ferramenta: título (com um selo curto na ponta
 * direita da linha, como a origem do teste), uma frase que diz o que a ferramenta faz e, abaixo,
 * o que a página trouxer (formulário e resultado). O ritmo vertical mora aqui
 * para as páginas não divergirem; quem usa não acrescenta margem própria.
 */
export function ToolPage({
  title,
  description,
  meta,
  children,
}: ToolPageProps) {
  return (
    <main className="flex flex-col gap-8 pt-10 pb-8 sm:gap-10 sm:pt-14">
      <Reveal className="flex flex-col gap-4">
        <div className="flex max-w-[44rem] flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h1 className="text-[2.125rem] leading-[1.12] font-medium tracking-[-0.02em] text-foreground sm:text-heading-lg">
            {title}
          </h1>
          {meta}
        </div>
        <p className="max-w-[36rem] text-body-lg text-muted-foreground">
          {description}
        </p>
      </Reveal>
      {children}
    </main>
  )
}
