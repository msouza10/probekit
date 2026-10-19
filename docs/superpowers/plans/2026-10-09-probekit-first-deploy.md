# Probekit — Primeiro Deploy Completo: Plano de Implementação

> **Status: concluído em 2026-10-18.** O primeiro marco foi entregue: site no Cloudflare Workers chamando a API em HTTPS nas 2 VMs atrás do NLB, com CORS, rate limit pelo IP real do cliente (PR #10) e release e deploy da API automatizados (releases 1.0.0 a 1.2.1). Este plano é histórico e não recebe mais edições: as marcações de "pendente" e "⏳" abaixo refletem 2026-10-17 e **não valem como estado**. O que sobrou (CI em pull request, deploy automático do site, endurecimento de acessos, teste de derrubar uma VM, `origin_region`) está nas issues e no GitHub Project.

> **Para quem executa:** este plano respeita o `AGENTS.md`. Tarefas marcadas **[Criador]** (Terraform, workflows, Go, qualquer credencial) são escritas pelo criador; o assistente só revisa e ensina, e escreve os testes. Tarefas **[Assistente]** são frontend e `wrangler.toml`. Os passos usam checkbox (`- [ ]`) para acompanhamento.
>
> **Por que não há código de infra/Go aqui:** o criador está praticando Terraform e Go (ver `AGENTS.md`). Cada tarefa traz *o quê*, *onde*, *critério de pronto* e *como verificar*; o *como escrever* é feito em sessão guiada, um passo por vez.

**Goal:** `https://probekit.cc` servindo o frontend (Cloudflare Worker) e chamando `https://api.probekit.cc`, que chega em 2 VMs OCI via NLB com TLS Origin CA, com release e deploy automatizados.

**Architecture:** Cloudflare (Worker + DNS proxied, SSL Full strict) → OCI NLB L4 → 2 VMs rodando o binário Go com TLS próprio. Binário publicado por GitHub Release (já existe); VMs atualizam por *pull* (systemd timer); frontend publicado por Wrangler.

**Tech Stack:** Terraform (OCI + Cloudflare), Go `net/http`, systemd, GitHub Actions, React/Vite, Wrangler.

**Specs/ADRs:** `docs/superpowers/specs/2026-10-01-probekit-infra-design.md`, `…-ping-dns-feature-design.md`, `…-frontend-scaffold-design.md`, `docs/adr/0001`, `docs/adr/0002`.

## Estado em 2026-10-17

O primeiro marco está **no ar**: `https://probekit.cc` (site, deploy manual com Wrangler) chamando `https://api.probekit.cc` (2 VMs OCI atrás do NLB, TLS Origin CA, CORS), com release e deploy da API automatizados. As seções abaixo mantêm o histórico do plano, agora com cada item marcado conforme o que foi feito e verificado.

| Task | Estado |
|---|---|
| 0 · Decisões e ADRs | ✅ ADRs 0003, 0004 e 0005 |
| 1 · Rede e NLB na 443 | ✅ (falta só revisar o `plan` no log do workflow) |
| 2 · Egress ICMP/UDP | ✅ verificado em produção |
| 3 · Go: TLS, IP do cliente, CORS, `origin_region` | ⚠️ TLS ✅ e CORS ✅; **IP real do cliente e `origin_region` pendentes** |
| 4 · `deploy-api-go.sh` | ✅ |
| 5 · Primeira release | ✅ 1.0.0, 1.1.0 e 1.2.0 |
| 6 · Certificado | ✅ entregue pelo workflow |
| 7 · Deploy inicial e runbook | ⚠️ deploy, smoke test e runbook ✅; faltam o teste de derrubar uma VM, confirmar Full (strict) no painel e `concurrency` |
| 8 · Frontend: URL base da API | ✅ PR #8 |
| 9 · `wrangler.toml` | ✅ e **site publicado manualmente** |
| 10 · Secrets no GitHub | ⏳ só o necessário para automatizar o site |
| 11 · CI em pull request | ⏳ |
| 12 · Deploy automático do frontend | ⏳ (hoje manual) |
| 13 · Endurecimento de acessos | ⏳ |
| 14 · Documentação | ✅ nesta rodada |

**Próximos passos:** (1) Task 3 restante no backend (IP real do cliente e `origin_region`); (2) Tasks 11 e 12 (CI e deploy automático do site); (3) Task 13 (a 443 só para as faixas da Cloudflare, SSH restrito); (4) teste de derrubar uma VM.

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

### Situação das divergências em 2026-10-17

| Divergência | Situação |
|---|---|
| TLS no Go | ✅ Resolvida (PR #5, [ADR-0003](../../adr/0003-porta-origem-e-entrega-do-certificado.md)) |
| Egress só TCP | ✅ Resolvida (egress `all`; ping e DNS lookup funcionam nas VMs) |
| `origin_region` ausente; frontend com região fixa | ⏳ O frontend não fixa mais a região (PR #8) e lê o campo; o backend ainda não o devolve |
| Rate limit por `RemoteAddr` | ⏳ Pendente: o NLB preserva a origem, então o Go vê o IP da borda da Cloudflare |
| Frontend relativo e sem CORS | ✅ Resolvida (CORS no PR #7, `VITE_API_BASE_URL` no PR #8, [ADR-0004](../../adr/0004-chamada-frontend-api-com-cors.md)) |
| `user_data` ausente | ✅ Superada pela D6: o workflow entrega o script por SSH |

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
| D3 | Como as VMs recebem **novas** versões (redeploy; o deploy inicial é do workflow, ver D6) | **Decidido: opção A** (timer de 5 min nas VMs), ver [ADR-0005](../../adr/0005-atualizacao-das-vms-e-deploy-inicial.md). Opção A: systemd timer nas VMs consulta `releases/latest` (sem SSH nem chave no CI). Opção B: GitHub Action dispara o redeploy (ex.: ao publicar release), exige SSH do runner e chave no CI. Não bloqueia o deploy inicial |
| D4 | Entrega do certificado Origin CA nas VMs | **Cópia manual única por `scp`** (validade de até 15 anos, ADR-0002). `user_data` é visível na metadata da OCI, então não serve para chave privada **Mudou na execução:** o certificado vai por secrets do GitHub e pelo workflow ([ADR-0003](../../adr/0003-porta-origem-e-entrega-do-certificado.md)). |
| D5 | State do Terraform | **Decidido: remoto** no bucket OCI (`backend.tf`). Substitui a decisão 8 do spec de infra (state local). CI pode rodar `plan` e `apply` |
| D6 | Deploy inicial | **Decidido:** o workflow `deploy-api-golang.yml` (manual) roda `terraform apply`, descobre os IPs das VMs, conecta por SSH e executa o `deploy-api-go.sh` (binário + serviço systemd). Segredos via Infisical (OIDC) |

- [x] Responder D1, D2, D3, D4 (D5 e D6 já decididas). Respostas registradas em 2026-10-17: D1 = 443→443 ([ADR-0003](../../adr/0003-porta-origem-e-entrega-do-certificado.md)); D2 = frontend chama a API direto com CORS ([ADR-0004](../../adr/0004-chamada-frontend-api-com-cors.md)); D3 = timer de 5 min nas VMs ([ADR-0005](../../adr/0005-atualizacao-das-vms-e-deploy-inicial.md)); D4 = certificado entregue pelo workflow a partir de secrets do GitHub, no lugar do `scp` manual ([ADR-0003](../../adr/0003-porta-origem-e-entrega-do-certificado.md))
- [x] Criar os 3 ADRs: 0003 (D1+D4), 0004 (D2) e 0005 (D3+D5+D6), em 2026-10-17
- [x] Atualizar a decisão 8 do spec de infra (state agora remoto), feito em 2026-10-17

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
- [x] **Verificar (pós-apply, Task 7):** `ping` e `dns-lookup` respondem de dentro da VM — verificado em produção em 2026-10-17: `/api/ping` e `/api/dns-lookup` respondem 200 por `api.probekit.cc` (o ping exigiu liberar o ICMP sem privilégio, ver Task 4)

### Task 3: Go — TLS, IP do cliente, CORS e `origin_region` **[Criador; testes: Assistente]**
**Depende de:** D1, D2. **Files:** `backend/api-service-golang/main.go`, `utils/` (novo helper de IP), `handler/ping.go`, `handler/lookup.go`

Conceitos a estudar (sessão guiada, um passo por vez): `http.ListenAndServeTLS`; ler cabeçalho `CF-Connecting-IP` só quando a conexão vem de IP da Cloudflare (senão é forjável); middleware CORS e resposta ao `OPTIONS`; ler uma variável de ambiente para `ORIGIN_REGION`.

Critérios de pronto:
- [x] Servidor sobe em TLS com caminhos de cert/key vindos de variáveis de ambiente — PR #5; `tests/tls_test.go` (leitura das variáveis, HTTPS real, saída com erro sem os arquivos)
- [ ] `RateLimiter` usa o IP real do cliente — **pendente.** O NLB preserva o IP de origem (verificado com `ss` nas VMs), então o Go enxerga o IP da borda da Cloudflare. Plano: `ClientIP` confia em `CF-Connecting-IP` só quando a conexão vem de faixa da Cloudflare (`TRUSTED_PROXY_CIDRS`)
- [x] `Access-Control-Allow-Origin` só para a allowlist; `OPTIONS` responde 204 — PR #7; `tests/cors_test.go`; o preflight responde 204 (origem permitida) ou 403 (não permitida)
- [ ] Respostas de `/api/ping` e `/api/dns-lookup` trazem `origin_region` (cumpre o spec do ping) — **pendente**; o frontend já lê o campo
- [ ] **Assistente:** escrever os testes (`tests/clientip_test.go`, `tests/cors_test.go`, `tests/origin_region_test.go`) assim que o criador definir as assinaturas; rodar `go test ./...` — `tls_test.go` e `cors_test.go` escritos; faltam `clientip_test.go` e `origin_region_test.go`

### Task 4: Estender `deploy-api-go.sh` **[Criador]**
**Depende de:** D1, D3, D4. **Files:** `infra/shellscript/deploy-api-go.sh` (editar). O timer reutiliza o próprio script, copiado da tag da release para `/usr/local/sbin/autodeploy-api-go.sh`, então `probekit-update.sh` não é mais necessário.

- [x] Health check final usa HTTPS na porta de D1 (`curl -k`), não `http://localhost:8080` (depende da Task 3) — `curl -fsS -k https://localhost:443/`
- [x] Service recebe as variáveis de ambiente de cert/key/região/porta (depende da Task 3 e D4) — cert/key (`TLS_CERT_FILE`, `TLS_KEY_FILE`) e `CORS_ALLOWED_ORIGINS`; a porta usa o padrão `:443`; a região depende do `origin_region` (Task 3)
- [x] Liberar a porta no firewall do SO e persistir: `free_ports 22 443` (iptables/ip6tables, `netfilter-persistent save` se existir); **confirmar o estado real na VM** com `iptables -L INPUT -n --line-numbers`
- [x] Timer de atualização (`autodeploy-api-go.timer`, 5 min): compara a tag instalada com `releases/latest`, baixa, confere `SHA256SUMS`, reinicia só se mudou; updater instalado a partir da **tag** da release
- [x] Ramo RedHat removido (só Ubuntu); `set -euo pipefail`; `flock`; download em `mktemp -d`
- [x] **Verificar:** rodar duas vezes na mesma VM é idempotente. Simulado em 2026-10-16 (execução repetida: 0 downloads, 0 restarts, regras de firewall sem duplicar; release nova: 1 restart; checksum adulterado: aborta sem alterar nada). **Falta confirmar numa VM real** — o workflow *Deploy* rodou três vezes em 2026-10-17 sobre VMs já configuradas, sem falha
- [x] Instalar cert e chave em `/etc/probekit` (dono `probekit`, chave `0600`) e conferir que existem **antes** de trocar o binário (`install_tls_files` e `check_tls_files`)
- [x] ICMP sem privilégio: `allow_icmp` grava `net.ipv4.ping_group_range` com o gid do usuário do serviço; `CAP_NET_RAW` fica disponível para ferramentas futuras (traceroute)

### Task 5: Primeira release **[Criador]**
**Depende de:** Task 3. **Files:** nenhum (usa o workflow existente)

- [x] Merge na `main` com um `feat:` em `backend/api-service-golang/` — PR #5 (release 1.1.0) e PR #7 (1.2.0)
- [x] **Verificar:** release `probekit-linux-amd64-api-go-1.0.0` com binário e `SHA256SUMS` — releases 1.0.0, 1.1.0 e 1.2.0 publicadas
- [x] **Verificar:** `curl -fsSL …/releases/latest | jq -r .tag_name` devolve a tag — `latest` é a 1.2.0

---

## Fase 2 — Subir a infraestrutura

### Task 6: `user_data` e certificado **[Criador]**
**Depende de:** Tasks 4, 5. **Files:** `infra/terraform/oci/instance.tf` (adicionar `user_data` ao `metadata`)

- [x] ~~`user_data` baixa e executa o `deploy-api-go.sh` da release~~ — descartado, substituído pela D6 (o workflow entrega o script por SSH)
- [x] Gerar o certificado Origin CA no painel da Cloudflare (`api.probekit.cc`) e guardar fora do repo — entregue por secrets do GitHub e pelo workflow ([ADR-0003](../../adr/0003-porta-origem-e-entrega-do-certificado.md))

### Task 7: Deploy inicial pelo workflow e runbook **[Criador]**
**Files:** `.github/workflows/deploy-api-golang.yml`

- [x] Workflow corrigido: `setup-terraform` em step próprio (wrapper desligado), `plan -out=tfplan` e `apply tfplan` (plano salvo, sem `-auto-approve`), sem `continue-on-error`, sem step de "state" (já é remoto)
- [x] Autenticação OCI no runner: strings de config no Infisical (OIDC); chave da API OCI em GitHub Secret, gravada em arquivo (`TF_VAR_private_key_path`)
- [x] Step que lê `api_probekit_public_ip` e exporta `VM_API_01`/`VM_API_02` (sem hífen)
- [x] Espera das VMs: laço de até 30 tentativas com `cloud-init status --wait`, falha com `exit 1` se esgotar
- [x] SSH para cada VM com chave em GitHub Secret, `StrictHostKeyChecking=accept-new`, executando o `deploy-api-go.sh` com `sudo bash -s`
- [x] Porta 22 da security list permite o acesso do runner (hoje `0.0.0.0/0`; restringir na Task 13)
- [x] Conferir no GitHub os nomes dos secrets usados pelo workflow (`SSH_PRIVATE_KEY_`, `PRIVATE_KEY_PATH`) e, no Infisical, que os segredos se chamam `TF_VAR_*` — nomes atuais: `SSH_PRIVATE_KEY`, `OCI_PRIVATE_KEY`, `TLS_CERT_FILE`, `TLS_KEY_FILE`
- [ ] Limpar linhas em branco ao final do workflow; opcional: `concurrency` para evitar dois applies simultâneos
- [x] Disparar o workflow manualmente e revisar o `plan` no log — executado com sucesso mais de uma vez; revisar o `plan` no log segue sendo responsabilidade do criador a cada execução
- [x] `scp` do cert/key para as 2 VMs e `systemctl restart probekit` — automatizado no workflow (passo que grava o cert e a chave e os copia para as duas VMs); o restart é feito pelo script de deploy
- [ ] Zona Cloudflare em **SSL/TLS → Full (strict)** — a API responde por HTTPS pela Cloudflare com o Origin CA; falta confirmar no painel que o modo é Full (strict)
- [x] **Smoke test:** `curl -fsS https://api.probekit.cc/` → `{"message":"OK"}`; `/api/ping?target=1.1.1.1&count=2`; `/api/dns-lookup?domain=example.com`; ping a IP privado → `400` — verificado em 2026-10-17: `/`, `/api/ping` e `/api/dns-lookup` retornam 200 e o ping para `10.0.0.1` retorna 400
- [ ] Derrubar uma VM e confirmar que o NLB continua respondendo
- [x] Registrar o passo a passo em `docs/runbook-deploy.md` — [`docs/runbook-deploy.md`](../../runbook-deploy.md)

---

## Fase 3 — Frontend

### Task 8: URL base da API e região vinda da resposta **[Assistente]**
**Depende de:** D2, Task 3. **Files:** Modify `frontend/src/lib/api.ts`; Create `frontend/.env.example`, `frontend/src/lib/api.test.ts`

- [x] Teste: `runPing` usa `import.meta.env.VITE_API_BASE_URL` como prefixo e, sem a variável, usa caminho relativo (dev com proxy do Vite) — PR #8; `frontend/src/lib/api.test.ts`
- [x] Remover `ORIGIN_REGION` fixo; usar `origin_region` da resposta — o badge só aparece se a API devolver o campo
- [x] Mensagem de erro de rede sem citar `localhost:8080`
- [x] `npx vitest run` e `npm run build` — 37 testes passando e build ok

### Task 9: `wrangler.toml` **[Assistente]**
**Files:** Create `frontend/wrangler.toml`

- [x] Worker com static assets apontando para `dist`, fallback de SPA, `routes` para `probekit.cc` (e `www`, se desejado), conforme decisões 1, 3 e 12 do spec de infra — `frontend/wrangler.toml`
- [x] **Verificar:** `npx wrangler deploy --dry-run` (sem credencial real) — o dry-run lê os arquivos de `dist/` sem erro
- [x] **Primeiro deploy manual:** o site está no ar em `probekit.cc` e `www.probekit.cc` (verificado em 2026-10-17: `/`, `/ping` e `/dns-lookup` respondem 200). Build com `VITE_API_BASE_URL=https://api.probekit.cc` e `npx wrangler deploy`; passo a passo no [runbook](../../runbook-deploy.md)

---

## Fase 4 — Pipelines **[Criador]**

### Task 10: Segredos no GitHub
- [ ] `CLOUDFLARE_API_TOKEN` (escopo Workers) e `CLOUDFLARE_ACCOUNT_ID` — só necessários para automatizar o site; hoje o deploy manual usa `wrangler login`
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
- [ ] **Verificar:** `https://probekit.cc/ping` carrega e executa um ping real — o site já foi publicado manualmente; falta a automação e confirmar no navegador a chamada à API (verificada até aqui por `curl`)

---

## Fase 5 — Hardening e documentação

### Task 13: Restringir acessos **[Criador]**
- [ ] Ingress da API só com os ranges de IP da Cloudflare (ADR-0002)
- [ ] SSH (22) só do seu IP, ou removido (se o acesso for por outro meio)
- [ ] Instâncias em fault domains distintos

### Task 14: Documentação **[Assistente]**
- [x] `OVERVIEW.md`: atualizar o progresso (frontend e infra) — atualizado em 2026-10-17
- [x] Marcar o plano `2026-10-04-probekit-frontend-scaffold.md` como concluído — banner de concluído no plano do scaffold
- [x] Corrigir referências a `docs/arch.md` → `docs/architecture/arch.md` — na spec de infra
- [x] Remover a decisão "fora do Terraform" obsoleta no spec de infra — spec de infra atualizada (state remoto, deploy do binário, webserver resolvido)

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
