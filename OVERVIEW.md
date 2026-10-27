# Probekit — visão geral do projeto

Documento vivo para registrar o propósito, as decisões e o progresso do projeto. Atualizar conforme as definições evoluírem. (Antigo `NORTE.md`.)

## Propósito

Construir uma caixa de ferramentas técnicas na web, baseada nas necessidades do criador e aberta ao público. O Probekit não se limita a testes: poderá reunir ferramentas de rede, arquivos, texto, cron e outros utilitários.

O projeto também será um laboratório pessoal de DevOps, com infraestrutura como código usando Terraform e automação usando GitHub Actions.

## Objetivos

- Resolver tarefas técnicas reais com ferramentas simples de acessar e usar.
- Começar pequeno e expandir o catálogo conforme surgirem necessidades.
- Praticar provisionamento, integração contínua, publicação e operação de serviços.
- Distribuir ferramentas e serviços entre provedores de cloud, dentro dos respectivos free tiers.
- Manter registradas as decisões de produto e arquitetura.

## Decisões confirmadas

- Nome: **Probekit**.
- Público: o criador e qualquer pessoa interessada.
- Acesso inicial sem login.
- Primeiro recorte: ping e DNS lookup (a antiga "tradução" — esclarecido como consulta de registros DNS).
- Expansão gradual depois desse primeiro recorte.
- Multicloud inicialmente significa distribuir ferramentas e serviços entre provedores.
- Hospedar o frontend simultaneamente em várias clouds não é requisito inicial.
- Terraform e GitHub Actions fazem parte da abordagem DevOps.
- A infraestrutura deve respeitar o free tier; provedores, limites e mecanismos de controle ainda serão definidos.
- Frontend como **Cloudflare Worker com assets estáticos** (não Pages), gerenciado pelo Wrangler; a API fica em `api.probekit.cc`, em duas VMs OCI atrás de um Network Load Balancer ([ADR-0001](./docs/adr/0001-oci-network-load-balancer.md)).
- TLS terminado no próprio binário Go, com certificado Origin CA e zona em Full (strict) ([ADR-0002](./docs/adr/0002-terminacao-tls-cloudflare-full-strict.md)); porta, entrega do certificado, CORS e atualização das VMs em [ADR-0003](./docs/adr/0003-porta-origem-e-entrega-do-certificado.md), [ADR-0004](./docs/adr/0004-chamada-frontend-api-com-cors.md) e [ADR-0005](./docs/adr/0005-atualizacao-das-vms-e-deploy-inicial.md).
- Segredos: configurações e variáveis do Terraform no **Infisical** (por OIDC); as credenciais mais sensíveis em **secrets de ambiente do GitHub**, atrás da aprovação do `production` ([ADR-0007](./docs/adr/0007-gestao-de-segredos-com-infisical.md)).
- O `GET /` da API devolve também a versão compilada (`{"message":"OK","version":"1.3.0"}`), para verificar deploys e rollbacks ([ADR-0009](./docs/adr/0009-versao-da-api-no-health-check.md)).
- Artigos como **arquivos markdown no repositório** (`frontend/content/articles/`), compilados no build e publicados pelo deploy do site, sem editor na web, login nem banco ([spec](./docs/superpowers/specs/2026-10-26-probekit-blog-artigos-design.md), [runbook](./docs/runbook-artigos.md)). A seção só existe com pelo menos um artigo; a Home aponta para o mais recente.
- Gestão de tasks/backlog via **GitHub Issues e Projects** ([ADR-0006](./docs/adr/0006-gestao-de-tasks-no-github-projects.md)). O padrão de documentos e tarefas está em [`docs/README.md`](./docs/README.md).

## Responsabilidades

- **Criador:** DevOps, infraestrutura, Terraform e GitHub Actions; backend das ferramentas escolhidas como exercício de aprendizado de Python/Go.
- **Assistente:** frontend do site; backend das ferramentas que não forem escolhidas como aprendizado; revisão e suporte no Terraform/GitHub Actions escritos pelo criador; testes automatizados das ferramentas, mesmo quando o backend é exercício do criador.
- **Em conjunto:** escopo das ferramentas, experiência de uso, contratos de integração e a decisão, ferramenta a ferramenta, de quem escreve o backend.

