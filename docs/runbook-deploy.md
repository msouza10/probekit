# Runbook: publicar e diagnosticar a API e o site

Este documento descreve como publicar o Probekit, como conferir que deu certo e o que fazer quando algo falha. Tudo aqui foi verificado em produção em 2026-10-17, exceto o que estiver marcado como pendente de confirmação. Decisões e motivos estão nos [ADRs](./adr/); a arquitetura, em [`architecture/arch.md`](./architecture/arch.md).

> Nunca coloque valores de secrets, certificados ou chaves neste documento nem no repositório. Aqui só aparecem **nomes**.

## 1. O que existe

| Parte | Endereço | Como é publicada |
|---|---|---|
| Site | `https://probekit.cc` e `https://www.probekit.cc` | Workflow *Deploy Frontend*, com aprovação (seção 5); manual com o Wrangler como plano B |
| API | `https://api.probekit.cc` | Release automática + workflow *Deploy API* manual (seção 3) |
| Infraestrutura | OCI e Cloudflare | Terraform, dentro do workflow *Deploy API* |

## 2. Secrets e configuração

**GitHub, ambiente `production`:**

| Secret | Uso |
|---|---|
| `SSH_PRIVATE_KEY` | acesso SSH do workflow às VMs |
| `OCI_PRIVATE_KEY` | chave da API OCI, gravada em arquivo para o Terraform |
| `TLS_CERT_FILE` | **conteúdo** do certificado Origin CA (PEM completo, com as linhas `BEGIN/END`) |
| `TLS_KEY_FILE` | **conteúdo** da chave privada do certificado (PEM completo) |
| `CF_API_TOKEN` | token da API da Cloudflare, só para publicar o site (o workflow o passa ao Wrangler como `CLOUDFLARE_API_TOKEN`) |
| `CF_ACCOUNT_ID` | id da conta da Cloudflare, lido pelo Wrangler como `CLOUDFLARE_ACCOUNT_ID` |

O nome `TLS_*_FILE` engana: o secret guarda o texto do PEM, e o workflow o grava em arquivo. As demais configurações da OCI (ids, região, etc.) vêm do **Infisical**, por OIDC.

**GitHub, ambiente `plan`** (sem aprovação, só a branch `main`): apenas `OCI_PRIVATE_KEY`, que o `terraform plan` exige. A chave SSH e o certificado ficam só no `production`.

**Infisical:** além das configurações da OCI e das variáveis do Terraform, guarda a `TFPLAN_PASSPHRASE`, a senha que cifra o plano do Terraform entre o job `plan` e o job `deploy`. Por que dois lugares: [ADR-0007](./adr/0007-gestao-de-segredos-com-infisical.md).

**Cloudflare:** o deploy do site usa `CF_API_TOKEN` e `CF_ACCOUNT_ID`, do ambiente `production` (decisão e motivo em [ADR-0008](./adr/0008-deploy-do-site-pelo-github-actions.md)). O token deve ter só o mínimo para publicar o Worker e ligar os domínios (permissões de Workers Scripts e Account Settings na conta e de Workers Routes na zona `probekit.cc`; a lista vigente fica no painel da Cloudflare). Se o token tiver data de validade, o deploy do site falha quando ela vencer: crie outro e atualize o secret. `CF_ACCESSKEY_ID`, `CF_SECRET_ACCESSKEY` e `CF_S3_ENDPOINT` também estão no ambiente, reservados para uso futuro, e nenhum workflow os usa. O deploy manual (seção 5.2) continua podendo usar `wrangler login`.

**Painel da Cloudflare:**

- Registro `api` com proxy ligado (nuvem laranja). O Terraform o gerencia.
- SSL/TLS em **Full (strict)**. Em Flexible a Cloudflare fala HTTP com a origem e a API, que só serve HTTPS, deixa de responder.

## 3. Publicar a API

### 3.1 Gerar o certificado Origin CA (primeira vez ou renovação)

1. Painel da Cloudflare → o domínio → **SSL/TLS → Origin Server → Origin Certificates → Create Certificate**.
2. Gerar a chave privada e o CSR pela Cloudflare (RSA 2048 ou ECDSA), listar o hostname da API (`api.probekit.cc` ou um coringa) e escolher a validade.
3. Copiar o certificado e a chave **na hora**: a chave aparece uma única vez.
4. Guardar nos secrets `TLS_CERT_FILE` e `TLS_KEY_FILE` do ambiente `production`. Não guardar em arquivo do repositório (`*.pem` e `*.key` estão no `.gitignore`).

