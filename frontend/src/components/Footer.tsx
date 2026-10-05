import { Link } from "react-router-dom"
import { Activity, ExternalLink, Radio, ShieldCheck } from "lucide-react"
import { GithubIcon } from "./icons/GithubIcon"

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-page-ink/80 pt-12 pb-16 text-body-sm backdrop-blur-sm">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
        {/* Column 1: Brand & Status */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-cornflower/15 text-blue-cornflower">
              <Activity className="h-4 w-4" />
            </span>
            <span className="font-semibold text-foreground">Probekit</span>
            <span className="rounded bg-steel-border/50 px-1.5 py-0.5 font-mono text-[10px] text-ash">
              v0.1.0
            </span>
          </div>
          <p className="text-body-sm text-muted-foreground">
            Caixa de ferramentas técnicas na web e laboratório de DevOps.
            Diagnósticos diretos sem cadastro, sem rastreadores e com latência
            real.
          </p>
          <div className="flex items-center gap-2 rounded-md border border-steel-border/70 bg-deep-coal px-3 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <div className="flex flex-col text-[11px] leading-tight">
              <span className="font-medium text-foreground">
                Sonda us-ashburn-1
              </span>
              <span className="font-mono text-muted-foreground">
                Oracle Cloud • Operacional
              </span>
            </div>
          </div>
        </div>

        {/* Column 2: Tools */}
        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-caption tracking-wider uppercase text-muted-foreground">
            Ferramentas
          </h3>
          <ul className="flex flex-col gap-2 text-muted-foreground">
            <li>
              <Link
                to="/ping"
                className="transition-colors hover:text-foreground"
              >
                Ping ICMP Nativo
              </Link>
            </li>
            <li>
              <Link
                to="/dns-lookup"
                className="transition-colors hover:text-foreground"
              >
                Consulta DNS Autoritativo
              </Link>
            </li>
            <li className="flex items-center gap-2 text-fog">
              <span>Calculadora CIDR</span>
              <span className="font-mono text-[10px] text-fog/80">[breve]</span>
            </li>
            <li className="flex items-center gap-2 text-fog">
              <span>Inspetor SSL/TLS</span>
              <span className="font-mono text-[10px] text-fog/80">[breve]</span>
            </li>
            <li className="flex items-center gap-2 text-fog">
              <span>Headers HTTP & CORS</span>
              <span className="font-mono text-[10px] text-fog/80">[breve]</span>
            </li>
          </ul>
        </div>

        {/* Column 3: Architecture & DevOps */}
        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-caption tracking-wider uppercase text-muted-foreground">
            Engenharia & DevOps
          </h3>
          <ul className="flex flex-col gap-2 text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-blue-cornflower" />
              <span>Go Backend (Raw Sockets)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-cornflower" />
              <span>Filtro RFC 1918 Anti-Abuso</span>
            </li>
            <li>
              <span>OCI VM + Terraform IaC</span>
            </li>
            <li>
              <span>GitHub Actions CI/CD</span>
            </li>
            <li>
              <span>React 19 + Tailwind v4 + Motion</span>
            </li>
          </ul>
        </div>

        {/* Column 4: Project & Community */}
        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-caption tracking-wider uppercase text-muted-foreground">
            Projeto & Código
          </h3>
          <ul className="flex flex-col gap-2 text-muted-foreground">
            <li>
              <Link
                to="/sobre"
                className="transition-colors hover:text-foreground"
              >
                Sobre o projeto
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/msouza10/probekit"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <GithubIcon className="h-3.5 w-3.5" />
                <span>Repositório GitHub</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </li>
            <li>
              <a
                href="https://github.com/msouza10/probekit/blob/main/LICENSE"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <span>Licença MIT</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </li>
            <li>
              <a
                href="https://github.com/msouza10/probekit/issues"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <span>Sugerir Ferramenta / Bug</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-steel-border/50 pt-6 text-caption text-fog sm:flex-row">
        <p>© 2026 Probekit. Ferramentas técnicas de código aberto.</p>
        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
          <span className="flex items-center gap-1 text-ash">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-cornflower"></span>
            RFC 1918 Protegido
          </span>
          <span className="flex items-center gap-1 text-ash">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-cornflower"></span>
            Sem Cookies / Rastreadores
          </span>
          <span className="flex items-center gap-1 text-ash">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-cornflower"></span>
            OCI Free Tier
          </span>
        </div>
      </div>
    </footer>
  )
}
