import { Diagram, type DiagramStep } from "./Diagram"
import {
  Node,
  SUB,
  NAME,
  Zone,
  arrow,
  delay,
  type Box,
  type Cloud,
} from "./svgParts"

/*
 * Mesma linguagem visual do ArchitectureDiagram (ver o comentário dele):
 * viewBox de 600 de largura, nomes em 15 e secundário em 13 unidades, blocos
 * `fill-card stroke-border`, zonas tracejadas `stroke-input`, ligações
 * ortogonais com cantos de raio 12 e setas abertas.
 * Aqui as linhas se desenham uma vez e os recursos entram em sequência: o
 * código, o plan, a aprovação, o apply e, por fim, o que ele cria em cada
 * nuvem. Só as
 * ligações são contínuas e cinza, porque saem do apply (Terraform), que não é
 * uma cloud; a cor fica nas zonas dos provedores.
 * O bloco do estado remoto é tracejado e fica parado.
 */

// Linha de cima: código -> plan -> aprovação -> apply, e o estado remoto à
// direita. Plan, aprovação e apply são blocos separados porque o plano salvo e
// a aprovação entre os dois são o que o apply tem de diferente de um `apply`
// solto.
const code: Box = { x: 4, y: 8, w: 72 }
const plan: Box = { x: 104, y: 8, w: 72 }
const approval: Box = { x: 204, y: 8, w: 112 }
const apply: Box = { x: 344, y: 8, w: 92 }
const state = { x: 464, y: 8, w: 132, h: 64 }
// Zonas e recursos (centro do bloco em y=196).
const oracle = { x: 4, y: 120, w: 372, h: 120 }
const cloudflare = { x: 396, y: 120, w: 200, h: 120 }
const rede: Box = { x: 20, y: 164, w: 104 }
const vms: Box = { x: 140, y: 164, w: 104 }
const balanceador: Box = { x: 260, y: 164, w: 104 }
const dns: Box = { x: 412, y: 164, w: 168 }

// Trechos visíveis das ligações (de borda a borda).
const lines = {
  codePlan: "M76 40 H104",
  planApproval: "M176 40 H204",
  approvalApply: "M316 40 H344",
  applyOracle: "M374 72 V96 Q374 108 362 108 H252 Q240 108 240 120",
  applyCloudflare: "M406 72 V96 Q406 108 418 108 H484 Q496 108 496 120",
}
// Apply -> estado remoto: tracejado e parado.
const stateLine = "M436 40 H464"

function ProviderZone({
  zone,
  label,
  cloud,
  enter,
}: {
  zone: { x: number; y: number; w: number; h: number }
  label: string
  cloud: Cloud
  enter: number
}) {
  return (
    <g className="diagram-pop" style={delay(enter)}>
      <Zone
        x={zone.x}
        y={zone.y}
        width={zone.w}
        height={zone.h}
        label={label}
        labelY={zone.y + 26}
        cloud={cloud}
      />
    </g>
  )
}

const steps: DiagramStep[] = [
  {
    // infra/terraform/*.tf (main.tf, backend.tf, oci/*.tf, cloudflare/dns.tf)
    title: "Escrever o código",
    tag: "*.tf",
    detail:
      "A infraestrutura é descrita em arquivos do Terraform, na pasta infra/terraform do repositório.",
  },
  {
    // deploy-api-golang.yml (workflow_dispatch; job plan-deploy: terraform
    // plan -out=tfplan, openssl enc -aes-256-cbc, upload-artifact com
    // retention-days: 1); ADR-0005 (apply não roda sem ordem explícita)
    title: "Plan",
    detail:
      "O workflow Deploy API, disparado à mão, roda o terraform plan e guarda o plano como artefato cifrado, que expira em um dia.",
  },
  {
    // deploy-api-golang.yml (job deploy, needs: plan-deploy, environment:
    // production); o ambiente tem um revisor obrigatório (ADR-0008)
    title: "Aprovação",
    detail:
      "O job do apply roda no ambiente production, que exige a aprovação de um revisor antes de começar.",
  },
  {
    // deploy-api-golang.yml (openssl enc -d; terraform apply do tfplan)
    title: "Apply",
    detail:
      "O apply decifra e aplica exatamente esse plano salvo, sem calcular outro.",
  },
  {
    // infra/terraform/oci/network.tf (VCN, sub-rede, gateway, rota, security
    // list); instance.tf (count = 2); loadbalacers.tf (network load balancer)
    title: "Criar a rede, as duas VMs e o balanceador na OCI",
    detail:
      "Na Oracle Cloud o Terraform cria a rede, as duas máquinas virtuais da API e o balanceador de carga que fica na frente delas.",
  },
  {
    // infra/terraform/cloudflare/dns.tf (cloudflare_dns_record "api",
    // proxied = true, aponta para o IP do balanceador)
    title: "Criar o registro DNS da API na Cloudflare",
    detail:
      "Na Cloudflare o Terraform cria o registro DNS api, com proxy, apontando para o balanceador.",
  },
  {
    // infra/terraform/backend.tf (backend "oci", bucket); ADR-0005 (state
    // remoto permite que o CI rode plan e apply)
    title: "Guardar o estado num bucket remoto",
    detail:
      "O estado do Terraform fica num bucket da Oracle Cloud, e não na máquina de quem roda. É por isso que o CI consegue rodar o plan e o apply. O Worker do site não faz parte: quem o publica é o pipeline.",
  },
]

