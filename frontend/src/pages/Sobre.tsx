import { Link } from "react-router-dom"
import { InfoPage, InfoSection, SourceLinks } from "@/components/page/InfoPage"
import { CreditsGrid } from "@/components/page/CreditsGrid"
import { StackMap, type Layer } from "@/components/page/StackMap"
import { AuthorCard, type Author } from "@/components/page/AuthorCard"
import { inlineLink, introText, prose } from "@/components/page/classes"

const repository = "https://github.com/msouza10/probekit"

const layers: Layer[] = [
  {
    name: "Site",
    role: "O que você abre no navegador",
    detail:
      "Interface em React 19, estilizada com Tailwind v4 e empacotada com Vite. Um Cloudflare Worker entrega os arquivos estáticos.",
    tech: [
      { logo: "React", label: "React 19" },
      { logo: "Tailwind CSS", label: "Tailwind v4" },
      { logo: "Vite" },
      { logo: "Cloudflare", label: "Cloudflare Worker" },
    ],
  },
  {
    name: "API",
    role: "Quem faz a medição",
    detail: "Escrita em Go. Faz o ping (ICMP) e a consulta DNS.",
    tech: [{ logo: "Go" }],
  },
  {
    name: "Servidor",
    role: "Onde a API roda",
    detail:
      "Duas máquinas no free tier da Oracle Cloud, criadas com Terraform.",
    tech: [{ logo: "Oracle Cloud" }, { logo: "Terraform" }],
  },
]

const delivery: Layer = {
  name: "Entrega",
  role: "Como tudo chega ao ar",
  detail:
    "GitHub Actions: verificações em pull requests, release da API e deploy da API e do site, estes com aprovação antes de publicar.",
  tech: [{ logo: "GitHub", label: "GitHub Actions" }],
}

const author: Author = {
  name: "Marcos Souza",
  role: "Infraestrutura · Cloud · DevOps",
  photo: "/brand/marcos.webp",
  bio: [
    "Trabalho com infraestrutura de TI há alguns anos, principalmente com Linux, AWS, Azure e automação. Tenho certificações AWS, Microsoft Azure e Linux Essentials, e interesse especial em DevOps e SRE.",
    "Gosto de desenvolver projetos próprios para explorar tecnologias e colocar ideias em prática. O Probekit nasceu dessa vontade de aprender, experimentar e compartilhar o que construo.",
  ],
  links: [
    { href: "https://github.com/msouza10", label: "GitHub", icon: "github" },
    {
      href: "https://www.linkedin.com/in/marcos-vinicius-3905b1206/",
      label: "LinkedIn",
      icon: "linkedin",
    },
  ],
}

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
        <StackMap layers={layers} delivery={delivery} />
        <p className={prose}>
          O caminho de um pedido, o pipeline e a infraestrutura estão explicados
          na página{" "}
          <Link to="/arquitetura" className={inlineLink}>
            Arquitetura
          </Link>
          .
        </p>
      </InfoSection>

      <InfoSection id="limites" title="O que o resultado diz e o que não diz">
        <p className={prose}>
          Cada teste é uma medição feita por uma única sonda, em São Paulo.
          Outro ponto do mundo pode ver outro caminho e outra latência para o
          mesmo destino.
        </p>
        <p className={prose}>
          Um ping que não respondeu não prova que o destino está fora do ar:
          muitos servidores e firewalls descartam ICMP e continuam servindo o
          site normalmente. Na consulta DNS, a resposta vem do resolvedor da
          máquina da sonda, não dos servidores autoritativos do domínio, então
          pode estar em cache e demorar a refletir uma mudança recente.
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

      <InfoSection id="quem" title="Quem faz">
        <AuthorCard author={author} />
      </InfoSection>

      <InfoSection
        id="decisoes"
        title="Como as decisões ficam registradas"
        tocTitle="Decisões registradas"
      >
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

      <InfoSection id="creditos" title="Créditos">
        <CreditsGrid />
        <p className={prose}>
          Os nomes e logotipos pertencem aos seus donos e aparecem só para
          identificar as tecnologias usadas.
        </p>
      </InfoSection>
    </InfoPage>
  )
}

export default Sobre
