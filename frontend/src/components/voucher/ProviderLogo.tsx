import type { ReactNode } from "react"
import { Building2 } from "lucide-react"
import {
  siCanonical,
  siCisco,
  siComptia,
  siDatabricks,
  siDocker,
  siElastic,
  siGoogle,
  siHashicorp,
  siLinuxfoundation,
  siNeo4j,
  siRedhat,
  siVmware,
  type SimpleIcon,
} from "simple-icons"
import { providerKey, type ProviderKey } from "@/lib/providers"

/*
 * Logos dos providers, todos em cor única (currentColor): seguem o tema, claro
 * ou escuro, e não competem com o conteúdo. A simple-icons não traz AWS,
 * Microsoft nem Oracle (retirados por marca registrada), então esses três são
 * desenhos do catálogo Dashboard Icons, redesenhados em cor única.
 */

interface Mark {
  viewBox: string
  shapes: ReactNode
}

// `viewBox` recortado no desenho de verdade (medido com getBBox): vários logos
// da simple-icons são largos e vêm num quadrado de 24 com muita folga em cima e
// embaixo, o que os deixaria minúsculos. Sem recorte, o quadrado inteiro.
const fromSimpleIcons = (icon: SimpleIcon, viewBox = "0 0 24 24"): Mark => ({
  viewBox,
  shapes: <path d={icon.path} />,
})

const MARKS: Record<ProviderKey, Mark> = {
  aws: {
    viewBox: "0 102.6 512 306.4",
    shapes: (
      <>
        <path d="M144.3 214.1c0 6.3.7 11.4 1.9 15.2 1.4 3.7 3.1 7.8 5.4 12.3.9 1.4 1.2 2.7 1.2 3.9 0 1.7-1 3.4-3.2 5.1l-10.7 7.2c-1.5 1-3.1 1.5-4.4 1.5-1.7 0-3.4-.9-5.1-2.4-2.4-2.6-4.4-5.3-6.1-8-1.7-2.9-3.4-6.1-5.3-10-13.3 15.7-30 23.5-50.1 23.5-14.3 0-25.7-4.1-34.1-12.3-8.3-8.2-12.6-19.1-12.6-32.7 0-14.5 5.1-26.2 15.5-35.1S60.8 169 78.4 169c5.8 0 11.7.5 18.1 1.4s12.8 2.2 19.6 3.7v-12.4c0-12.9-2.7-22-8-27.2-5.4-5.3-14.6-7.8-27.8-7.8-6 0-12.1.7-18.4 2.2s-12.4 3.4-18.4 5.8c-2.7 1.2-4.8 1.9-6 2.2s-2 .5-2.7.5c-2.4 0-3.6-1.7-3.6-5.3v-8.3c0-2.7.3-4.8 1.2-6s2.4-2.4 4.8-3.6c6-3.1 13.1-5.6 21.5-7.7 8.3-2.2 17.2-3.2 26.6-3.2 20.3 0 35.1 4.6 44.6 13.8 9.4 9.2 14.1 23.2 14.1 41.9v55.2h.3zM75.2 240c5.6 0 11.4-1 17.5-3.1 6.1-2 11.6-5.8 16.2-10.9 2.7-3.2 4.8-6.8 5.8-10.9s1.7-9 1.7-14.8v-7.2c-4.9-1.2-10.2-2.2-15.7-2.9-5.4-.7-10.7-1-16-1-11.4 0-19.8 2.2-25.4 6.8S51 207.1 51 215.6c0 8 2 14 6.3 18.1 4.1 4.2 10 6.3 17.9 6.3m136.7 18.4c-3.1 0-5.1-.5-6.5-1.7-1.4-1-2.6-3.4-3.6-6.6l-40-131.6c-1-3.4-1.5-5.6-1.5-6.8 0-2.7 1.4-4.3 4.1-4.3h16.7c3.2 0 5.4.5 6.6 1.7 1.4 1 2.4 3.4 3.4 6.6l28.6 112.7 26.6-112.7c.9-3.4 1.9-5.6 3.2-6.6 1.4-1 3.7-1.7 6.8-1.7H270c3.2 0 5.4.5 6.8 1.7 1.4 1 2.6 3.4 3.2 6.6l26.9 114.1 29.5-114.1c1-3.4 2.2-5.6 3.4-6.6 1.4-1 3.6-1.7 6.6-1.7h15.8c2.7 0 4.3 1.4 4.3 4.3 0 .9-.2 1.7-.3 2.7-.2 1-.5 2.4-1.2 4.3l-41 131.6q-1.5 5.1-3.6 6.6c-1.4 1-3.6 1.7-6.5 1.7h-14.6c-3.2 0-5.4-.5-6.8-1.7s-2.6-3.4-3.2-6.8l-26.4-109.8L236.7 250c-.9 3.4-1.9 5.6-3.2 6.8-1.4 1.2-3.7 1.7-6.8 1.7h-14.8zm218.8 4.6c-8.9 0-17.7-1-26.2-3.1-8.5-2-15.2-4.3-19.6-6.8-2.7-1.5-4.6-3.2-5.3-4.8s-1-3.2-1-4.8v-8.7c0-3.6 1.4-5.3 3.9-5.3 1 0 2 .2 3.1.5 1 .3 2.6 1 4.3 1.7 5.8 2.6 12.1 4.6 18.7 6 6.8 1.4 13.5 2 20.3 2 10.7 0 19.1-1.9 24.9-5.6s8.9-9.2 8.9-16.2c0-4.8-1.5-8.7-4.6-11.9s-8.9-6.1-17.2-8.9l-24.7-7.7c-12.4-3.9-21.6-9.7-27.2-17.4-5.6-7.5-8.5-15.8-8.5-24.7 0-7.2 1.5-13.5 4.6-18.9s7.2-10.2 12.3-14c5.1-3.9 10.9-6.8 17.7-8.9 6.8-2 14-2.9 21.5-2.9 3.7 0 7.7.2 11.4.7 3.9.5 7.5 1.2 11.1 1.9 3.4.9 6.6 1.7 9.7 2.7s5.4 2 7.2 3.1c2.4 1.4 4.1 2.7 5.1 4.3 1 1.4 1.5 3.2 1.5 5.6v8c0 3.6-1.4 5.4-3.9 5.4-1.4 0-3.6-.7-6.5-2q-14.55-6.6-32.7-6.6c-9.7 0-17.4 1.5-22.6 4.8s-8 8.2-8 15.2c0 4.8 1.7 8.9 5.1 12.1s9.7 6.5 18.7 9.4l24.2 7.7c12.3 3.9 21.1 9.4 26.4 16.3s7.8 15 7.8 23.8c0 7.3-1.5 14-4.4 19.8-3.1 5.8-7.2 10.9-12.4 15-5.3 4.3-11.6 7.3-18.9 9.5-8 2.5-16 3.7-24.7 3.7" />
        <path d="M462.9 345.7c-56 41.4-137.4 63.3-207.4 63.3-98.1 0-186.5-36.3-253.2-96.6-5.3-4.8-.5-11.2 5.8-7.5 72.2 41.9 161.3 67.3 253.4 67.3 62.2 0 130.4-12.9 193.3-39.5 9.3-4.2 17.3 6.2 8.1 13" />
        <path d="M486.2 319.2c-7.2-9.2-47.3-4.4-65.6-2.2-5.4.7-6.3-4.1-1.4-7.7 32-22.5 84.6-16 90.8-8.5 6.1 7.7-1.7 60.3-31.7 85.5-4.6 3.9-9 1.9-7-3.2 6.9-16.9 22.1-54.9 14.9-63.9" />
      </>
    ),
  },
  microsoft: {
    viewBox: "22.3 22.3 467.4 467.4",
    shapes: (
      <>
        <path d="M22.3 22.3h222.6v222.6H22.3z" />
        <path d="M267.1 22.3h222.6v222.6H267.1z" />
        <path d="M22.3 267.1h222.6v222.6H22.3z" />
        <path d="M267.1 267.1h222.6v222.6H267.1z" />
      </>
    ),
  },
  // O "G" do Google, que lê melhor que o logo do Cloud (uma nuvem cheia) em 16-32 px.
  google: fromSimpleIcons(siGoogle),
  cisco: fromSimpleIcons(siCisco, "0 5.67 24 12.65"),
  comptia: fromSimpleIcons(siComptia, "0 9.38 24 5.24"),
  hashicorp: fromSimpleIcons(siHashicorp),
  "linux-foundation": fromSimpleIcons(siLinuxfoundation),
  "red-hat": fromSimpleIcons(siRedhat, "0 2.92 24 18.16"),
  vmware: fromSimpleIcons(siVmware),
  canonical: fromSimpleIcons(siCanonical),
  oracle: {
    // O "O" da Oracle (anel arredondado): é contorno, então vai com traço.
    viewBox: "0 0 32 20",
    shapes: (
      <path
        d="M10 2a8 8 0 1 0 0 16h12a8 8 0 1 0 0-16z"
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
      />
    ),
  },
  docker: fromSimpleIcons(siDocker, "0 3.39 24 17.22"),
  elastic: fromSimpleIcons(siElastic),
  databricks: fromSimpleIcons(siDatabricks),
  neo4j: fromSimpleIcons(siNeo4j),
}

