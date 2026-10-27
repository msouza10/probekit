import { Link } from "react-router-dom"
import { introText } from "@/components/page/classes"
import { Reveal } from "@/components/Reveal"
import { articlePath, articles, formatDate } from "@/lib/articles"

export default function Artigos() {
  return (
    <main className="flex flex-col gap-10 pt-10 pb-8 sm:gap-12 sm:pt-14">
      <section aria-labelledby="artigos-title" className="flex flex-col gap-5">
        <Reveal>
          <h1
            id="artigos-title"
            className="max-w-[20ch] text-[2.125rem] leading-[1.12] font-medium tracking-[-0.02em] text-foreground sm:text-heading-lg"
          >
            Artigos
          </h1>
        </Reveal>
        <Reveal delay={0.08}>
          <p className={introText}>
            Textos do Probekit, do mais novo para o mais antigo.
          </p>
        </Reveal>
      </section>
      <ul role="list" className="flex max-w-[38rem] flex-col">
        {articles.map((article) => (
          <li
            key={article.slug}
            className="flex flex-col gap-2 border-t border-border py-6 last:border-b"
          >
            <h2 className="text-heading-sm text-foreground">
              <Link
                to={articlePath(article.slug)}
                className="underline decoration-highlight/50 underline-offset-[0.2em] transition-colors hover:decoration-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {article.title}
              </Link>
            </h2>
            <p className="text-body text-foreground/90">
              {article.description}
            </p>
            <p className="font-sans text-caption text-muted-foreground">
              <time dateTime={article.date}>{formatDate(article.date)}</time>
              {" · "}
              {article.readingMinutes} min de leitura
            </p>
          </li>
        ))}
      </ul>
    </main>
  )
}