Detalhes completos do acordo de colaboração em `AGENTS.md`. Spec detalhado do primeiro marco em `docs/superpowers/specs/2026-10-01-probekit-ping-dns-feature-design.md`.

## Progresso do primeiro marco

**Backend — `/api/ping`:**
- ✅ Ping ICMP real, com `count`/`timeout` configuráveis pelo cliente (defaults e limites definidos).
- ✅ Validação de IP privado/reservado (RFC1918, loopback, link-local/metadata, incluindo hostnames que resolvem pra essas faixas).
- ✅ Contrato de erro padronizado (`{"error", "code"}`).
- ✅ Suite de testes automatizados (23 casos) cobrindo validação, erros e sucesso.
- ✅ Jitter (`stats.StdDevRtt` da lib, exposto como `jitter` na resposta).
- ✅ Rate limiting por IP de origem (ver abaixo).

**Backend — `/api/dns-lookup`:**
- ✅ Resolve A, AAAA, CNAME, MX (com prioridade), TXT, NS; suporte opcional a SRV.
- ✅ Contrato de erro padronizado, consistente com `/api/ping`.
- ✅ Validação de IP privado/reservado, igual ao `/api/ping`.
- ✅ Suite de testes automatizados cobrindo validação, erros e sucesso.
- ✅ Rate limiting por IP de origem (ver abaixo).

**Rate limiting (`/api/ping` e `/api/dns-lookup`):**
- ✅ `utils.RateLimiter`: janela fixa de 5 minutos, 50 requisições/IP, aplicado via middleware em `main.go`, compartilhado entre as duas rotas.
- ✅ Testes automatizados do `RateLimiter` em isolamento (permite até o limite, bloqueia depois, IPs independentes).
- ⏳ O middleware em si (dentro de `main()`) não é testável automaticamente hoje — só a lógica do `RateLimiter`; validado manualmente ponta a ponta.
- ⏳ Sem limpeza periódica de IPs antigos ainda (mapas crescem indefinidamente) — aceitável na escala atual do projeto.

**Frontend (`probekit.cc`):**
- ✅ SPA em React 19 + Vite + TypeScript, Tailwind v4, shadcn/ui e Motion; páginas Home, Ping, DNS Lookup, Arquitetura, Sobre e NotFound.
- ✅ As páginas de Ping e DNS Lookup chamam a API de verdade (`VITE_API_BASE_URL`, `https://api.probekit.cc` em produção); a simulação de resultados só existe em desenvolvimento, para nunca mostrar dados inventados em produção.
- ✅ Testes com Vitest (incluindo o cliente da API e as páginas).
- ✅ **Site no ar** como Cloudflare Worker com assets estáticos (`frontend/wrangler.toml`), nos domínios `probekit.cc` e `www.probekit.cc`, com deploy pelo workflow `deploy-frontend.yml` (ver abaixo); o passo a passo manual com o Wrangler continua no [`runbook`](./docs/runbook-deploy.md).
- ✅ As páginas de ferramenta mostram a origem do teste ("Sonda: OCI · São Paulo"), com valores fixos em `frontend/src/lib/api.ts` (`PROBE_*`), porque as VMs ficam sempre na mesma região. O campo `origin_region` da API não é mais necessário para isso.
- ✅ Rotas inexistentes respondem HTTP 404 (`not_found_handling = "404-page"`), e o build pré-renderiza um HTML por rota (com título, descrição, canonical e dados estruturados próprios). Validado localmente com `wrangler dev` em 2026-10-26; em produção só depois do próximo deploy do site.
- ✅ CI em pull request (`ci.yml`, com os jobs Go, NPM e Terraform) e deploy do site pelo workflow `deploy-frontend.yml` quando algo em `frontend/**` entra na `main`, com aprovação do ambiente `production` ([ADR-0008](./docs/adr/0008-deploy-do-site-pelo-github-actions.md); verificado em 2026-10-21 e 2026-10-22).

