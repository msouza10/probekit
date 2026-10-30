# Números do site atualizados sozinhos — plano de implementação

> **Para quem for executar:** use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`, task por task. Os passos usam caixas (`- [ ]`) como roteiro de execução; o estado oficial de cada task está na issue e no GitHub Project. Commit, push e PR são do criador: os passos de commit trazem só a mensagem sugerida.

**Goal:** o `/stats.json` que a Home lê (commits, PRs, issues e linguagens do repositório) passa a ser gerado a cada deploy e atualizado seis vezes ao dia (09:17, 12:17, 15:17, 18:17, 21:17 e 00:17 em Brasília), sem ninguém aprovar nada à mão.

**Architecture:** um script Node chama a API pública do GitHub e grava `dist/stats.json` depois do build (sem commit, porque a `main` só aceita PR). O próprio `deploy-frontend.yml` chama o script e ganha um gatilho agendado: nele, compara os números com os do site no ar e só publica quando mudaram, num ambiente do GitHub (`stats`) **sem revisor**, escolhido por expressão só para o evento agendado ([ADR-0010](../../adr/0010-deploy-agendado-em-ambiente-proprio.md)), porque o `production` exige 1 aprovação e também gate a API ([ADR-0008](../../adr/0008-deploy-do-site-pelo-github-actions.md)). Não há workflow separado nem token novo (o GitHub é lido com o `GITHUB_TOKEN` do job).

**Tech Stack:** Node 22 (o do workflow), API REST do GitHub, GitHub Actions, Wrangler, Vitest.

**Spec:** não há spec própria (o site já mostra esses números; muda só quem os gera). O formato do arquivo está no comentário de `frontend/src/lib/stats.ts` e é validado por `parseStats`. Contrato que a Home já usa: `RepoStats` em `frontend/src/lib/stats.ts`.

## Restrições globais

- O formato de saída é **exatamente** o de `RepoStats` (`generated_at` em UTC ISO, `commits`, `pull_requests{total,open}`, `issues{total,open}`, `languages[{name,bytes}]`); todo arquivo gravado passa em `parseStats`.
- Nunca gravar número inventado nem zerado por falha: se a API falhar, o arquivo anterior fica como está.
- `issues` conta só issues (não PRs); `pull_requests` conta só PRs. A branch contada é a `main`.
- O script só **lê** do GitHub; o token é o `GITHUB_TOKEN` do próprio job, com `contents: read`. Nenhum token novo.
- Workflows e ambientes são do criador: as tasks dele descrevem o resultado, não o YAML. O repositório é público: segredos aparecem só pelo nome.
- Os testes atuais continuam passando.

## Foco da revisão

1. **Limite de requisições / falha da API:** com `403`/`429`/rede fora, o script não derruba o deploy normal e não sobrescreve `dist/stats.json` com lixo. Task 1.
2. **Contagem de commits com um commit só** (a API não manda o cabeçalho `Link`): devolve 1, não 0. Task 1.
3. **PR contado como issue** (a busca de issues inclui PRs se faltar `type:issue`): os totais batem com `gh issue list` e `gh pr list`. Task 1.
4. **Deploy agendado atropelando um deploy normal:** os dois estão no mesmo workflow e usam o mesmo grupo de `concurrency`, sem cancelar um ao outro. Task 5.
5. **Deploy agendado sem necessidade:** sem mudança nos números, o job agendado termina sem publicar. Task 2 e Task 5.
6. **Ambiente errado:** o agendado usa o `stats` e todo o resto usa o `production`; um run de cada tipo confirma qual foi usado. Task 5.
7. **Deploy de código sem números:** se a API do GitHub falhar num push, o `dist` recebe o `/stats.json` que está no ar, em vez de sair sem o arquivo. Task 4.

---

### Task 1: Script que gera o `stats.json`

**Files:**
- Create: `frontend/scripts/generateStats.mjs`, `frontend/scripts/generateStats.test.mjs`
- Modify: `frontend/package.json` (script `"stats": "node scripts/generateStats.mjs"`)

**Interfaces:**
- Produces:
  - `collectStats(getJson: (path: string) => Promise<{ body: unknown; headers: Record<string, string> }>, now?: Date): Promise<RepoStats>` — usa `getJson` para `/commits?sha=main&per_page=1` (conta pelo `Link` `rel="last"`; sem `Link`, conta os itens da resposta), `/search/issues?q=repo:msouza10/probekit+type:pr` (e `+state:open`), o mesmo com `type:issue`, e `/repos/msouza10/probekit/languages` (ordenado por bytes, decrescente). `generated_at = now.toISOString()` sem milissegundos.
  - CLI `node scripts/generateStats.mjs [--out dist/stats.json]`: grava com `JSON.stringify(stats, null, 2)`. Em erro, escreve o motivo em `stderr`, **não toca no arquivo** e sai com código 0 — a menos que `STATS_STRICT=1`, quando sai com 1.

- [ ] **Step 1: Escrever os testes que falham** com um `getJson` falso: (a) a saída passa em `parseStats` (importado de `src/lib/stats.ts`); (b) commits = número da última página do `Link`; (c) sem `Link` e com 1 item, commits = 1; (d) PRs e issues vêm de buscas diferentes e os totais não se misturam; (e) `languages` em ordem decrescente de bytes; (f) `getJson` que lança → o CLI não altera o arquivo existente e sai 0, e com `STATS_STRICT=1` sai 1; (g) resposta malformada (campo faltando) → erro, nunca zeros.
- [ ] **Step 2: Rodar e ver falhar.** `cd frontend && npx vitest run scripts/generateStats.test.mjs`.
- [ ] **Step 3: Implementar** `collectStats` e o CLI (`fetch` nativo, cabeçalho `Authorization: Bearer $GITHUB_TOKEN` quando existir, `Accept: application/vnd.github+json`).
- [ ] **Step 4: Rodar os testes** → PASS. Depois, uma rodada real: `npm run build && STATS_STRICT=1 npm run stats && cat dist/stats.json` — o JSON tem a data de agora, e `commits` bate com `git rev-list --count main`; PRs e issues batem com `gh pr list --state all --json number --jq length` e `gh issue list --state all --json number --jq length`.
- [ ] **Step 5: Commit (do criador)** — `feat(frontend): script que gera o stats.json a partir da API do GitHub`.

### Task 2: Decisão de publicar ou não

**Files:**
- Create: `frontend/scripts/statsChanged.mjs`, `frontend/scripts/statsChanged.test.mjs`
- Modify: `frontend/package.json` (script `"stats:changed": "node scripts/statsChanged.mjs"`)

**Interfaces:**
- Consumes: `collectStats` (Task 1), `parseStats`.
- Produces:
  - `sameNumbers(a: RepoStats, b: RepoStats): boolean` — igual em tudo menos `generated_at`.
  - CLI `node scripts/statsChanged.mjs --live https://probekit.cc/stats.json`: busca o arquivo no ar e os números novos, e escreve `changed=true` ou `changed=false` em `$GITHUB_OUTPUT` (e na saída padrão, fora do GitHub). Arquivo no ar inexistente ou inválido → `changed=true`; falha ao obter os números novos → `changed=false` com aviso (não publicar às cegas).

