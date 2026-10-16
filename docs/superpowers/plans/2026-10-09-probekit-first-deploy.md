# Probekit — Primeiro Deploy Completo: Plano de Implementação

> **Para quem executa:** este plano respeita o `AGENTS.md`. Tarefas marcadas **[Criador]** (Terraform, workflows, Go, qualquer credencial) são escritas pelo criador; o assistente só revisa e ensina, e escreve os testes. Tarefas **[Assistente]** são frontend e `wrangler.toml`. Os passos usam checkbox (`- [ ]`) para acompanhamento.
>
> **Por que não há código de infra/Go aqui:** o criador está praticando Terraform e Go (ver `AGENTS.md`). Cada tarefa traz *o quê*, *onde*, *critério de pronto* e *como verificar*; o *como escrever* é feito em sessão guiada, um passo por vez.

**Goal:** `https://probekit.cc` servindo o frontend (Cloudflare Worker) e chamando `https://api.probekit.cc`, que chega em 2 VMs OCI via NLB com TLS Origin CA, com release e deploy automatizados.

**Architecture:** Cloudflare (Worker + DNS proxied, SSL Full strict) → OCI NLB L4 → 2 VMs rodando o binário Go com TLS próprio. Binário publicado por GitHub Release (já existe); VMs atualizam por *pull* (systemd timer); frontend publicado por Wrangler.

**Tech Stack:** Terraform (OCI + Cloudflare), Go `net/http`, systemd, GitHub Actions, React/Vite, Wrangler.

**Specs/ADRs:** `docs/superpowers/specs/2026-10-01-probekit-infra-design.md`, `…-ping-dns-feature-design.md`, `…-frontend-scaffold-design.md`, `docs/adr/0001`, `docs/adr/0002`.

## Global Constraints

- Free tier: shape `VM.Standard.E2.1.Micro` (1 OCPU / 1 GB), região `sa-saopaulo-1`, Cloudflare free.
- Domínio `probekit.cc`; API em `api.probekit.cc` com `proxied = true`.
- Tag de release: `probekit-linux-amd64-api-go-X.Y.Z`; asset `probekit-linux-amd64-api-go` + `SHA256SUMS`.
- Credenciais nunca no repo nem com o assistente (`*.tfvars`, `*.key`, `*.pem`, `*.tfstate` já no `.gitignore`).
- State do Terraform **remoto** no bucket OCI (`backend.tf`, região `sa-saopaulo-1`). `terraform apply` só roda pelo workflow `deploy-api-golang.yml`, disparado manualmente (`workflow_dispatch`) pelo criador; nunca em push ou PR.

---

## 1. Validação do estado atual (executada em 2026-10-09)

| Item | Resultado | Evidência |
|---|---|---|
| Backend Go | ✅ OK | `go vet ./...` limpo; `go test ./...` passa (pacote `tests`) |
| Frontend | ✅ OK | `npm ci` + `vitest`: 13 arquivos / 25 testes passam; `npm run build` OK (aviso: chunk de 554 kB) |
| Lint do frontend | ⚠️ só avisos | `Math.random` em `Ping.tsx:55`, `Date` em `Footer.tsx:91` (regra `react/purity`), `only-export-components` em `ui/*` |
| Terraform | ✅ `validate` OK | ⚠️ `terraform fmt -check` aponta `main.tf`, `cloudflare/variables.tf`, `oci/instance.tf`, `oci/loadbalacers.tf` (formatação, não erro) |
| `terraform plan` | ⏳ não executado | exige credenciais reais — fica com o criador |
| Workflow de release | ✅ lógica validada em repo temporário; commit `187b3a0` | ⏳ nunca rodou no GitHub |
| Plano do scaffold do frontend | ⚠️ desatualizado | 0 de 77 checkboxes marcados, mas o app existe e passa nos testes |
| `OVERVIEW.md` | ⚠️ desatualizado | diz "Frontend: não iniciado" e "Infra: não iniciado" |

### Divergências entre spec/ADR e código (viram tarefas)

