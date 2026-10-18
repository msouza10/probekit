# Probekit — infraestrutura inicial

## Contexto

Ver `OVERVIEW.md` e `AGENTS.md`. Este spec cobre o provisionamento e a automação necessários para publicar o frontend e expor o backend — sem entrar na lógica das ferramentas em si (spec `2026-10-01-probekit-ping-dns-feature-design.md`).

Revisão de 2026-10-05 (sessão de grilling): o escopo mudou bastante em relação à primeira versão deste documento — a VM da OCI já existe (provisionada manualmente), o frontend passou de Cloudflare Pages para Cloudflare Workers, e o deploy do Worker passou a ser responsabilidade do Wrangler, não do Terraform. Ver "Decisões confirmadas" abaixo para o histórico de cada escolha.

Revisão adicional, mesmo dia: a decisão 7 (achatar tudo, sem módulos) foi revertida — o objetivo passou a ser multi-provider desde já (Cloudflare, Azure, AWS e o que mais for necessário), então a estrutura de módulo por provedor volta a valer. Texto da decisão atualizado abaixo, mantendo o registro de que já foi considerado e descartado o caminho sem módulo.

Revisão de 2026-10-06: o backend deixou de ser uma única VM — agora são **duas** VMs OCI atrás de um load balancer. Ver `docs/architecture/arch.md` para o diagrama atualizado. Decisões 4, 5 e 10 e os resources que referenciavam "a VM"/`var.vm_ip` foram ajustados para "as VMs"/Load Balancer/`var.lb_ip`.

Revisão de 2026-10-07: o tipo de load balancer foi definido como **OCI Network Load Balancer (L4)**, não o Load Balancer clássico (L7) mencionado na revisão anterior. Isso importa porque um Network Load Balancer não termina TLS nem entende HTTP — a decisão em aberto sobre webserver (`docs/architecture/arch.md`, seção 5) passa a decidir quem termina TLS na ponta da VM, não é só uma escolha de conveniência.

Revisão de 2026-10-08 (2): decisão 13 adicionada — resolvida a decisão em aberto sobre webserver/TLS registrada em `docs/architecture/arch.md` (seção 5). Ver [ADR-0002](../../adr/0002-terminacao-tls-cloudflare-full-strict.md).

Revisão de 2026-10-08: as decisões 4 e 5 foram **revertidas** — o Terraform passou a provisionar toda a infraestrutura OCI (VCN, subnet, security list, route table, internet gateway, as duas instâncias e o Network Load Balancer com backend_set/backends/listener), não só o registro DNS. Isso nasceu da escrita incremental do módulo `oci/` nesta sessão: cada peça (rede, instâncias, NLB) foi revisada e validada com `terraform plan` até fechar o fluxo completo, e só depois ficou claro que isso contradizia as decisões 4/5 originais. Optou-se por manter essa abordagem (provisionamento completo via Terraform) em vez de reverter o código, por já estar validada ponta a ponta. Ver decisões 4 e 5 atualizadas abaixo para o texto revertido.

Revisão de 2026-10-17: o primeiro marco está no ar. State do Terraform passou a ser remoto (decisão 8); o deploy do binário é feito pelo workflow manual e pelo timer das VMs, sem `user_data` ([ADR-0005](../../adr/0005-atualizacao-das-vms-e-deploy-inicial.md)); o webserver foi descartado ([ADR-0002](../../adr/0002-terminacao-tls-cloudflare-full-strict.md)); o frontend está publicado, com deploy manual pelo Wrangler. Estado de cada tarefa em `docs/superpowers/plans/2026-10-09-probekit-first-deploy.md`.

Responsabilidades (ver `AGENTS.md`):
- **Terraform**: escrito e mantido pelo criador; o assistente revisa, debuga e explica, mas não escreve a infraestrutura.
- **`wrangler.toml`** (config de build/deploy do Worker): escrito e mantido pelo **assistente**, mesma divisão que já existe para o resto do frontend. O `.yml` do GitHub Actions que invoca `wrangler deploy` continua sendo do criador.
- **GitHub Actions**: escrito e mantido pelo criador.

