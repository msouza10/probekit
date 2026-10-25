import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Reveal } from "@/components/Reveal"
import { tools } from "@/lib/tools"

const repository = "https://github.com/msouza10/probekit"
const available = tools.filter((tool) => tool.status !== "Planejado")

const adrs = `${repository}/tree/main/docs/adr`
const specs = `${repository}/tree/main/docs/superpowers/specs`
const license = `${repository}/blob/main/LICENSE`

const inlineLink =
  "text-foreground underline decoration-highlight/50 underline-offset-[0.2em] transition-colors hover:decoration-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={inlineLink}>
      {children}
    </a>
  )
}

const profile: { term: string; detail: ReactNode }[] = [
  { term: "Foco", detail: "Go · DevOps · redes" },
  { term: "API", detail: "Go, em duas VMs · Oracle Cloud, São Paulo" },
  { term: "Site", detail: "Cloudflare Worker com arquivos estáticos" },
  { term: "Infraestrutura", detail: "Terraform · OCI e Cloudflare" },
  {
    term: "Entrega",
    detail: "GitHub Actions · CI, release, deploy com aprovação e rollback",
  },
  {
    term: "Decisões",
    detail: (
      <>
        <ExternalLink href={adrs}>ADRs</ExternalLink> e{" "}
        <ExternalLink href={specs}>specs</ExternalLink> no repositório
      </>
    ),
  },
  { term: "Licença", detail: <ExternalLink href={license}>MIT</ExternalLink> },
]

export function Home() {
  return (
    <main className="flex flex-col gap-20 pt-12 pb-8 sm:gap-28 sm:pt-20 lg:pt-24">
      <section aria-labelledby="home-title" className="flex flex-col gap-10">
        <div className="flex flex-col gap-6">
          <Reveal>
            <h1
              id="home-title"
              className="max-w-[20ch] text-[2.125rem] leading-[1.12] font-medium tracking-[-0.02em] text-foreground sm:text-heading-lg lg:text-display"
            >
              Um laboratório feito para mim, aberto para quem quiser olhar.
            </h1>
          </Reveal>
          <Reveal delay={0.08} className="flex flex-col gap-4">
            <p className="max-w-[36rem] text-body-lg text-muted-foreground">
              Estou aprendendo Go e DevOps construindo ferramentas de rede que
              funcionam de verdade. Cada uma nasceu de uma pergunta minha, e
              continua aqui porque ainda serve para respondê-la.
            </p>
            <p className="max-w-[36rem] text-body-lg text-muted-foreground">
              Pode usar à vontade, ou só olhar como foi feito: o código está
              todo <ExternalLink href={repository}>no GitHub</ExternalLink>.
            </p>
          </Reveal>
        </div>
      </section>

      <section
        aria-labelledby="perfil-title"
        className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-x-14"
      >
        <h2
          id="perfil-title"
          className="max-w-[16ch] text-heading-sm text-foreground lg:pt-1"
        >
          Perfil do laboratório
        </h2>
        <Reveal>
          <dl className="max-w-[40rem] border-b border-border">
            {profile.map(({ term, detail }) => (
              <div
                key={term}
                className="grid gap-x-8 gap-y-1 border-t border-border py-4 sm:grid-cols-[9rem_minmax(0,1fr)]"
              >
                <dt className="font-sans text-body-sm font-medium text-foreground">
                  {term}
                </dt>
                <dd className="text-body text-foreground/90">{detail}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
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
                  {tool.why ? (
                    <p className="text-body-sm text-muted-foreground">
                      {tool.why}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
        <p className="font-sans text-body-sm text-muted-foreground">
          Outras ideias estão anotadas no repositório. Entram aqui quando
          estiverem rodando.
        </p>
      </section>
      <p className="font-sans text-body-sm text-muted-foreground">
        Como tudo isso é montado:{" "}
        <Link
          to="/arquitetura"
          className={`${inlineLink} inline-flex min-h-11 items-center font-medium`}
        >
          Arquitetura
        </Link>
      </p>
    </main>
  )
}

export default Home