| Divergência | Onde |
|---|---|
| ADR-0002 manda TLS no Go; o binário serve HTTP puro | `backend/api-service-golang/main.go` (`ListenAndServe(":8080")`) |
| Egress só TCP; ping (ICMP) e DNS lookup (UDP 53) ficam bloqueados | `infra/terraform/oci/network.tf` (egress `protocol = "6"`) |
| Spec do ping: "resposta sempre inclui de onde partiu o teste"; o backend não devolve isso e o frontend fixa `us-ashburn-1`, mas a infra é `sa-saopaulo-1` | `frontend/src/lib/api.ts` (`ORIGIN_REGION`) |
| Rate limit por `r.RemoteAddr`; atrás de Cloudflare+NLB todos os usuários parecem o mesmo IP | `main.go` (`WithRateLimit`) |
| Frontend chama `/api/...` relativo; em produção cai no Worker, não na API; backend sem CORS | `frontend/src/lib/api.ts`, `main.go` |
| `user_data` ausente: o script de deploy nunca roda | `infra/terraform/oci/instance.tf` |

## 2. Mapa anti-duplicação

| Necessidade | O que já existe | Decisão |
|---|---|---|
| Release do binário | `.github/workflows/build-api-golang.yml` + `infra/shellscript/calculate-version.sh` | **Reusar.** Não criar segundo workflow de build |
| Provisionar a VM | `infra/shellscript/deploy-api-go.sh` | **Estender** (TLS, restart, timer, firewall). Não criar script novo |
| Rede/VMs/NLB/DNS | `infra/terraform/{oci,cloudflare}/` | **Editar** os módulos. Não criar módulo novo |
| App do frontend | `frontend/` completo + `docs/superpowers/plans/2026-10-04-probekit-frontend-scaffold.md` | **Não recriar plano de frontend.** Só marcar o antigo como concluído (Task 14) |
| Testes do backend | `backend/api-service-golang/tests/` | **Adicionar** arquivos ao mesmo pacote |
| Wrangler / workflow de frontend / CI de PR / validate do Terraform | nada | **Criar** (Tasks 9, 11, 12) |

## Review Focus

Falhas prováveis que nenhum teste automatizado cobre; cada uma tem verificação manual na tarefa dona:

1. **Primeiro boot antes da release existir:** o `user_data` baixa o `latest`; se a release `1.0.0` não existir, a VM sobe sem API (Task 5 antes da Task 6).
2. **Porta Cloudflare → origem:** em modo proxied, a Cloudflare conecta na porta do visitante (443) salvo Origin Rule — *confirmar na doc da Cloudflare*. Se o NLB só escutar 8080, `api.probekit.cc` dá 521/522 (Task 1).
3. **Rate limit compartilhado:** sem `CF-Connecting-IP`, 50 req/5 min valem para *todos* os usuários de um edge da Cloudflare (Task 3).
4. **ICMP/UDP bloqueados:** a página existe, mas ping e DNS lookup retornam erro em produção (Task 2).
5. **CORS/preflight:** `fetch` cross-origin do Worker para a API falha no navegador mesmo com `curl` funcionando (Tasks 3 e 8).
6. **Firewall do SO da VM** (imagens Ubuntu da OCI costumam bloquear tudo exceto SSH — *verificar na primeira VM*): security list liberada e porta ainda fechada (Task 4).

---

## Fase 0 — Decisões (bloqueiam as demais)

### Task 0: Registrar decisões em ADRs

**Owner:** criador decide; assistente redige o ADR a partir das respostas.
**Files:** Create `docs/adr/0003-porta-origem-e-tls.md`, `docs/adr/0004-chamada-frontend-api.md`, `docs/adr/0005-atualizacao-das-vms.md`

| ID | Pergunta | Recomendação |
|---|---|---|
| D1 | Porta Cloudflare→NLB→VM | NLB escuta **443** e encaminha para **8443** na VM (Go não precisa de `CAP_NET_BIND_SERVICE`). Alternativa: Origin Rule mantendo 8080 |
| D2 | Como o frontend chama a API | **Direto em `api.probekit.cc` com CORS** (allowlist `https://probekit.cc` + origem de dev). Alternativa: rota no Worker fazendo proxy, sem CORS, mas com código de Worker |
| D3 | Como as VMs recebem **novas** versões (redeploy; o deploy inicial é do workflow, ver D6) | **EM ABERTO** (criador ainda decide). Opção A: systemd timer nas VMs consulta `releases/latest` (sem SSH nem chave no CI). Opção B: GitHub Action dispara o redeploy (ex.: ao publicar release), exige SSH do runner e chave no CI. Não bloqueia o deploy inicial |
| D4 | Entrega do certificado Origin CA nas VMs | **Cópia manual única por `scp`** (validade de até 15 anos, ADR-0002). `user_data` é visível na metadata da OCI, então não serve para chave privada |
| D5 | State do Terraform | **Decidido: remoto** no bucket OCI (`backend.tf`). Substitui a decisão 8 do spec de infra (state local). CI pode rodar `plan` e `apply` |
| D6 | Deploy inicial | **Decidido:** o workflow `deploy-api-golang.yml` (manual) roda `terraform apply`, descobre os IPs das VMs, conecta por SSH e executa o `deploy-api-go.sh` (binário + serviço systemd). Segredos via Infisical (OIDC) |

