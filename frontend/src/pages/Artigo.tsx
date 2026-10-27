import { use } from "react"
import { Link, useParams } from "react-router-dom"
import { ArticleBody } from "@/components/article/ArticleBody"
import { inlineLink, introText } from "@/components/page/classes"
import { PageToc } from "@/components/page/PageToc"
import { useActiveId } from "@/components/page/useActiveId"
import { Reveal } from "@/components/Reveal"
import {
  findArticle,
  formatDate,
  loadArticle,
  type LoadedArticle,
} from "@/lib/articles"
import NotFound from "./NotFound"

// Uma promessa por slug: `use` precisa da mesma promessa a cada renderização.
// É também o que faz o prerender esperar o corpo antes de gerar o HTML.
const loading = new Map<string, Promise<LoadedArticle | undefined>>()
function read(slug: string) {
  let promise = loading.get(slug)
  if (!promise) {
    promise = loadArticle(slug)
    loading.set(slug, promise)
  }
  return promise
}

const NO_TOC: LoadedArticle["toc"] = []

function ArticleView({ slug }: { slug: string }) {
  const article = use(read(slug))
  const active = useActiveId(article?.toc ?? NO_TOC)
  if (!article) return <NotFound />

  const { meta, tree, toc } = article
  return (
    <main className="grid gap-x-14 pt-10 pb-8 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_13rem]">
      <article className="flex min-w-0 flex-col gap-10 sm:gap-12">
        <header className="flex flex-col gap-5">
          <Reveal className="flex flex-col gap-5">
            <p className="font-sans text-body-sm">
              <Link to="/artigos" className={inlineLink}>
                Artigos
              </Link>
            </p>
            <h1 className="max-w-[30ch] text-[2.125rem] leading-[1.12] font-medium tracking-[-0.02em] text-foreground sm:text-heading-lg">
              {meta.title}
            </h1>
          </Reveal>
          <Reveal delay={0.08} className="flex flex-col gap-4">
            <p className={introText}>{meta.description}</p>
            <p className="font-sans text-caption text-muted-foreground">
              <time dateTime={meta.date}>{formatDate(meta.date)}</time>
              {" · "}
              {meta.readingMinutes} min de leitura
            </p>
          </Reveal>
        </header>
        <PageToc items={toc} active={active} variant="inline" />
        <ArticleBody tree={tree} />
      </article>
      <aside>
        <div className="sticky top-[calc(var(--header-height)+24px)]">
          <PageToc items={toc} active={active} variant="side" />
        </div>
      </aside>
    </main>
  )
}

export default function Artigo() {
  const { slug = "" } = useParams()
  if (!findArticle(slug)) return <NotFound />
  return <ArticleView slug={slug} />
}
