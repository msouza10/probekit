# Runbook: publicar e diagnosticar a API e o site

Este documento descreve como publicar o Probekit, como conferir que deu certo e o que fazer quando algo falha. Tudo aqui foi verificado em produção em 2026-10-17. Decisões e motivos estão nos [ADRs](./adr/); a arquitetura, em [`architecture/arch.md`](./architecture/arch.md).

> Nunca coloque valores de secrets, certificados ou chaves neste documento nem no repositório. Aqui só aparecem **nomes**.

## 1. O que existe

| Parte | Endereço | Como é publicada |
|---|---|---|
| Site | `https://probekit.cc` e `https://www.probekit.cc` | **Manual**, com o Wrangler (seção 5) |
| API | `https://api.probekit.cc` | Release automática + workflow *Deploy* manual (seção 3) |
| Infraestrutura | OCI e Cloudflare | Terraform, dentro do workflow *Deploy* |

## 2. Secrets e configuração

**GitHub, ambiente `production`:**

| Secret | Uso |
|---|---|
| `SSH_PRIVATE_KEY` | acesso SSH do workflow às VMs |
| `OCI_PRIVATE_KEY` | chave da API OCI, gravada em arquivo para o Terraform |
| `TLS_CERT_FILE` | **conteúdo** do certificado Origin CA (PEM completo, com as linhas `BEGIN/END`) |
| `TLS_KEY_FILE` | **conteúdo** da chave privada do certificado (PEM completo) |

O nome `TLS_*_FILE` engana: o secret guarda o texto do PEM, e o workflow o grava em arquivo. As demais configurações da OCI (ids, região, etc.) vêm do **Infisical**, por OIDC.

**GitHub, ambiente `plan`** (sem aprovação, só a branch `main`): apenas `OCI_PRIVATE_KEY`, que o `terraform plan` exige. A chave SSH e o certificado ficam só no `production`.

**Infisical:** além das configurações da OCI e das variáveis do Terraform, guarda a `TFPLAN_PASSPHRASE`, a senha que cifra o plano do Terraform entre o job `plan` e o job `deploy`. Por que dois lugares: [ADR-0007](./adr/0007-gestao-de-segredos-com-infisical.md).

**Cloudflare (hoje só na máquina do criador):** o `wrangler login` autentica na conta. Quando o deploy do site for automatizado serão necessários `CLOUDFLARE_API_TOKEN` (escopo Workers) e `CLOUDFLARE_ACCOUNT_ID`.

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

Mudanças só em `infra/` ou `frontend/` não geram release.

### 3.3 Deploy completo (infra, certificado, script)

Actions → **Deploy** → *Run workflow*. Ele aplica o Terraform, espera o cloud-init, entrega o certificado e a chave e executa o `deploy-api-go.sh` nas duas VMs. Leia o `terraform plan` no log antes de aprovar a continuação, quando houver aprovação configurada.

> **Ordem importante.** Se a release nova exige algo que só o *Deploy* entrega (um arquivo, uma variável de ambiente), rode o *Deploy* **logo depois** da release. Até lá o timer pode ter instalado o binário novo em uma VM que ainda não tem o que ele precisa ([ADR-0005](./adr/0005-atualizacao-das-vms-e-deploy-inicial.md)).

### 3.4 Verificar a API

De qualquer lugar (sem `-k`; o certificado que você vê é o da borda da Cloudflare):

```bash
curl https://api.probekit.cc/                                        # {"message":"OK"}
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
curl -k https://localhost/               # direto na VM, com -k
```

No portal da OCI: **Networking → Network Load Balancers → api-probekit → Backend sets**. Os dois backends devem estar *OK*. Logo após um restart eles podem demorar alguns ciclos de health check (10 s cada) para voltar.