- [ ] Responder D1, D2, D3, D4 (D5 e D6 já decididas). Estado atual: D1 está no Terraform como 443→443 (NLB escuta 443 e a VM também; difere da recomendação 443→8443, registrar no ADR); D3 está implementada no script (timer de 5 min); D2 e D4 em aberto (Origin CA ainda não gerado)
- [ ] Criar os 3 ADRs (D1+D4 no 0003; D5 vira nota no 0005 junto com D3)
- [ ] Atualizar a decisão 8 do spec de infra (state agora remoto)

---

## Fase 1 — Corrigir a base antes do primeiro `apply`

### Task 1: Rede e NLB na porta decidida **[Criador]**
**Depende de:** D1. **Files:** `infra/terraform/oci/network.tf`, `infra/terraform/oci/loadbalacers.tf`

- [x] Listener do NLB e `port` do backend/health check na porta definida em D1 (443, TCP)
- [x] Ingress da security list nessa porta (hoje só 22 e 443; 8080 removida)
- [x] `terraform fmt -recursive` e `terraform validate` (verificados em 2026-10-16: sem diferenças e configuração válida)
- [ ] **Verificar:** `terraform plan` mostra só alterações de listener/backend/security list (rodar no primeiro run do workflow)

### Task 2: Egress liberando ICMP e UDP **[Criador]**
**Files:** `infra/terraform/oci/network.tf` (bloco `egress_security_rules`)

- [x] Trocar o egress para permitir todos os protocolos (`"all"`)
- [ ] **Verificar (pós-apply, Task 7):** `ping` e `dns-lookup` respondem de dentro da VM

### Task 3: Go — TLS, IP do cliente, CORS e `origin_region` **[Criador; testes: Assistente]**
**Depende de:** D1, D2. **Files:** `backend/api-service-golang/main.go`, `utils/` (novo helper de IP), `handler/ping.go`, `handler/lookup.go`

Conceitos a estudar (sessão guiada, um passo por vez): `http.ListenAndServeTLS`; ler cabeçalho `CF-Connecting-IP` só quando a conexão vem de IP da Cloudflare (senão é forjável); middleware CORS e resposta ao `OPTIONS`; ler uma variável de ambiente para `ORIGIN_REGION`.

Critérios de pronto:
- [ ] Servidor sobe em TLS com caminhos de cert/key vindos de variáveis de ambiente
- [ ] `RateLimiter` usa o IP real do cliente
- [ ] `Access-Control-Allow-Origin` só para a allowlist; `OPTIONS` responde 204
- [ ] Respostas de `/api/ping` e `/api/dns-lookup` trazem `origin_region` (cumpre o spec do ping)
- [ ] **Assistente:** escrever os testes (`tests/clientip_test.go`, `tests/cors_test.go`, `tests/origin_region_test.go`) assim que o criador definir as assinaturas; rodar `go test ./...`

### Task 4: Estender `deploy-api-go.sh` **[Criador]**
**Depende de:** D1, D3, D4. **Files:** `infra/shellscript/deploy-api-go.sh` (editar). O timer reutiliza o próprio script, copiado da tag da release para `/usr/local/sbin/autodeploy-api-go.sh`, então `probekit-update.sh` não é mais necessário.

