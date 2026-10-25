import type { CSSProperties } from "react"
import { Diagram, type DiagramStep } from "./Diagram"

/*
 * Linguagem visual dos diagramas largos (as Tasks de Pipeline e
 * Infraestrutura reaproveitam):
 * - viewBox de 600 de largura e svg limitado a 600px (`max-w-[600px]`): de
 *   1280 até ~600px de coluna, 1 unidade = 1px. A coluna mais estreita em que o
 *   svg aparece é 576px (viewport de 640 menos o `sm:px-8`), escala 0,96.
 * - Texto: nome do bloco 15 (= `text-body-sm` da lista), secundário e rótulo
 *   de zona 13 (= `text-caption`). Em 576px viram 14,4 e 12,5px efetivos.
 * - Bloco: retângulo `fill-card stroke-border`, raio 6 (`rounded-md`), altura
 *   64; nome com baseline em y+27, secundário em y+46.
 * - Zona: retângulo tracejado `stroke-input`, raio 10, rótulo no canto.
 * - Ligação: traço `stroke-input` (3:1 sobre o fundo, como a borda de campo)
 *   em linhas ortogonais com cantos de raio 12, seta aberta no fim. O caminho
 *   do pedido ganha por cima um tracejado `stroke-highlight` (`diagram-flow`).
 * - Pontos: círculos `diagram-packet` desenhados ANTES dos blocos, então
 *   somem por baixo de cada bloco que atravessam (o "processamento").
 */
const NAME = 15
const SUB = 13
const BOX_H = 64

type Box = { x: number; y: number; w: number }

// Geometria: duas linhas (centros y=92 e y=204) e o meio (y=148).
const navegador: Box = { x: 4, y: 116, w: 96 }
const worker: Box = { x: 138, y: 60, w: 148 }
const proxy: Box = { x: 138, y: 172, w: 148 }
const balanceador: Box = { x: 338, y: 116, w: 112 }
const vm1: Box = { x: 496, y: 60, w: 88 }
const vm2: Box = { x: 496, y: 172, w: 88 }

// Trechos visíveis das ligações (de borda a borda de bloco).
const lines = {
  site: "M52 116 V104 Q52 92 64 92 H138",
  api: "M52 180 V192 Q52 204 64 204 H138",
  origem: "M286 204 H300 Q312 204 312 192 V160 Q312 148 324 148 H338",
  vm1: "M394 116 V104 Q394 92 406 92 H496",
  vm2: "M394 180 V192 Q394 204 406 204 H496",
}

// Caminhos completos dos pontos: começam no centro do Navegador e terminam
// no centro do bloco de destino, passando por dentro dos blocos (escondidos).
const packetPaths = {
  site: "M52 148 V104 Q52 92 64 92 H212",
  vm1: "M52 148 V192 Q52 204 64 204 H300 Q312 204 312 192 V160 Q312 148 324 148 H394 V104 Q394 92 406 92 H540",
  vm2: "M52 148 V192 Q52 204 64 204 H300 Q312 204 312 192 V160 Q312 148 324 148 H394 V192 Q394 204 406 204 H540",
}

// Seta aberta que termina em (x, y), apontando para a direita.
function arrow(x: number, y: number) {
  return `M${x - 6} ${y - 5} L${x} ${y} L${x - 6} ${y + 5}`
}

function delay(seconds: number): CSSProperties {
  return { animationDelay: `${seconds}s` }
}

function Node({
  box,
  name,
  detail,
  mono = false,
  pulse,
  enter,
}: {
  box: Box
  name: string
  detail: string
  mono?: boolean
  /** Atraso da respiração da borda; sem ele o bloco não respira. */
  pulse?: number
  /** Atraso da entrada do bloco. */
  enter: number
}) {
  const cx = box.x + box.w / 2
  return (
    <g className="diagram-pop" style={delay(enter)}>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={BOX_H}
        rx={6}
        className={`fill-card stroke-border${pulse === undefined ? "" : " diagram-pulse"}`}
        style={pulse === undefined ? undefined : delay(pulse)}
      />
      <text
        x={cx}
        y={box.y + 27}
        textAnchor="middle"
        fontSize={NAME}
        className="fill-foreground font-medium"
      >
        {name}
      </text>
      <text
        x={cx}
        y={box.y + 46}
        textAnchor="middle"
        fontSize={SUB}
        className={`fill-muted-foreground${mono ? " font-mono" : ""}`}
      >
        {detail}
      </text>
    </g>
  )
}

