import { Link } from "react-router-dom"
import { GithubIcon } from "./icons/GithubIcon"

const repository = "https://github.com/msouza10/probekit"

const footerLink =
  "inline-flex min-h-11 items-center py-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border pt-12 pb-6 sm:mt-24 sm:pt-16">
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[2fr_1fr_1fr] lg:gap-16">
        <div className="col-span-2 flex flex-col items-start gap-5 lg:col-span-1">
          <span className="font-serif text-heading-sm font-medium tracking-tight text-foreground">
            Probekit
          </span>
          <p className="max-w-[44ch] text-body-sm text-muted-foreground">
            Ferramentas técnicas feitas por mim. O código está no GitHub, e dá
            para sugerir melhorias pelo link ao lado.
          </p>
          <a
            href={repository}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm text-foreground hover:bg-muted"
          >
            <GithubIcon className="h-4 w-4" />
            Repositório GitHub
          </a>
        </div>

        <nav aria-label="Ferramentas no rodapé">
          <h2 className="type-eyebrow mb-3 text-muted-foreground">
            Ferramentas
          </h2>
          <ul className="flex flex-col">
            <li>
              <Link className={footerLink} to="/ping">
                Ping
              </Link>
            </li>
            <li>
              <Link className={footerLink} to="/dns-lookup">
                DNS Lookup
              </Link>
            </li>
            <li>
              <a className={footerLink} href="/#ferramentas">
                Todas as ferramentas
              </a>
            </li>
          </ul>
        </nav>

        <nav aria-label="Projeto no rodapé">
          <h2 className="type-eyebrow mb-3 text-muted-foreground">Projeto</h2>
          <ul className="flex flex-col">
            <li>
              <Link className={footerLink} to="/arquitetura">
                Arquitetura
              </Link>
            </li>
            <li>
              <Link className={footerLink} to="/sobre">
                Sobre o projeto
              </Link>
            </li>
            <li>
              <a
                className={footerLink}
                href={`${repository}/issues`}
                target="_blank"
                rel="noreferrer"
              >
                Enviar sugestão
              </a>
            </li>
            <li>
              <a
                className={footerLink}
                href={`${repository}/blob/main/LICENSE`}
                target="_blank"
                rel="noreferrer"
              >
                Licença MIT
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border pt-5 text-sm text-muted-foreground sm:mt-16">
        <p>© {new Date().getFullYear()} Probekit</p>
        <a
          href="#inicio"
          className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
        >
          Voltar ao topo
        </a>
      </div>
    </footer>
  )
}