O outro cartão da mesma tela, *Authenticated Origin Pulls*, é uma proteção diferente (a origem exigir que quem conecta seja a Cloudflare) e não é necessário para o TLS.

### 3.2 Código novo (release)

1. Fazer o merge na `main` de uma mudança em `backend/api-service-golang/` com commit `feat:`, `fix:` ou `perf:`.
2. O workflow *Build & Release API* roda os testes e publica `probekit-linux-amd64-api-go-X.Y.Z`.
3. As VMs baixam a versão nova sozinhas em até cerca de 5 minutos.
4. Conferir a versão no ar: `curl -s https://api.probekit.cc/` deve mostrar `"version":"X.Y.Z"`, a da release. As duas VMs atualizam em momentos diferentes (até uns 5 a 6 minutos), então por um curto período as respostas podem trazer versões diferentes.

Mudanças só em `infra/` ou `frontend/` não geram release.

### 3.3 Deploy completo (infra, certificado, script)

Actions → **Deploy API** → *Run workflow* (só na `main`). O workflow tem dois jobs:

1. **`Plan deploy`** (ambiente `plan`, sem pausa): roda `terraform plan`, cifra o plano e o sobe como artefato de 1 dia.
2. **`Deploy`** (ambiente `production`): **espera a sua aprovação**. Antes de aprovar, leia o `terraform plan` no log do job `Plan deploy`. Depois de aprovado, ele baixa e decifra o plano, aplica **esse** plano, espera o cloud-init, entrega o certificado e a chave e executa o `deploy-api-go.sh` nas duas VMs.

Dois *Deploy API* nunca rodam juntos: o segundo espera na fila. Se o estado mudar entre o plano e a aprovação, o `apply` do plano salvo falha em vez de aplicar algo diferente do que você leu.

> **Ordem importante.** Se a release nova exige algo que só o *Deploy API* entrega (um arquivo, uma variável de ambiente), rode o *Deploy API* **logo depois** da release. Até lá o timer pode ter instalado o binário novo em uma VM que ainda não tem o que ele precisa ([ADR-0005](./adr/0005-atualizacao-das-vms-e-deploy-inicial.md)).

### 3.4 Verificar a API

O último passo do *Deploy API* (`Verify the public API`) já faz isso sozinho: roda `bash infra/shellscript/verify-api-routes.sh full` com `EXPECTED_VERSION` igual à versão da release `latest`, e **falha o deploy** se algum caso não bater ou se a API servir outra versão. Não usa segredos (só o token automático do GitHub para ler a `latest`). A mesma checagem roda na sua máquina:

```bash
EXPECTED_VERSION=1.3.0 bash infra/shellscript/verify-api-routes.sh full   # sem EXPECTED_VERSION, não confere a versão
```

Se o updater desfez uma release ruim (seção 7), a API serve a versão anterior e esse passo falha de propósito: é o aviso de que a `latest` não é a que está no ar.

Para olhar caso a caso, de qualquer lugar (sem `-k`; o certificado que você vê é o da borda da Cloudflare):

```bash
curl https://api.probekit.cc/                                        # {"message":"OK","version":"X.Y.Z"}
curl "https://api.probekit.cc/api/ping?target=1.1.1.1&count=2&timeout=3"
curl "https://api.probekit.cc/api/dns-lookup?domain=example.com"
curl "https://api.probekit.cc/api/ping?target=10.0.0.1"              # 400 private_ip_not_allowed

# CORS: deve responder 204 com allow-origin
curl -si -X OPTIONS -H 'Origin: https://probekit.cc' \
  -H 'Access-Control-Request-Method: GET' https://api.probekit.cc/api/ping
```

Em cada VM (por SSH, usuário `ubuntu`):