// A altura é fixa; a largura segue a proporção do desenho, com um teto para os
// logos muito largos (CompTIA, por exemplo) não estourarem o espaço.
const SIZES = {
  sm: { box: "h-4 w-4", wide: "h-4 w-auto max-w-10" },
  lg: { box: "h-8 w-8", wide: "h-8 w-auto max-w-16" },
}

function aspectRatio(viewBox: string): number {
  const [, , width, height] = viewBox.split(" ").map(Number)
  return width / height
}

/** O logo do provider em cor única, ou um prédio genérico se não há logo. */
export function ProviderLogo({
  vendor,
  size = "sm",
  className = "",
}: {
  vendor: string | null
  size?: keyof typeof SIZES
  className?: string
}) {
  const key = providerKey(vendor)
  if (!key) {
    return (
      <Building2
        data-provider="generic"
        aria-hidden="true"
        className={`${SIZES[size].box} shrink-0 ${className}`}
      />
    )
  }
  const mark = MARKS[key]
  const ratio = aspectRatio(mark.viewBox)
  return (
    <svg
      data-provider={key}
      viewBox={mark.viewBox}
      fill="currentColor"
      aria-hidden="true"
      style={{ aspectRatio: ratio }}
      className={`${ratio > 1.2 ? SIZES[size].wide : SIZES[size].box} shrink-0 ${className}`}
    >
      {mark.shapes}
    </svg>
  )
}
