# ADR-0011: Último commit e últimos deploys em arquivo estático

## Status

Aceita (2026-11-04). Decidida pelo criador na [issue #71](https://github.com/msouza10/probekit/issues/71); a implementação é a [issue #72](https://github.com/msouza10/probekit/issues/72), no [plano dos números automáticos](../superpowers/plans/2026-10-26-probekit-numeros-automaticos.md).

## Contexto

A Home mostra o último commit e o último deploy do site e da API. Hoje esses dados vêm de `frontend/src/lib/github.ts`, que chama `api.github.com` **direto do navegador de cada visitante**, sem token. Cada parte falha sozinha e, quando falha, o bloco deixa de aparecer sem nenhum aviso. O único cache é de 10 minutos, no `sessionStorage`, e só vale dentro da mesma sessão.

As chamadas sem autenticação à API do GitHub têm um limite baixo por IP ([limites da API REST](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)). Quando esse limite estoura, ou a API fica fora do ar, o bloco some.

Os outros números da Home (commits, PRs, issues e linguagens) já não têm esse problema: o `stats.json` é gerado no build e no deploy agendado, com o `GITHUB_TOKEN` do job ([ADR-0010](./0010-deploy-agendado-em-ambiente-proprio.md)).

Restrições: um operador só, nenhum custo novo, repositório público (nenhum token no navegador).

## Decisão

O último commit e os últimos deploys passam a ser **gerados em um arquivo estático**, no mesmo fluxo do `stats.json` (no build e no deploy agendado, com o `GITHUB_TOKEN` do job), e servidos pelo próprio site. O navegador deixa de chamar `api.github.com`.

A Home mostra a **hora em que o arquivo foi gerado**, para o dado não parecer mais novo do que é. Sem o arquivo, ou com um formato inválido, o bloco some como hoje.

O nome e o formato do arquivo, e se ele entra no `stats.json` ou fica separado, são detalhes da implementação ([#72](https://github.com/msouza10/probekit/issues/72)), não desta decisão.

## Alternativas consideradas

### Manter a chamada no navegador e avisar quando falhar

O bloco continuaria buscando na API, mas mostraria uma mensagem quando a chamada falhasse.

**Motivo da não escolha:** o aviso explica a falha, mas não a evita. O limite por IP continua, e quem mais depende do dado (o visitante que abre a Home) é quem fica sem ele. Resolver no build usa um mecanismo que o projeto já tem.

## Consequências

### Positivas

- O limite de acesso por IP deixa de afetar o visitante, e uma queda da API do GitHub não apaga o bloco.
- Mesmo padrão do `stats.json`: um fluxo só para entender e manter.
- Nenhum token novo e nada de credencial no navegador.

### Negativas

- O dado fica atrás do repositório até o próximo horário do cron (seis por dia, com intervalo de até 9 horas de madrugada, e o GitHub pode atrasar). Por isso a Home mostra a hora de geração.
- O deploy agendado hoje só publica quando os **números** mudaram (`stats:changed`). Para o arquivo novo acompanhar um commit ou um deploy da API sem mudar esses números, a comparação precisa passar a incluí-lo. Isso é trabalho da #72, e sem ele o arquivo só atualiza junto com os números ou com um deploy normal.

## Validação

Serão avaliados, com a data de cada verificação:

- a Home não faz nenhuma chamada a `api.github.com` ao abrir (aba de rede do navegador);
- o bloco mostra a hora de geração do arquivo;
- sem o arquivo no ar, a Home continua funcionando e o bloco some;
- um commit novo, sem mudança nos números do `stats.json`, aparece no site depois do próximo deploy agendado.

## Referências

- [ADR-0010: deploy agendado do site em ambiente próprio](./0010-deploy-agendado-em-ambiente-proprio.md)
- [Plano dos números automáticos](../superpowers/plans/2026-10-26-probekit-numeros-automaticos.md)
- [Limites da API REST do GitHub](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
