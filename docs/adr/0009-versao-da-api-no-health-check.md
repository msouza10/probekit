# ADR-0009: Versão da API no health check

## Status

Aceita (2026-10-22). A implementação ainda não foi feita.

## Contexto

Hoje, para saber qual release da API está no ar, é preciso ler `/opt/probekit/VERSION` por SSH em cada VM ou deduzir pelo timer de atualização. A informação é útil em três lugares:

- o **teste de fumaça** depois do deploy (issue #19), que hoje só confere que a API responde, e não **qual** versão responde;
- os **rollbacks** (issues #16 e #30), que precisam confirmar pelas VMs que elas voltaram para a versão esperada;
- quem opera o sistema, para ver o que está em produção com um `curl`, sem entrar nas máquinas.

O que o código mostra:

- O `GET /` responde `{"message":"OK"}` pelo tipo `utils.Response`, usado só ali (e no teste dele).
- O corpo de `/` é lido pelo `validate_api` do updater (`grep -q "OK"`), pelo `tls_test.go` (confere que o corpo **contém** `OK`) e é citado no README e no runbook.
- A release compila com `go build -trimpath -ldflags="-s -w"`, logo depois de calcular a versão (`steps.version.outputs.version`, algo como `1.3.0`), então embutir a versão é um acréscimo ao `-ldflags`.
- O repositório e as releases são públicos: a única informação nova exposta é **qual** versão está no ar agora.

## Decisão

O `GET /` passa a devolver também a versão compilada:

```json
{"message":"OK","version":"1.3.0"}
```

- A versão é embutida no binário em tempo de build, com `-X main.version=<versão da release>` no `-ldflags` do passo de build da release. Em build local e nos testes o valor é `dev`.
- O health check continua sendo "HTTP 200 e um corpo que contém `OK`": o `validate_api` e o `tls_test.go` seguem valendo sem mudança.
- O valor é a versão da release (por exemplo `1.3.0`), e não a tag completa (`probekit-linux-amd64-api-go-1.3.0`) que o updater grava em `/opt/probekit/VERSION`. Quem compara os dois precisa tirar o prefixo da tag.

## Alternativas consideradas

### Rota separada `GET /version`

Uma rota nova que devolve só a versão, deixando o health intacto.

**Motivo da não escolha:** custa uma rota, um handler e testes a mais, e o teste de fumaça passaria a fazer duas chamadas para obter o que uma resposta já pode trazer. O ganho de manter o health "puro" é pequeno aqui, porque o único consumidor frágil do corpo (`grep -q "OK"`) continua funcionando.

### Cabeçalho `X-Probekit-Version` em toda resposta

A versão vai num cabeçalho, sem mudar corpo nem rotas.

**Motivo da não escolha:** é menos visível (`curl -I`, e não o corpo que todos já olham) e mexe em todas as respostas da API, inclusive nas de erro e no preflight de CORS, para uma informação que só interessa ao health.

### Não expor a versão

**Motivo da não escolha:** o deploy e os rollbacks continuariam sem uma verificação objetiva da versão, e o teste de fumaça só poderia confirmar que a API responde.

## Consequências

### Positivas

- Uma única chamada (`GET /`) dá a saúde e a versão no ar, para o teste de fumaça, para os rollbacks e para quem opera.
- Menos código que a rota separada: um campo, uma variável compilada e uma linha no `-ldflags`.
- Nenhum consumidor atual do corpo de `/` quebra.

### Negativas

- O contrato do health cresce: ele deixa de ser só `{"message":"OK"}`. Documentos que citam o corpo exato (README, runbook) precisam ser atualizados.
- A versão só existe em binários de release; em build local e nos testes ela é `dev`.
- Informa publicamente qual versão está no ar, o que mostra quando uma VM está atrasada. O risco é baixo, porque o repositório e as releases já são públicos.
- O `version` e o `VERSION` das VMs têm formatos diferentes (versão contra tag completa), e a comparação precisa tratar isso.

## Validação

Decisão tomada em 2026-10-22; nada foi verificado ainda. Falta implementar (campo, `-ldflags` na release e testes) e confirmar em produção que `GET /` devolve a versão da release no ar.

## Referências

- Issue #18 (a decisão) e as issues #16, #19 e #30, que consomem a versão
- [ADR-0005](./0005-atualizacao-das-vms-e-deploy-inicial.md) (o updater e o `VERSION` das VMs)
