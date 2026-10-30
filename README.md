# Probekit

O **Probekit** é um projeto pessoal que une uma caixa de ferramentas técnicas na web a um laboratório de aprendizado. A ideia é resolver necessidades do dia a dia e, ao mesmo tempo, experimentar novas tecnologias e aplicá-las em um projeto real, do código à operação.

- **Site:** <https://probekit.cc> (também em `www.probekit.cc`)
- **API:** <https://api.probekit.cc>

## Por que este projeto existe

O Probekit é um espaço para aprender fazendo. Cada ferramenta oferece uma oportunidade de explorar uma tecnologia, entender suas escolhas e limitações e acompanhar como ela se comporta na prática.

O aprendizado passa por diferentes partes do projeto:

- **Backend:** praticar Go e Python na construção de APIs e ferramentas úteis.
- **Frontend:** construir uma interface acessível e agradável, com React, Vite e TypeScript.
- **DevOps:** praticar infraestrutura como código com Terraform e automação de integração e publicação com GitHub Actions.
- **Cloud e operação:** explorar a distribuição de serviços entre provedores, respeitando os limites dos respectivos free tiers, e aprender a publicar e manter esses serviços.

As tecnologias entram conforme surgem necessidades e oportunidades de aprendizado. O projeto evolui de forma incremental, com espaço para testar abordagens, rever decisões e aplicar o que foi aprendido nas próximas entregas.

## Estado atual

O projeto está **no ar**, com as duas primeiras ferramentas (ping ICMP e consulta de registros DNS):