```bash
ls -l /etc/probekit/                      # cert 644 e chave 600, dono probekit
systemctl status probekit --no-pager
systemctl cat probekit | grep -E 'TLS_|CORS_'
sysctl net.ipv4.ping_group_range         # gid do probekit repetido, não "1 0"
journalctl -u probekit -n 30 --no-pager
curl -k https://localhost/               # direto na VM, com -k (mostra a versão)
cat /opt/probekit/VERSION                # a tag instalada, ex.: probekit-linux-amd64-api-go-1.3.0
```

O `version` do `GET /` é a versão da release (`1.3.0`), e o `/opt/probekit/VERSION` de cada VM guarda a **tag completa** (`probekit-linux-amd64-api-go-1.3.0`): para comparar os dois, tire o prefixo da tag. Em build local o `version` é `dev` ([ADR-0009](./adr/0009-versao-da-api-no-health-check.md)).

No portal da OCI: **Networking → Network Load Balancers → api-probekit → Backend sets**. Os dois backends devem estar *OK*. Logo após um restart eles podem demorar alguns ciclos de health check (10 s cada) para voltar.

## 4. Diagnóstico da API

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `curl: (60) SSL certificate problem` em `api.probekit.cc` | proxy desligado (nuvem cinza), então você vê o Origin CA, que só a Cloudflare confia | ligar o proxy no registro `api` |
| `curl: (60)` ao testar o IP da VM ou do NLB | esperado: o Origin CA não é confiável fora da Cloudflare | usar `-k` só para teste |
| `521` | a Cloudflare não alcança a origem | serviço parado, backend *Critical* no NLB ou porta 443 bloqueada |
| `525` | falha no handshake TLS entre a Cloudflare e a VM | certificado e chave não formam par, ou o serviço está sem eles |
| `526` | certificado da origem inválido no modo Full (strict) | hostname da API fora da lista do certificado, ou expirado |
| `/api/ping` responde 500 e o `dns-lookup` funciona | `net.ipv4.ping_group_range` em `1 0` (ICMP sem privilégio desligado) | rodar o *Deploy API*; o script grava o gid do usuário em `/etc/sysctl.d/99-probekit-ping.conf` |
| API fora do ar logo após uma release | binário novo sem o arquivo ou a variável que exige | rodar o *Deploy API*; ver `journalctl -u probekit` |
| `journalctl` cheio de `TLS handshake error ... EOF` | health check TCP do NLB, que fecha sem fazer TLS | ignorar, é esperado |
| Navegador bloqueia a chamada do site (CORS) | `CORS_ALLOWED_ORIGINS` sem a origem, ou vazia | conferir `systemctl cat probekit`; corrigir no script e rodar o *Deploy API* |
| Script de deploy sai com "arquivo de certificado ou chave nao encontrado" | secrets `TLS_*` ausentes ou o passo do certificado não rodou | conferir os secrets e a ordem dos passos no workflow |
| `GET /` mostra `"version":"dev"` em produção | binário compilado sem o `-ldflags` (build manual, ou o passo *Build Linux AMD64* sem a versão) | conferir o passo de build do workflow *Build & Release API* e publicar uma release nova |

Conferir se o certificado e a chave formam um par, sem imprimir a chave:

```bash
openssl x509 -in origin-ca.pem -noout -pubkey | openssl sha256
openssl pkey -in origin-ca-key.pem -pubout | openssl sha256     # os dois hashes devem ser iguais
```

## 5. Publicar o site

### 5.1 Automático (padrão)

O workflow *Deploy Frontend* (`.github/workflows/deploy-frontend.yml`) dispara a cada push na `main` que mude algo em `frontend/**`, e também à mão: Actions → **Deploy Frontend** → *Run workflow*. Tem dois jobs:

1. **`Build Frontend`** (sem token): `npm ci`, lint, formatação, testes e build com `VITE_API_BASE_URL=https://api.probekit.cc`; confere que o `dist/` contém essa URL e sobe o `dist` como artefato de 1 dia.
2. **`Deploy Frontend`** (ambiente `production`): **espera a sua aprovação**, que só é pedida depois de o build passar. Baixa o `dist`, publica com `npx wrangler deploy` e roda `verify-sites.sh` e `verify-api-routes.sh`. Qualquer falha deixa o job vermelho.

Dois deploys do site não rodam juntos: o segundo espera na fila.

Verificado em 2026-10-21 (run manual) e em 2026-10-22 (disparo por push em `frontend/**`): os dois jobs passaram, com a aprovação do `production` entre eles.