- [ ] Health check final usa HTTPS na porta de D1 (`curl -k`), não `http://localhost:8080` (depende da Task 3)
- [ ] Service recebe as variáveis de ambiente de cert/key/região/porta (depende da Task 3 e D4)
- [x] Liberar a porta no firewall do SO e persistir: `free_ports 22 443` (iptables/ip6tables, `netfilter-persistent save` se existir); **confirmar o estado real na VM** com `iptables -L INPUT -n --line-numbers`
- [x] Timer de atualização (`autodeploy-api-go.timer`, 5 min): compara a tag instalada com `releases/latest`, baixa, confere `SHA256SUMS`, reinicia só se mudou; updater instalado a partir da **tag** da release
- [x] Ramo RedHat removido (só Ubuntu); `set -euo pipefail`; `flock`; download em `mktemp -d`
- [ ] **Verificar:** rodar duas vezes na mesma VM é idempotente. Simulado em 2026-10-16 (execução repetida: 0 downloads, 0 restarts, regras de firewall sem duplicar; release nova: 1 restart; checksum adulterado: aborta sem alterar nada). **Falta confirmar numa VM real**

### Task 5: Primeira release **[Criador]**
**Depende de:** Task 3. **Files:** nenhum (usa o workflow existente)

- [ ] Merge na `main` com um `feat:` em `backend/api-service-golang/`
- [ ] **Verificar:** release `probekit-linux-amd64-api-go-1.0.0` com binário e `SHA256SUMS`
- [ ] **Verificar:** `curl -fsSL …/releases/latest | jq -r .tag_name` devolve a tag

---

## Fase 2 — Subir a infraestrutura

### Task 6: `user_data` e certificado **[Criador]**
**Depende de:** Tasks 4, 5. **Files:** `infra/terraform/oci/instance.tf` (adicionar `user_data` ao `metadata`)

- [x] ~~`user_data` baixa e executa o `deploy-api-go.sh` da release~~ — descartado, substituído pela D6 (o workflow entrega o script por SSH)
- [ ] Gerar o certificado Origin CA no painel da Cloudflare (`api.probekit.cc`) e guardar fora do repo

### Task 7: Deploy inicial pelo workflow e runbook **[Criador]**
**Files:** `.github/workflows/deploy-api-golang.yml`

- [x] Workflow corrigido: `setup-terraform` em step próprio (wrapper desligado), `plan -out=tfplan` e `apply tfplan` (plano salvo, sem `-auto-approve`), sem `continue-on-error`, sem step de "state" (já é remoto)
- [x] Autenticação OCI no runner: strings de config no Infisical (OIDC); chave da API OCI em GitHub Secret, gravada em arquivo (`TF_VAR_private_key_path`)
- [x] Step que lê `api_probekit_public_ip` e exporta `VM_API_01`/`VM_API_02` (sem hífen)
- [x] Espera das VMs: laço de até 30 tentativas com `cloud-init status --wait`, falha com `exit 1` se esgotar
- [x] SSH para cada VM com chave em GitHub Secret, `StrictHostKeyChecking=accept-new`, executando o `deploy-api-go.sh` com `sudo bash -s`
- [x] Porta 22 da security list permite o acesso do runner (hoje `0.0.0.0/0`; restringir na Task 13)
- [ ] Conferir no GitHub os nomes dos secrets usados pelo workflow (`SSH_PRIVATE_KEY_`, `PRIVATE_KEY_PATH`) e, no Infisical, que os segredos se chamam `TF_VAR_*`
- [ ] Limpar linhas em branco ao final do workflow; opcional: `concurrency` para evitar dois applies simultâneos
- [ ] Disparar o workflow manualmente e revisar o `plan` no log
- [ ] `scp` do cert/key para as 2 VMs e `systemctl restart probekit`
- [ ] Zona Cloudflare em **SSL/TLS → Full (strict)**
- [ ] **Smoke test:** `curl -fsS https://api.probekit.cc/` → `{"message":"OK"}`; `/api/ping?target=1.1.1.1&count=2`; `/api/dns-lookup?domain=example.com`; ping a IP privado → `400`
- [ ] Derrubar uma VM e confirmar que o NLB continua respondendo
- [ ] Registrar o passo a passo em `docs/runbook-deploy.md`

---

## Fase 3 — Frontend

### Task 8: URL base da API e região vinda da resposta **[Assistente]**
**Depende de:** D2, Task 3. **Files:** Modify `frontend/src/lib/api.ts`; Create `frontend/.env.example`, `frontend/src/lib/api.test.ts`

