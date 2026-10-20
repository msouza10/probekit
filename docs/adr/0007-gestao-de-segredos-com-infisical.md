# ADR-0007: Gestão de segredos com Infisical e secrets de ambiente do GitHub

## Status

Aceita (registrada em 2026-10-20). A prática vale desde o primeiro deploy; este ADR escreve a decisão e o motivo.

## Contexto

O *Deploy* roda no GitHub Actions e precisa de credenciais: configurações e variáveis do Terraform para a OCI, a chave da API da OCI, a chave SSH das VMs e o certificado Origin CA (ver [ADR-0003](./0003-porta-origem-e-entrega-do-certificado.md) e [ADR-0005](./0005-atualizacao-das-vms-e-deploy-inicial.md)). O repositório é **público**, então nenhum valor pode ficar no código nem no histórico.

O que se queria:

- segredos **fora do repositório** e fora do provedor de CI, em um só lugar;
- nenhuma credencial de longa duração guardada só para conseguir ler os segredos;
- as credenciais mais sensíveis liberadas somente **depois de uma aprovação** (a pausa de aprovação do *Deploy* é a issue #17).

## Decisão

Um modelo **híbrido**, com cada tipo de segredo no lugar que o protege melhor:

1. **Infisical** (ambiente `prod`) é a fonte das **configurações da OCI**, das **variáveis do Terraform** (`TF_VAR_*`) e da **senha que cifra o plano do Terraform** entre os jobs do *Deploy*. O workflow se autentica por **OIDC**: a identidade do Infisical aceita apenas tokens do GitHub deste repositório, vindos dos ambientes `plan` e `production`, e o job recebe os valores como variáveis de ambiente.
2. **Secrets de ambiente do GitHub** guardam as **credenciais mais sensíveis**: `OCI_PRIVATE_KEY`, `SSH_PRIVATE_KEY`, `TLS_CERT_FILE` e `TLS_KEY_FILE`. Ficam no ambiente `production`, protegido por revisor, e só chegam ao job depois da aprovação. O ambiente `plan`, sem aprovação, recebe só o `OCI_PRIVATE_KEY`, que o `terraform plan` exige.
3. **Nada de segredo no repositório:** arquivos de chave ficam fora do versionamento (`*.pem` no `.gitignore`), e documentos citam segredos só pelo nome.
4. **Convenção de nomes:** chaves em maiúsculas são variáveis de ambiente usadas pelo workflow; as em minúsculas vêm de fora, por exemplo as variáveis do Terraform.

## Alternativas consideradas

### Só secrets do GitHub (de repositório e de ambiente)

Guardar tudo como secrets do GitHub, sem ferramenta externa.

**Motivo da não escolha:** como fonte **única** ela contraria a meta de ter os segredos fora do GitHub, em um só lugar. Ela continua em uso, de propósito, para as quatro credenciais mais sensíveis, por causa da aprovação do ambiente `production` (ver Decisão, item 2).

### SOPS com age

Segredos cifrados dentro do próprio repositório e decifrados no CI.

**Motivo da não escolha:** deixa os segredos, mesmo cifrados, **dentro de um repositório público**, e eles ficam no histórico para sempre; um vazamento da chave `age` exporia todo o histórico. Além disso a chave `age` precisaria ser guardada em outro lugar, o que devolve o problema.

### Não avaliadas

O **OCI Vault** e o **HashiCorp Vault** (cofre mantido em uma VM própria) não foram avaliados.

## Consequências

### Positivas

- Configurações e variáveis do Terraform ficam fora do repositório e do GitHub, em um só lugar.
- Não há credencial fixa de acesso aos segredos: o login é por OIDC, e a identidade só aceita este repositório e os ambientes `plan` e `production`.
- As credenciais mais sensíveis (chave SSH, certificado, chave da OCI no `production`) só chegam ao job depois da aprovação.
- Trocar uma configuração da OCI não exige alterar o repositório nem republicar um workflow.

### Negativas

- **Duas fontes de segredo** (Infisical e GitHub): é preciso lembrar onde cada um mora, e uma mudança pode exigir conferir os dois lugares.
- O *Deploy* depende de um **serviço externo** (o Infisical): se ele estiver fora do ar, o workflow não obtém as configurações.
- O ambiente `plan`, **sem aprovação**, lê as configurações e a senha do plano. A proteção dele vem de aceitar só a branch `main` e de a identidade do Infisical aceitá-lo.
- O login do workflow exporta **todos** os segredos do ambiente `prod` do Infisical para o job, inclusive os que o job não usa.
- O `OCI_PRIVATE_KEY` existe nos dois ambientes do GitHub (`plan` e `production`).

## Validação

Verificado em 2026-10-20, pela API do GitHub e só pelos **nomes** dos secrets:

- o ambiente `production` tem revisor, o bloqueio da própria aprovação está desligado (há um só operador) e aceita só a branch `main`;
- o ambiente `plan` não tem revisor e aceita só a branch `main`;
- os secrets do `production` são `OCI_PRIVATE_KEY`, `SSH_PRIVATE_KEY`, `TLS_CERT_FILE` e `TLS_KEY_FILE`, e o do `plan` é `OCI_PRIVATE_KEY`; não há secret no nível do repositório.

Verificado em 2026-10-20, no *Deploy* com dois jobs (run `39440535935`, depois de corrigir uma linha de claim em branco na identidade do Infisical):

- o login por OIDC passou nos ambientes `plan` e `production`, e a senha do plano chegou aos dois jobs (a guarda da senha, a cifragem, a decifragem e o `apply` do plano salvo passaram);
- o artefato do plano tem 1 dia de retenção e é um arquivo cifrado (cabeçalho `Salted__`, sem texto legível do Terraform);
- a aprovação do `production` ficou registrada, e o job `Deploy` só começou cerca de 48 segundos depois do fim do `plan`.

## Referências

- [Runbook de deploy](../runbook-deploy.md) (secrets do *Deploy*)
- [ADR-0003](./0003-porta-origem-e-entrega-do-certificado.md) e [ADR-0005](./0005-atualizacao-das-vms-e-deploy-inicial.md)
- [Infisical](https://infisical.com/docs)
- [GitHub Actions](https://docs.github.com/actions)