- **API em Go**, em duas VMs na Oracle Cloud (OCI) atrás de um Network Load Balancer, com TLS terminado no próprio binário (certificado Origin CA da Cloudflare), CORS por lista de origens, validação de destinos, erros padronizados, limite de requisições por IP e testes automatizados. Cada merge com mudança no backend gera uma release, e as VMs se atualizam sozinhas.
- **Frontend** em React + Vite + TypeScript, publicado como Cloudflare Worker com assets estáticos. O deploy do site roda pelo workflow `deploy-frontend.yml`, com aprovação do ambiente `production` (e, no agendamento que atualiza os números da Home, sem aprovação, no ambiente `stats`); o passo a passo manual com o Wrangler continua em [Publicação](#publicação).
- **Infraestrutura** como código com Terraform (OCI e Cloudflare) e deploy da API por GitHub Actions disparado manualmente.

O que ainda falta (detalhes no [`OVERVIEW.md`](./OVERVIEW.md)): IP real do cliente no limite de requisições (hoje ele enxerga o IP da borda da Cloudflare), região de origem na resposta da API e o endurecimento de acessos.

A arquitetura completa, com diagrama e fluxo de uma requisição, está em [`docs/architecture/arch.md`](./docs/architecture/arch.md).

## Estrutura

```
backend/api-service-golang/   API em Go (ping, DNS lookup) e seus testes
frontend/                     React + Vite + TypeScript — ver frontend/README.md
infra/terraform/              Terraform: rede, VMs e NLB na OCI; DNS na Cloudflare
infra/shellscript/            deploy-api-go.sh (VMs) e calculate-version.sh (release)
.github/workflows/            build-api-golang.yml (release) e deploy-api-golang.yml (deploy)
docs/                         arquitetura, ADRs, runbook, specs e planos
```

## Executar localmente

### Backend

Requer Go **1.25.0 ou superior**, conforme o `go.mod`, e conectividade de rede para as consultas DNS e os testes ICMP.

A API **só serve HTTPS**: sem certificado e chave ela encerra com erro na inicialização. Para desenvolver, gere um par autoassinado (os arquivos `*.pem` e `*.key` já estão no `.gitignore`):

```bash
cd backend/api-service-golang
openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
  -keyout /tmp/key.pem -out /tmp/cert.pem -subj "/CN=localhost"

ADDR=:8443 TLS_CERT_FILE=/tmp/cert.pem TLS_KEY_FILE=/tmp/key.pem go run .
```

Configuração, por variáveis de ambiente:

| Variável | Obrigatória | Padrão | Função |
|---|---|---|---|
| `TLS_CERT_FILE` | sim | — | caminho do certificado PEM |
| `TLS_KEY_FILE` | sim | — | caminho da chave privada PEM |
| `ADDR` | não | `:443` | endereço de escuta (`:8443` evita precisar de root) |
| `CORS_ALLOWED_ORIGINS` | não | vazia | origens permitidas, separadas por vírgula (ex.: `https://probekit.cc,http://localhost:5173`); vazia = ninguém é liberado |

O servidor fica disponível em `https://localhost:8443`. O certificado de teste não é confiável, então o `curl` precisa de `-k`.

#### Rotas disponíveis

- `GET /` — health check e versão no ar (`{"message":"OK","version":"1.3.0"}`). A release embute a versão no binário; em build local o valor é `dev`. Decisão no [ADR-0009](docs/adr/0009-versao-da-api-no-health-check.md).
- `GET /api/ping?target=<host>&count=<n>&timeout=<segundos>` — ping ICMP real. `count` (default `5`, máximo `10`) e `timeout` em segundos (default `1`, máximo `5`) são opcionais. Rejeita IPs/hosts privados ou reservados.
- `GET /api/dns-lookup?domain=<domain>&service=<service>&proto=<proto>` — resolve A, AAAA, CNAME, MX, TXT e NS do domínio. `service`/`proto` são opcionais e, se os dois forem passados, incluem registros SRV na resposta.

As duas rotas de ferramentas compartilham um limite de **50 requisições por IP a cada janela de 5 minutos**. Erros seguem o formato `{"error": "mensagem", "code": "categoria_do_erro"}`.

Exemplos de chamadas:

```bash
curl -k 'https://localhost:8443/'
curl -k 'https://localhost:8443/api/ping?target=1.1.1.1&count=3&timeout=1'
curl -k 'https://localhost:8443/api/dns-lookup?domain=example.com'
```

Em produção, a mesma API responde em `https://api.probekit.cc`, sem `-k`.

#### Testes

No diretório `backend/api-service-golang/`:

```bash
go test ./... -v
```

Os testes do `/api/ping` fazem ping ICMP real contra um IP público (`1.1.1.1`) e contra alvos privados/inválidos — exigem permissão de rede/ICMP de saída no ambiente onde rodam. Os testes de TLS e CORS compilam o binário, geram um certificado de teste e sobem o servidor numa porta livre, então não precisam de configuração prévia.

### Frontend

Detalhes em [`frontend/README.md`](./frontend/README.md). Em resumo:

```bash
cd frontend
npm ci
npm run dev
```

## Publicação

**API.** Um merge na `main` que altere `backend/api-service-golang/` dispara o workflow *Build & Release API*: roda os testes, calcula a versão pelos commits (`feat:` sobe o minor, `fix:`/`perf:` o patch, `!:` ou `BREAKING CHANGE:` o major) e publica a release com o binário e o `SHA256SUMS` (a versão vai embutida no binário, e o `GET /` a informa). As VMs consultam a última release a cada 5 minutos e se atualizam. O workflow *Deploy* (manual) aplica o Terraform, entrega o certificado e executa o script de deploy nas VMs.

**Site.** Hoje o deploy é manual, a partir da máquina do criador. O build de produção precisa apontar para a API:

```bash
cd frontend
npx wrangler login        # uma vez, autentica na conta da Cloudflare
VITE_API_BASE_URL=https://api.probekit.cc npm run build
npx wrangler deploy
```

O `wrangler.toml` cria o Worker `probekit` com os arquivos de `dist/` e liga os domínios `probekit.cc` e `www.probekit.cc`. Sem o `VITE_API_BASE_URL`, as chamadas ficam relativas e caem no próprio Worker em vez de chegar à API. Um workflow para automatizar esse passo ainda está planejado.

O passo a passo completo, com verificações e diagnóstico de erros, está em [`docs/runbook-deploy.md`](./docs/runbook-deploy.md).

## Documentação do projeto

- [`OVERVIEW.md`](./OVERVIEW.md): propósito, decisões, progresso e próximos passos.
- [`docs/README.md`](./docs/README.md): o que é cada tipo de documento (spec, ADR, plano, runbook, issue) e o padrão de cada um.
- [`docs/architecture/arch.md`](./docs/architecture/arch.md): arquitetura, componentes e fluxo de uma requisição.
- [`docs/adr/`](./docs/adr/): registros de decisões de arquitetura (ADRs).
- [`docs/runbook-deploy.md`](./docs/runbook-deploy.md): como publicar e diagnosticar a API e o site.
- [`Especificações`](./docs/superpowers/specs/): escopo e decisões de design das funcionalidades, do frontend e da infraestrutura.
- [`Planos`](./docs/superpowers/plans/): passo a passo de cada iniciativa. O estado das tarefas fica no GitHub Project, não nos planos.
- [`AGENTS.md`](./AGENTS.md): acordo de colaboração entre o criador e o assistente. Infraestrutura e parte dos backends ficam com o criador como prática; o assistente contribui com frontend, testes, revisão e apoio ao aprendizado.

## Licença

[MIT](./LICENSE).
