import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { Reveal } from "@/components/Reveal"
import { articlePath, formatDate, type ArticleMeta } from "@/lib/articles"

/*
 * Como a Home aponta para o artigo mais recente: uma linha discreta no herói e
 * um bloco no fechamento, ao lado de "Arquitetura". A linha diz "Último
 * artigo", e não "Novo", para nunca ficar desatualizada. A Home só os mostra
 * quando existe artigo.
 */

const link =
  "inline-flex items-center pointer-coarse:min-h-11 text-foreground underline decoration-highlight/50 underline-offset-[0.2em] transition-colors hover:decoration-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

export function LatestArticleLine({ article }: { article: ArticleMeta }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 font-mono text-caption text-muted-foreground">
      <span>Último artigo</span>
      <span aria-hidden="true">·</span>
      <Link to={articlePath(article.slug)} className={link}>
        {article.title}
      </Link>
    </p>
  )
}

export function LatestArticleCard({ article }: { article: ArticleMeta }) {
  return (
    <section aria-labelledby="artigo-recente-title" className="sm:h-full">
      <h2 id="artigo-recente-title" className="sr-only">
        Artigos
      </h2>
      <Reveal className="border-b border-border sm:h-full">
        <div className="group relative flex flex-col gap-3 border-t border-border py-8 sm:h-full sm:py-10">
          <p className="type-eyebrow font-sans text-muted-foreground">
            Artigos
          </p>
          <Link
            to={articlePath(article.slug)}
            className="flex w-fit max-w-[24ch] items-start gap-3 text-heading-sm font-medium text-foreground underline-offset-4 group-hover:underline after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring sm:text-heading"
          >
            {article.title}
            <ArrowRight
              aria-hidden="true"
              className="mt-[0.35em] h-[0.8em] w-[0.8em] shrink-0 text-highlight"
            />
          </Link>
          <p className="max-w-[34ch] text-body text-muted-foreground">
            {article.description}
          </p>
          <p className="font-sans text-caption text-muted-foreground">
            <time dateTime={article.date}>{formatDate(article.date)}</time>
            {" · "}
            {article.readingMinutes} min de leitura
          </p>
          <Link to="/artigos" className={`relative z-10 w-fit ${link}`}>
            Todos os artigos
          </Link>
        </div>
      </Reveal>
    </section>
  )
}