const title = "A infraestrutura criada pelo Terraform"
const summary =
  "A infraestrutura do Probekit em Terraform: o código em arquivos .tf passa por plan, aprovação e apply, no workflow Deploy API disparado à mão. O apply cria na Oracle Cloud a rede, as duas VMs e o balanceador de carga e, na Cloudflare, o registro DNS da API. O estado fica num bucket remoto da Oracle Cloud. O Worker do site é publicado pelo pipeline, não pelo Terraform."

export function InfrastructureDiagram() {
  return (
    <Diagram id="infraestrutura" title={title} summary={summary} steps={steps}>
      {(ids) => (
        <svg
          role="img"
          aria-labelledby={`${ids.title} ${ids.summary}`}
          viewBox="0 0 600 248"
          className="block h-auto w-full max-w-[600px] font-sans"
        >
          <title id={ids.title}>{title}</title>
          <desc id={ids.summary}>{summary}</desc>

          {/* Zonas. Fonte: infra/terraform/main.tf (módulos oci e cloudflare) */}
          <ProviderZone
            zone={oracle}
            label="Oracle Cloud"
            cloud="oracle"
            enter={0.9}
          />
          <ProviderZone
            zone={cloudflare}
            label="Cloudflare"
            cloud="cloudflare"
            enter={0.9}
          />

          {/* Ligações: linhas contínuas, desenhadas uma vez. */}
          <g className="fill-none stroke-input" strokeWidth={1.25}>
            {Object.values(lines).map((d, index) => (
              <path
                key={d}
                d={d}
                pathLength={1}
                className="diagram-draw"
                style={delay(0.2 + index * 0.2)}
              />
            ))}
          </g>
          {/* Apply -> estado remoto: parado (o estado não é um fluxo). */}
          <path
            d={stateLine}
            className="fill-none stroke-input"
            strokeWidth={1.25}
            strokeDasharray="5 5"
          />

          {/* Setas: todas cinza; o apply (Terraform) não é uma cloud. */}
          <g
            className="fill-none"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={arrow("right", 104, 40)} className="stroke-input" />
            <path d={arrow("right", 204, 40)} className="stroke-input" />
            <path d={arrow("right", 344, 40)} className="stroke-input" />
            <path d={arrow("right", 464, 40)} className="stroke-input" />
            <path d={arrow("down", 240, 120)} className={"stroke-input"} />
            <path d={arrow("down", 496, 120)} className={"stroke-input"} />
          </g>

          {/* *.tf: infra/terraform (main.tf, backend.tf, oci/*.tf, cloudflare/) */}
          <Node
            box={code}
            name="*.tf"
            monoName
            lines={[{ text: "o código" }]}
            enter={0}
          />
          {/* plan: deploy-api-golang.yml (job plan-deploy; plano cifrado e salvo) */}
          <Node
            box={plan}
            name="plan"
            monoName
            lines={[{ text: "salvo" }]}
            enter={0.2}
          />
          {/* aprovação: deploy-api-golang.yml (job deploy, environment production) */}
          <Node
            box={approval}
            name="aprovação"
            lines={[{ text: "production" }]}
            enter={0.4}
          />
          {/* apply: deploy-api-golang.yml (job deploy; terraform apply do plano salvo) */}
          <Node
            box={apply}
            name="apply"
            monoName
            lines={[{ text: "mesmo plano" }]}
            enter={0.6}
          />
          {/* Rede: oci/network.tf (VCN, sub-rede, gateway, rota, security list) */}
          <Node box={rede} name="Rede" enter={1.1} />
          {/* 2 VMs: oci/instance.tf (oci_core_instance, count = 2) */}
          <Node box={vms} name="2 VMs" enter={1.2} />
          {/* Balanceador: oci/loadbalacers.tf (network load balancer) */}
          <Node box={balanceador} name="Balanceador" enter={1.3} />
          {/* DNS api (proxied): cloudflare/dns.tf (name api.*, proxied = true) */}
          <Node box={dns} name="DNS api (proxied)" monoName enter={1.2} />

          {/* Estado remoto: backend.tf (backend "oci", bucket). Parado. */}
          <g data-state>
            <rect
              x={state.x}
              y={state.y}
              width={state.w}
              height={state.h}
              rx={6}
              strokeDasharray="3 5"
              className="fill-none stroke-input"
            />
            <text
              x={state.x + state.w / 2}
              y={state.y + 27}
              textAnchor="middle"
              fontSize={NAME}
              className="fill-foreground font-medium"
            >
              Estado remoto
            </text>
            <text
              x={state.x + state.w / 2}
              y={state.y + 46}
              textAnchor="middle"
              fontSize={SUB}
              className="fill-muted-foreground"
            >
              bucket na OCI
            </text>
          </g>
        </svg>
      )}
    </Diagram>
  )
}