### 5.2 Manual (plano B)

Pré-requisitos: Node recente (o Wrangler 4 exige), dependências instaladas (`npm ci`) e uma conta da Cloudflare que seja dona da zona `probekit.cc`.

```bash
cd frontend
npx wrangler login                                   # uma vez
VITE_API_BASE_URL=https://api.probekit.cc npm run build
npx wrangler deploy
```

Pontos de atenção:

- **O `VITE_API_BASE_URL` é obrigatório no build.** Ele é embutido no momento do `vite build`. Sem ele, as chamadas ficam relativas e vão para o próprio Worker, que só serve arquivos. O workflow falha se o `dist/` não contiver a URL esperada.
- O `wrangler.toml` liga os domínios `probekit.cc` e `www.probekit.cc` com `custom_domain = true`: a Cloudflare cria o DNS e o certificado sozinha. Se já existir um registro manual para o mesmo nome (ex.: um `A` em `www`), o deploy falha por conflito; apague o registro antes.
- O primeiro acesso após criar um domínio pode levar alguns minutos até o certificado ser emitido.
- Para validar a configuração e o empacotamento sem publicar: `npx wrangler deploy --dry-run`.

### 5.3 Verificar o site

```bash
bash infra/shellscript/verify-sites.sh        # o site: os quatro endereços respondem 200
bash infra/shellscript/verify-api-routes.sh   # a API: saúde, preflight de CORS (204) e origem bloqueada (403)
```

No navegador, abra `/ping` e `/dns-lookup`, execute uma consulta e confirme o resultado vindo da API (aba Rede: a chamada vai para `api.probekit.cc` e a resposta traz `access-control-allow-origin`).

Uma rota inexistente também responde 200: o Worker devolve o `index.html` e o React mostra a página de "não encontrado". É o comportamento do fallback de SPA.

### 5.4 Voltar o site à versão anterior

**Pelo workflow** *Rollback Frontend* (Actions → **Rollback Frontend** → *Run workflow*, só na `main`). Entradas:

- `action = previous`: volta uma versão (a imediatamente mais antiga que a ativa);
- `action = specific` + `version_id`: volta (ou avança) para a versão informada;
- `reason`: motivo, opcional, até 70 caracteres.

Tem dois jobs, e **cada um pede a aprovação** do ambiente `production`:

1. **`Plan rollback`** calcula o alvo e escreve no **resumo do run** a tabela dos deployments e a frase "Vai voltar da versão X para a Y". Leia o resumo antes de aprovar o próximo job.
2. **`Rollback Frontend`** confere que a versão ativa continua a do plano (se alguém publicou nesse meio-tempo, falha), aplica o `wrangler rollback`, confere que o alvo ficou ativo e roda o `verify-sites.sh`.

O workflow entra na mesma fila do deploy do site (`deploy-frontend`), então os dois não correm juntos, e nunca imprime o e-mail do autor dos deployments. Os ids de versão estão na tabela do resumo; o script que escolhe o alvo é `infra/shellscript/select-rollback-target.sh`.

O rollback muda só a versão **ativa** do Worker; o repositório não muda. O próximo push em `frontend/**` publica de novo a partir da `main` e desfaz o rollback: para uma correção permanente, reverta o commit na `main`.

**Plano B, manual** (com o token na sessão do terminal), se o workflow estiver indisponível:

```bash
cd frontend
npx wrangler deployments list --json          # os ids de versão (tem o e-mail do autor: não cole em lugar público)
npx wrangler rollback <id-da-versao>          # pergunta uma mensagem opcional e pede confirmação (yes)
npx wrangler deployments status               # mostra a versão ativa
```
Também dá para voltar pelo painel da Cloudflare (Workers → `probekit` → Deployments).

Verificado em 2026-10-22, em dois runs do workflow: `previous` (de `782d862d` para `aa524c5a`) e `specific` (de `aa524c5a` para `f0e2ba05`). Nos dois, as duas aprovações foram registradas, o alvo ficou ativo, o site respondeu 200 e o log não trouxe nenhum e-mail. Antes disso, em 2026-10-22, o comando manual também foi verificado.

