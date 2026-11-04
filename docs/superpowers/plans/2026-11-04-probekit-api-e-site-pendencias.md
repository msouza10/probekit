# Pendências de produto da API e do site — plano

> **Para quem for executar:** task por task. Os passos usam caixas (`- [ ]`) como roteiro; o estado oficial de cada task está na issue e no GitHub Project. O Go da API é do **criador**, escrito como aprendizado: o assistente guia em passos pequenos e escreve os testes; o frontend é do assistente. Commit, push e PR são do criador.

**Goal:** cumprir o contrato da [spec do ping e DNS](../specs/2026-10-01-probekit-ping-dns-feature-design.md), deixar os testes da API independentes da internet e ter uma verificação automática de que o site fala com a API.

**Contexto:** o [plano do primeiro deploy](./2026-10-09-probekit-first-deploy.md) deixou estas pendências para o Project. A spec exige `origin_region` nas respostas e o frontend já lê o campo, mas a API não o devolve. Os testes que sobem o binário real chamam `api.cloudflare.com` na subida, por causa do IP real. A chamada do site à API só foi confirmada à mão (registrada no `docs/runbook-deploy.md`, seção 5.3). As rotas inexistentes do site já respondem 404, e a verificação no navegador foi feita: ficam fora deste plano.

**Restrições globais:** cada mudança de API passa pela release e pelo _Deploy_ ([ADR-0005](../../adr/0005-atualizacao-das-vms-e-deploy-inicial.md)). O repositório é público: sem segredo nem IP em issue ou documento.

**Ordem:** as Tasks 1 e 2 são independentes. A Task 3 (decisão) vem antes da 4; a Task 5 (decisão) vem antes das 6 e 7.

### Task 1: A API devolve `origin_region`

**Resultado esperado:** `/api/ping` e `/api/dns-lookup` trazem `origin_region`, lido da variável `ORIGIN_REGION` do serviço, e o badge de região aparece no site. Sem a variável, o campo some, mas a API não cai. O contrato para variável vazia (omitir ou devolver texto vazio) fica escrito na spec.

- [ ] **Step 1 (criador, com o assistente guiando):** ler a variável como `TLSFilesFromEnv` e `OriginsFromEnv` fazem, entregá-la aos handlers e incluí-la nas duas respostas.
- [ ] **Step 2 (assistente):** testes em `tests/origin_region_test.go` (variável definida e ausente), escritos primeiro.
- [ ] **Step 3 (criador):** o `deploy-api-go.sh` passa a variável ao serviço, como já faz com `CORS_ALLOWED_ORIGINS`. A variável só chega às VMs pelo _Deploy_: rodá-lo logo depois da release.
- [ ] **Step 4 (assistente):** atualizar a spec e o `frontend/README.md` com o contrato; conferir o badge no site em produção e registrar a data.

### Task 2: `verify-api-routes` confere o allow-origin no GET

**Resultado esperado:** o script falha se um `GET /api/ping` com `Origin: https://probekit.cc` ou `https://www.probekit.cc` não trouxer `access-control-allow-origin` igual à origem e `vary: Origin`. Hoje ele só confere o preflight (204) e a origem bloqueada (403). É `curl` com `Origin` escrito à mão, não prova que o navegador aceitou.

- [ ] **Step 1 (criador):** casos novos em `infra/shellscript/verify-api-routes.sh` para as duas origens permitidas.
- [ ] **Step 2 (criador):** conferir que o script sai com código 1 quando o cabeçalho some, removendo `CORS_ALLOWED_ORIGINS` num teste local.
- [ ] **Step 3 (assistente):** atualizar o runbook.

### Task 3: Decisão sobre a busca das faixas da Cloudflare nos testes

`TrustedProxyCIDRs()` busca as faixas na Cloudflare na subida (timeout de 5 s); se falhar, o `main` segue com a lista vazia, o que é seguro. Os testes do binário real chamam a Cloudflare, ficam mais lentos sem rede e fazem o CI depender de um serviço externo.

**Resultado esperado:** uma Decision que termina em ADR, comparando ao menos: URL configurável por variável (o teste aponta para um servidor local) e lista de faixas por variável (o `main` nem faz a busca quando definida).

- [ ] **Step 1 (criador):** escolher a alternativa e aceitar o ADR. Esta task é um rascunho no Project até a decisão estar madura para virar issue.

### Task 4: Testes do binário sem depender da internet

**Depende da Task 3.**

**Resultado esperado:** `go test ./...` passa sem rede e sem esperar o timeout; nenhum teste chama a Cloudflare; há um teste que prova o caminho offline (o binário sobe e o IP real cai no _fallback_ seguro).

- [ ] **Step 1 (assistente):** escrever os testes (`tests/tls_test.go`, `tests/cors_test.go`) conforme o ADR da Task 3.
- [ ] **Step 2 (criador):** a mudança no `main.go` e em `utils/ratelimiter.go`, que segue a decisão.

### Task 5: Decisão sobre adotar o Playwright

O smoke test com navegador real exige uma dependência nova (o navegador é baixado). Decidir antes se vale; se não, registrar um ADR com a alternativa.

**Resultado esperado:** uma Decision que termina em ADR. Esta task é um rascunho no Project até a decisão estar madura.

- [ ] **Step 1 (criador):** escolher e aceitar o ADR.

### Task 6: Smoke test no navegador do site chamando a API

**Depende da Task 5.**

**Resultado esperado:** `npm run test:smoke -- --base https://probekit.cc` abre `/ping` e `/dns-lookup`, dispara a consulta e espera o resultado na página, sem erro de CORS no console; falha com mensagem clara se a API não responder. Fica fora do `npm test` e do CI de PR, para não depender da rede de produção.

- [ ] **Step 1 (assistente):** o teste, escrito primeiro, e o comando.
- [ ] **Step 2 (assistente):** documentar no `frontend/README.md`.

### Task 7: Smoke test depois do deploy do site

**Depende da Task 6.**

**Resultado esperado:** um passo final do `deploy-frontend.yml`, contra `https://probekit.cc`, faz um deploy que quebra a chamada à API (CORS, URL errada) falhar em vez de passar em silêncio. A falha não reverte sozinha: o rollback do site continua manual.

- [ ] **Step 1 (criador):** o passo no workflow.
- [ ] **Step 2 (assistente):** documentar no `docs/runbook-deploy.md`.

### Fechamento

- [ ] **Step 1 (assistente):** quando a última task fechar, banner `> **Status: concluído.** …` neste plano e mais nenhuma edição.
