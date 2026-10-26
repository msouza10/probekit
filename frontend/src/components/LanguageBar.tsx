import { cn } from "@/lib/utils"
import { formatPercent, type LanguageShare } from "@/lib/stats"

interface LanguageBarProps {
  shares: LanguageShare[]
  className?: string
}

// Do trecho maior para o menor: sem cor, a posição na barra e o tom dizem qual
// é qual, e o nome fica escrito na legenda.
const tones = [1, 0.72, 0.52, 0.38, 0.26]

const toneOf = (index: number) => tones[Math.min(index, tones.length - 1)]

/**
 * Barra de linguagens do repositório, em uma cor só. A legenda escreve nome e
 * porcentagem de cada trecho, então a barra nunca depende de cor para ser lida.
 */
export function LanguageBar({ shares, className }: LanguageBarProps) {
  return (
    <div
      role="group"
      aria-label="Linguagens do repositório"
      className={cn("flex flex-col gap-3", className)}
    >
      <div aria-hidden="true" className="flex h-1.5 gap-0.5">
        {shares.map((share, index) => (
          <div
            key={share.name}
            className="bg-foreground"
            style={{
              flexGrow: share.percent,
              flexBasis: 0,
              minWidth: 3,
              opacity: toneOf(index),
            }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-caption text-muted-foreground">
        {shares.map((share, index) => (
          <li key={share.name} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-4 bg-foreground"
              style={{ opacity: toneOf(index) }}
            />
            <span>
              <span className="text-foreground">{share.name}</span>{" "}
              {formatPercent(share.percent)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
