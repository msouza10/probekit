# Probekit — infraestrutura inicial

## Contexto

Ver `OVERVIEW.md` e `AGENTS.md`. Este spec cobre o provisionamento e a automação necessários para publicar o frontend e rodar o backend das ferramentas — sem entrar na lógica das ferramentas em si (spec `2026-10-01-probekit-ping-dns-feature-design.md`).

Responsável pela implementação: **criador** (Terraform e GitHub Actions são responsabilidade dele, conforme `AGENTS.md`); o assistente revisa, debuga e explica, mas não escreve a infraestrutura.

## Objetivo

Ter um caminho reproduzível para publicar o frontend e expor o backend, usando infraestrutura como código, respeitando free tier e sem exigir nenhuma ação manual fora do Terraform/GitHub Actions a cada novo deploy.

## Escopo

- **Backend**: 1 VM na Oracle Cloud Always Free (Ubuntu), provisionada via Terraform.
  - Regra de firewall liberando a porta da API (HTTPS) e ICMP de saída (necessário para o backend fazer ping real).
  - Mecanismo de deploy do binário Go na VM (ex: `scp` + restart de serviço `systemd`, ou outra abordagem que o criador preferir).
- **Frontend**: publicação estática no Cloudflare Pages, via GitHub Actions, a partir do build gerado pelo spec de frontend.
- **Pipelines** (`.github/workflows/`):
  - CI do frontend: instala dependências, roda testes, builda.
  - CI do backend: builda o binário Go, roda testes.
  - `terraform plan` automático em PRs que alterarem `infra/` (checagem, sem aplicar).
  - Deploy do frontend: automático após merge na branch principal.
  - Deploy do backend: automático após merge (deploy do binário na VM já provisionada) — `terraform apply` da própria VM continua manual, rodado pelo criador.

## Fora de escopo

- Múltiplas regiões ou múltiplos provedores para o mesmo serviço (fora do escopo inicial, conforme `OVERVIEW.md`).
- Observabilidade avançada (métricas, alertas) — pode entrar em uma iteração futura.
- Gestão de domínio próprio/DNS customizado (pode usar os domínios padrão do Cloudflare Pages e da VM por enquanto).

## Design

- `infra/` com os módulos Terraform:
  - `oci-vm/`: instância, regras de rede/firewall, chave SSH.
  - Estado do Terraform: definir backend remoto (ex: bucket) ou local por enquanto — decisão do criador, documentar a escolha quando feita.
- Segredos (chave da OCI, credenciais do Cloudflare, etc.) ficam em GitHub Actions Secrets — nunca commitados, nunca compartilhados com o assistente.
- O deploy do backend assume que o binário é um único executável Go (sem dependências externas de runtime), simplificando o `systemd` da VM a um único serviço.

## Testes

- `terraform validate` e `terraform plan` como checagem de CI.
- Pipeline de deploy do frontend/backend falha o build se os testes de `frontend/` ou do backend não passarem antes de publicar.

## Critérios de aceite

- Rodar `terraform apply` (manual, pelo criador) cria a VM do zero, com SSH e firewall configurados.
- Um merge na branch principal publica o frontend atualizado no Cloudflare Pages automaticamente.
- Um merge na branch principal atualiza o binário do backend na VM automaticamente, sem passo manual.
- Nenhuma credencial real aparece no repositório ou é vista pelo assistente.

## Dependências

- Precisa do binário do backend existir (spec de feature) para o pipeline de deploy do backend ter o que publicar — mas o provisionamento da VM em si pode ser feito em paralelo.
