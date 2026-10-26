import { Diagram, type DiagramStep } from "./Diagram"
import { Node, SUB, Zone, arrow, delay, type Box } from "./svgParts"

/*
 * Mesma linguagem visual do ArchitectureDiagram (ver o comentário dele):
 * viewBox de 600 de largura, nomes em 15 e secundário em 13 unidades, blocos
 * `fill-card stroke-border`, ligações contínuas e cinza com setas abertas.
 * Aqui o fluxo é de cima para baixo, em quatro faixas (zonas tracejadas) que
 * são as fases do pipeline. A primeira junta o pull request e o CI, porque o
 * CI roda no pull request, antes do merge: separar os dois obrigaria a seta a
 * descer ao CI e voltar para a `main`. O merge é a seta que sai dessa fase.
 * Nas fases 2 e 3 o pipeline se divide em duas trilhas, a da API (à esquerda)
 * e a do site (à direita), porque elas divergem de verdade: gatilho, release e
 * deploy são diferentes.
 *
 * Cores: as ligações saem do GitHub Actions, que não é uma cloud, então ficam
 * em cinza. A cor mora só nas zonas dos provedores onde o deploy chega (Oracle
 * Cloud e Cloudflare). O rollback é o caminho excepcional: tracejado e parado.
 * Cada trilha tem o seu ponto (a da API e a do site), defasados em meio ciclo:
 * uma trilha animada e a outra parada sugeriria que a parada está inativa.
 */
const GAP = 20 // entre faixas
const MERGE_GAP = 32 // entre a fase 1 e a 2: cabe o rótulo "merge na main"
const FAN = 28 // do pull request aos jobs do CI
const LABEL = 22 // linha de base do rótulo da fase, a partir do topo da faixa
const TOP = 30 // topo dos blocos, a partir do topo da faixa
const PAD = 10 // folga embaixo dos blocos
const NODE = 64
const TALL = 82 // blocos de duas linhas secundárias
const PROVIDER = TOP + NODE + PAD // zona de provedor: rótulo, bloco e folga

const band = (y: number, content: number) => ({
  y,
  h: TOP + content + PAD,
  top: y + TOP,
})
const b1 = band(4, NODE + FAN + TALL)
const b2 = band(b1.y + b1.h + MERGE_GAP, TALL)
const b3 = band(b2.y + b2.h + GAP, TALL + GAP + PROVIDER)
const b4 = band(b3.y + b3.h + GAP, TALL)
const HEIGHT = b4.y + b4.h + 4

// Centros das duas trilhas e do meio.
const L = 153
const R = 447
const C = 300

// Fase 1: o pull request e, abaixo, os três jobs do CI. Go fica sob a trilha da
// API e NPM sob a do site.
const pullRequest: Box = { x: C - 65, y: b1.top, w: 130 }
const jobsY = b1.top + NODE + FAN
const go: Box = { x: L - 65, y: jobsY, w: 130, h: TALL }
const terraform: Box = { x: C - 65, y: jobsY, w: 130, h: TALL }
const npm: Box = { x: R - 65, y: jobsY, w: 130, h: TALL }
// Fase 2: uma trilha por produto.
const release: Box = { x: 18, y: b2.top, w: 270, h: TALL }
const site: Box = { x: 312, y: b2.top, w: 270, h: TALL }
// Fase 3: deploy e, embaixo, onde ele chega.
const deployApi: Box = { x: 18, y: b3.top, w: 270, h: TALL }
const deploySite: Box = { x: 312, y: b3.top, w: 270, h: TALL }
const providerY = b3.top + TALL + GAP
const oracle = { x: 18, y: providerY, w: 270, h: PROVIDER }
const cloudflare = { x: 312, y: providerY, w: 270, h: PROVIDER }
const vms: Box = { x: L - 75, y: providerY + TOP, w: 150 }
const workers: Box = { x: R - 75, y: providerY + TOP, w: 150 }
// Fase 4: rollback.
const rollbackApi: Box = { x: 18, y: b4.top, w: 270, h: TALL }
const rollbackSite: Box = { x: 312, y: b4.top, w: 270, h: TALL }

