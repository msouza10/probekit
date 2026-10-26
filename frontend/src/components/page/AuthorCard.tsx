import { motion } from "motion/react"
import { GithubIcon } from "@/components/icons/GithubIcon"
import { LinkedinIcon } from "@/components/icons/LinkedinIcon"
import { useStaticMotion } from "@/lib/motion"
import { prose } from "./classes"

export interface Author {
  name: string
  role: string
  bio: string
  // Retrato em /public (ex.: "/brand/marcos.webp"), de preferência 4:5. Sem
  // ele, o painel mostra as iniciais.
  photo?: string
  links: { href: string; label: string; icon?: "github" | "linkedin" }[]
}

const EASE = [0.22, 1, 0.36, 1] as const

const icons = { github: GithubIcon, linkedin: LinkedinIcon }

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")

const pill =
  "inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3.5 font-sans text-body-sm text-foreground transition-colors duration-200 hover:border-input hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

/**
 * Quem faz o projeto. Um painel único: o retrato em formato vertical ocupa a
 * lateral inteira (no celular, o topo), e ao lado vêm nome, função, texto e
 * links. O retrato entra com uma leve aproximação, parado com movimento
 * reduzido.
 */
export function AuthorCard({ author }: { author: Author }) {
  const { name, role, bio, photo, links } = author
  const isStatic = useStaticMotion()
  return (
    <div className="grid max-w-[40rem] overflow-hidden rounded-lg border border-border sm:grid-cols-[13.5rem_minmax(0,1fr)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted sm:aspect-auto sm:min-h-[17rem]">
        {photo ? (
          <motion.img
            src={photo}
            alt={`Foto de ${name}`}
            width={640}
            height={800}
            className="absolute inset-0 size-full object-cover object-[50%_30%]"
            {...(isStatic
              ? {}
              : {
                  initial: { opacity: 0, scale: 1.08 },
                  whileInView: { opacity: 1, scale: 1 },
                  viewport: { once: true, amount: 0.2 },
                  transition: { duration: 0.9, ease: EASE },
                })}
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center font-sans text-4xl font-medium text-muted-foreground"
          >
            {initials(name)}
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center gap-5 p-6 sm:p-8">
        <div className="flex flex-col gap-1">
          <p className="font-sans text-caption font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {role}
          </p>
          <p className="text-heading-sm font-medium tracking-[-0.01em] text-foreground">
            {name}
          </p>
        </div>
        <p className={prose}>{bio}</p>
        <ul className="flex flex-wrap gap-2">
          {links.map(({ href, label, icon }) => {
            const Icon = icon ? icons[icon] : null
            return (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={pill}
                >
                  {Icon ? <Icon className="size-4 shrink-0" /> : null}
                  {label}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
