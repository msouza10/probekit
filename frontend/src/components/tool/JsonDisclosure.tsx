import { motion, useReducedMotion } from "motion/react"
import { useEffect, useId, useRef, useState } from "react"
import { Bench } from "@/components/Bench"
import { Button } from "@/components/ui/button"
import { entrance } from "@/lib/motion"

/**
 * O JSON bruto de uma resposta, escondido até a pessoa pedir. "Copiar" funciona
 * com o JSON fechado: quem só quer colar não precisa abrir. O painel abre com a
 * entrada padrão do site (`entrance`).
 */
export function JsonDisclosure({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const panelId = useId()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const json = JSON.stringify(data, null, 2)
  const { initial, animate, transition } = entrance(useReducedMotion() ?? false)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = () => {
    navigator.clipboard.writeText(json)
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 font-sans">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="min-h-11 sm:min-h-8"
        >
          {open ? "Ocultar JSON" : "Ver JSON"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copy}
          className="min-h-11 sm:min-h-8"
        >
          {copied ? "Copiado!" : "Copiar JSON"}
        </Button>
      </div>
      <div id={panelId}>
        {open ? (
          // Abre com a mesma entrada dos blocos da página; fechar é instantâneo.
          <motion.div
            initial={initial}
            animate={animate}
            transition={transition}
          >
            <Bench label="JSON">
              <pre className="text-[0.8125rem] leading-6 text-bench-foreground">
                {json}
              </pre>
            </Bench>
          </motion.div>
        ) : null}
      </div>
    </div>
  )
}
