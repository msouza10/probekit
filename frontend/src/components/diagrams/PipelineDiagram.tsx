import { Diagram, type DiagramStep } from "./Diagram"
import { Node, arrow, delay, type Box } from "./svgParts"

/*
 * Mesma linguagem visual do ArchitectureDiagram (ver o comentário dele):
 * viewBox de 600 de largura (576px na coluna mais estreita, escala 0,96),
 * nomes em 15 e secundário em 13 unidades, blocos `fill-card stroke-border`,
 * ligações `stroke-input` ortogonais com cantos de raio 12 e setas abertas,
 * caminho do ponto em `stroke-highlight`. Aqui o fluxo é de cima para baixo:
 * a bifurcação depois da `main` vira duas colunas (API à esquerda, site à
 * direita) que se juntam no portão de aprovação.
 */
// Linha 1: pull request -> CI -> main (centro y=40).
const pullRequest: Box = { x: 4, y: 8, w: 112, h: 64 }
const ci: Box = { x: 152, y: 8, w: 176, h: 64 }
const main: Box = { x: 373, y: 8, w: 84, h: 64 }
// Linha 2: os dois ramos (blocos de 3 linhas por causa do caminho).
const release: Box = { x: 4, y: 124, w: 252, h: 80 }
const site: Box = { x: 340, y: 124, w: 150, h: 80 }
// Linha 3: deploy da API, portão e deploy.
const deployApi: Box = { x: 55, y: 244, w: 150, h: 64 }
const gate: Box = { x: 330, y: 244, w: 170, h: 64 }
const deploy: Box = { x: 524, y: 244, w: 72, h: 64 }
// Linha 4: rollback.
const rollback: Box = { x: 496, y: 348, w: 100, h: 64 }

// Trechos visíveis das ligações (de borda a borda de bloco).
const lines = {
  prCi: "M116 40 H152",
  ciMain: "M328 40 H373",
  forkSite: "M415 72 V124",
  forkApi: "M415 72 V88 Q415 100 403 100 H142 Q130 100 130 112 V124",
  releaseDeploy: "M130 204 V244",
  deployGate: "M205 276 H330",
  siteGate: "M415 204 V244",
  gateDeploy: "M500 276 H524",
}
// O que o ponto percorre (caminho do site): em destaque, com fluxo.
const highlighted = [
  lines.prCi,
  lines.ciMain,
  lines.forkSite,
  lines.siteGate,
  lines.gateDeploy,
]

// Rollback: linha tracejada de volta, parada. Sai do Deploy, passa pelo
// bloco Rollback e volta ao portão (rollback também pede aprovação).
const rollbackLines = ["M560 308 V348", "M496 380 H427 Q415 380 415 368 V308"]

// O ponto sai do centro do Pull request e termina no centro do Deploy,
// passando por dentro dos blocos (escondido por eles).
const packetPath = "M60 40 H415 V276 H560"

const steps: DiagramStep[] = [
  {
    // .github/workflows/ci.yml (on: pull_request, branches: main)
    title: "Uma mudança abre um pull request",
    detail: "O pull request aponta para a main e é isso que dispara o CI.",
  },
  {
    // .github/workflows/ci.yml (jobs go, terraform, npm)
    title: "CI roda os jobs Go, NPM e Terraform",
    detail:
      "Os três jobs rodam em cada pull request, antes de a mudança entrar.",
  },
  {
    // build-api-golang.yml e deploy-frontend.yml (on: push, branches: main)
    title: "A mudança chega à main",
    detail:
      "Um push na main dispara o workflow da API ou o do site, conforme os arquivos que mudaram.",
  },
  {
    // build-api-golang.yml (paths, release condicional); infra/shellscript/
    // calculate-version.sh; deploy-api-golang.yml (só workflow_dispatch)
    title: "Release da API, só se o commit pedir",
    tag: "backend/api-service-golang/**",
    detail:
      "O pipeline roda os testes, calcula a versão e só publica uma release se as mensagens de commit pedirem (feat, fix ou perf, ou um marcador de mudança incompatível). O deploy da API é manual, em outro workflow.",
  },
  {
    // deploy-frontend.yml (paths frontend/**, job build, job deploy needs build)
    title: "Build do site",
    tag: "frontend/**",
    detail:
      "O workflow constrói o site e, se o build passar, o deploy espera a aprovação.",
  },
  {
    // deploy-frontend.yml, deploy-api-golang.yml, rollback-*.yml (environment
    // production); ADR-0007 e ADR-0008 (revisor); runbook-deploy.md
    title: "Aprovação do ambiente production",
    detail:
      "O deploy do site, o deploy da API e os dois rollbacks rodam no ambiente production, que tem revisor e espera a aprovação antes de seguir.",
  },
  {
    // deploy-frontend.yml (wrangler deploy); deploy-api-golang.yml (plan e
    // deploy); runbook-deploy.md (seções 3 e 5)
    title: "Deploy, depois da aprovação",
    detail:
      "O site é publicado com o Wrangler e verificado. O deploy da API aplica o plano que você leu e roda o script de deploy nas duas VMs.",
  },
  {
    // rollback-frontend.yml, rollback-api-golang.yml; ADR-0008; runbook-deploy.md
    title: "Rollback da API e do site",
    detail:
      "Cada um tem seu workflow de rollback, disparado à mão e também no ambiente production. O site volta a uma versão anterior do Worker; a API marca uma release anterior como a mais recente.",
  },
]

