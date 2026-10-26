import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { AsciiOwl } from "@/components/AsciiOwl"
import { QuickPing } from "@/components/QuickPing"
import { RepoPulse } from "@/components/RepoPulse"
import { Reveal } from "@/components/Reveal"
import LogoCloudBlock from "@/components/ui/logo-cloud-3"
import { tools } from "@/lib/tools"

const repository = "https://github.com/msouza10/probekit"
const available = tools.filter((tool) => tool.status !== "Planejado")

const inlineLink =
  "text-foreground underline decoration-highlight/50 underline-offset-[0.2em] transition-colors hover:decoration-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={inlineLink}>
      {children}
    </a>
  )
}

export function Home() {
  return (
    <main className="flex flex-col gap-16 pt-8 pb-8 sm:gap-28 sm:pt-20 lg:pt-24">
      <section
        aria-labelledby="home-title"
        className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-center lg:gap-x-12"
      >
        <div className="flex flex-col gap-6">
          <Reveal>
            <h1
              id="home-title"
              className="max-w-[20ch] text-[2.125rem] leading-[1.12] font-medium tracking-[-0.02em] text-foreground sm:text-heading-lg lg:text-display"
            >
              Teste se um host responde.
            </h1>
          </Reveal>
          <Reveal delay={0.08}>
            <QuickPing />
          </Reveal>
          <Reveal delay={0.16}>
            <p className="max-w-[36rem] text-body text-muted-foreground sm:text-body-lg">
              Um laboratório feito para mim, aberto a quem quiser usar. Aqui eu
              testo, aprendo e uso no dia a dia tecnologias que me interessam. É
              opinativo e pode mudar a qualquer momento. O código está todo{" "}
              <ExternalLink href={repository}>no GitHub</ExternalLink>.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <RepoPulse />
          </Reveal>
        </div>
        <AsciiOwl />
      </section>

      <section
        id="ferramentas"
        aria-labelledby="ferramentas-title"
        className="flex flex-col gap-6"
      >
        <h2
          id="ferramentas-title"
          className="text-heading-sm text-foreground sm:text-heading"
        >
          O que já funciona
        </h2>
        <Reveal>
          <ul className="border-b border-border">
            {available.map((tool) => (
              <li
                key={tool.href}
                className="group relative grid gap-x-10 gap-y-2 border-t border-border py-6 transition-colors hover:bg-muted/60 sm:px-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:py-8"
              >
                <div className="flex items-baseline justify-between gap-4 lg:flex-col lg:justify-start lg:gap-1">
                  <Link
                    to={tool.href}
                    className="text-subheading font-medium text-foreground underline-offset-4 group-hover:underline after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
                  >
                    {tool.name}
                  </Link>
                  <code className="text-caption text-muted-foreground">
                    {tool.href}
                  </code>
                </div>
                <div className="flex max-w-[40rem] flex-col gap-2">
                  <p className="text-body text-foreground">
                    {tool.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
        <p className="font-sans text-body-sm text-muted-foreground">
          Outras ideias estão anotadas{" "}
          <ExternalLink href={repository}>no repositório</ExternalLink>. Entram
          aqui quando estiverem rodando.
        </p>
      </section>

      <section aria-labelledby="fechamento-title">
        <h2 id="fechamento-title" className="sr-only">
          Arquitetura e artigos
        </h2>
        <Reveal className="grid border-b border-border sm:grid-cols-2">
          <div className="group relative flex flex-col gap-3 border-t border-border py-8 sm:border-r sm:py-10 sm:pr-10">
            <p className="type-eyebrow font-sans text-muted-foreground">
              Como foi feito
            </p>
            <Link
              to="/arquitetura"
              className="flex w-fit items-center gap-3 text-heading-sm font-medium text-foreground underline-offset-4 group-hover:underline after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring sm:text-heading"
            >
              Arquitetura
              <ArrowRight
                aria-hidden="true"
                className="h-[0.8em] w-[0.8em] text-highlight"
              />
            </Link>
            <p className="max-w-[30ch] text-body text-muted-foreground">
              Diagramas da API, da infraestrutura e do deploy.
            </p>
          </div>
          <div className="flex flex-col gap-3 border-t border-border py-8 sm:py-10 sm:pl-10">
            <p className="type-eyebrow font-sans text-muted-foreground">
              Escritos
            </p>
            <p className="text-heading-sm font-medium text-muted-foreground sm:text-heading">
              Artigos
            </p>
            <p className="max-w-[30ch] text-body text-muted-foreground">
              Em breve. Vou escrever sobre o que testo e aprendo.
            </p>
          </div>
        </Reveal>
      </section>

      <LogoCloudBlock />
    </main>
  )
}

export default Home
