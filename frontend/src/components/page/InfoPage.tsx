import { useEffect, useRef, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { Reveal } from "@/components/Reveal"
import { inlineLink } from "./classes"
import { PageToc } from "./PageToc"
import { type TocItem, useActiveId } from "./useActiveId"

type InfoPageProps = {
  title: string
  // Parágrafos de abertura, já com a classe `introText`.
  intro: ReactNode
  children: ReactNode
}

/**
 * Esqueleto das páginas informativas (Sobre, Arquitetura): `h1`, abertura,
 * seções e o sumário "Nesta página". O sumário é montado a partir das
 * `InfoSection` da própria página (atributo `data-toc`), então nenhuma página
 * repete a lista de seções. O ritmo vertical mora aqui, como no `ToolPage`, mas
 * com mais ar entre seções, porque cada uma é um bloco de leitura.
 */
export function InfoPage({ title, intro, children }: InfoPageProps) {
  const main = useRef<HTMLElement>(null)
  const [items, setItems] = useState<TocItem[]>([])
  const active = useActiveId(items)

  useEffect(() => {
    const sections = main.current?.querySelectorAll<HTMLElement>("[data-toc]")
    setItems(
      Array.from(sections ?? [], (section) => ({
        id: section.id,
        title: section.dataset.toc || "",
      })).filter((item) => item.id && item.title),
    )
  }, [])

  return (
    <main
      ref={main}
      className="grid gap-x-14 pt-10 pb-8 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_13rem]"
    >
      <div className="flex min-w-0 flex-col gap-12 sm:gap-16">
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
        <PageToc items={items} active={active} variant="inline" />
        {children}
      </div>
      <aside>
        <div className="sticky top-[calc(var(--header-height)+24px)]">
          <PageToc items={items} active={active} variant="side" />
        </div>
      </aside>
    </main>
  )
}

/** Seção com o título em cima e o conteúdo logo abaixo, numa coluna só. */
export function InfoSection({
  id,
  title,
  tocTitle,
  number,
  children,
}: {
  id: string
  title: string
  // Nome mais curto no sumário, quando o título é longo.
  tocTitle?: string
  // Número decorativo acima do título ("01"); some para leitores de tela.
  number?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      data-toc={tocTitle ?? title}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-[calc(var(--header-height)+24px)] flex-col gap-5 border-t border-border pt-8"
    >
      <h2
        id={`${id}-title`}
        className="flex flex-col gap-1 text-heading-sm text-foreground"
      >
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
