# Probekit — Pipeline de CI/CD: Plano de Implementação

> **Para quem executa:** este plano respeita o `AGENTS.md`. Workflows, shell e configuração do GitHub são do **Criador**; o assistente revisa, ensina e escreve os testes (por exemplo, o do updater). Por isso as Tasks trazem *o quê*, *onde*, *critério de pronto* e *como verificar*, sem o YAML nem o shell. Os passos com caixa são o roteiro de quem executa; o **estado** de cada Task está na issue e no GitHub Project, não aqui.

**Goal:** todo código novo passa por testes antes do merge, a `main` só aceita PR verde, uma release que não sobe volta sozinha nas VMs e o site é publicado pelo CI.

**Architecture:** um workflow `ci.yml` em `pull_request` (três jobs independentes, sempre rodando) vira o check obrigatório de uma regra de proteção da `main`. O *Deploy* ganha fila e pausa de aprovação, o updater das VMs ganha rollback, e dois fluxos novos (teste de fumaça e deploy do site) fecham o ciclo. Nada de staging, blue/green, canary nem Kubernetes: para 2 VMs e um operador o custo supera o benefício.

**Tech Stack:** GitHub Actions, rulesets do GitHub, shell (updater e fumaça), Terraform (só `fmt` e `validate` no CI), Wrangler.

**Specs/ADRs:** [ADR-0005](../../adr/0005-atualizacao-das-vms-e-deploy-inicial.md) (updater e deploy, sem rollback hoje), [ADR-0004](../../adr/0004-chamada-frontend-api-com-cors.md), [`docs/runbook-deploy.md`](../../runbook-deploy.md). Plano anterior, encerrado: [`2026-10-09-probekit-first-deploy.md`](./2026-10-09-probekit-first-deploy.md) (Tasks 10 a 13 dele viram este epic).

## Global Constraints

- Repositório **público**: nenhum valor de secret, IP ou nome interno em workflow, issue ou doc; segredos aparecem só pelo nome.
- Todo workflow novo: `permissions: contents: read` por padrão (escalar só no job que precisa), ações fixadas por SHA e `concurrency` explícito (skill `github-actions-hardening`).
- O CI **não usa segredos** (PR de fork não os recebe).
- O merge continua sendo **merge commit**: o `calculate-version.sh` lê a mensagem de cada commit que toca `backend/api-service-golang/**`.
- Os jobs do CI **sempre rodam** (sem filtro de caminho): um check obrigatório que não roda trava o PR.
- Nomes dos jobs, estáveis e curtos: workflow `CI Test`, jobs `Go`, `NPM`, `Terraform`. A regra da `main` exige o nome do job (`Go`, `NPM`, `Terraform`); o prefixo `CI Test /` é só o rótulo da aba Checks.
- `concurrency` do *Deploy* e da release **nunca** com `cancel-in-progress: true` (cancelar um `apply` ou uma release no meio deixa estado pela metade). No CI de PR, sim.

## Review Focus

Entradas e condições que o plano implica e que mais provavelmente quebram, mais provável primeiro. Cada linha tem o teste ou a verificação na Task dona.

1. Teste do Go que chama `api.cloudflare.com` na subida (timeout de 5 s) fica vermelho no runner sem culpa do PR → Task 1: rodar o CI várias vezes e registrar oscilação; a solução definitiva é o epic de testes offline.
2. PR **só de docs** com check obrigatório → Task 2: abrir um PR de docs e confirmar que fecha.
3. Binário novo que escuta mas responde errado, ou que sai com código 1 → Task 3: teste do updater com binário ruim.
4. Dois *Deploy* disparados juntos, ou um *Deploy* cancelado no meio → Task 4: disparar dois seguidos e ver o segundo esperar sem cancelar o primeiro.
5. Build do site sem `VITE_API_BASE_URL` em produção (chama `/api` no próprio Worker) → Task 7: o workflow fixa o valor e a verificação pós-deploy testa `/ping`.

---

## Mapa de arquivos

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `.github/workflows/ci.yml` (novo) | testes, lint e build em PR | 1 |
| Ruleset da `main` (GitHub, sem arquivo) | exige PR e os checks `Go`, `NPM` e `Terraform` | 2 |
| `infra/shellscript/deploy-api-go.sh` | updater: backup, validação e rollback | 3 |
| `.github/workflows/deploy-api-golang.yml` | `concurrency` e aprovação | 4 |
| `docs/adr/NNNN-…` (novo) | decisão sobre expor a versão | 5 |
| `infra/shellscript/smoke-test.sh` (novo) + passo no *Deploy* | fumaça pós-deploy | 6 |
| `.github/workflows/deploy-frontend.yml` (novo) | deploy do site | 7 |
| `.github/workflows/rollback-frontend.yml` (novo) | rollback do site por workflow | 8 |
| `.github/workflows/rollback-api.yml` (novo) | rollback manual da API por workflow | 9 |

