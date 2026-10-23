import { Reveal } from "@/components/Reveal"

const repository = "https://github.com/msouza10/probekit"
const specs = `${repository}/tree/main/docs/superpowers/specs`
const adrs = `${repository}/tree/main/docs/adr`

const prose = "max-w-[38rem] text-body text-foreground/90"
const inlineLink =
  "text-foreground underline decoration-highlight/50 underline-offset-[0.2em] transition-colors hover:decoration-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

const stack = [
  {
    term: "API",
    detail: "Go. Faz o ping (ICMP) e a consulta DNS de verdade.",
  },
  {
    term: "Servidor",
    detail: "Uma máquina no free tier da Oracle Cloud, criada com Terraform.",
  },
  {
    term: "Entrega",
    detail: "GitHub Actions: testes, build e deploy a cada mudança.",
  },
  {
    term: "Site",
    detail:
      "React 19, Tailwind v4 e Vite, servido por um Cloudflare Worker com arquivos estáticos.",
  },
]

export function Sobre() {
  return (
    <main className="flex flex-col gap-16 pt-12 pb-8 sm:gap-24 sm:pt-20">
      <section aria-labelledby="sobre-title" className="flex flex-col gap-6">
        <Reveal>
          <h1
            id="sobre-title"
            className="max-w-[20ch] text-[2.125rem] leading-[1.12] font-medium tracking-[-0.02em] text-foreground sm:text-heading-lg"
          >
            Um laboratório para aprender fazendo.
          </h1>
        </Reveal>
        <Reveal delay={0.08} className="flex flex-col gap-4">
          <p className="max-w-[36rem] text-body-lg text-muted-foreground">
            O Probekit é um laboratório pessoal. Estou aprendendo Go e DevOps
            construindo ferramentas de rede de verdade, em vez de seguir
            exercícios de curso, e deixei tudo aberto para quem quiser usar ou
            olhar como foi feito.
          </p>
          <p className="max-w-[36rem] text-body-lg text-muted-foreground">
            Por enquanto são duas ferramentas, ping e consulta DNS. As próximas
            entram quando eu tiver uma pergunta que elas respondam.
          </p>
        </Reveal>
      </section>

      <section
        aria-labelledby="roda-title"
        className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-x-14"
      >
        <h2
          id="roda-title"
          className="max-w-[16ch] text-heading-sm text-foreground lg:pt-1"
        >
          Do que é feito
        </h2>
        <Reveal>
          <dl className="max-w-[40rem] border-b border-border">
            {stack.map(({ term, detail }) => (
              <div
                key={term}
                className="grid gap-x-8 gap-y-1 border-t border-border py-4 sm:grid-cols-[6rem_minmax(0,1fr)]"
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
        aria-labelledby="regras-title"
        className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-x-14"
      >
        <h2
          id="regras-title"
          className="max-w-[16ch] text-heading-sm text-foreground lg:pt-1"
        >
          Como funciona o uso
        </h2>
        <Reveal className="flex flex-col gap-5">
          <p className={prose}>
            Não tem conta nem login: abrir e usar. A API recusa endereços
            privados e reservados antes de testar qualquer coisa, para que o
            laboratório não sirva de ponte para a rede de ninguém.
          </p>
        </Reveal>
      </section>

      <section
        aria-labelledby="decisoes-title"
        className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-x-14"
      >
        <h2
          id="decisoes-title"
          className="max-w-[16ch] text-heading-sm text-foreground lg:pt-1"
        >
          Como as decisões ficam registradas
        </h2>
        <Reveal className="flex flex-col gap-5">
          <p className={prose}>
            Escrevo uma especificação antes de construir cada parte e registro
            as escolhas difíceis em ADRs, que são notas curtas sobre o que foi
            decidido e por quê. Ficam em <code>docs/</code> no repositório,
            junto com o código, que é MIT.
          </p>
          <ul className="flex flex-col gap-1 font-sans text-body-sm">
            {[
              { href: repository, label: "Repositório no GitHub" },
              { href: specs, label: "Especificações" },
              { href: adrs, label: "Decisões de arquitetura (ADRs)" },
            ].map(({ href, label }) => (
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
        </Reveal>
      </section>
    </main>
  )
}

export default Sobre
