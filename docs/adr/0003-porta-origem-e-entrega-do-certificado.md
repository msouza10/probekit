# ADR-0003: Porta da origem e entrega do certificado Origin CA

## Status
Aceita

## Contexto

A API Go roda em duas VMs atrás de um OCI Network Load Balancer L4 (ver [ADR-0001](0001-oci-network-load-balancer.md)) e termina TLS no próprio binário, com um certificado Origin CA da Cloudflare (ver [ADR-0002](0002-terminacao-tls-cloudflare-full-strict.md)). Com o registro DNS em modo proxied, a Cloudflare conecta na origem usando a mesma porta do visitante, a 443, salvo uma Origin Rule.

Faltavam duas definições: em qual porta o NLB e as VMs escutam, e como o certificado e a chave privada chegam às VMs. As VMs são criadas e recriadas pelo Terraform, então a entrega precisa ser reproduzível. A chave privada não pode ir para o repositório (`*.pem` e `*.key` estão no `.gitignore`).

## Decisão

**Porta.** O listener do NLB, o backend e o health check usam a **443/TCP**, e o Go escuta em `:443` (padrão da variável `ADDR`). O serviço recebe `CAP_NET_BIND_SERVICE` na unit do systemd para abrir a porta sem ser root. A security list e o firewall do sistema liberam a 443.

**Certificado.**

1. O par Origin CA é gerado no painel da Cloudflare (SSL/TLS → Origin Server → Origin Certificates), com o hostname da API na lista.
2. O certificado e a chave ficam em **secrets do GitHub** (`TLS_CERT_FILE` e `TLS_KEY_FILE`), no ambiente `production`, o mesmo lugar das chaves SSH e OCI.
3. O workflow *Deploy* grava os dois no runner e os copia por `scp` para `/tmp` nas duas VMs, **antes** de executar o script de deploy.
4. O `deploy-api-go.sh` instala os arquivos em `/etc/probekit/` (dono `probekit`; certificado `0644`, chave `0600`) e remove as cópias de `/tmp`. Só instala se os arquivos de `/tmp` existirem, para as execuções do timer de atualização (que não têm os secrets) não falharem.
5. O script confere que o certificado e a chave existem em `/etc/probekit/` **antes** de trocar o binário, e a unit do systemd recebe os caminhos em `TLS_CERT_FILE` e `TLS_KEY_FILE`. O binário se recusa a subir sem eles.

## Alternativas consideradas

### NLB na 443 encaminhando para a 8443 da VM

Era a recomendação inicial do plano: o Go escutaria numa porta alta e dispensaria `CAP_NET_BIND_SERVICE`.

**Motivo da não escolha:** exigiria portas diferentes no listener, no backend, no health check e na security list, para evitar uma capability que o serviço já recebe. Usar a mesma porta de ponta a ponta é mais simples de operar e de depurar.

### Cópia manual única por `scp` (decisão inicial D4)

O criador copiaria o par para as duas VMs uma vez.

**Motivo da não escolha:** não é reproduzível. Uma VM recriada pelo Terraform subiria sem certificado, e o deploy ficaria dependente de uma etapa manual esquecível.

### Entregar pelo `user_data` (cloud-init)

**Motivo da não escolha:** o `user_data` fica visível na metadata da instância, então a chave privada ficaria exposta a quem consultar a metadata.

## Consequências

### Positivas

- Deploy reproduzível: recriar uma VM e rodar o workflow entrega o certificado sem passo manual.
- A chave privada nunca entra no repositório, e fica com permissão `0600` e dono `probekit` nas VMs.
- Um serviço sem certificado falha na hora, com mensagem clara, em vez de subir quebrado.

### Negativas

- A chave passa pelo disco do runner e por `/tmp` nas VMs durante o deploy (removida em seguida).
- Renovar ou trocar o certificado exige atualizar os dois secrets e rodar o *Deploy* de novo.
- Um release do Go que passe a exigir novos arquivos ou variáveis pode derrubar o serviço se as VMs o baixarem (timer) antes do *Deploy* entregar o que falta. Ver [ADR-0005](0005-atualizacao-das-vms-e-deploy-inicial.md).

## Validação

Verificado em produção em 2026-10-17:

- `curl https://api.probekit.cc/` responde 200 sem `-k`, passando por Cloudflare → NLB → VM.
- O health check TCP do NLB marca os dois backends como OK.
- Testes automatizados (`tests/tls_test.go`): leitura das variáveis, servidor real respondendo por HTTPS e saída com erro quando faltam os arquivos.

Conferência manual de um certificado:

```bash
openssl x509 -in origin-ca.pem -noout -subject -issuer -dates -ext subjectAltName
```

## Referências

- [ADR-0001](0001-oci-network-load-balancer.md), [ADR-0002](0002-terminacao-tls-cloudflare-full-strict.md)
- [Cloudflare Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)
- `infra/shellscript/deploy-api-go.sh`, `.github/workflows/deploy-api-golang.yml`
