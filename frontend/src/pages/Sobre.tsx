import {
  CheckCircle2,
  Code2,
  ExternalLink,
  Radio,
  ShieldCheck,
  Terminal,
} from "lucide-react"
import { GithubIcon } from "@/components/icons/GithubIcon"

export function Sobre() {
  return (
    <main className="flex flex-col gap-16 py-12 sm:py-16">
      {/* Header section */}
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-steel-border bg-deep-coal px-3 py-1 font-mono text-caption tracking-wider text-blue-cornflower w-fit">
          <Terminal className="h-3.5 w-3.5" />
          <span>MANIFESTO & ARQUITETURA</span>
        </div>
        <h1 className="text-heading sm:text-heading-lg font-semibold tracking-[-0.03em] text-foreground">
          Sobre o Probekit
        </h1>
        <p className="max-w-[70ch] text-body-lg text-muted-foreground leading-relaxed">
          O Probekit é uma caixa de ferramentas técnicas pensada pra resolver
          tarefas reais — rede, arquivos, texto, cron e outros utilitários — de
          um jeito simples de acessar e usar.
        </p>
      </div>

      {/* Purpose & Philosophy */}
      <section className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-lg border border-steel-border bg-card p-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-cornflower/15 text-blue-cornflower">
            <Radio className="h-5 w-5" />
          </div>
          <h2 className="text-body font-semibold text-snow">
            Telemetria de Origem Clara
          </h2>
          <p className="text-body-sm text-muted-foreground">
            Testes de rede só fazem sentido quando você sabe exatamente de onde
            partiram. Cada teste informa a região e provedor da máquina de
            origem (OCI us-ashburn-1).
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-steel-border bg-card p-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-cornflower/15 text-blue-cornflower">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="text-body font-semibold text-snow">
            Segurança por Padrão
          </h2>
          <p className="text-body-sm text-muted-foreground">
            Alvos em faixas privadas (RFC 1918), loopback, link-local e
            endpoints de metadata de nuvem são rejeitados antes da execução,
            protegendo a infraestrutura contra abusos.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-steel-border bg-card p-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-cornflower/15 text-blue-cornflower">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h2 className="text-body font-semibold text-snow">
            Sem Contas ou Rastreamento
          </h2>
          <p className="text-body-sm text-muted-foreground">
            O catálogo começa pequeno (ping e consulta de DNS) e cresce aos
            poucos, conforme surgem necessidades reais. Não tem conta nem login:
            é só acessar e usar.
          </p>
        </div>
      </section>

      {/* DevOps Laboratory context */}
      <section className="flex flex-col gap-8 rounded-lg border border-steel-border bg-deep-coal/70 p-8">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-caption uppercase tracking-wider text-blue-cornflower">
            // INFRAESTRUTURA COMO CÓDIGO
          </span>
          <h2 className="text-heading-sm font-semibold text-snow">
            Laboratório Pessoal de DevOps
          </h2>
          <p className="max-w-[70ch] text-body-sm text-muted-foreground">
            O projeto também funciona como um laboratório pessoal de DevOps, com
            infraestrutura como código e automação de CI/CD por trás de cada
            ferramenta.
          </p>
        </div>

        {/* Stack Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5 rounded border border-steel-border/70 bg-card p-4">
            <span className="font-mono text-[11px] text-blue-cornflower">
              BACKEND
            </span>
            <span className="text-body-sm font-medium text-snow">
              Go Microservice
            </span>
            <span className="text-caption text-fog">
              Ping ICMP nativo via sockets brutos, resolução DNS completa.
            </span>
          </div>

          <div className="flex flex-col gap-1.5 rounded border border-steel-border/70 bg-card p-4">
            <span className="font-mono text-[11px] text-blue-cornflower">
              INFRAESTRUTURA
            </span>
            <span className="text-body-sm font-medium text-snow">
              Oracle Cloud (OCI)
            </span>
            <span className="text-caption text-fog">
              Instância computacional provisionada via Terraform no Free Tier.
            </span>
          </div>

          <div className="flex flex-col gap-1.5 rounded border border-steel-border/70 bg-card p-4">
            <span className="font-mono text-[11px] text-blue-cornflower">
              FRONTEND
            </span>
            <span className="text-body-sm font-medium text-snow">
              React 19 + Tailwind v4
            </span>
            <span className="text-caption text-fog">
              Vite, Motion, componentes shadcn/ui e tipografia Inter / Mono.
            </span>
          </div>

          <div className="flex flex-col gap-1.5 rounded border border-steel-border/70 bg-card p-4">
            <span className="font-mono text-[11px] text-blue-cornflower">
              AUTOMATIZAÇÃO
            </span>
            <span className="text-body-sm font-medium text-snow">
              GitHub Actions
            </span>
            <span className="text-caption text-fog">
              Testes automatizados com tráfego ICMP real e linting de ponta a
              ponta.
            </span>
          </div>
        </div>
      </section>

      {/* Open Source & Links */}
      <section className="flex flex-col items-start justify-between gap-6 rounded-lg border border-steel-border bg-card p-8 md:flex-row md:items-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-subheading font-semibold text-snow">
            Código Aberto & Transparência
          </h2>
          <p className="max-w-[60ch] text-body-sm text-muted-foreground">
            Toda a base de código do Probekit — incluindo os contratos de API,
            manifestos de infraestrutura e especificações técnicas — está
            disponível publicamente sob a licença MIT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="https://github.com/msouza10/probekit"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md bg-snow px-4 py-2 text-body-sm font-medium text-page-ink transition-colors hover:bg-snow/90"
          >
            <GithubIcon className="h-4 w-4" />
            <span>Ver no GitHub</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
          <a
            href="https://github.com/msouza10/probekit/tree/main/docs/superpowers/specs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md border border-steel-border bg-deep-coal px-4 py-2 text-body-sm font-medium text-snow transition-colors hover:border-graphite"
          >
            <Code2 className="h-4 w-4 text-blue-cornflower" />
            <span>Especificações de Design</span>
          </a>
        </div>
      </section>
    </main>
  )
}

export default Sobre