## 4. Diagnóstico da API

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `curl: (60) SSL certificate problem` em `api.probekit.cc` | proxy desligado (nuvem cinza), então você vê o Origin CA, que só a Cloudflare confia | ligar o proxy no registro `api` |
| `curl: (60)` ao testar o IP da VM ou do NLB | esperado: o Origin CA não é confiável fora da Cloudflare | usar `-k` só para teste |
| `521` | a Cloudflare não alcança a origem | serviço parado, backend *Critical* no NLB ou porta 443 bloqueada |
| `525` | falha no handshake TLS entre a Cloudflare e a VM | certificado e chave não formam par, ou o serviço está sem eles |
| `526` | certificado da origem inválido no modo Full (strict) | hostname da API fora da lista do certificado, ou expirado |
| `/api/ping` responde 500 e o `dns-lookup` funciona | `net.ipv4.ping_group_range` em `1 0` (ICMP sem privilégio desligado) | rodar o *Deploy*; o script grava o gid do usuário em `/etc/sysctl.d/99-probekit-ping.conf` |
| API fora do ar logo após uma release | binário novo sem o arquivo ou a variável que exige | rodar o *Deploy*; ver `journalctl -u probekit` |
| `journalctl` cheio de `TLS handshake error ... EOF` | health check TCP do NLB, que fecha sem fazer TLS | ignorar, é esperado |
| Navegador bloqueia a chamada do site (CORS) | `CORS_ALLOWED_ORIGINS` sem a origem, ou vazia | conferir `systemctl cat probekit`; corrigir no script e rodar o *Deploy* |
| Script de deploy sai com "arquivo de certificado ou chave nao encontrado" | secrets `TLS_*` ausentes ou o passo do certificado não rodou | conferir os secrets e a ordem dos passos no workflow |

Conferir se o certificado e a chave formam um par, sem imprimir a chave:

```bash
openssl x509 -in origin-ca.pem -noout -pubkey | openssl sha256
openssl pkey -in origin-ca-key.pem -pubout | openssl sha256     # os dois hashes devem ser iguais
```

## 5. Publicar o site (manual)

Pré-requisitos: Node recente (o Wrangler 4 exige), dependências instaladas (`npm ci`) e uma conta da Cloudflare que seja dona da zona `probekit.cc`.

```bash
cd frontend
npx wrangler login                                   # uma vez
VITE_API_BASE_URL=https://api.probekit.cc npm run build
npx wrangler deploy
```

Pontos de atenção:

- **O `VITE_API_BASE_URL` é obrigatório no build.** Ele é embutido no momento do `vite build`. Sem ele, as chamadas ficam relativas e vão para o próprio Worker, que só serve arquivos.
- O `wrangler.toml` liga os domínios `probekit.cc` e `www.probekit.cc` com `custom_domain = true`: a Cloudflare cria o DNS e o certificado sozinha. Se já existir um registro manual para o mesmo nome (ex.: um `A` em `www`), o deploy falha por conflito; apague o registro antes.
- O primeiro acesso após criar um domínio pode levar alguns minutos até o certificado ser emitido.
- Para validar a configuração e o empacotamento sem publicar: `npx wrangler deploy --dry-run`.

### Verificar o site

```bash
for u in https://probekit.cc/ https://www.probekit.cc/ https://probekit.cc/ping https://probekit.cc/dns-lookup; do
  curl -sS -o /dev/null -w "$u -> %{http_code}\n" "$u"
done
```

Todos devem responder 200. No navegador, abra `/ping` e `/dns-lookup`, execute uma consulta e confirme o resultado vindo da API (aba Rede: a chamada vai para `api.probekit.cc` e a resposta traz `access-control-allow-origin`).

Uma rota inexistente também responde 200: o Worker devolve o `index.html` e o React mostra a página de "não encontrado". É o comportamento do fallback de SPA.

### Diagnóstico do site

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Ping e DNS dão erro "Não foi possível conectar à API" | build feito sem `VITE_API_BASE_URL`, ou CORS bloqueando | refazer o build com a variável; ver a seção 4 para o CORS |
| Falha de `wrangler deploy` por domínio já existente | registro DNS manual no mesmo nome | remover o registro e repetir |
| `wrangler login` não autentica | conta ou navegador errado | `npx wrangler whoami` mostra a conta atual |

## 6. Trocar o certificado

1. Gerar um novo par (seção 3.1) e atualizar os secrets `TLS_CERT_FILE` e `TLS_KEY_FILE`.
2. Rodar o workflow *Deploy*. Ele copia o novo par para as VMs e o script o instala em `/etc/probekit/`.
3. O serviço lê o certificado ao iniciar. Se o par instalado for novo e o serviço já estiver rodando, reinicie-o (`sudo systemctl restart probekit`) em cada VM, de uma por vez, para o NLB manter ao menos um backend de pé.

## 7. Reverter

Não há rollback automático: o binário antigo é sobrescrito antes da validação. Para voltar a uma versão anterior, reverta o commit problemático na `main` e publique uma nova release. No site, reconstrua a partir de um commit anterior e rode `npx wrangler deploy` de novo (o Wrangler também guarda versões do Worker no painel da Cloudflare).