- [ ] **Step 1: Testes que falham:** (a) mesmos números com `generated_at` diferente → `true`; (b) um commit a mais → `false`; (c) linguagem com bytes diferentes → `false`; (d) ordem diferente das linguagens com o mesmo conteúdo → `true`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** `sameNumbers` e o CLI.
- [ ] **Step 4: Rodar.** PASS; `GITHUB_OUTPUT=/tmp/out node scripts/statsChanged.mjs --live https://probekit.cc/stats.json && cat /tmp/out` mostra `changed=true` ou `changed=false` (informar qual e por quê).
- [ ] **Step 5: Commit (do criador)** — `feat(frontend): compara os números novos com os do site no ar`.

### Task 3: Ambiente do deploy agendado (criador)

**Resultado esperado:** existe o ambiente `stats` do GitHub, **sem revisor**, que só aceita a branch `main`, com o token e o id da conta da Cloudflare do site guardados como secrets desse ambiente (mesmos nomes do `production`, valores nunca no repositório). Nenhum token novo. Depende do [ADR-0010](../../adr/0010-deploy-agendado-em-ambiente-proprio.md) estar **Aceita**. Criar o ambiente e copiar os secrets é do criador (credenciais).

- [ ] **Step 1 (criador):** criar o ambiente `stats` e os dois secrets e mudar o *Status* do ADR-0010 para Aceita, com a data.
- [ ] **Step 2 (assistente):** conferir com `gh api repos/msouza10/probekit/environments/stats --jq '{rules: [.protection_rules[].type], branches: .deployment_branch_policy}'` que não há `required_reviewers` e que a política de branches é só a `main`.