**Infraestrutura e deploy da API:**
- ✅ Terraform (state remoto em bucket OCI) provisiona a rede, 2 VMs e o Network Load Balancer (L4, TCP/443) na OCI, e o registro DNS `api` (proxied) na Cloudflare.
- ✅ TLS terminado no binário Go com certificado Origin CA da Cloudflare ([ADR-0002](./docs/adr/0002-terminacao-tls-cloudflare-full-strict.md)); certificado e chave chegam às VMs pelo workflow de deploy, a partir de secrets do GitHub ([ADR-0003](./docs/adr/0003-porta-origem-e-entrega-do-certificado.md)).
- ✅ CORS por lista de origens (`CORS_ALLOWED_ORIGINS`) com preflight ([ADR-0004](./docs/adr/0004-chamada-frontend-api-com-cors.md)).
- ✅ ICMP sem privilégio liberado só para o grupo do usuário do serviço (`net.ipv4.ping_group_range`); sem isso o `/api/ping` respondia 500 nas VMs.
- ✅ Release automática do binário (`probekit-linux-amd64-api-go-X.Y.Z`, na 1.3.0 em 2026-10-26) e atualização das VMs por timer de 5 minutos ([ADR-0005](./docs/adr/0005-atualizacao-das-vms-e-deploy-inicial.md)).
- ✅ Workflow *Deploy* (manual): `terraform apply`, espera do cloud-init, entrega do certificado e execução do `deploy-api-go.sh` por SSH nas duas VMs. Rodou com sucesso mais de uma vez.
- ✅ Smoke test em produção (2026-10-17): `/`, `/api/ping` e `/api/dns-lookup` respondem 200, ping para IP privado responde 400, e o preflight de CORS responde 204 só para as origens permitidas.
- ⏳ Teste de derrubar uma VM e confirmar que o NLB continua respondendo.

**Limitações conhecidas:**
- O limite de requisições usa o IP real do cliente (`CF-Connecting-IP`, só quando a conexão vem de faixa da Cloudflare; release 1.2.1, API em produção na 1.3.0 em 2026-10-26). Se a lista de faixas da Cloudflare não carregar na inicialização, o limite volta a usar o IP da conexão, que é o da borda. Falta testar de fora o comportamento por usuário.
- A porta 443 do NLB e das VMs está aberta para `0.0.0.0/0` (não só para a Cloudflare) e o SSH (22) também.

## Diretrizes propostas

- Informar de onde partem os testes de rede, para tornar os resultados interpretáveis.
- Usar processamento no navegador quando a operação permitir.
- Organizar as ferramentas de modo que novas páginas e serviços possam ser adicionados gradualmente.
- Definir limites de uso e validação de destinos antes de disponibilizar operações de rede no backend ao público.
- Verificar as condições atuais de free tier antes de escolher serviços; nenhum provedor ou custo foi validado até agora.

## Fora do escopo inicial

- Contas de usuário e autenticação.
- Um catálogo amplo de ferramentas já na primeira entrega.
- Frontend ativo em múltiplos provedores simultaneamente.
- Definir agora todas as ferramentas futuras.

## Próximos passos

O primeiro marco (ping e DNS lookup no ar, com infraestrutura reproduzível) está concluído. O acompanhamento tarefa a tarefa fica em [`docs/superpowers/plans/2026-10-09-probekit-first-deploy.md`](./docs/superpowers/plans/2026-10-09-probekit-first-deploy.md). O que vem a seguir, em ordem:

1. **Backend (Task 3, restante):** devolver `origin_region` nas respostas de ping e DNS lookup, se ainda fizer sentido (o site já mostra a origem com valores fixos).
2. **Operação:** teste de derrubar uma VM, `concurrency` nos workflows e aprovação obrigatória no ambiente `production`.
3. **Endurecimento (Task 13):** restringir a 443 às faixas de IP da Cloudflare, restringir o SSH, distribuir as VMs em fault domains distintos e avaliar *Authenticated Origin Pulls*.
4. **Próximas ferramentas** do catálogo, definidas conforme as necessidades.