const bottom = (box: Box) => box.y + (box.h ?? NODE)

// Do pull request a um job: desce, anda na horizontal e desce de novo (cantos
// de raio 12). Em linha reta quando os x coincidem.
const R12 = 12
function fan(x0: number, y0: number, x1: number, y1: number) {
  if (x0 === x1) return `V${y1}`
  const mid = (y0 + y1) / 2
  const dir = x1 > x0 ? 1 : -1
  return `V${mid - R12} Q${x0} ${mid} ${x0 + dir * R12} ${mid} H${x1 - dir * R12} Q${x1} ${mid} ${x1} ${mid + R12} V${y1}`
}
const prBottom = bottom(pullRequest)
const mergeLabelY = b1.y + b1.h + MERGE_GAP / 2 + 4

// Ligações (de borda a borda de bloco), todas contínuas.
const lines = {
  prGo: `M${C} ${prBottom} ${fan(C, prBottom, L, jobsY)}`,
  prTerraform: `M${C} ${prBottom} ${fan(C, prBottom, C, jobsY)}`,
  prNpm: `M${C} ${prBottom} ${fan(C, prBottom, R, jobsY)}`,
  goRelease: `M${L} ${bottom(go)} V${release.y}`,
  npmSite: `M${R} ${bottom(npm)} V${site.y}`,
  releaseDeploy: `M${L} ${bottom(release)} V${deployApi.y}`,
  siteDeploy: `M${R} ${bottom(site)} V${deploySite.y}`,
  apiProduction: `M${L} ${bottom(deployApi)} V${oracle.y}`,
  siteProduction: `M${R} ${bottom(deploySite)} V${cloudflare.y}`,
}
// Rollback: tracejado de volta à produção, parado (caminho excepcional).
const rollbackLines = {
  api: `M${L} ${rollbackApi.y} V${oracle.y + oracle.h}`,
  site: `M${R} ${rollbackSite.y} V${cloudflare.y + cloudflare.h}`,
}

// Os pontos saem do centro do pull request, descem até o job da trilha (Go ou
// NPM) e seguem a trilha até o centro do bloco de destino (as VMs ou a
// Cloudflare), passando por dentro dos blocos (escondidos por eles).
const packetFrom = `M${C} ${pullRequest.y + NODE / 2} V${prBottom}`
const packetPaths = {
  api: `${packetFrom} ${fan(C, prBottom, L, jobsY)} V${vms.y + NODE / 2}`,
  site: `${packetFrom} ${fan(C, prBottom, R, jobsY)} V${workers.y + NODE / 2}`,
}

const steps: DiagramStep[] = [
  {
    // .github/workflows/ci.yml (on: pull_request, branches: main; jobs go,
    // terraform, npm); ruleset `protection-main` do GitHub (required status
    // checks Go, Terraform e NPM; pull request obrigatório; só merge commit)
    title: "O pull request roda o CI",
    tag: "CI",
    detail:
      "Toda mudança entra por um pull request que aponta para a main, e o CI roda nele, antes do merge: Go (testes e linters), NPM (lint, verificação de formato, testes e build) e Terraform (fmt, init sem backend e validate). A main só aceita o merge com os três verdes.",
  },
  {
    // build-api-golang.yml (on: push na main, paths backend/api-service-golang/**,
    // release condicional por calculate-version.sh); deploy-frontend.yml
    // (on: push na main, paths frontend/**, job build)
    title: "O merge na main dispara o build e o release",
    tag: "release",
    detail:
      "Uma mudança em backend/** roda os testes, calcula a versão e só se as mensagens de commit pedirem (feat, fix, perf ou quebra de compatibilidade) gera o binário e a release. Uma mudança em frontend/** roda o build do site.",
  },
  {
    // deploy-api-golang.yml (workflow_dispatch; plan e deploy);
    // deploy-frontend.yml (push na main; job deploy needs build);
    // ADR-0007 e ADR-0008 (ambiente production com revisor)
    title: "Deploy, com aprovação do ambiente production",
    tag: "production",
    detail:
      "O deploy da API é manual: plan, aprovação, apply e as duas VMs, uma depois da outra. O deploy do site é automático na main, mas espera a aprovação; publica com wrangler e verifica o site.",
  },
  {
    // rollback-frontend.yml, rollback-api-golang.yml; ADR-0008;
    // runbook-deploy.md
    title: "Recuperação, sob demanda",
    tag: "rollback",
    detail:
      "Cada produto tem um rollback manual, também no ambiente production. O do site volta a versão do Worker; o da API marca uma release anterior como a mais recente.",
  },
]