## Ordem e dependências

```
1 CI em PR ──► 2 proteção da main ─────────────┐
3 rollback do updater (paralelo)               ├─► (epic fecha)
4 concurrency + aprovação (paralelo)           │
5 decisão: versão ──► 6 fumaça ────────────────┤
7 deploy do site (quando existirem os secrets)─┤
7 ──► 8 rollback do site por workflow ─────────┤
3 ──► 9 rollback manual da API por workflow ───┘
```

Tasks 1, 3, 4 e 5 não dependem entre si. A 8 depende da 7 (o ambiente e os secrets do site), e a 9 depende da 3 (o updater precisa ter a proteção de rollback antes de aceitar versões antigas).

---

### Task 1: CI em pull request **[Criador]**

**Issue:** `ci(pipeline): roda testes, lint e build em todo pull request`

**Files:** Create `.github/workflows/ci.yml`. Referência: `.github/workflows/build-api-golang.yml`.

**Interfaces:**
- Produces: três checks com os nomes de job `Go`, `NPM` e `Terraform` (na aba Checks aparecem como `CI Test / Go` etc.) (a Task 2 depende deles).

- [ ] Esqueleto: `on: pull_request` (sem `paths`), `permissions: contents: read`, `concurrency` por PR com `cancel-in-progress: true`.
- [ ] Job `Go`: `go vet ./...` e `go test ./...` em `backend/api-service-golang/`; reaproveitar da release o `setup-go` com `go-version-file` e o passo *Allow Ping* (`net.ipv4.ping_group_range`).
- [ ] Job `NPM`: `npm ci`, `npm run lint`, `npm test`, `npm run build` em `frontend/`, com Node fixado (o `package.json` não declara `engines`; escolher a versão exigida pelo Vite 8 e pelo Wrangler 4) e cache do npm.
- [ ] Job `Terraform`: `terraform fmt -check -recursive`, `terraform init -backend=false`, `terraform validate` em `infra/terraform`, com o wrapper do `setup-terraform` desligado.
- [ ] Decidir o `gofmt`: corrigir os 4 arquivos listados em PR separado **antes**, ou deixá-lo de fora do CI.
- [ ] **Verificar:** PR de teste com um teste do Go quebrado de propósito deixa `CI Test / Go` vermelho; idem para o frontend; corrigir e ver os três verdes (`gh pr checks <nº>`). A release segue com seu próprio `go test`.

### Task 2: Exigir os checks para mergear na `main` **[Criador]**

**Issue:** `ci(pipeline): exige os checks para mergear na main`

**Files:** configuração em *Settings → Rules → Rulesets* (sem arquivo); descrever a regra em `docs/README.md`.

**Interfaces:** Consumes os três checks da Task 1.

- [ ] Ruleset na `main`: exigir PR, exigir os checks `Go`, `NPM` e `Terraform` (fonte GitHub Actions), bloquear force push e exclusão; aprovações em 0 (um só operador).
- [ ] Manter **merge commit**; decidir se o administrador pode contornar a regra e registrar a decisão.
- [ ] Atualizar `docs/README.md` com a regra.
- [ ] **Verificar:** PR com check vermelho não mergeia; PR só de docs fecha; a próxima release da API ainda sai (a release usa `GITHUB_TOKEN` para tag e release, não faz push de commit).

### Task 3: Rollback automático no updater das VMs **[Criador; testes: Assistente]**

**Issue:** `feat(infra): rollback automático quando a release nova não sobe nas VMs`

**Files:** Modify `infra/shellscript/deploy-api-go.sh` (`install_binary`, `validate_api`, `main`); Test: harness da simulação com `curl`, `systemctl` e `journalctl` falsos (o assistente escreve). Atualizar a seção *Negativas* do ADR-0005 ao terminar.