function Zone({
  x,
  width,
  label,
}: {
  x: number
  width: number
  label: string
}) {
  return (
    <g>
      <rect
        x={x}
        y={4}
        width={width}
        height={248}
        rx={10}
        strokeDasharray="3 5"
        className="fill-none stroke-input"
      />
      <text
        x={x + 14}
        y={30}
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
    // OVERVIEW.md (decisões confirmadas); frontend/wrangler.toml ([assets])
    title: "Você abre o site",
    detail:
      "Os arquivos estáticos do site saem de um Worker, na borda da Cloudflare.",
    tag: "Worker",
  },
  {
    // OVERVIEW.md (registro DNS `api` proxied); ADR-0002
    title: "O navegador chama a API",
    detail: "Cada teste vai para a API e passa antes pelo proxy da Cloudflare.",
    tag: "api.probekit.cc",
  },
  {
    // ADR-0001; infra/terraform/oci/loadbalacers.tf (listener TCP 443,
    // backend count = 2); infra/terraform/main.tf (sa-saopaulo-1)
    title: "O balanceador escolhe uma VM",
    detail:
      "O balanceador de carga da Oracle Cloud, em São Paulo, repassa a conexão para uma das duas VMs.",
    tag: "TCP 443",
  },
  {
    // ADR-0002 e main.go (ListenAndServeTLS); utils/privatecheck.go
    title: "A API confere o destino",
    detail:
      "A API em Go, que termina o TLS no próprio binário, recusa endereços privados, de loopback e de link-local.",
  },
  {
    // handler/ping.go (pro-bing); handler/lookup.go (net.Lookup*, resolvedor
    // padrão do sistema)
    title: "O teste roda de verdade",
    detail:
      "O ping envia ICMP de verdade, e o DNS usa o resolvedor do sistema da VM, não os servidores autoritativos do domínio.",
  },
  {
    // utils/response.go (SetJSON, Content-Type application/json)
    title: "A resposta volta em JSON",
    detail: "O resultado faz o caminho de volta até o navegador.",
    tag: "JSON",
  },
]

const title = "O caminho de um pedido"
const summary =
  "A arquitetura do site e da API: o navegador recebe o site de um Worker da Cloudflare e, a cada teste, chama api.probekit.cc, que passa pelo proxy da Cloudflare e pelo balanceador da Oracle Cloud em São Paulo até uma das duas VMs com a API em Go."

export function ArchitectureDiagram() {
  return (
    <Diagram id="arquitetura" title={title} summary={summary} steps={steps}>
      {(ids) => (
        <svg
          role="img"
          aria-labelledby={`${ids.title} ${ids.summary}`}
          viewBox="0 0 600 256"
          className="block h-auto w-full max-w-[600px] font-sans"
        >
          <title id={ids.title}>{title}</title>
          <desc id={ids.summary}>{summary}</desc>

          {/* Fonte: OVERVIEW.md (Worker na Cloudflare, registro `api` proxied) */}
          <Zone x={124} width={176} label="Cloudflare" />
          {/* Fonte: infra/terraform/main.tf (region sa-saopaulo-1) */}
          <Zone x={324} width={272} label="Oracle Cloud · São Paulo" />

          {/* Ligações: base que se desenha uma vez. */}
          <g className="fill-none stroke-input" strokeWidth={1.25}>
            {Object.values(lines).map((d, index) => (
              <path
                key={d}
                d={d}
                pathLength={1}
                className="diagram-draw"
                style={delay(0.3 + index * 0.12)}
              />
            ))}
          </g>
          {/* Caminho do pedido: tracejado que flui por cima da base. */}
          <g className="diagram-pop" style={delay(1.1)}>
            <g className="fill-none stroke-highlight" strokeWidth={1.5}>
              {[lines.api, lines.origem, lines.vm1, lines.vm2].map((d) => (
                <path key={d} d={d} className="diagram-flow" />
              ))}
            </g>
          </g>

          {/* Pontos: antes dos blocos, para passarem por baixo deles. */}
          <circle
            r={3}
            className="diagram-packet"
            style={{
              offsetPath: `path("${packetPaths.site}")`,
              fill: "var(--muted-foreground)",
              animationDelay: "0.9s",
              ["--diagram-travel" as string]: "2.4s",
            }}
          />
          <circle
            r={3.5}
            className="diagram-packet"
            style={{
              offsetPath: `path("${packetPaths.vm1}")`,
              animationDelay: "1.3s",
              ["--diagram-travel" as string]: "5s",
            }}
          />
          <circle
            r={3.5}
            className="diagram-packet"
            style={{
              offsetPath: `path("${packetPaths.vm2}")`,
              animationDelay: "3.8s",
              ["--diagram-travel" as string]: "5s",
            }}
          />

          {/* Setas: cinza para o site, destaque para o caminho do pedido. */}
          <g
            className="fill-none"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={arrow(138, 92)} className="stroke-input" />
            <path d={arrow(138, 204)} className="stroke-highlight" />
            <path d={arrow(338, 148)} className="stroke-highlight" />
            <path d={arrow(496, 92)} className="stroke-highlight" />
            <path d={arrow(496, 204)} className="stroke-highlight" />
          </g>

          {/* Navegador: quem visita (você). */}
          <Node box={navegador} name="Navegador" detail="você" enter={0} />
          {/* Worker e Proxy: OVERVIEW.md; frontend/wrangler.toml; ADR-0002 */}
          <Node
            box={worker}
            name="Worker"
            detail="este site, estático"
            enter={0.08}
          />
          <Node
            box={proxy}
            name="Proxy da API"
            detail="api.probekit.cc"
            mono
            enter={0.16}
          />
          {/* Balanceador: ADR-0001; oci/loadbalacers.tf (listener TCP 443) */}
          <Node
            box={balanceador}
            name="Balanceador"
            detail="TCP 443"
            enter={0.24}
          />
          {/* VMs: oci/instance.tf (count = 2); backend/api-service-golang */}
          <Node
            box={vm1}
            name="VM 1"
            detail="API em Go"
            pulse={0}
            enter={0.32}
          />
          <Node
            box={vm2}
            name="VM 2"
            detail="API em Go"
            pulse={2}
            enter={0.4}
          />
        </svg>
      )}
    </Diagram>
  )
}
