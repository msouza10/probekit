import { Diagram, type DiagramStep } from "./Diagram"
import { Node, SUB, NAME, arrow, delay, type Box } from "./svgParts"

/*
 * Mesma linguagem visual do ArchitectureDiagram (ver o comentário dele):
 * viewBox de 600 de largura, nomes em 15 e secundário em 13 unidades, blocos
 * `fill-card stroke-border`, zonas tracejadas `stroke-input`, ligações
 * ortogonais com cantos de raio 12 e setas abertas.
 * Aqui as linhas se desenham uma vez e os recursos entram em sequência: o
 * código, o plan → apply e, por fim, o que ele cria em cada nuvem. Só as
 * ligações que saem do apply ganham o fluxo discreto em `stroke-highlight`.
 * O bloco do estado remoto é tracejado e fica parado.
 */

// Linha de cima: código -> plan -> apply, e o estado remoto à direita.
const code: Box = { x: 4, y: 8, w: 136 }
const apply: Box = { x: 190, y: 8, w: 176 }
const state = { x: 456, y: 8, w: 140, h: 64 }
// Zonas e recursos (centro do bloco em y=196).
const oracle = { x: 4, y: 120, w: 372, h: 120 }
const cloudflare = { x: 396, y: 120, w: 200, h: 120 }
const rede: Box = { x: 20, y: 164, w: 104 }
const vms: Box = { x: 140, y: 164, w: 104 }
const balanceador: Box = { x: 260, y: 164, w: 104 }
const dns: Box = { x: 412, y: 164, w: 168 }

// Trechos visíveis das ligações (de borda a borda).
const lines = {
  codeApply: "M140 40 H190",
  applyOracle: "M240 72 V120",
  applyCloudflare: "M320 72 V96 Q320 108 332 108 H484 Q496 108 496 120",
}
// Só o que o apply cria ganha o fluxo.
const created = [lines.applyOracle, lines.applyCloudflare]
// Apply -> estado remoto: tracejado e parado.
const stateLine = "M366 40 H456"

function Zone({
  zone,
  label,
  enter,
}: {
  zone: { x: number; y: number; w: number; h: number }
  label: string
  enter: number
}) {
  return (
    <g className="diagram-pop" style={delay(enter)}>
      <rect
        x={zone.x}
        y={zone.y}
        width={zone.w}
        height={zone.h}
        rx={10}
        strokeDasharray="3 5"
        className="fill-none stroke-input"
      />
      <text
        x={zone.x + 14}
        y={zone.y + 26}
        fontSize={SUB}
        className="fill-muted-foreground font-medium"
      >
        {label}
      </text>
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
    // deploy-api-golang.yml (workflow_dispatch; job plan-deploy, depois job
    // deploy no ambiente production com `terraform apply` do plano salvo);
    // ADR-0005 (apply não roda sem ordem explícita)
    title: "Plan e apply",
    tag: "plan → apply",
    detail:
      "O plan e o apply rodam no workflow Deploy da API, que é disparado à mão. O plan fica salvo, e o apply só segue depois da aprovação do ambiente production e aplica exatamente esse plano.",
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
  "A infraestrutura do Probekit em Terraform: o código em arquivos .tf passa por plan e apply, que criam na Oracle Cloud a rede, as duas VMs e o balanceador de carga e, na Cloudflare, o registro DNS da API. O estado fica num bucket remoto da Oracle Cloud. O Worker do site é publicado pelo pipeline, não pelo Terraform."

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
          <Zone zone={oracle} label="Oracle Cloud" enter={0.5} />
          <Zone zone={cloudflare} label="Cloudflare" enter={0.5} />

          {/* Ligações: base que se desenha uma vez. */}
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
          {/* O que o apply cria: tracejado discreto que flui por cima. */}
          <g className="diagram-pop" style={delay(1.4)}>
            <g className="fill-none stroke-highlight" strokeWidth={1.5}>
              {created.map((d) => (
                <path key={d} d={d} className="diagram-flow" />
              ))}
            </g>
          </g>
          {/* Apply -> estado remoto: parado (o estado não é um fluxo). */}
          <path
            d={stateLine}
            className="fill-none stroke-input"
            strokeWidth={1.25}
            strokeDasharray="5 5"
          />

          {/* Setas: cinza no código e no estado, destaque no que é criado. */}
          <g
            className="fill-none"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={arrow("right", 190, 40)} className="stroke-input" />
            <path d={arrow("right", 456, 40)} className="stroke-input" />
            <path d={arrow("down", 240, 120)} className="stroke-highlight" />
            <path d={arrow("down", 496, 120)} className="stroke-highlight" />
          </g>

          {/* *.tf: infra/terraform (main.tf, backend.tf, oci/*.tf, cloudflare/) */}
          <Node
            box={code}
            name="*.tf"
            monoName
            lines={[{ text: "o código" }]}
            enter={0}
          />
          {/* plan → apply: deploy-api-golang.yml (job plan-deploy, job deploy) */}
          <Node
            box={apply}
            name="plan → apply"
            monoName
            lines={[{ text: "terraform" }]}
            enter={0.3}
          />
          {/* Rede: oci/network.tf (VCN, sub-rede, gateway, rota, security list) */}
          <Node box={rede} name="Rede" enter={0.7} />
          {/* 2 VMs: oci/instance.tf (oci_core_instance, count = 2) */}
          <Node box={vms} name="2 VMs" enter={0.8} />
          {/* Balanceador: oci/loadbalacers.tf (network load balancer) */}
          <Node box={balanceador} name="Balanceador" enter={0.9} />
          {/* DNS api (proxied): cloudflare/dns.tf (name api.*, proxied = true) */}
          <Node box={dns} name="DNS api (proxied)" monoName enter={0.8} />

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