### Task 4: Gerar os números em todo deploy (criador)

**Resultado esperado:** o `deploy-frontend.yml` roda `npm run stats` no job de build, depois do `npm run build` e antes de arquivar o `dist`, com `GITHUB_TOKEN` do job. O token do job continua com `permissions: contents: read`. Se o passo não gravar o `dist/stats.json` (API do GitHub fora), um passo seguinte baixa o `/stats.json` do ar para o `dist` (`curl -f`, sem derrubar o deploy). Depois do deploy, `https://probekit.cc/stats.json` tem `generated_at` do dia do run.

- [ ] **Step 1 (criador):** adicionar o passo e o `curl` de reserva ao workflow.
- [ ] **Step 2 (criador):** na mesma mudança, remover `frontend/public/stats.json` do git (`git rm`). O `.gitignore` já ignora o caminho. **Não remover antes** de o passo existir, porque um deploy sem ele publicaria o site sem números.
- [ ] **Step 3 (assistente):** revisar com `github-actions-hardening` e conferir, depois do primeiro deploy, `curl -s https://probekit.cc/stats.json | head -3` (a data é a do run e os números batem com o repositório).

### Task 5: Gatilho agendado no `deploy-frontend.yml` (criador)

**Resultado esperado:** o `deploy-frontend.yml` ganha `schedule` com `17 12,15,18,21,00,03 * * *` (UTC: 09:17, 12:17, 15:17, 18:17, 21:17 e 00:17 em Brasília). Quando o evento é o agendado, um passo calcula `changed` com `npm run stats:changed -- --live https://probekit.cc/stats.json`; só com `true` o build e o deploy seguem. O job de deploy escolhe o ambiente por expressão: `stats` no agendado, `production` nos demais. Mantém o **mesmo grupo de `concurrency`** (`deploy-frontend`, sem cancelar o que está rodando) e `permissions` mínimas. Termina verde sem publicar quando nada mudou.

- [ ] **Step 1 (criador):** editar o workflow (gatilho, `changed`, `if` dos passos de build e deploy e o ambiente por expressão).
- [ ] **Step 2 (criador):** rodar por `workflow_dispatch` (usa o `production` e pede aprovação) e esperar um run agendado (usa o `stats` e não pede). Depois, dois runs agendados seguidos: o primeiro publica (ou não, se nada mudou); o segundo termina sem publicar. Anotar os links dos runs no ADR-0010 (*Validação*).
- [ ] **Step 3 (assistente):** revisar o workflow e conferir que um deploy normal e um agendado disparados juntos não rodam em paralelo.

### Task 6: Documentação e fechamento

**Files:**
- Modify: `docs/runbook-deploy.md` (seção "Números do site": o que gera, quando roda, como disparar à mão, o que fazer se a API do GitHub falhar), `frontend/README.md`, `frontend/src/lib/stats.ts` (o comentário passa a descrever o fluxo real), `docs/adr/0010-deploy-agendado-em-ambiente-proprio.md` (*Status* e *Validação*, com a data)
- Depois do último task: banner de concluído neste plano.

- [ ] **Step 1: Atualizar os documentos** acima; só marcar como validado o que o criador de fato verificou, com a data.
- [ ] **Step 2: Conferir.** `python3 .claude/skills/probekit-docs/scripts/check_links.py`; `cd frontend && npx prettier --check README.md src/lib/stats.ts ../docs/runbook-deploy.md`; `npx vitest run` → tudo PASS.
- [ ] **Step 3: Commit (do criador)** — `docs: números do site no runbook de deploy`.
