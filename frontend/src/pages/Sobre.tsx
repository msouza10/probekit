import { Link } from "react-router-dom"
import {
  FactList,
  InfoPage,
  InfoSection,
  SourceLinks,
} from "@/components/page/InfoPage"
import { inlineLink, introText, prose } from "@/components/page/classes"

const repository = "https://github.com/msouza10/probekit"

const stack = [
  {
    term: "API",
    detail: "Go. Faz o ping (ICMP) e a consulta DNS.",
  },
  {
    term: "Servidor",
    detail:
      "Duas máquinas no free tier da Oracle Cloud, criadas com Terraform.",
  },
  {
    term: "Entrega",
    detail:
      "GitHub Actions: verificações em pull requests, release da API e deploy da API e do site, estes com aprovação antes de publicar.",
  },
  {
    term: "Site",
    detail:
      "React 19, Tailwind v4 e Vite, servido por um Cloudflare Worker com arquivos estáticos.",
  },
]

export function Sobre() {
  return (
    <InfoPage
      title="Um laboratório para aprender fazendo."
      intro={
        <>
          <p className={introText}>
            O Probekit é um laboratório pessoal. É onde eu testo, aprendo e
            aplico tecnologias, algumas que estou começando a estudar, outras
            que já uso no dia a dia. O que aprendo fica sobretudo por trás das
            ferramentas: Terraform, GitHub Actions, Oracle Cloud, Cloudflare,
            rede e arquitetura. As escolhas são minhas, então o projeto é
            opinativo e pode mudar a qualquer momento.
          </p>
          <p className={introText}>
            Por enquanto são duas ferramentas,{" "}
            <Link to="/ping" className={inlineLink}>
              Ping
            </Link>{" "}
            e{" "}
            <Link to="/dns-lookup" className={inlineLink}>
              DNS Lookup
            </Link>
            . As próximas entram quando eu tiver uma pergunta que elas
            respondam.
          </p>
        </>
      }
    >
      <InfoSection id="feito" title="Do que é feito">
        <FactList items={stack} />
        <p className={prose}>
          O caminho de um pedido, o pipeline e a infraestrutura estão explicados
          na página{" "}
          <Link to="/arquitetura" className={inlineLink}>
            Arquitetura
          </Link>
          .
        </p>
      </InfoSection>

      <InfoSection id="uso" title="Como funciona o uso">
        <p className={prose}>
          Não tem conta nem login: abrir e usar. O teste parte de uma máquina
          minha, a sonda, em São Paulo, e não do seu navegador. Por isso a
          latência do ping é a do caminho entre a sonda e o destino, e cada
          resultado diz de onde saiu.
        </p>
        <p className={prose}>
          A API recusa endereços privados e reservados antes de testar qualquer
          coisa, para que o laboratório não sirva de ponte para a rede de
          ninguém. O limite é de 50 pedidos a cada 5 minutos por endereço.
        </p>
      </InfoSection>

      <InfoSection id="decisoes" title="Como as decisões ficam registradas">
        <p className={prose}>
          Costumo escrever uma especificação antes de construir cada parte e
          registro as escolhas difíceis em ADRs, que são notas curtas sobre o
          que foi decidido e por quê. Ficam em <code>docs/</code> no
          repositório, junto com o código, que é MIT. Sugestões e problemas
          entram como issues.
        </p>
        <SourceLinks
          sources={[
            { href: repository, label: "Repositório no GitHub" },
            {
              href: `${repository}/tree/main/docs/superpowers/specs`,
              label: "Especificações",
            },
            {
              href: `${repository}/tree/main/docs/adr`,
              label: "Decisões de arquitetura (ADRs)",
            },
            {
              href: `${repository}/issues`,
              label: "Enviar sugestão ou relatar um problema",
            },
          ]}
        />
      </InfoSection>
    </InfoPage>
  )
}

export default Sobre