const title = "O caminho de uma mudança no pipeline"
const summary =
  "Pipeline do Probekit em quatro fases: pull request e CI (a mudança é validada em três jobs, Go, NPM e Terraform, antes do merge na main), build e release (release da API e build do site, em trilhas separadas, disparados pelo merge), deploy (API manual e site automático, ambos com aprovação do ambiente production, na Oracle Cloud e na Cloudflare) e recuperação (rollbacks manuais da API e do site)."

export function PipelineDiagram() {
  return (
    <Diagram
      id="pipeline"
      title={title}
      summary={summary}
      steps={steps}
      compact
    >
      {(ids) => (
        <svg
          role="img"
          aria-labelledby={`${ids.title} ${ids.summary}`}
          viewBox={`0 0 600 ${HEIGHT}`}
          className="block h-auto w-full max-w-[600px] font-sans"
        >
          <title id={ids.title}>{title}</title>
          <desc id={ids.summary}>{summary}</desc>

          {/* Fases: faixas tracejadas (agrupamento). */}
          {[
            [b1, "01 · Pull request e CI"],
            [b2, "02 · Build e release"],
            [b3, "03 · Deploy"],
            [b4, "04 · Recuperação"],
          ].map(([b, label]) => (
            <Zone
              key={label as string}
              x={4}
              y={(b as typeof b1).y}
              width={592}
              height={(b as typeof b1).h}
              label={label as string}
              labelY={(b as typeof b1).y + LABEL}
            />
          ))}
          {/* Onde o deploy chega. Fontes: infra/terraform/main.tf
              (sa-saopaulo-1); OVERVIEW.md (Worker na Cloudflare) */}
          <Zone
            x={oracle.x}
            y={oracle.y}
            width={oracle.w}
            height={oracle.h}
            label="Oracle Cloud · sa-saopaulo-1"
            labelY={oracle.y + LABEL}
            cloud="oracle"
          />
          <Zone
            x={cloudflare.x}
            y={cloudflare.y}
            width={cloudflare.w}
            height={cloudflare.h}
            label="Cloudflare · borda"
            labelY={cloudflare.y + LABEL}
            cloud="cloudflare"
          />

          {/* Ligações: linhas contínuas, desenhadas uma vez. */}
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
          {/* Rollback: tracejado parado, sem fluxo e sem animação. */}
          <g
            className="fill-none stroke-input"
            strokeWidth={1.25}
            strokeDasharray="5 5"
          >
            {Object.values(rollbackLines).map((d) => (
              <path key={d} d={d} data-rollback />
            ))}
          </g>

          {/* Pontos: antes dos blocos, para passarem por baixo deles. Um por
              trilha, defasados em meio ciclo (8s de viagem). */}
          {(
            [
              ["site", 1.2],
              ["api", 5.2],
            ] as const
          ).map(([track, start]) => (
            <circle
              key={track}
              r={3.5}
              className="diagram-packet"
              style={{
                offsetPath: `path("${packetPaths[track]}")`,
                animationDelay: `${start}s`,
                ["--diagram-travel" as string]: "8s",
              }}
            />
          ))}

          {/* Setas: todas cinza (saem do GitHub Actions, que não é uma cloud). */}
          <g
            className="fill-none stroke-input"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={arrow("down", L, go.y)} />
            <path d={arrow("down", C, terraform.y)} />
            <path d={arrow("down", R, npm.y)} />
            <path d={arrow("down", L, release.y)} />
            <path d={arrow("down", R, site.y)} />
            <path d={arrow("down", L, deployApi.y)} />
            <path d={arrow("down", R, deploySite.y)} />
            <path d={arrow("down", L, oracle.y)} />
            <path d={arrow("down", R, cloudflare.y)} />
            <path d={arrow("up", L, oracle.y + oracle.h)} />
            <path d={arrow("up", R, cloudflare.y + cloudflare.h)} />
          </g>

          {/* Rótulo do merge: o que leva a mudança da fase 1 para a 2. O ruleset da
              main só deixa o merge acontecer com os três checks do CI verdes. */}
          <text
            x={C}
            y={mergeLabelY}
            textAnchor="middle"
            fontSize={SUB}
            className="fill-muted-foreground"
          >
            merge na main · CI verde
          </text>

          {/* Fase 1. Fontes: ci.yml (on: pull_request, branches: main; jobs
              go, npm, terraform) */}
          <Node box={pullRequest} name="Pull request" enter={0} />
          <Node
            box={go}
            name="Go"
            lines={[{ text: "testes" }, { text: "linters" }]}
            enter={0.08}
          />
          <Node
            box={terraform}
            name="Terraform"
            lines={[{ text: "fmt" }, { text: "validate" }]}
            enter={0.16}
          />
          <Node
            box={npm}
            name="NPM"
            lines={[{ text: "lint · format" }, { text: "testes · build" }]}
            enter={0.24}
          />
          {/* Fase 2. Fontes: build-api-golang.yml (paths backend/**, release
              condicional); deploy-frontend.yml (paths frontend/**, job build) */}
          <Node
            box={release}
            name="Release da API"
            lines={[
              { text: "backend/** na main" },
              { text: "testes → versão → binário" },
            ]}
            enter={0.32}
          />
          <Node
            box={site}
            name="Build do site"
            lines={[
              { text: "frontend/** na main" },
              { text: "lint · testes · build" },
            ]}
            enter={0.4}
          />
          {/* Fase 3. Fontes: deploy-api-golang.yml (workflow_dispatch; plan e
              deploy no ambiente production); deploy-frontend.yml (push na
              main; wrangler deploy); runbook-deploy.md */}
          <Node
            box={deployApi}
            name="Deploy da API"
            lines={[
              { text: "manual · plan → aprovação" },
              { text: "apply → VM 1 → VM 2" },
            ]}
            pulse={0}
            enter={0.56}
          />
          <Node
            box={deploySite}
            name="Deploy do site"
            lines={[
              { text: "automático · aprovação" },
              { text: "wrangler → verifica" },
            ]}
            pulse={2}
            enter={0.64}
          />
          <Node
            box={vms}
            name="VM 1 · VM 2"
            lines={[{ text: "API em Go" }]}
            enter={0.72}
          />
          <Node
            box={workers}
            name="Workers"
            lines={[{ text: "site estático" }]}
            enter={0.8}
          />
          {/* Fase 4. Fontes: rollback-api-golang.yml (marca a release anterior
              como latest); rollback-frontend.yml (versão anterior do Worker) */}
          <Node
            box={rollbackApi}
            name="Rollback da API"
            lines={[
              { text: "manual · aprovação" },
              { text: "marca a release anterior" },
            ]}
            enter={0.88}
          />
          <Node
            box={rollbackSite}
            name="Rollback do site"
            lines={[
              { text: "manual · aprovação" },
              { text: "volta a versão do Worker" },
            ]}
            enter={0.96}
          />
        </svg>
      )}
    </Diagram>
  )
}
