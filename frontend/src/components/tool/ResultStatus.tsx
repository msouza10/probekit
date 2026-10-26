import {
  CircleAlert,
  CircleCheck,
  CircleX,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"

export type StatusTone = "up" | "down" | "notice"

const tones: Record<
  StatusTone,
  { icon: LucideIcon; color: string; role: "status" | "alert" }
> = {
  // Verde: o destino respondeu. Vermelho: o destino não respondeu (o problema
  // é dele). Cinza: a falha foi nossa ou do pedido, não do destino.
  up: { icon: CircleCheck, color: "text-status-up", role: "status" },
  down: { icon: CircleX, color: "text-status-down", role: "status" },
  notice: { icon: CircleAlert, color: "text-muted-foreground", role: "alert" },
}

type ResultStatusProps = {
  tone: StatusTone
  title: string
  children?: ReactNode
}

/**
 * A primeira coisa que o resultado de uma ferramenta diz: o veredicto, em uma
 * frase, com um ícone colorido. O sentido está sempre no texto; a cor só ajuda.
 */
export function ResultStatus({ tone, title, children }: ResultStatusProps) {
  const { icon: Icon, color, role } = tones[tone]
  return (
    <div role={role} className="flex flex-col gap-1.5">
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden="true"
          className={`mt-1 h-6 w-6 shrink-0 ${color}`}
          strokeWidth={2}
        />
        <h2 className="min-w-0 font-sans text-body-lg font-semibold tracking-normal break-words text-foreground">
          {title}
        </h2>
      </div>
      {children ? (
        <div className="pl-9 font-sans text-body-sm break-words text-muted-foreground">
          {children}
        </div>
      ) : null}
    </div>
  )
}
