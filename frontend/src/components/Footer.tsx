import { Link } from "react-router-dom"
import { articles } from "@/lib/articles"
import { GithubIcon } from "./icons/GithubIcon"
import { RepoStats } from "./RepoStats"

const repository = "https://github.com/msouza10/probekit"

const footerLink =
  "inline-flex min-h-8 items-center py-1 text-sm text-muted-foreground pointer-coarse:min-h-11 pointer-coarse:py-2 underline-offset-4 hover:text-foreground hover:underline"

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border pt-8 pb-4 sm:mt-16 sm:pt-10">
      <div className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-[2fr_1fr_1fr] lg:gap-12">
        <div className="col-span-2 flex flex-col items-start gap-3 lg:col-span-1">
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
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm pointer-coarse:min-h-11 text-foreground hover:bg-muted"
          >
            <GithubIcon className="h-4 w-4" />
            Repositório GitHub
          </a>
        </div>

        <nav aria-label="Ferramentas no rodapé">
          <h2 className="type-eyebrow mb-1 text-muted-foreground">
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
          <h2 className="type-eyebrow mb-1 text-muted-foreground">Projeto</h2>
          <ul className="flex flex-col">
            <li>
              <Link className={footerLink} to="/arquitetura">
                Arquitetura
              </Link>
            </li>
            {articles.length > 0 ? (
              <li>
                <Link className={footerLink} to="/artigos">
                  Artigos
                </Link>
              </li>
            ) : null}
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
          </ul>
        </nav>
      </div>

      <div className="mt-6 sm:mt-8">
        <RepoStats />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
        <p className="flex flex-wrap items-center gap-x-3">
          <span>© {new Date().getFullYear()} Probekit</span>
          <span aria-hidden="true">·</span>
          <a
            href={`${repository}/blob/main/LICENSE`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-8 items-center underline-offset-4 hover:text-foreground hover:underline pointer-coarse:min-h-11"
          >
            Licença MIT
          </a>
        </p>
        <a
          href="#inicio"
          className="inline-flex min-h-8 items-center underline-offset-4 hover:text-foreground hover:underline pointer-coarse:min-h-11"
        >
          Voltar ao topo
        </a>
      </div>
    </footer>
  )
}
