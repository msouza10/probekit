import { ArrowUp } from "lucide-react"
import { motion } from "motion/react"
import { riseInView, useStaticMotion } from "@/lib/motion"
import { LogoMark, logoByName } from "@/components/icons/techLogos"
import { prose } from "./classes"

export interface Layer {
  name: string
  // Uma linha dizendo qual é o papel da camada.
  role: string
  detail: string
  // Nomes do catálogo de logos (techLogos); `label` sobrescreve o texto do chip.
  tech: { logo: string; label?: string }[]
}

const EASE = [0.22, 1, 0.36, 1] as const

function TechChip({ logo, label }: { logo: string; label?: string }) {
  return (
    <li className="inline-flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-muted-foreground transition-colors duration-200 hover:border-input hover:text-foreground">
      <LogoMark logo={logoByName(logo)} className="h-4" />
      <span className="font-sans text-body-sm text-foreground">
        {label ?? logo}
      </span>
    </li>
  )
}

function LayerBody({ layer }: { layer: Layer }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="font-sans text-body font-medium text-foreground">
          {layer.name}
        </h3>
        <p className="font-sans text-body-sm text-muted-foreground">
          {layer.role}
        </p>
      </div>
      <ul
        className="flex flex-wrap gap-2"
        aria-label={`Tecnologias: ${layer.name}`}
      >
        {layer.tech.map((item) => (
          <TechChip key={item.logo} {...item} />
        ))}
      </ul>
      <p className={prose}>{layer.detail}</p>
    </div>
  )
}

/**
 * Mapa das camadas do Probekit. As três primeiras (o que o visitante usa até
 * onde a API roda) ficam num trilho vertical: a linha se desenha uma vez e um
 * ponto desce por ela, como um pedido. A entrega fica fora do trilho, abaixo,
 * porque não é parte do caminho de um pedido: é o que publica as três.
 * Com movimento reduzido tudo aparece parado e sem o ponto.
 */
export function StackMap({
  layers,
  delivery,
}: {
  layers: Layer[]
  delivery: Layer
}) {
  const reduced = useStaticMotion()
  return (
    <div className="flex max-w-[40rem] flex-col gap-10">
      <ol className="relative flex flex-col gap-9 pl-9">
        <motion.span
          aria-hidden="true"
          className="absolute top-3 bottom-3 left-[4px] w-px origin-top bg-input"
          {...(reduced
            ? {}
            : {
                initial: { scaleY: 0 },
                whileInView: { scaleY: 1 },
                viewport: { once: true, amount: 0.1 },
                transition: { duration: 1.1, ease: EASE },
              })}
        />
        {!reduced ? (
          <motion.span
            aria-hidden="true"
            className="absolute left-0 size-[9px] rounded-full bg-highlight"
            initial={{ top: "0.5rem", opacity: 0 }}
            animate={{
              top: ["0.5rem", "calc(100% - 1.25rem)"],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 3.6,
              ease: "linear",
              repeat: Infinity,
              repeatDelay: 0.8,
              delay: 1.2,
            }}
          />
        ) : null}
        {layers.map((layer, index) => (
          <motion.li
            key={layer.name}
            className="relative"
            {...riseInView(reduced, index * 0.12)}
          >
            <span
              aria-hidden="true"
              className="absolute top-2 -left-9 size-[9px] rounded-full border border-input bg-background"
            />
            <LayerBody layer={layer} />
          </motion.li>
        ))}
      </ol>
      <motion.div
        className="flex flex-col gap-3 border-t border-border pt-8"
        {...riseInView(reduced)}
      >
        <p className="inline-flex items-center gap-2 font-sans text-caption font-medium tracking-[0.12em] text-muted-foreground uppercase">
          <ArrowUp aria-hidden="true" className="size-3.5" />
          Publica as três camadas acima
        </p>
        <LayerBody layer={delivery} />
      </motion.div>
    </div>
  )
}