## Objetivo

Ter um caminho reproduzível para publicar o frontend e apontar o domínio para o backend já existente, usando infraestrutura como código no que for pertinente, respeitando free tier.

## Decisões confirmadas (sessão de grilling 2026-10-05)

1. Frontend hospedado em **Cloudflare Workers** (static assets), não Pages — Pages está em modo de manutenção, a Cloudflare recomenda Workers para projetos novos.
2. Domínio customizado (`probekit.cc`) está **dentro do escopo** deste primeiro deploy (a versão anterior deste spec colocava isso fora de escopo; a zona já existe e o código já pressupunha o domínio).
3. O Worker é gerenciado **inteiramente pelo Wrangler** — nenhum `cloudflare_worker`/`cloudflare_worker_version` no Terraform. Evita duas ferramentas disputando o mesmo recurso; Wrangler é a ferramenta certa para deploys frequentes (a cada merge), Terraform para o que muda raramente (registro DNS).
4. ~~As duas VMs da OCI, mais o OCI Network Load Balancer (L4) na frente delas, já estão provisionados manualmente — Terraform não cria, não importa, não gerencia chave SSH, não decide shape/topologia.~~ **Revertido em 2026-10-08:** o Terraform provisiona as duas VMs e o Network Load Balancer (L4) do zero — VCN, subnet, security list, route table, internet gateway, as 2 instâncias (`oci_core_instance`, `count = 2`) e o NLB completo (NLB + backend_set + backends + listener), tudo no módulo `oci/`. O que resta fora do Terraform é só o deploy do binário Go nas instâncias (script de inicialização/cloud-init, decisão em andamento — ver seção "Escopo").
5. ~~Terraform não tem relação com a OCI — nem provider, nem data source, nem import. O IP do Load Balancer entra como `var.lb_ip`, valor colado manualmente no `terraform.tfvars`.~~ **Revertido em 2026-10-08:** o provider `oci` é configurado na raiz (`main.tf`), autenticado via API Key (`tenancy_ocid`, `user_ocid`, `fingerprint`, `private_key_path`, `region`). O módulo `oci/` usa `data` sources (`oci_identity_availability_domain`, `oci_core_images`) para resolver availability domain e imagem da instância. O IP do Load Balancer deixou de ser colado manualmente — agora é um `output "nlb_ip_address"` do módulo `oci`, computado a partir do `oci_network_load_balancer_network_load_balancer` após o apply, e repassado pro módulo `cloudflare` via `module.oci.nlb_ip_address`. O DNS continua apontando pro Load Balancer, não direto pra uma VM — trocar as instâncias atrás dele não exige mudar o registro DNS.
6. Status da conta/ambiente OCI Always Free ainda precisa ser validado pelo criador — dependência externa, não bloqueia o restante do design (ver "Dependências").
7. Estrutura do Terraform **com módulo por provedor** (revisado — a versão anterior desta decisão havia optado por achatar tudo, mas o objetivo é multi-provider desde já). `main.tf` na raiz de `infra/terraform/` declara um `module` por provedor (`module "cloudflare" { source = "./cloudflare" }` hoje; `module "azure"`/`module "aws"` quando esses provedores entrarem de fato), todos compartilhando o mesmo state (ver decisão 8). Cada pasta de módulo precisa declarar sua própria `variable {}` para cada input recebido da raiz — não há herança automática de nomes de variável entre raiz e módulo.
8. State do Terraform: **remoto**, em bucket da OCI (`backend.tf`, região `sa-saopaulo-1`). Revisado antes do primeiro deploy (era local): o `plan`/`apply` roda no workflow manual e precisa de state compartilhado. Ver [ADR-0005](../../adr/0005-atualizacao-das-vms-e-deploy-inicial.md).
9. Sem variável de seleção de ferramenta (`var.tools`/`count` condicional) — nada na infra varia por ferramenta; o binário Go já serve `/api/ping` e `/api/dns-lookup` na mesma VM.
10. `cloudflare_dns_record.api` (único resource do Terraform) fica com `proxied = true` — Cloudflare termina TLS e esconde o IP real do Load Balancer; permite restringir o firewall do Load Balancer/VMs só aos ranges de IP da Cloudflare.
11. Sem `variable "cf_account_id"` — nenhum resource de escopo de conta sobrou no Terraform (DNS record só precisa de `zone_id`).
12. Domínio do frontend (`probekit.cc`/`www`) **não tem registro no Terraform** — é resolvido pelo binding de domínio customizado do Wrangler (`routes` no `wrangler.toml`), que a Cloudflare gerencia internamente.
13. TLS da API termina direto no binário Go (`net/http` com `ListenAndServeTLS`), sem webserver dedicado (nginx/Apache), usando um certificado **Origin CA emitido pela Cloudflare** e o modo SSL/TLS da zona em **Full (strict)**. Ver [ADR-0002](../../adr/0002-terminacao-tls-cloudflare-full-strict.md) para as alternativas consideradas (Cloudflare Flexible, Let's Encrypt) e o motivo da escolha — resolve a decisão em aberto que estava registrada em `docs/architecture/arch.md`, seção 5.

## Escopo

- **Backend**: duas VMs Oracle Cloud Always Free e um OCI Network Load Balancer (L4) distribuindo a carga entre elas, **provisionados via Terraform** (módulo `oci/`: VCN, subnet, security list, route table, internet gateway, as 2 instâncias, NLB + backend_set + backends + listener). Escopo do Terraform aqui cobre a infraestrutura de rede/compute inteira, além do DNS pro Load Balancer.
  - Mecanismo de deploy do binário Go nas VMs — o workflow `deploy-api-golang.yml` (manual) entrega o `deploy-api-go.sh` por SSH, que instala o binário da release (conferindo o `SHA256SUMS`), o certificado e o serviço systemd; depois um timer nas VMs atualiza o binário a cada nova release. O `user_data` foi descartado ([ADR-0005](../../adr/0005-atualizacao-das-vms-e-deploy-inicial.md)). O conteúdo do script é definido pelo criador.
  - ~~Webserver na frente do binário Go (nginx/Apache)~~ — resolvido em 2026-10-08: sem webserver, o TLS termina no binário Go ([ADR-0002](../../adr/0002-terminacao-tls-cloudflare-full-strict.md)).
- **Frontend**: Cloudflare Worker com static assets, deploy via Wrangler (`wrangler.toml` + `cloudflare/wrangler-action`) a cada merge na branch principal.
- **DNS/domínio** (único resource Terraform deste primeiro deploy):
  - `cloudflare_dns_record.api`: `zone_id`, `name = "api.${var.fqdn_name}"`, `type = "A"`, `content = var.lb_ip`, `proxied = true`, `ttl` conforme exigido pelo provider.
- **Pipelines** (`.github/workflows/`, escritos pelo criador):
  - CI do frontend: instala dependências, roda testes, builda.
  - CI do backend: builda o binário Go, roda testes.
  - `terraform plan` automático em PRs que alterarem `infra/terraform/` (checagem, sem aplicar).
  - Deploy do frontend: `wrangler deploy` automático após merge na branch principal (alvo). **Hoje o deploy é manual** e o workflow está no plano do primeiro deploy, Task 12.
  - Deploy do backend: cada merge com mudança em `backend/api-service-golang/` publica uma release e as VMs se atualizam sozinhas por timer; o deploy completo (Terraform, certificado, script) é o workflow manual *Deploy*. Ver [ADR-0005](../../adr/0005-atualizacao-das-vms-e-deploy-inicial.md).
  - `terraform apply` roda somente no workflow manual *Deploy*, disparado pelo criador; nunca em push ou pull request.

## Fora de escopo

- Múltiplas regiões ou múltiplos provedores para o mesmo serviço.
- Observabilidade avançada (métricas, alertas).
- Qualquer resource Terraform de escopo de conta Cloudflare (Workers, bindings) — fica inteiramente com o Wrangler.

## Design

- `infra/terraform/` — raiz com um `module` por provedor:
  - `main.tf`: `terraform {}` + `required_providers { cloudflare, ... }`, variáveis de nível raiz, e um bloco `module "<provedor>" { source = "./<provedor>" ... }` por provedor ativo.
  - `cloudflare/`: módulo com seu próprio `provider "cloudflare"`, suas próprias `variable {}` (recebendo os inputs passados pelo `module` block da raiz — `cf_api_token`, `fqdn_name`, `zone_id`, `nlb_ip_address`) e `dns.tf` com `resource "cloudflare_dns_record" "api"`.
  - `oci/`: módulo sem provider próprio — herda o `provider "oci"` configurado na raiz (`main.tf`, autenticado via API Key: `tenancy_ocid`, `user_ocid`, `fingerprint`, `private_key_path`, `region`). Declara `variable {}` para os inputs recebidos (`tenancy_ocid`, `compartment_id`, `instance_availability_domain`, `ssh_public_key`). Contém `network.tf` (VCN, subnet, security list, route table, internet gateway), `instance.tf` (as 2 instâncias `oci_core_instance`, `count = 2`), `loadbalacers.tf` (NLB, backend_set, backends, listener) e `output.tf` (`nlb_ip_address`, consumido pelo módulo `cloudflare`).
  - `azure/`, `aws/`: mesma estrutura, criados quando esses provedores entrarem de fato — não antecipar conteúdo vazio antes de haver um resource real para colocar lá.
  - `terraform.tfvars`: valores reais na raiz, já coberto por `infra/**/*.tfvars` no `.gitignore`.
  - State remoto único, em bucket da OCI (`backend.tf`), compartilhado por todos os módulos.
- `frontend/wrangler.toml` — config do Worker (nome, `routes` com domínio customizado, diretório de assets apontando pro build do Vite). Mantido pelo assistente.
- Segredos (API token da Cloudflare, credenciais da OCI para o deploy do binário, etc.) ficam em GitHub Actions Secrets — nunca commitados, nunca compartilhados com o assistente.

## Testes

- `terraform validate` e `terraform plan` como checagem de CI pro `infra/terraform/`.
- Pipeline de deploy do frontend/backend falha o build se os testes de `frontend/` ou do backend não passarem antes de publicar.

## Critérios de aceite

- `terraform apply` (manual, pelo criador) cria/atualiza toda a infraestrutura OCI (rede, instâncias, Network Load Balancer) e o registro DNS da `api`, apontando pro IP do Load Balancer resolvido automaticamente via output do módulo `oci`.
- Um merge na branch principal publica o frontend atualizado no Worker automaticamente, via Wrangler (alvo; hoje o deploy é manual).
- O deploy do backend acontece automaticamente após merge (release + atualização das VMs por timer), sem exigir ajuste manual no Terraform, já que o IP do Load Balancer é resolvido automaticamente. Ver [ADR-0005](../../adr/0005-atualizacao-das-vms-e-deploy-inicial.md).
- Nenhuma credencial real aparece no repositório ou é vista pelo assistente.

## Dependências

- Validação de que a conta/ambiente Always Free da OCI está funcionando — pendente, a cargo do criador. Não bloqueia o Terraform (que não toca na OCI), mas bloqueia o deploy real do backend.
- Precisa do binário do backend existir (spec de feature) para o pipeline de deploy do backend ter o que publicar.
- Precisa do build do frontend (Vite) existir para o `wrangler deploy` ter assets pra servir.
