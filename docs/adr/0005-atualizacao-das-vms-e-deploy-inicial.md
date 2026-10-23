# ADR-0005: Deploy inicial por workflow manual e atualização das VMs por pull

## Status
Aceita

## Contexto

A API roda em duas VMs criadas pelo Terraform. Era preciso definir três coisas do plano do primeiro deploy: como a infraestrutura e a primeira versão chegam às VMs (D6), como as VMs recebem **novas** versões do binário (D3) e onde fica o state do Terraform (D5).

Restrições: projeto de um operador só, free tier, e o `terraform apply` não pode rodar sem ordem explícita do criador.

## Decisão

**State do Terraform (D5).** Remoto, em um bucket da OCI (`backend.tf`, região `sa-saopaulo-1`). Isso substitui a decisão 8 do spec de infra (state local) e permite que o CI rode `plan` e `apply`.

**Deploy inicial (D6).** O workflow `deploy-api-golang.yml`, disparado **só manualmente** (`workflow_dispatch`), no ambiente `production`:

1. obtém as configurações da OCI no Infisical por OIDC e grava a chave da API OCI (secret do GitHub) em arquivo;
2. `terraform init`, `plan -out=tfplan` e `apply tfplan` (o plano salvo, sem `-auto-approve` sobre um plano diferente);
3. lê os IPs das VMs (`api_probekit_public_ip`) e espera o `cloud-init` terminar em cada uma;
4. entrega o certificado e a chave ([ADR-0003](0003-porta-origem-e-entrega-do-certificado.md));
5. executa o `deploy-api-go.sh` por SSH (`sudo bash -s`) nas duas VMs.

**Release.** O workflow *Build & Release API* roda a cada push na `main` que altere `backend/api-service-golang/`: executa `go test ./...`, calcula a versão pelos commits (`feat:` minor, `fix:`/`perf:` patch, `!:` ou `BREAKING CHANGE:` major), compila para Linux AMD64 e publica a release `probekit-linux-amd64-api-go-X.Y.Z` com o binário e o `SHA256SUMS`. Mudanças que só tocam `infra/` ou `frontend/` não geram release.

**Novas versões (D3), por pull.** O `deploy-api-go.sh` instala na VM um timer do systemd, `autodeploy-api-go.timer`, que roda a cada 5 minutos (`OnBootSec=2min`, `OnUnitActiveSec=5min`, até 30 s de atraso aleatório). O timer executa uma cópia do próprio script (`/usr/local/sbin/autodeploy-api-go.sh`, baixada do tag da release), que:

- consulta `releases/latest` e compara com a versão instalada (`/opt/probekit/VERSION`);
- se há versão nova, baixa o binário e o `SHA256SUMS`, confere o checksum e só então troca o binário e reinicia o serviço;
- usa `flock` para dois deploys nunca rodarem juntos e é idempotente: sem versão nova, nada é baixado nem reiniciado.

## Alternativas consideradas

### Redeploy disparado pelo GitHub Actions a cada release (opção B da D3)

Um workflow dispara ao publicar a release e conecta por SSH nas VMs.

**Motivo da não escolha:** depende do CI estar de pé a cada versão e do runner alcançar as VMs. No modelo por pull, as VMs se atualizam sozinhas e o CI só publica o binário.

### `terraform apply` automático em push de `infra/**`

**Motivo da não escolha (por enquanto):** aplicaria infraestrutura real sem uma aprovação. Quando for adotado, deve vir com *required reviewers* no ambiente `production`, plano separado do apply e `concurrency`.

### `user_data` baixando e executando o script no primeiro boot

Foi cogitado e descartado: o workflow entrega o script por SSH, o que também permite entregar o certificado.

## Consequências

### Positivas

- As VMs se mantêm atualizadas sem ação manual e sem credencial de CI com acesso a elas a cada release.
- O binário só é trocado depois de conferir o checksum, e o script é idempotente (verificado rodando o workflow várias vezes).
- O apply nunca roda em push ou pull request.

### Negativas

- **Uma release pode chegar às VMs antes do ambiente que ela exige.** Foi o risco da release com TLS: o binário passou a exigir `TLS_CERT_FILE` e `TLS_KEY_FILE`, que só o *Deploy* entrega, e se o timer o baixasse antes do workflow o serviço reiniciaria e falharia. Na prática o *Deploy* rodou um minuto depois da release e não houve queda observada. O mesmo vale para novas variáveis, como `CORS_ALLOWED_ORIGINS` (sem ela, só o CORS fica restritivo). Mudanças que acrescentam requisitos de ambiente devem rodar o *Deploy* logo após a release.
- O script que o timer usa vem do **tag da release**: mudanças só no script chegam às VMs pelo timer apenas depois de uma nova release. O *Deploy* aplica o script do repositório na hora.
- Não há rollback automático: o binário antigo é sobrescrito antes da validação. Voltar atrás exige publicar uma nova release.
- Até 5 minutos de atraso, e as duas VMs atualizam em momentos diferentes.

## Validação

- O *Deploy* manual rodou com sucesso mais de uma vez, inclusive repetido sobre VMs já configuradas (três execuções bem-sucedidas em 2026-10-17, após as releases 1.1.0 e 1.2.0).
- Releases publicadas: 1.0.0, 1.1.0 (TLS) e 1.2.0 (CORS).
- Em 2026-10-22 o updater das VMs ganhou **rollback automático** (issue #16, PR #34): guarda o binário anterior, só grava a versão depois que a API responde, restaura o anterior se a release nova não sobe e marca a versão como ruim para não tentá-la de novo. A consequência negativa "Não há rollback automático", acima, descreve o estado de quando a decisão foi tomada. Verificado em contêiner (9 cenários, 33 verificações); falta confirmar numa VM de verdade, o que depende de o updater novo chegar às VMs com a próxima release da API.
- Em 2026-10-20 o *Deploy* passou a ter dois jobs, `plan` (sem pausa) e `deploy` (com a aprovação do ambiente `production`), com o plano cifrado entre eles ([ADR-0007](./0007-gestao-de-segredos-com-infisical.md)). O primeiro run nesse formato passou, com "No changes" no plano e 0 recursos alterados no `apply`. A decisão acima, de aplicar o plano salvo, continua valendo.
- Verificação do timer em uma VM: `systemctl list-timers autodeploy-api-go.timer` e `journalctl -u autodeploy-api-go -n 30`.

## Referências

- [ADR-0003](0003-porta-origem-e-entrega-do-certificado.md)
- `.github/workflows/build-api-golang.yml`, `.github/workflows/deploy-api-golang.yml`
- `infra/shellscript/deploy-api-go.sh`, `infra/shellscript/calculate-version.sh`
