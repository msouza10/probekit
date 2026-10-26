import { Diagram, type DiagramStep } from "./Diagram"
import {
  Node,
  Zone,
  arrow,
  cloudStroke,
  delay,
  type Box,
  type Cloud,
} from "./svgParts"

/*
 * Linguagem visual dos diagramas largos (o Pipeline e a Infraestrutura a
 * reaproveitam; as peças comuns estão em svgParts.tsx):
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

 * - Cliente: o único ator externo ao sistema. Fica à esquerda, com fundo da
 *   página e traço de campo (não é um bloco do sistema), e dele partem os dois
 *   ramos: Frontend (entrega a interface) e Backend (a API).
 * - Onde roda: as zonas do papel (Frontend, Backend) contêm zonas de
 *   localização aninhadas: "Cloudflare · borda" (Workers e Proxy),
 *   "Oracle Cloud · sa-saopaulo-1" (NLB e VMs). A Interface Web fica fora de
 *   qualquer zona de provedor, porque roda no navegador do cliente.
 * - Cor por provedor: cada ligação e cada seta leva a cor da cloud para onde
 *   aponta (ou de onde sai, quando o destino é o cliente). O ponto muda de cor
 *   ao atravessar cada zona (`tint`, calculado da geometria dos caminhos).
 * - Pontos: círculos `diagram-packet` desenhados ANTES dos blocos, então
 *   somem por baixo de cada bloco que atravessam (o "processamento"). Todos
 *   vão até o destino e voltam (`animation-direction: alternate`), mostrando
 *   a resposta.
 */
// Geometria (viewBox 600x412). O Cliente fica no meio, à esquerda; o ramo do
// Frontend sobe (centro y=104) e o do Backend desce (centro y=308).
const cliente: Box = { x: 4, y: 174, w: 84 }
const worker: Box = { x: 136, y: 72, w: 172 }
const interfaceWeb: Box = { x: 372, y: 72, w: 140 }
const proxy: Box = { x: 136, y: 276, w: 172 }
const nlb: Box = { x: 348, y: 276, w: 100 }
const vm1: Box = { x: 482, y: 236, w: 92 }
const vm2: Box = { x: 482, y: 316, w: 92 }

// Trechos visíveis das ligações (de borda a borda de bloco).
const lines = {
  frontend: "M46 174 V116 Q46 104 58 104 H136",
  entrega: "M308 104 H372",
  backend: "M46 238 V296 Q46 308 58 308 H136",
  origem: "M308 308 H348",
  vm1: "M448 308 H458 Q470 308 470 296 V280 Q470 268 482 268",
  vm2: "M448 308 H458 Q470 308 470 320 V336 Q470 348 482 348",
}

// Cloud de cada ligação: a do bloco para onde ela aponta; a que sai do Workers
// em direção à interface (que roda no cliente) fica com a de onde sai.
const lineCloud: Record<keyof typeof lines, Cloud> = {
  frontend: "cloudflare",
  entrega: "cloudflare",
  backend: "cloudflare",
  origem: "oracle",
  vm1: "oracle",
  vm2: "oracle",
}

// Caminhos completos dos pontos: começam no centro do Cliente e terminam no
// centro do bloco de destino, passando por dentro dos blocos (escondidos).
const packetPaths = {
  frontend: "M46 206 V116 Q46 104 58 104 H442",
  vm1: "M46 206 V296 Q46 308 58 308 H458 Q470 308 470 296 V280 Q470 268 482 268 H528",
  vm2: "M46 206 V296 Q46 308 58 308 H458 Q470 308 470 320 V336 Q470 348 482 348 H528",
}

// Cor do ponto ao longo do caminho: [cor, % do percurso em que começa]. Os
// limites vêm de amostrar cada caminho contra as zonas (Cloudflare em x de 124
// a 320, Oracle a partir de 334): n = neutro, cf = Cloudflare, or = Oracle.
const tintStops = {
  frontend: [
    ["n", 0],
    ["cf", 35.6],
    ["n", 75.4],
  ],
  api: [
    ["n", 0],
    ["cf", 28.7],
    ["n", 60.9],
    ["or", 63.1],
  ],
} as const
const tintColor = {
  n: "var(--muted-foreground)",
  cf: "var(--cloud-cloudflare)",
  or: "var(--cloud-oracle)",
}
// Em `alternate` o ponto volta pelo mesmo caminho, então as cores acompanham.
function tintKeyframes(
  name: string,
  stops: readonly (readonly [string, number])[],
) {
  const body = stops
    .map(([color, from], index) => {
      const to = index + 1 < stops.length ? stops[index + 1][1] - 0.01 : 100
      return `${from}%, ${to}% { fill: ${tintColor[color as keyof typeof tintColor]}; }`
    })
    .join(" ")
  return `@keyframes ${name} { ${body} }`
}
const tintCss = [
  tintKeyframes("arq-tint-frontend", tintStops.frontend),
  tintKeyframes("arq-tint-api", tintStops.api),
].join(" ")

