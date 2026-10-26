import type { CSSProperties, ReactNode } from "react"
import { Reveal } from "@/components/Reveal"
import { inlineLink } from "./classes"

const sectionGrid =
  "grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-x-14"
const sectionTitle =
  "flex max-w-[16ch] flex-col gap-1 text-heading-sm text-foreground lg:pt-1"

type InfoPageProps = {
  title: string
  // Parágrafos de abertura, já com a classe `introText`.
  intro: ReactNode
  children: ReactNode
}

/**
 * Esqueleto das páginas informativas (Sobre, Arquitetura): `h1`, abertura e
 * seções. O ritmo vertical mora aqui, como no `ToolPage`, mas com mais ar entre
 * seções, porque cada uma é um bloco de leitura.
 */
export function InfoPage({ title, intro, children }: InfoPageProps) {
  return (
    <main className="flex flex-col gap-12 pt-10 pb-8 sm:gap-16 sm:pt-14">
      <section aria-labelledby="pagina-title" className="flex flex-col gap-5">
        <Reveal>
          <h1
            id="pagina-title"
            className="max-w-[20ch] text-[2.125rem] leading-[1.12] font-medium tracking-[-0.02em] text-foreground sm:text-heading-lg"
          >
            {title}
          </h1>
        </Reveal>
        <Reveal delay={0.08} className="flex flex-col gap-4">
          {intro}
        </Reveal>
      </section>
      {children}
    </main>
  )
}

/** Seção com o título na coluna da esquerda e o conteúdo na da direita. */
export function InfoSection({
  id,
  title,
  number,
  children,
}: {
  id: string
  title: string
  // Número decorativo acima do título ("01"); some para leitores de tela.
  number?: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={sectionGrid}>
      <h2 id={`${id}-title`} className={sectionTitle}>
        {number ? (
          <span
            aria-hidden="true"
            className="font-sans text-body-sm font-normal text-muted-foreground"
          >
            {number}
          </span>
        ) : null}
        {title}
      </h2>
      <Reveal className="flex flex-col gap-5">{children}</Reveal>
    </section>
  )
}

/** Lista de termo e detalhe, com linhas finas entre os itens. */
export function FactList({
  items,
  termWidth = "6rem",
}: {
  items: { term: string; detail: string }[]
  // Largura da coluna do termo no desktop (ex.: "6rem", "10rem").
  termWidth?: string
}) {
  return (
    <dl className="max-w-[40rem] border-b border-border">
      {items.map(({ term, detail }) => (
        <div
          key={term}
          className="grid gap-x-8 gap-y-1 border-t border-border py-4 sm:grid-cols-[var(--term-width)_minmax(0,1fr)]"
          style={{ "--term-width": termWidth } as CSSProperties}
        >
          <dt className="font-sans text-body-sm font-medium text-foreground">
            {term}
          </dt>
          <dd className="text-body text-foreground/90">{detail}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Links externos (do repositório) no fim de uma seção. */
export function SourceLinks({
  sources,
}: {
  sources: { href: string; label: string }[]
}) {
  return (
    <ul className="flex flex-wrap gap-x-6 font-sans text-body-sm">
      {sources.map(({ href, label }) => (
        <li key={href}>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`${inlineLink} inline-flex min-h-11 items-center`}
          >
            {label}
          </a>
        </li>
      ))}
    </ul>
  )
}