- [ ] Guardar o binário anterior (`$BIN_PATH.prev`) e a versão anterior antes da troca.
- [ ] Gravar a `VERSION` só **depois** de validar a API.
- [ ] Se a validação falhar: restaurar o `.prev`, reiniciar, validar de novo e marcar a tag ruim (arquivo em `$APP_DIR`, por exemplo `BAD_VERSION`); o timer não tenta a mesma tag em laço, e uma tag diferente limpa a marca.
- [ ] Confirmar que o serviço fica `active` por alguns segundos (o `Restart=always` mascara crash em laço), além do `curl` que procura `OK`.
- [ ] **Verificar (teste do updater):** binário bom instala e grava a versão; binário ruim volta ao anterior e marca a tag; execução repetida sem versão nova faz 0 downloads e 0 restarts; checksum adulterado aborta sem alterar nada. Depois, numa VM real, uma release de teste que sai com código 1 (`journalctl -u autodeploy-api-go -n 40`).
- Cuidado: o script do timer vem da **tag da release**, então a correção só chega às VMs numa nova release ou num *Deploy*.

### Task 4: `concurrency` e aprovação no *Deploy* **[Criador]**

**Issue:** `ci(pipeline): concurrency e aprovação no workflow Deploy`

**Files:** Modify `.github/workflows/deploy-api-golang.yml`.

- [ ] `concurrency` com grupo `deploy` e `cancel-in-progress: false` (enfileira, nunca cancela um `apply`).
- [ ] Confirmar se o backend `oci` do state faz *lock* antes de depender disso.
- [ ] *Required reviewers* no ambiente `production`; separar em dois jobs (`plan` e `apply`, o `apply` com o ambiente protegido), passando o `tfplan` como artefato de retenção curta (pode ter valores sensíveis).
- [ ] Limpar as linhas em branco do fim do workflow.
- [ ] **Verificar:** dois *Deploy* seguidos, o segundo espera; o plano aparece no log antes da aprovação; um *Deploy* sem mudança de infraestrutura continua verde.

### Task 5: Decisão — expor a versão da API **[Criador decide; assistente redige o ADR]**

**Issue:** `decision: expor a versão da API para verificar o deploy`

**Files:** Create `docs/adr/NNNN-<nome>.md`, no modelo de `docs/adr/0000-exemple-adr.md`.

- [ ] Comparar as alternativas A (campo `version` em `/`, sem tocar o `grep OK` do `validate_api`), B (rota `/version`) e C (não expor), com o risco de informação pública a mais.
- [ ] Se A ou B: a versão entra pelo `-ldflags "-X main.version=…"` no passo de build da release, que já calcula `steps.version.outputs.version`.
- [ ] **Verificar:** ADR aceito; as tasks de implementação e de uso na Task 6 abertas como issues.

### Task 6: Teste de fumaça depois do deploy **[Criador]**

**Issue:** `ci(pipeline): teste de fumaça contra a API depois do deploy`

**Files:** Create `infra/shellscript/smoke-test.sh`; Modify `.github/workflows/deploy-api-golang.yml`; Modify `docs/runbook-deploy.md` (seção 3.4, trocar o `curl` manual pelo script).

- [ ] O script confere, contra a API pública: `GET /` → 200 `{"message":"OK"}`; `GET /api/ping?target=1.1.1.1&count=2&timeout=3` → 200; `GET /api/dns-lookup?domain=example.com` → 200; `GET /api/ping?target=10.0.0.1` → 400 `private_ip_not_allowed`; `OPTIONS` com `Origin: https://probekit.cc` → 204 com `access-control-allow-origin`; `OPTIONS` com `Origin: https://evil.com` → 403 sem cabeçalhos CORS.
- [ ] Poucas chamadas (rate limit de 50 por 5 min por IP vale para o runner) e repetição com espera curta no começo (propagação do NLB e da Cloudflare).
- [ ] Rodar no fim do *Deploy*, sem segredos; se a Task 5 expuser a versão, conferir também a versão esperada.
- [ ] **Verificar:** rodar localmente contra produção, tudo verde; alterar um valor esperado de propósito e ver o script falhar.

### Task 7: Deploy automático do site **[Criador]**

**Issue:** `ci(pipeline): deploy automático do site no Cloudflare Workers`

**Files:** Create `.github/workflows/deploy-frontend.yml`; Modify `docs/runbook-deploy.md` (seção 5: caminho automático e o manual como plano B).

- [ ] Criar os secrets `CLOUDFLARE_API_TOKEN` (escopo mínimo de Workers; domínios personalizados podem pedir permissão na zona) e `CLOUDFLARE_ACCOUNT_ID`, no ambiente `production`. **Só o criador faz isto.**
- [ ] Workflow: `on: push` em `main` com `paths: frontend/**` e `workflow_dispatch`; checkout, Node fixo, `npm ci`, build com `VITE_API_BASE_URL=https://api.probekit.cc` fixado, `cloudflare/wrangler-action`.
- [ ] Depois do deploy, `curl` em `/`, `/ping` e `/dns-lookup` esperando 200.
- [ ] **Verificar:** mudar um texto do frontend, mergear e ver o site atualizado; `npx wrangler deployments list` mostra a versão nova. Rollback do site: `wrangler rollback`.