/** Estilo de um ponto: viaja pelo caminho e troca de cor conforme a zona. */
function packetStyle(
  path: string,
  tint: string,
  delaySeconds: number,
  travel: number,
) {
  const twice = (value: string) => `${value}, ${value}`
  return {
    offsetPath: `path("${path}")`,
    animationName: `diagram-travel, ${tint}`,
    animationDuration: twice(`${travel}s`),
    animationTimingFunction: twice("linear"),
    animationIterationCount: twice("infinite"),
    animationDirection: twice("alternate"),
    animationDelay: twice(`${delaySeconds}s`),
  }
}

const steps: DiagramStep[] = [
  {
    // OVERVIEW.md (decisões confirmadas); frontend/wrangler.toml ([assets])
    title: "O cliente carrega a interface",
    detail:
      "O cliente acessa probekit.cc. O Cloudflare Workers, na borda da Cloudflare, entrega a interface web (HTML, JS e CSS estáticos), que passa a rodar no navegador. O Worker só serve arquivos.",
    tag: "Workers",
  },
  {
    // ADR-0004 (a SPA chama a API direto, com CORS); ADR-0002
    title: "A interface chama a API",
    detail:
      "O JavaScript da interface, já no navegador, faz fetch para api.probekit.cc, outra origem, com CORS. O pedido passa pelo proxy da Cloudflare, também na borda, e o Worker não participa.",
    tag: "api.probekit.cc",
  },
  {
    // ADR-0001; infra/terraform/oci/loadbalacers.tf (listener TCP 443,
    // backend count = 2); infra/terraform/main.tf (sa-saopaulo-1)
    title: "O NLB escolhe uma VM",
    detail:
      "O Network Load Balancer da OCI, em L4 na porta TCP 443, repassa a conexão para uma das duas VMs.",
    tag: "TCP 443",
  },
  {
    // ADR-0002 e main.go (ListenAndServeTLS); utils/privatecheck.go
    title: "A API valida o destino",
    detail:
      "A API em Go termina o TLS no próprio binário e recusa endereços privados, de loopback e de link-local.",
  },
  {
    // handler/ping.go (pro-bing); handler/lookup.go (net.Lookup*, resolvedor
    // padrão do sistema)
    title: "A ferramenta executa",
    detail:
      "O ping envia ICMP. O DNS usa o resolvedor do sistema da VM, não os servidores autoritativos do domínio.",
  },
  {
    // utils/response.go (SetJSON, Content-Type application/json)
    title: "A resposta volta em JSON",
    detail:
      "A resposta segue o mesmo caminho de volta até o cliente, com os cabeçalhos CORS.",
    tag: "JSON",
  },
]

const title = "Fluxo de uma requisição"
const summary =
  "Arquitetura do site e da API: o cliente faz dois pedidos independentes. O primeiro vai ao Cloudflare Workers, na borda da Cloudflare (frontend), que entrega a interface web; ela roda no navegador. O segundo, feito pela interface, vai a api.probekit.cc: passa pelo proxy da Cloudflare, também na borda, e pelo NLB da OCI em sa-saopaulo-1 até uma das duas VMs com a API em Go. A resposta volta pelo mesmo caminho."

