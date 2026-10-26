# ADR-0010: Deploy agendado do site em um ambiente próprio

## Status

Proposta (2026-10-26). Vira *Aceita* quando o criador confirmar; a implementação é o [plano dos números automáticos](../superpowers/plans/2026-10-26-probekit-numeros-automaticos.md).

## Contexto

A Home mostra números do repositório (commits, PRs, issues e linguagens) lidos de `/stats.json`. Hoje o arquivo é fixo: `frontend/public/stats.json` tem uma data escrita à mão, e o comentário de `frontend/src/lib/stats.ts` diz que "quem gera o arquivo é o workflow de deploy", o que não é verdade, porque o `deploy-frontend.yml` não tem esse passo.

Gerar o arquivo no deploy resolve só quando há deploy, e o site só é publicado quando `frontend/**` muda. Para os números ficarem frescos sem ninguém fazer nada, é preciso um deploy agendado.

Duas restrições impedem o caminho óbvio:

- A `main` só aceita pull request ([`docs/README.md`](../README.md), *Proteção da `main`*), então um robô não pode commitar o `stats.json` nela.
- O job `Deploy Frontend` roda no ambiente `production`, que tem **1 revisor obrigatório** ([ADR-0008](./0008-deploy-do-site-pelo-github-actions.md)). Um deploy agendado diário ficaria parado esperando a aprovação do criador. O próprio ADR-0008 registra que desligar a aprovação só para o site "exigiria um ambiente próprio".

## Decisão

Gerar o `stats.json` em `dist/` no build (sem commit) e criar um **ambiente do GitHub só para o deploy agendado do site**, sem revisor, restrito à branch `main`, com o token e o id da conta da Cloudflare do site como secrets desse ambiente.

Um workflow agendado (uma vez por dia) compara os números novos com os do site no ar e **só publica quando mudaram**. Ele usa o mesmo grupo de `concurrency` do deploy normal. O `production` continua com a aprovação para tudo o que é mudança de código; o ambiente novo é usado **apenas** pelo agendado.

## Alternativas consideradas

### Aprovar o `production` todo dia

O deploy agendado usaria o `production` como está.

**Motivo da não escolha:** a automação deixa de ser automática; vira um lembrete diário que o criador precisa aprovar, e o tempo da aprovação é desperdício para publicar um arquivo de números.

### Gerar no build e agendar só um lembrete semanal

Os números mudam em todo deploy normal, e um agendamento semanal dispara o deploy para o criador aprovar com um clique.

**Motivo da não escolha:** não muda a segurança, mas também não resolve o pedido; entre deploys os números continuam parados, e a aprovação continua manual.

### Worker agendado com KV, sem deploy

Um Worker com *Cron Trigger* leria a API do GitHub e guardaria os números no KV da Cloudflare, e o site serviria `/stats.json` a partir dele.

**Motivo da não escolha:** o site deixa de ser só arquivos estáticos (hoje é "Worker só de arquivos estáticos", ver `frontend/wrangler.toml`), ganha código de servidor, um recurso novo para manter e outra superfície de falha, e o dado deixa de ir no HTML pré-renderizado. É mais peça do que o problema pede.

### Workflow agendado que abre um pull request

Um cron geraria o `stats.json` e abriria um PR diário.

**Motivo da não escolha:** a `main` exige PR com CI verde e o deploy continua atrás da aprovação do `production`; seriam duas aprovações por dia para atualizar um arquivo.

## Consequências

### Positivas

- Os números do site se atualizam sozinhos, sem commit de robô e sem aprovação diária.
- O `production` mantém a aprovação para qualquer mudança de código; o novo ambiente só publica o que já está na `main` e só roda a partir dela.
- Sem mudança nos números, o job agendado termina sem publicar, o que evita versões inúteis no Cloudflare.

### Negativas

- O token do site passa a existir em **dois** ambientes (`production` e o novo), e o do novo é usado sem revisor. Mitigação: o token já é de uso exclusivo do site, com o mínimo de permissões (ADR-0008), o ambiente só aceita a `main`, e a `main` só recebe código por PR com CI verde.
- Dois caminhos de deploy do site para manter em sincronia (build, verificações, `concurrency`). Se a duplicação incomodar, extrair um workflow reutilizável.
- O GitHub desativa workflows agendados de repositório público depois de 60 dias sem atividade. Como os números só mudam com atividade no repositório, o efeito é inofensivo, mas o criador precisa saber que isso pode acontecer.

## Validação

Pendente. Serão avaliados, com a data de cada verificação:

- o ambiente criado não tem revisor e só aceita a `main` (`gh api` mostra as regras);
- duas execuções seguidas do workflow agendado: a primeira publica quando há mudança, a segunda termina sem publicar;
- `https://probekit.cc/stats.json` com `generated_at` do dia do deploy e números iguais aos do repositório;
- um deploy normal e um agendado disparados juntos não rodam em paralelo.

## Referências

- [ADR-0008: deploy do site pelo GitHub Actions](./0008-deploy-do-site-pelo-github-actions.md)
- [Plano dos números automáticos](../superpowers/plans/2026-10-26-probekit-numeros-automaticos.md)
- [Eventos que disparam workflows: schedule (GitHub Docs)](https://docs.github.com/actions/using-workflows/events-that-trigger-workflows#schedule)