- [ ] Teste: `runPing` usa `import.meta.env.VITE_API_BASE_URL` como prefixo e, sem a variável, usa caminho relativo (dev com proxy do Vite)
- [ ] Remover `ORIGIN_REGION` fixo; usar `origin_region` da resposta
- [ ] Mensagem de erro de rede sem citar `localhost:8080`
- [ ] `npx vitest run` e `npm run build`

### Task 9: `wrangler.toml` **[Assistente]**
**Files:** Create `frontend/wrangler.toml`

- [ ] Worker com static assets apontando para `dist`, fallback de SPA, `routes` para `probekit.cc` (e `www`, se desejado), conforme decisões 1, 3 e 12 do spec de infra
- [ ] **Verificar:** `npx wrangler deploy --dry-run` (sem credencial real)

---

## Fase 4 — Pipelines **[Criador]**

### Task 10: Segredos no GitHub
- [ ] `CLOUDFLARE_API_TOKEN` (escopo Workers) e `CLOUDFLARE_ACCOUNT_ID`
- [ ] Credenciais OCI e chave SSH ficam no Infisical (acesso por OIDC); no GitHub só os segredos mínimos. Como o CI agora aplica Terraform (D5/D6), restringir o `environment: production` (aprovação/branch)

### Task 11: CI em pull request
**Files:** Create `.github/workflows/ci.yml`
- [ ] Backend: `go vet` + `go test ./...`
- [ ] Frontend: `npm ci`, `lint`, `vitest run`, `build`
- [ ] Terraform: `fmt -check -recursive` e `validate` (com `init -backend=false`)
- [ ] Os jobs de PR não duplicam o `go test` do workflow de release; ele continua como trava final

### Task 12: Deploy do frontend
**Files:** Create `.github/workflows/deploy-frontend.yml`
- [ ] Dispara na `main` com `paths: frontend/**`; usa `cloudflare/wrangler-action` com `VITE_API_BASE_URL=https://api.probekit.cc` no build
- [ ] **Verificar:** `https://probekit.cc/ping` carrega e executa um ping real

---

## Fase 5 — Hardening e documentação

### Task 13: Restringir acessos **[Criador]**
- [ ] Ingress da API só com os ranges de IP da Cloudflare (ADR-0002)
- [ ] SSH (22) só do seu IP, ou removido (se o acesso for por outro meio)
- [ ] Instâncias em fault domains distintos

### Task 14: Documentação **[Assistente]**
- [ ] `OVERVIEW.md`: atualizar o progresso (frontend e infra)
- [ ] Marcar o plano `2026-10-04-probekit-frontend-scaffold.md` como concluído
- [ ] Corrigir referências a `docs/arch.md` → `docs/architecture/arch.md`
- [ ] Remover a decisão "fora do Terraform" obsoleta no spec de infra

---

## Ordem e dependências

```
Task 0 ─┬─ Task 1 ─┐
        ├─ Task 2 ─┤
        ├─ Task 3 ─┼─ Task 5 ─┐
        └─ Task 4 ─┘          ├─ Task 6 ─ Task 7 ─┬─ Task 8 ─ Task 9 ─ Task 12
                              │                   └─ Task 10, 11
                              └──────────────────────────── Task 13, 14
```

Tarefas 1, 2 e 3 são independentes entre si. As Tasks 8 e 9 (assistente) podem começar assim que D2 estiver decidido, em paralelo com a Fase 2.

## Self-Review

- **Cobertura do spec de infra:** DNS/NLB/VMs (1, 2, 6, 7), deploy do binário (4, 5, 6), Wrangler (9, 12), TLS Origin CA/Full strict (3, 6, 7), CI e `terraform validate` (11). `terraform plan` em PR continua fora do escopo: o PR só roda `fmt` e `validate`; `plan` e `apply` ficam no workflow manual (D5/D6). Redeploy das VMs (D3) segue em aberto.
- **Cobertura do spec do ping:** origem da resposta (Task 3 + 8), rate limit (Task 3), IP privado (smoke test da Task 7).
- **Sem duplicação:** ver seção 2.
- **Lacuna aceita:** nenhum teste automatizado cobre o middleware de rate limit dentro de `main()` (já registrado no `OVERVIEW.md`); a verificação é o smoke test da Task 7.
