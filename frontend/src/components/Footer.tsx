import { Link } from "react-router-dom"
import { Activity, ArrowUp, ArrowUpRight } from "lucide-react"
import { GithubIcon } from "./icons/GithubIcon"

const repository = "https://github.com/msouza10/probekit"

export function Footer() {
  return (
    <footer className="site-footer mt-16 border-t border-border pt-12 pb-6 sm:mt-24 sm:pt-16">
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[2fr_1fr_1fr] lg:gap-16">
        <div className="col-span-2 flex flex-col items-start gap-5 lg:col-span-1">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-cornflower/25 bg-blue-cornflower/10 text-blue-cornflower">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-xl font-medium tracking-tight text-foreground">
              Probekit<span className="text-blue-cornflower">.</span>
            </span>
          </div>
          <p className="max-w-[36ch] text-sm text-muted-foreground">
            Mais clareza sobre a sua rede.
            <br />
            Ferramentas simples, código aberto.
          </p>
          <a
            href={repository}
            target="_blank"
            rel="noreferrer"
            className="footer-repository inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs text-foreground"
          >
            <GithubIcon className="h-4 w-4" />
            Repositório GitHub
            <ArrowUpRight className="h-3.5 w-3.5 text-fog" />
          </a>
        </div>

        <nav aria-label="Ferramentas no rodapé">
          <h2 className="type-eyebrow mb-4 text-fog">Ferramentas</h2>
          <ul className="flex flex-col gap-1">
            <li>
              <Link className="footer-link" to="/ping">
                Ping ICMP
              </Link>
            </li>
            <li>
              <Link className="footer-link" to="/dns-lookup">
                Consulta DNS
              </Link>
            </li>
            <li>
              <a className="footer-link" href="/#ferramentas">
                Ver catálogo <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </li>
          </ul>
        </nav>

        <nav aria-label="Projeto no rodapé">
          <h2 className="type-eyebrow mb-4 text-fog">Projeto</h2>
          <ul className="flex flex-col gap-1">
            <li>
              <Link className="footer-link" to="/sobre">
                Sobre o projeto
              </Link>
            </li>
            <li>
              <a
                className="footer-link"
                href={`${repository}/issues`}
                target="_blank"
                rel="noreferrer"
              >
                Enviar sugestão <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </li>
            <li>
              <a
                className="footer-link"
                href={`${repository}/blob/main/LICENSE`}
                target="_blank"
                rel="noreferrer"
              >
                Licença MIT <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border/60 pt-5 text-xs text-fog sm:mt-16">
        <p>© {new Date().getFullYear()} Probekit</p>
        <a
          href="#inicio"
          className="footer-top inline-flex min-h-11 items-center gap-2 hover:text-foreground"
        >
          Voltar ao topo <ArrowUp className="h-4 w-4" />
        </a>
      </div>
    </footer>
  )
}