### 5.5 Diagnóstico do site

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Ping e DNS dão erro "Não foi possível conectar à API" | build feito sem `VITE_API_BASE_URL`, ou CORS bloqueando | refazer o build com a variável; ver a seção 4 para o CORS |
| O job `Build Frontend` falha em `Check API URL in the build` | `VITE_API_BASE_URL` errada ou vazia no passo de build do workflow | corrigir o valor no workflow |
| O passo `Deploy Frontend` falha por autenticação | token da Cloudflare vencido, revogado ou sem permissão | criar outro token e atualizar `CF_API_TOKEN` no ambiente `production` |
| `Verify the site is up` falha depois de publicar | propagação lenta ou o site realmente fora | rodar `verify-sites.sh`; se persistir, voltar a versão (5.4) |
| Falha de `wrangler deploy` por domínio já existente | registro DNS manual no mesmo nome | remover o registro e repetir |
| `wrangler login` não autentica | conta ou navegador errado | `npx wrangler whoami` mostra a conta atual |

## 6. Trocar o certificado

1. Gerar um novo par (seção 3.1) e atualizar os secrets `TLS_CERT_FILE` e `TLS_KEY_FILE`.
2. Rodar o workflow *Deploy API*. Ele copia o novo par para as VMs e o script o instala em `/etc/probekit/`.
3. O serviço lê o certificado ao iniciar. Se o par instalado for novo e o serviço já estiver rodando, reinicie-o (`sudo systemctl restart probekit`) em cada VM, de uma por vez, para o NLB manter ao menos um backend de pé.

## 7. Reverter

**API, automático.** O updater das VMs reverte sozinho uma release que não sobe. Ele guarda o binário anterior (`/opt/probekit/api-service-golang.prev`), só grava a versão depois que a API responde e, se a validação falha, restaura o anterior, reinicia e valida de novo. A versão que falhou fica anotada em `/opt/probekit/BAD_VERSION`, e o updater não a tenta de novo; uma release diferente é instalada normalmente. Para ver o que aconteceu, em cada VM: `journalctl -u autodeploy-api-go -n 40` (procure "a release X falhou, voltei para Y"). Para deixar o updater tentar de novo a mesma tag, apague o `BAD_VERSION`.

Só reverte quando houve troca de versão naquela execução: se a API cair sem uma release nova (certificado, disco...), o binário não é rebaixado e a rodada termina com erro.

Esse updater chega às VMs com a primeira release da API depois do PR do rollback; até lá elas rodam o updater antigo, sem rollback. Verificado em 2026-10-22 em contêiner (`infra/shellscript/tests/updater/`, 9 cenários). Pendente de confirmação: o teste numa VM de verdade.

**API, por decisão sua, rápido.** Rode o workflow *Rollback API GoLang* (`action`: `previous` ou `specific` com `version` X.Y.Z, mais um `reason`). Ele marca uma release anterior como `latest`, sem SSH nem credencial das VMs, e o updater de cada VM a instala em até uns 5,5 minutos (timer de 5 min + até 30 s):

1. **`Plan rollback`** (ambiente `production`, espera aprovação) escolhe a release e escreve no resumo a tabela das versões e o alvo. Falha antes de editar qualquer coisa se a versão for malformada, não existir, já for a `latest` ou for **anterior à 1.3.0**.
2. **`Rollback API`** (também em `production`) confere que a `latest` continua a do plano, roda `gh release edit --latest` e confere que ela ficou marcada.

O piso 1.3.0 existe porque o updater reinstala o próprio script a partir da tag instalada: voltar para uma release anterior troca o updater das VMs por um sem rollback automático. O valor está em `MIN_VERSION` no `infra/shellscript/select-api-rollback-target.sh`; mude-o quando a proteção mudar. O workflow entra na mesma fila do *Deploy API* (`deploy-api-golang`).

Depois, confira (as VMs levam alguns minutos): `EXPECTED_VERSION=<X.Y.Z> bash infra/shellscript/verify-api-routes.sh full`. O efeito dura até a próxima release, que vira `latest` sozinha; para uma correção permanente, faça o próximo caminho.

**API, por decisão sua, permanente.** Reverta o commit problemático na `main` e publique uma nova release.

**Site.** Use o workflow *Rollback Frontend* (seção 5.4), ou reverta o commit na `main` e deixe o workflow publicar de novo.
