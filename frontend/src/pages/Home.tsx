import { Link } from "react-router-dom"
import { Bench } from "@/components/Bench"
import { Reveal } from "@/components/Reveal"
import { tools } from "@/lib/tools"

const repository = "https://github.com/msouza10/probekit"
const available = tools.filter((tool) => tool.status !== "Planejado")

const prose = "max-w-[38rem] text-body text-foreground/90"
const inlineLink =
  "text-foreground underline decoration-highlight/50 underline-offset-[0.2em] transition-colors hover:decoration-highlight"

/*
 * Saída de exemplo, rotulada como tal no Bench. Endereço da faixa reservada
 * para documentação (RFC 5737, 192.0.2.0/24): nada aqui é medição real.
 */
const exampleReplies = [
  { seq: 1, time: "12.4" },
  { seq: 2, time: "11.9" },
  { seq: 3, time: "12.1" },
]

function ExamplePing() {
  return (
    <pre className="text-[0.8125rem] leading-7 sm:text-sm">
      <span className="text-bench-muted">$ </span>
      ping -c 3 example.com
      {"\n"}
      <span className="text-bench-muted">PING example.com (192.0.2.10)</span>
      {exampleReplies.map(({ seq, time }) => (
        <span key={seq}>
          {"\n"}
          <span className="text-bench-muted">seq={seq} ttl=52 </span>
          time={time} ms
        </span>
      ))}
      {"\n\n"}3 enviados, 3 recebidos,{" "}
      <span className="text-bench-ok">0% de perda</span>
      {"\n"}
      <span className="text-bench-muted">mín/média/máx </span>
      11.9/12.1/12.4 ms
    </pre>
  )
}

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
              todo{" "}
              <a
                href={repository}
                target="_blank"
                rel="noreferrer"
                className={inlineLink}
              >
                no GitHub
              </a>
              .
            </p>
          </Reveal>
        </div>

        <Reveal
          delay={0.16}
          className="grid items-end gap-5 lg:grid-cols-[minmax(0,44rem)_minmax(0,1fr)] lg:gap-10"
        >
          <Bench label="ping" meta="valores ilustrativos" example>
            <ExamplePing />
          </Bench>
          <p className="max-w-[30ch] font-sans text-body-sm text-muted-foreground">
            Este é o formato da resposta, não uma medição. A de verdade sai de
            uma VM em Ashburn, nos Estados Unidos.{" "}
            <Link
              to="/ping"
              className="inline-flex min-h-11 items-center font-medium text-foreground underline decoration-highlight underline-offset-4 transition-colors hover:text-highlight"
            >
              Rodar de verdade
            </Link>
          </p>
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

      <section
        aria-labelledby="execucao-title"
        className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-x-14"
      >
        <h2
          id="execucao-title"
          className="max-w-[16ch] text-heading-sm text-foreground lg:pt-1"
        >
          Como os diagnósticos são executados
        </h2>
        <Reveal className="flex flex-col gap-5">
          <p className={prose}>
            O diagnóstico não acontece no seu navegador. Quando você pede um
            ping ou uma consulta DNS, a página manda o pedido para uma API em Go
            que roda na Oracle Cloud, em Ashburn, nos Estados Unidos. É de lá
            que os pacotes saem.
          </p>
          <p className={prose}>
            Antes de testar, a API resolve o nome e recusa endereços privados e
            internos (loopback, link-local), para que o laboratório não sirva de
            ponte para a rede de ninguém. O ping usa ICMP de verdade, então a
            latência que aparece é a distância entre Ashburn e o alvo, não entre
            você e o alvo.
          </p>
          <p className={prose}>
            Para não esgotar a máquina, cada endereço pode fazer 50 pedidos a
            cada cinco minutos. Por isso esta página não testa nada sozinha ao
            abrir; o exemplo lá em cima é só texto.
          </p>
        </Reveal>
      </section>
    </main>
  )
}

export default Home
