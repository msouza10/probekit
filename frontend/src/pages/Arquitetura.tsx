import type { ReactNode } from "react"
import { Reveal } from "@/components/Reveal"
import { ArchitectureDiagram } from "@/components/diagrams/ArchitectureDiagram"
import { PipelineDiagram } from "@/components/diagrams/PipelineDiagram"

const repository = "https://github.com/msouza10/probekit"

const prose = "max-w-[38rem] text-body text-foreground/90"
const inlineLink =
  "text-foreground underline decoration-highlight/50 underline-offset-[0.2em] transition-colors hover:decoration-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
const sectionGrid =
  "grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-x-14"
const sectionTitle =
  "flex max-w-[16ch] flex-col gap-1 text-heading-sm text-foreground lg:pt-1"
const sectionNumber = "font-sans text-body-sm font-normal text-muted-foreground"

type Source = { href: string; label: string }

// Cada parágrafo só afirma o que está nestes arquivos: OVERVIEW.md,
// docs/adr (0001, 0002, 0005, 0007, 0008), .github/workflows e infra/terraform.
const sections: {
  id: string
  number: string
  title: string
  paragraphs: string[]
  diagram?: ReactNode
  sources: Source[]
}[] = [
  {
    id: "arquitetura",
    number: "01",
    title: "Arquitetura",
    paragraphs: [
      "O site é estático, servido por um Cloudflare Worker. Quando uma ferramenta roda, o navegador chama a API em api.probekit.cc: o pedido passa pelo proxy da Cloudflare, chega ao balanceador de carga da Oracle Cloud e cai em uma das duas máquinas, onde o binário em Go termina o TLS.",
      "Antes de qualquer pacote sair, a API confere o destino e recusa endereços privados, de loopback e de link-local. O ping usa ICMP de verdade, então a latência mostrada é a da máquina até o alvo. O limite é de 50 requisições a cada 5 minutos por endereço de origem, contado na memória de cada servidor.",
    ],
    diagram: <ArchitectureDiagram />,
    sources: [
      { href: `${repository}/blob/main/OVERVIEW.md`, label: "Visão geral" },
      {
        href: `${repository}/tree/main/docs/adr`,
        label: "Decisões (ADRs)",
      },
    ],
  },
  {
    id: "pipeline",
    number: "02",
    title: "Pipeline",
    paragraphs: [
      "Em cada pull request roda o CI, com os jobs Go, NPM e Terraform. Quando uma mudança do backend chega à main, o pipeline da API calcula a versão e só publica uma release se as mensagens de commit pedirem (feat, fix ou perf). O site é construído quando uma mudança do frontend chega à main, e o deploy espera a aprovação do ambiente production.",
      "O deploy da API é manual, e os dois, API e site, têm um workflow de rollback.",
    ],
    diagram: <PipelineDiagram />,
    sources: [
      {
        href: `${repository}/tree/main/.github/workflows`,
        label: "Workflows",
      },
      {
        href: `${repository}/blob/main/docs/runbook-deploy.md`,
        label: "Runbook de deploy",
      },
    ],
  },
  {
    id: "infraestrutura",
    number: "03",
    title: "Infraestrutura",
    paragraphs: [
      "O Terraform cria a rede, as duas máquinas e o balanceador de carga na Oracle Cloud, e o registro DNS da API na Cloudflare. O estado fica num bucket da Oracle Cloud.",
      "O Worker do site não é criado pelo Terraform: quem o publica é o pipeline.",
    ],
    // diagrama: infraestrutura (a Task 5 preenche `diagram`)
    diagram: undefined,
    sources: [
      {
        href: `${repository}/tree/main/infra/terraform`,
        label: "Terraform",
      },
      {
        href: `${repository}/tree/main/docs/adr`,
        label: "Decisões (ADRs)",
      },
    ],
  },
]

const principles = [
  {
    term: "Roda de verdade",
    detail: "Em produção o resultado vem da API, nunca de uma simulação.",
  },
  {
    term: "Fica registrado",
    detail: "As escolhas difíceis ficam registradas em ADRs.",
  },
  {
    term: "Código aberto",
    detail: "Tudo está no repositório.",
  },
]

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string
  number: string
  title: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={`secao-${id}-title`} className={sectionGrid}>
      <h2 id={`secao-${id}-title`} className={sectionTitle}>
        <span aria-hidden="true" className={sectionNumber}>
          {number}
        </span>
        {title}
      </h2>
      <Reveal className="flex flex-col gap-5">{children}</Reveal>
    </section>
  )
}

function SourceLinks({ sources }: { sources: Source[] }) {
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

export function Arquitetura() {
  return (
    <main className="flex flex-col gap-16 pt-12 pb-8 sm:gap-24 sm:pt-20">
      <section aria-labelledby="pagina-title" className="flex flex-col gap-6">
        <Reveal>
          <h1
            id="pagina-title"
            className="max-w-[20ch] text-[2.125rem] leading-[1.12] font-medium tracking-[-0.02em] text-foreground sm:text-heading-lg"
          >
            Arquitetura
          </h1>
        </Reveal>
        <Reveal delay={0.08} className="flex flex-col gap-4">
          <p className="max-w-[36rem] text-body-lg text-muted-foreground">
            Aqui eu mostro como o laboratório é montado. O site é estático, na
            Cloudflare, e a API, em Go, roda em duas máquinas da Oracle Cloud em
            São Paulo, atrás de um balanceador de carga.
          </p>
        </Reveal>
      </section>

      {sections.map(({ id, number, title, paragraphs, diagram, sources }) => (
        <Section key={id} id={id} number={number} title={title}>
          {paragraphs.map((text) => (
            <p key={text} className={prose}>
              {text}
            </p>
          ))}
          {diagram}
          <SourceLinks sources={sources} />
        </Section>
      ))}

      <section aria-labelledby="principios-title" className={sectionGrid}>
        <h2 id="principios-title" className={sectionTitle}>
          Princípios
        </h2>
        <Reveal>
          <dl className="max-w-[40rem] border-b border-border">
            {principles.map(({ term, detail }) => (
              <div
                key={term}
                className="grid gap-x-8 gap-y-1 border-t border-border py-4 sm:grid-cols-[10rem_minmax(0,1fr)]"
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
    </main>
  )
}

export default Arquitetura
