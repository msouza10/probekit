import { motion } from "motion/react"
import { LogoMark, logos } from "@/components/icons/techLogos"
import { riseInView, useStaticMotion } from "@/lib/motion"

// Página inicial de cada tecnologia (a "página de hero" dela).
const homepages: Record<string, string> = {
  Go: "https://go.dev",
  React: "https://react.dev",
  TypeScript: "https://www.typescriptlang.org",
  Vite: "https://vite.dev",
  "Tailwind CSS": "https://tailwindcss.com",
  Terraform: "https://developer.hashicorp.com/terraform",
  "Oracle Cloud": "https://www.oracle.com/cloud/",
  Cloudflare: "https://www.cloudflare.com",
  GitHub: "https://github.com",
  Infisical: "https://infisical.com",
}

/**
 * Créditos: só os logos das tecnologias, cada um com o nome e um link para a
 * página inicial dela. Cor única, que clareia ao passar o mouse, quando o logo
 * também cresce, e fica assim enquanto o mouse estiver em cima (`.credit-logo`,
 * no index.css). Entram em sequência ao
 * rolar, parados com movimento reduzido.
 */
export function CreditsGrid() {
  const isStatic = useStaticMotion()
  return (
    <ul
      aria-label="Logotipos das tecnologias"
      className="grid max-w-[40rem] grid-cols-2 border-t border-l border-border sm:grid-cols-5"
    >
      {logos.map((logo, index) => (
        <motion.li
          key={logo.name}
          className="border-r border-b border-border"
          {...riseInView(isStatic, (index % 5) * 0.08)}
        >
          <a
            href={homepages[logo.name]}
            target="_blank"
            rel="noreferrer"
            className="credit-link flex min-h-28 flex-col items-center justify-center gap-3 px-3 py-5 text-center text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <span className="credit-logo flex h-6 items-center">
              <LogoMark logo={logo} />
            </span>
            <span className="font-sans text-body-sm text-foreground">
              {logo.name}
            </span>
          </a>
        </motion.li>
      ))}
    </ul>
  )
}
