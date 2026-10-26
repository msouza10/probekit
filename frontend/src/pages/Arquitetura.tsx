import type { ReactNode } from "react"
import { ArchitectureDiagram } from "@/components/diagrams/ArchitectureDiagram"
import { InfrastructureDiagram } from "@/components/diagrams/InfrastructureDiagram"
import { PipelineDiagram } from "@/components/diagrams/PipelineDiagram"
import {
  FactList,
  InfoPage,
  InfoSection,
  SourceLinks,
} from "@/components/page/InfoPage"
import { introText, prose } from "@/components/page/classes"

const repository = "https://github.com/msouza10/probekit"
const adr = (file: string) => `${repository}/blob/main/docs/adr/${file}`

type Source = { href: string; label: string }

// Cada parágrafo só afirma o que está nestes arquivos: OVERVIEW.md,
// docs/adr (0001, 0002, 0005, 0007, 0008), .github/workflows e infra/terraform.
const sections: {
  id: string
  number: string
  title: string
  paragraphs: string[]
  diagram: ReactNode
  sources: Source[]
}[] = [
  {
    id: "arquitetura",
    number: "01",
    title: "Do navegador à API",
    paragraphs: [
      "O site é estático, servido por um Cloudflare Worker. Quando uma ferramenta roda, o navegador chama a API em api.probekit.cc: o pedido passa pelo proxy da Cloudflare, chega ao balanceador de carga da Oracle Cloud e cai em uma das duas máquinas, onde o binário em Go termina o TLS.",
      "Antes de qualquer pacote sair, a API confere o destino e recusa endereços privados, de loopback e de link-local. O ping usa ICMP de verdade, então a latência mostrada é a da máquina até o alvo. O limite é de 50 requisições a cada 5 minutos por visitante. Como o pedido chega pela Cloudflare, a API lê o endereço do visitante no cabeçalho CF-Connecting-IP, mas só quando a conexão vem de uma faixa de endereços da Cloudflare; quem acessar o balanceador direto não consegue forjá-lo. A contagem fica na memória de cada servidor.",
    ],
    diagram: <ArchitectureDiagram />,
    sources: [
      { href: `${repository}/blob/main/OVERVIEW.md`, label: "Visão geral" },
      {
        href: adr("0001-oci-network-load-balancer.md"),
        label: "ADR 0001: balanceador de carga",
      },
      {
        href: adr("0002-terminacao-tls-cloudflare-full-strict.md"),
        label: "ADR 0002: TLS na Cloudflare",
      },
    ],
  },
  {
    id: "pipeline",
    number: "02",
    title: "Pipeline",
    paragraphs: [
      "Em cada pull request roda o CI, com os jobs Go, NPM e Terraform. Quando uma mudança do backend chega à main, o pipeline da API calcula a versão e só publica uma release se as mensagens de commit pedirem: feat, fix ou perf, ou uma quebra de compatibilidade (BREAKING CHANGE: ou !:), que sobe a versão maior. O site é construído quando uma mudança do frontend chega à main, e o deploy espera a aprovação do ambiente production.",
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
      {
        href: adr("0008-deploy-do-site-pelo-github-actions.md"),
        label: "ADR 0008: deploy do site",
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
    diagram: <InfrastructureDiagram />,
    sources: [
      {
        href: `${repository}/tree/main/infra/terraform`,
        label: "Terraform",
      },
      {
        href: adr("0005-atualizacao-das-vms-e-deploy-inicial.md"),
        label: "ADR 0005: atualização das VMs",
      },
    ],
  },
]

const principles = [
  {
    term: "Roda de verdade",
    detail:
      "Em produção o resultado vem da API, nunca de uma simulação, e a página diz de onde o teste saiu.",
  },
  {
    term: "Fica registrado",
    detail:
      "As escolhas difíceis viram ADRs: notas curtas sobre o que foi decidido e por quê.",
  },
  {
    term: "Código aberto",
    detail:
      "O código é MIT e está inteiro no repositório, com o Terraform e os workflows.",
  },
]

export function Arquitetura() {
  return (
    <InfoPage
      title="Arquitetura"
      intro={
        <p className={introText}>
          Como o laboratório é montado. O site é estático, na Cloudflare, e a
          API, em Go, roda em duas máquinas da Oracle Cloud em São Paulo, atrás
          de um balanceador de carga.
        </p>
      }
    >
      {sections.map(({ id, number, title, paragraphs, diagram, sources }) => (
        <InfoSection key={id} id={`secao-${id}`} number={number} title={title}>
          {paragraphs.map((text) => (
            <p key={text} className={prose}>
              {text}
            </p>
          ))}
          {diagram}
          <SourceLinks sources={sources} />
        </InfoSection>
      ))}

      <InfoSection id="principios" title="Princípios">
        <FactList items={principles} termWidth="10rem" />
      </InfoSection>
    </InfoPage>
  )
}

export default Arquitetura