const title = "O caminho de uma mudança no pipeline"
const summary =
  "O pipeline do Probekit: o CI roda em cada pull request. Na main, uma mudança do backend pode gerar uma release da API e uma mudança do frontend gera o build do site. O deploy do site, o deploy da API (manual) e os rollbacks passam pela aprovação do ambiente production."

export function PipelineDiagram() {
  return (
    <Diagram id="pipeline" title={title} summary={summary} steps={steps}>
      {(ids) => (
        <svg
          role="img"
          aria-labelledby={`${ids.title} ${ids.summary}`}
          viewBox="0 0 600 420"
          className="block h-auto w-full max-w-[600px] font-sans"
        >
          <title id={ids.title}>{title}</title>
          <desc id={ids.summary}>{summary}</desc>

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
          {/* Caminho do ponto: tracejado que flui por cima da base. */}
          <g
            className="diagram-pop fill-none stroke-highlight"
            strokeWidth={1.5}
            style={delay(1.3)}
          >
            {highlighted.map((d) => (
              <path key={d} d={d} className="diagram-flow" />
            ))}
          </g>
          {/* Rollback: tracejado parado, sem fluxo e sem animação. */}
          <g
            className="fill-none stroke-input"
            strokeWidth={1.25}
            strokeDasharray="5 5"
          >
            {rollbackLines.map((d) => (
              <path key={d} d={d} data-rollback />
            ))}
          </g>

          {/* Ponto: antes dos blocos, para passar por baixo deles. */}
          <circle
            r={3.5}
            className="diagram-packet"
            style={{
              offsetPath: `path("${packetPath}")`,
              animationDelay: "1.2s",
              ["--diagram-travel" as string]: "6s",
            }}
          />

          {/* Setas: cinza nas ligações neutras, destaque no caminho do ponto. */}
          <g
            className="fill-none"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={arrow("right", 152, 40)} className="stroke-highlight" />
            <path d={arrow("right", 373, 40)} className="stroke-highlight" />
            <path d={arrow("down", 415, 124)} className="stroke-highlight" />
            <path d={arrow("down", 130, 124)} className="stroke-input" />
            <path d={arrow("down", 130, 244)} className="stroke-input" />
            <path d={arrow("right", 330, 276)} className="stroke-input" />
            <path d={arrow("down", 415, 244)} className="stroke-highlight" />
            <path d={arrow("right", 524, 276)} className="stroke-highlight" />
            <path d={arrow("up", 415, 308)} className="stroke-input" />
          </g>

          {/* Pull request e CI: ci.yml (on: pull_request; jobs go, npm, terraform) */}
          <Node box={pullRequest} name="Pull request" enter={0} />
          <Node
            box={ci}
            name="CI"
            lines={[{ text: "Go · NPM · Terraform" }]}
            enter={0.08}
          />
          {/* main: build-api-golang.yml e deploy-frontend.yml (branches: main) */}
          <Node box={main} name="main" monoName enter={0.16} />
          {/* Release da API: build-api-golang.yml (paths backend/api-service-golang/**,
              release condicional por calculate-version.sh) */}
          <Node
            box={release}
            name="Release da API"
            lines={[
              { text: "mudança em" },
              { text: "backend/api-service-golang/**", mono: true },
            ]}
            enter={0.24}
          />
          {/* Build do site: deploy-frontend.yml (paths frontend/**, job build) */}
          <Node
            box={site}
            name="Build do site"
            lines={[
              { text: "mudança em" },
              { text: "frontend/**", mono: true },
            ]}
            enter={0.32}
          />
          {/* Deploy da API: deploy-api-golang.yml (só workflow_dispatch) */}
          <Node
            box={deployApi}
            name="Deploy da API"
            lines={[{ text: "manual" }]}
            enter={0.4}
          />
          {/* Aprovação: ambiente production nos deploys e rollbacks (ADR-0007,
              ADR-0008; deploy-*.yml e rollback-*.yml) */}
          <Node
            box={gate}
            name="Aprovação"
            lines={[{ text: "ambiente production" }]}
            gate
            enter={0.48}
          />
          {/* Deploy: deploy-frontend.yml (job deploy, wrangler deploy) */}
          <Node box={deploy} name="Deploy" enter={0.56} />
          {/* Rollback: rollback-api-golang.yml e rollback-frontend.yml */}
          <Node
            box={rollback}
            name="Rollback"
            lines={[{ text: "API e site" }]}
            enter={0.64}
          />
        </svg>
      )}
    </Diagram>
  )
}