### Task 8: Rollback do site por workflow **[Criador]**

**Issue:** `ci(pipeline): workflow de rollback do site`

**Files:** Create `.github/workflows/rollback-frontend.yml`; Modify `docs/runbook-deploy.md` (seção 5.4: o workflow como caminho principal, o comando do Wrangler como plano B).

**Interfaces:**
- Consumes: os secrets `CF_API_TOKEN` e `CF_ACCOUNT_ID` e o ambiente `production` (Task 7); `verify-sites.sh`.
- Produces: o workflow *Rollback Frontend* (`workflow_dispatch`).

- [ ] Entradas do `workflow_dispatch`: `version_id` (opcional) e `reason`. **Sem `version_id`, o workflow só lista** os deployments (`wrangler deployments list`) e termina, para saber a versão sem token na máquina.
- [ ] Ambiente `production` (aprovação), o mesmo `concurrency` do deploy (`deploy-frontend`, sem cancelar), para rollback e deploy não correrem juntos.
- [ ] Passar as entradas ao shell por `env:` (nunca interpolar `${{ inputs.* }}` no `run`) e **validar o formato do `version_id`** (UUID) e o tamanho do `reason` (até 120 caracteres) antes de chamar o Wrangler.
- [ ] Com `version_id`: `npx wrangler rollback "$VERSION_ID" --message "$REASON" --yes`, depois `npx wrangler deployments status` e `bash infra/shellscript/verify-sites.sh`.
- [ ] **Verificar:** rodar só listando; rodar com um `version_id` malformado e ver o job falhar **antes** do Wrangler; voltar para a versão anterior e avançar de novo pelo mesmo workflow (as versões têm o mesmo conteúdo, então é inofensivo).
- O rollback não altera o repositório: o próximo push em `frontend/**` publica de novo a partir da `main`. Dizer isso no runbook.

### Task 9: Rollback manual da API por workflow **[Criador]**

**Issue:** `ci(pipeline): workflow de rollback manual da API`

**Files:** Create `.github/workflows/rollback-api.yml`; Modify `docs/runbook-deploy.md` (seção 7).

**Interfaces:**
- Consumes: o updater das VMs da Task 3 (instala sempre que a versão de `releases/latest` difere da instalada, inclusive para uma anterior).
- Produces: o workflow *Rollback API* (`workflow_dispatch`).

- [ ] Entradas: `tag` (a release para a qual voltar) e `reason`. Passá-las por `env:` e **validar** `tag` contra `^probekit-linux-amd64-api-go-[0-9]+\.[0-9]+\.[0-9]+$`.
- [ ] Conferir que a release existe (`gh release view`) e então `gh release edit "$TAG" --latest`. Sem SSH e sem credencial das VMs; só `contents: write` no job, ambiente `production` (aprovação).
- [ ] As VMs convergem pelo timer em até 5 minutos; o workflow mostra a release marcada como `latest` e instrui a conferir as VMs (se a Task 5 expuser a versão, conferir por ela).
- [ ] **Só voltar para tags que já incluem a proteção da Task 3.** O updater reinstala também o **próprio script** a partir da tag instalada: voltar para uma release anterior à Task 3 tira a proteção de rollback das VMs. Documentar e, de preferência, impedir isso no workflow.
- [ ] **Verificar:** marcar uma release anterior como `latest` e ver as VMs instalarem; marcar a mais nova de volta; tag malformada ou inexistente falha antes de editar a release.
- O efeito dura até a próxima release (ela vira `latest` sozinha). Para uma correção permanente, reverter o commit e publicar.

---

## Self-Review

- **Cobertura:** as sete issues iniciais do epic têm as Tasks 1 a 7, e as Tasks 8 e 9 acrescentam o rollback do site e o manual da API por workflow; o objetivo (testes antes do merge, `main` protegida, rollback, site pelo CI) está coberto pelas Tasks 1, 2, 3 e 7; fila, aprovação e fumaça (4 e 6) endurecem o deploy; a 5 destrava a verificação por versão.
- **Nomes:** `Go`, `NPM` e `Terraform` aparecem iguais nas Tasks 1 e 2.
- **Sem estado:** nenhum "pendente" ou "feito" neste arquivo; o andamento está nas issues. Ao fechar a última sub-issue, este plano ganha o banner de concluído.
