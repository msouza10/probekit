"use client"

import type { ReactNode } from "react"
import {
  siCloudflare,
  siGithub,
  siGo,
  siReact,
  siTailwindcss,
  siTerraform,
  siTypescript,
  siVite,
  type SimpleIcon,
} from "simple-icons"

interface Logo {
  name: string
  viewBox: string
  // Altura do logo; a largura segue a proporção do desenho.
  className: string
  shapes: ReactNode
}

// Só logos reais, todos em cor única (currentColor): ficam opacos e seguem o
// tema, claro ou escuro. Os da simple-icons cabem num quadrado de 24 unidades.
const fromSimpleIcons = (name: string, icon: SimpleIcon): Logo => ({
  name,
  viewBox: "0 0 24 24",
  className: "h-6",
  shapes: <path d={icon.path} />,
})

// Símbolo do Infisical (as duas voltas): são contornos, não áreas, por isso
// ficam com traço em vez de preenchimento.
const infisicalLoops = [
  "M553.632 381.22C533.755 410.306 501.28 450.058 462.327 485.3C411.038 531.702 357.602 562.005 313.064 562.005C214.431 562.005 134 481.453 134 381.502C134 281.552 214.431 201 313.064 201C358.2 201 409.518 229.12 459.031 273.365C497.879 308.079 531.147 348.732 553.632 381.22Z",
  "M599.187 381.097C637.731 435.284 672.832 479.658 709.665 511.711C750.413 547.171 791.204 565.731 839.441 565.731C937.703 565.731 1018 485.272 1018 385.229C1018 285.185 937.703 204.727 839.441 204.727C792.303 204.727 743.893 227.795 697.924 266.716C659.633 299.136 625.717 340.364 599.187 381.097Z",
]

const logos: Logo[] = [
  fromSimpleIcons("Go", siGo),
  fromSimpleIcons("React", siReact),
  fromSimpleIcons("TypeScript", siTypescript),
  fromSimpleIcons("Vite", siVite),
  fromSimpleIcons("Tailwind CSS", siTailwindcss),
  fromSimpleIcons("Terraform", siTerraform),
  {
    // O "O" da Oracle (anel arredondado), do catálogo Dashboard Icons: também
    // é contorno, então vai com traço.
    name: "Oracle Cloud",
    viewBox: "0 0 32 20",
    className: "h-5",
    shapes: (
      <path
        d="M10 2a8 8 0 1 0 0 16h12a8 8 0 1 0 0-16z"
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
      />
    ),
  },
  fromSimpleIcons("Cloudflare", siCloudflare),
  fromSimpleIcons("GitHub", siGithub),
  {
    name: "Infisical",
    viewBox: "91 158 970 451",
    className: "h-5",
    shapes: infisicalLoops.map((d) => (
      <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={86} />
    )),
  },
]

export default function LogoCloudBlock() {
  return (
    <section
      aria-label="Tecnologias do Probekit"
      className="flex w-full flex-col items-center bg-background text-foreground"
    >
      <style>{`
        @keyframes logo-cloud-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .logo-cloud-track {
          animation: logo-cloud-marquee 32s linear infinite;
        }
        .logo-cloud-mask:hover .logo-cloud-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .logo-cloud-track {
            animation: none;
          }
        }
      `}</style>

      <div className="w-full max-w-5xl text-center">
        <p className="font-sans text-caption font-medium tracking-[0.12em] text-muted-foreground uppercase">
          O que roda por baixo
        </p>

        <div className="logo-cloud-mask relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] motion-reduce:[mask-image:none]">
          <div className="logo-cloud-track flex w-max items-center motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-4">
            {[...logos, ...logos].map((logo, index) => (
              <div
                key={`${logo.name}-${index}`}
                className={`flex shrink-0 items-center gap-2.5 px-8 text-muted-foreground transition-colors duration-200 hover:text-foreground ${index >= logos.length ? "motion-reduce:hidden" : ""}`}
                aria-hidden={index >= logos.length ? "true" : undefined}
              >
                <svg
                  viewBox={logo.viewBox}
                  fill="currentColor"
                  className={`${logo.className} w-auto shrink-0`}
                  aria-hidden="true"
                >
                  {logo.shapes}
                </svg>
                <span className="text-lg font-medium tracking-tight whitespace-nowrap">
                  {logo.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