export function ArchitectureDiagram() {
  return (
    <Diagram id="arquitetura" title={title} summary={summary} steps={steps}>
      {(ids) => (
        <svg
          role="img"
          aria-labelledby={`${ids.title} ${ids.summary}`}
          viewBox="0 0 600 412"
          className="block h-auto w-full max-w-[600px] font-sans"
        >
          <title id={ids.title}>{title}</title>
          <desc id={ids.summary}>{summary}</desc>

          {/* Zonas por papel (Frontend, Backend) e, dentro delas, por onde roda.
              Fonte: OVERVIEW.md (Worker na Cloudflare, registro `api` proxied);
              infra/terraform/main.tf (region sa-saopaulo-1) */}
          <Zone
            x={112}
            y={4}
            width={420}
            height={148}
            label="Frontend"
            labelY={28}
          />
          <Zone
            x={124}
            y={40}
            width={196}
            height={104}
            label="Cloudflare · borda"
            labelY={62}
            cloud="cloudflare"
          />
          <Zone
            x={112}
            y={164}
            width={484}
            height={244}
            label="Backend"
            labelY={188}
          />
          <Zone
            x={124}
            y={244}
            width={196}
            height={108}
            label="Cloudflare · borda"
            labelY={266}
            cloud="cloudflare"
          />
          <Zone
            x={334}
            y={200}
            width={250}
            height={196}
            label="Oracle Cloud · sa-saopaulo-1"
            labelY={224}
            cloud="oracle"
          />

          <style>{tintCss}</style>

          {/* Ligações: linhas contínuas, desenhadas uma vez, na cor da cloud de destino. */}
          <g className="fill-none" strokeWidth={1.25}>
            {(Object.keys(lines) as (keyof typeof lines)[]).map(
              (key, index) => (
                <path
                  key={key}
                  d={lines[key]}
                  pathLength={1}
                  className={`diagram-draw ${cloudStroke[lineCloud[key]]}`}
                  style={delay(0.3 + index * 0.12)}
                />
              ),
            )}
          </g>
          {/* Pontos: antes dos blocos, para passarem por baixo deles. */}
          <circle
            r={3}
            className="diagram-packet"
            style={packetStyle(
              packetPaths.frontend,
              "arq-tint-frontend",
              0.9,
              3,
            )}
          />
          <circle
            r={3.5}
            className="diagram-packet"
            style={packetStyle(packetPaths.vm1, "arq-tint-api", 1.3, 5)}
          />
          <circle
            r={3.5}
            className="diagram-packet"
            style={packetStyle(packetPaths.vm2, "arq-tint-api", 3.8, 5)}
          />

          {/* Setas: a cor da cloud para onde apontam. */}
          <g
            className="fill-none"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d={arrow("right", 136, 104)}
              className={cloudStroke.cloudflare}
            />
            <path
              d={arrow("right", 372, 104)}
              className={cloudStroke.cloudflare}
            />
            <path
              d={arrow("right", 136, 308)}
              className={cloudStroke.cloudflare}
            />
            <path d={arrow("right", 348, 308)} className={cloudStroke.oracle} />
            <path d={arrow("right", 482, 268)} className={cloudStroke.oracle} />
            <path d={arrow("right", 482, 348)} className={cloudStroke.oracle} />
          </g>

          {/* Cliente: ator externo, de onde partem os dois ramos. */}
          <Node
            box={cliente}
            name="Cliente"
            lines={[{ text: "navegador" }]}
            external
            enter={0}
          />
          {/* Frontend. Fontes: OVERVIEW.md; frontend/wrangler.toml; ADR-0008 */}
          <Node
            box={worker}
            name="Cloudflare Workers"
            lines={[{ text: "probekit.cc", mono: true }]}
            enter={0.08}
          />
          <Node
            box={interfaceWeb}
            name="Interface Web"
            lines={[{ text: "roda no navegador" }]}
            enter={0.16}
          />
          {/* Backend. Fontes: OVERVIEW.md (registro `api` proxied); ADR-0002 */}
          <Node
            box={proxy}
            name="Cloudflare Proxy"
            lines={[{ text: "api.probekit.cc", mono: true }]}
            enter={0.24}
          />
          {/* NLB: ADR-0001; oci/loadbalacers.tf (listener TCP 443) */}
          <Node
            box={nlb}
            name="NLB"
            lines={[{ text: "L4 · TCP 443" }]}
            enter={0.32}
          />
          {/* VMs: oci/instance.tf (count = 2); backend/api-service-golang */}
          <Node
            box={vm1}
            name="VM 1"
            lines={[{ text: "API em Go" }]}
            pulse={0}
            enter={0.4}
          />
          <Node
            box={vm2}
            name="VM 2"
            lines={[{ text: "API em Go" }]}
            pulse={2}
            enter={0.48}
          />
        </svg>
      )}
    </Diagram>
  )
}
