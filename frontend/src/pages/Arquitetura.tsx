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
  // Lista de fases explicadas, logo abaixo do diagrama.
  phases?: { term: string; detail: string }[]
  sources: Source[]
}[] = [
  {
    id: "arquitetura",
    number: "01",
    title: "Do cliente à API",
    paragraphs: [
      "O cliente faz dois pedidos independentes. O primeiro vai ao Cloudflare Workers, que serve a interface web, uma SPA em React com HTML, JS e CSS estáticos. O segundo é feito pela própria interface, já no cliente: o JavaScript dela chama a API em api.probekit.cc, em outra origem e com CORS. Esse pedido passa pelo proxy da Cloudflare, chega ao NLB da Oracle Cloud e cai em uma das duas máquinas, onde o binário em Go termina o TLS. O Workers não fica no caminho da API.",
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
      "Do pull request à produção, o pipeline tem quatro fases: pull request e CI, build e release, deploy e recuperação. A API e o site seguem trilhas diferentes no build e no deploy, porque o gatilho, o release e o deploy de cada um são diferentes. O diagrama no fim da seção mostra as fases na ordem.",
    ],
    diagram: <PipelineDiagram />,
    phases: [
      {
        term: "01 · Pull request e CI",
        detail:
          "Toda mudança entra por um pull request que aponta para a main, e o CI roda nele, antes do merge, com três jobs: Go (testes e linters), NPM (lint, verificação de formato, testes e build) e Terraform (fmt, init sem backend e validate, nunca um plan). O ruleset da main só deixa o merge acontecer com esses três checks verdes (Go, Terraform e NPM), e só aceita merge commit. O merge na main é o que dispara a fase seguinte.",
      },
      {
        term: "02 · Build e release",
        detail:
          "As trilhas se separam. Uma mudança em backend/** dispara o release da API: testes, cálculo da versão e, só se as mensagens de commit pedirem (feat, fix, perf ou uma quebra de compatibilidade, com BREAKING CHANGE: ou !:), o binário Linux com checksum e a release no GitHub. Uma mudança em frontend/** dispara o build do site: lint, formato, testes, build e uma checagem de que a URL da API entrou no build.",
      },
      {
        term: "03 · Deploy",
        detail:
          "O deploy da API é manual: um job plan gera o plano do Terraform, cifrado, e o job deploy, no ambiente production, aplica o plano, atualiza a VM 1, depois a VM 2, e verifica a API pública. O deploy do site é automático na main, depois do build, mas espera a aprovação do ambiente production; publica com wrangler e verifica o site e se a API aceita a origem dele. A API chega à Oracle Cloud; o site, à Cloudflare.",
      },
      {
        term: "04 · Recuperação",
        detail:
          "Cada produto tem um workflow de rollback, manual e também no ambiente production, fora do caminho normal. O do site volta o Worker para uma versão anterior ou para a informada; o da API marca uma release anterior como a mais recente. Os dois conferem o alvo antes e verificam no fim que o rollback valeu.",
      },
    ],
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
      {sections.map(
        ({ id, number, title, paragraphs, diagram, phases, sources }) => (
          <InfoSection
            key={id}
            id={`secao-${id}`}
            number={number}
            title={title}
          >
            {paragraphs.map((text) => (
              <p key={text} className={prose}>
                {text}
              </p>
            ))}
            {phases ? <FactList items={phases} termWidth="13rem" /> : null}
            {diagram}
            <SourceLinks sources={sources} />
          </InfoSection>
        ),
      )}

      <InfoSection id="principios" title="Princípios">
        <FactList items={principles} termWidth="10rem" />
      </InfoSection>
    </InfoPage>
  )
}

export default Arquitetura
