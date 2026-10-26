import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { AsciiOwl } from "@/components/AsciiOwl"
import { Bench } from "@/components/Bench"
import { Reveal } from "@/components/Reveal"
import { Button } from "@/components/ui/button"
import { sampleDate, sampleDns, samplePing, sampleTarget } from "@/lib/sample"
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
  { term: "API", detail: "Go, em duas VMs · Oracle Cloud, São Paulo" },
  { term: "Site", detail: "Cloudflare Worker com arquivos estáticos" },
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
              Teste um host ou consulte o DNS de um domínio.
            </h1>
          </Reveal>
          <Reveal delay={0.08} className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-11 sm:h-10">
              <Link to="/ping">Pingar um host</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 sm:h-10"
            >
              <Link to="/dns-lookup">Consultar DNS</Link>
            </Button>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="max-w-[36rem] text-body text-muted-foreground sm:text-body-lg">
              Um laboratório feito para mim, aberto para quem quiser usar ou
              olhar. Estou aprendendo Go e DevOps com ferramentas de rede que
              funcionam de verdade, e o código está todo{" "}
              <ExternalLink href={repository}>no GitHub</ExternalLink>.
            </p>
          </Reveal>
        </div>
        <AsciiOwl />
      </section>

      <section aria-labelledby="exemplo-title" className="flex flex-col gap-6">
        <div className="flex max-w-[40rem] flex-col gap-2">
          <h2
            id="exemplo-title"
            className="text-heading-sm text-foreground sm:text-heading"
          >
            Como é uma resposta
          </h2>
          <p className="text-body text-muted-foreground">
            Um teste de verdade contra {sampleTarget}, feito em {sampleDate}.
            Está colado aqui: esta página não roda o teste a cada visita.
          </p>
        </div>
        <Reveal className="grid gap-4 lg:grid-cols-2">
          <Bench label="Ping">
            <p className="break-all text-base text-bench-foreground">
              {samplePing.target}{" "}
              <span className="text-bench-muted">({samplePing.ip_addr})</span>
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <dt className="text-xs text-bench-muted">Latência média</dt>
                <dd className="text-lg text-bench-foreground">
                  {samplePing.avg_rtt}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-bench-muted">Perda de pacotes</dt>
                <dd className="text-lg text-bench-ok">
                  {samplePing.packet_loss.toFixed(0)}%
                </dd>
                <dd className="text-xs text-bench-muted">
                  {samplePing.packets_recv}/{samplePing.packets_sent} recebidos
                </dd>
              </div>
              <div>
                <dt className="text-xs text-bench-muted">Latência mínima</dt>
                <dd className="text-lg text-bench-foreground">
                  {samplePing.min_rtt}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-bench-muted">Latência máxima</dt>
                <dd className="text-lg text-bench-foreground">
                  {samplePing.max_rtt}
                </dd>
              </div>
            </dl>
          </Bench>
          <Bench label="DNS Lookup">
            <p className="break-all text-base text-bench-foreground">
              {sampleDns.domain}
            </p>
            <dl className="mt-4 flex flex-col gap-4">
              <div>
                <dt className="text-xs text-bench-muted">Endereços (A/AAAA)</dt>
                {sampleDns.addrs.map((addr) => (
                  <dd key={addr} className="break-all text-bench-foreground">
                    {addr}
                  </dd>
                ))}
              </div>
              <div>
                <dt className="text-xs text-bench-muted">Servidores (NS)</dt>
                {sampleDns.ns.map((server) => (
                  <dd key={server} className="break-all text-bench-foreground">
                    {server}
                  </dd>
                ))}
              </div>
            </dl>
          </Bench>
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
          Outras ideias estão anotadas{" "}
          <ExternalLink href={repository}>no repositório</ExternalLink>. Entram
          aqui quando estiverem rodando.
        </p>
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
        <Reveal className="flex flex-col gap-4">
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
          <p className="font-sans text-body-sm text-muted-foreground">
            Como tudo isso é montado:{" "}
            <Link
              to="/arquitetura"
              className={`${inlineLink} inline-flex min-h-11 items-center font-medium`}
            >
              Arquitetura
            </Link>
          </p>
        </Reveal>
      </section>
    </main>
  )
}

export default Home
