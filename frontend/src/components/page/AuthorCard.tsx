import { motion } from "motion/react"
import { GithubIcon } from "@/components/icons/GithubIcon"
import { LinkedinIcon } from "@/components/icons/LinkedinIcon"
import { useStaticMotion } from "@/lib/motion"
import { prose } from "./classes"

export interface Author {
  name: string
  role: string
  // Um item por parágrafo.
  bio: string[]
  // Retrato em /public (ex.: "/brand/marcos.webp"), de preferência vertical (4:5), com o rosto afastado das bordas. Sem
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
 * Quem faz o projeto. O retrato aparece inteiro, em 4:5,
 * sem recorte: ao lado no desktop, acima no celular. Nome, função, texto e
 * links ficam na outra coluna. O retrato entra com uma leve aproximação, parado
 * com movimento reduzido.
 */
export function AuthorCard({ author }: { author: Author }) {
  const { name, role, bio, photo, links } = author
  const isStatic = useStaticMotion()
  return (
    <div className="flex max-w-[48rem] flex-col gap-7 sm:flex-row sm:items-start sm:gap-10">
      <div className="relative aspect-[4/5] w-64 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:w-72">
        {photo ? (
          <motion.img
            src={photo}
            alt={`Foto de ${name}`}
            width={800}
            height={1000}
            className="absolute inset-0 size-full object-cover"
            {...(isStatic
              ? {}
              : {
                  initial: { opacity: 0, scale: 1.06 },
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
      <div className="flex min-w-0 max-w-[32rem] flex-1 flex-col gap-5 sm:py-1">
        <div className="flex flex-col gap-1">
          <p className="font-sans text-caption font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {role}
          </p>
          <p className="text-heading-sm font-medium tracking-[-0.01em] text-foreground">
            {name}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {bio.map((paragraph) => (
            <p key={paragraph} className={prose}>
              {paragraph}
            </p>
          ))}
        </div>
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
