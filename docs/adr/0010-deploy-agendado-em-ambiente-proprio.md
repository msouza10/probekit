# ADR-0010: Deploy agendado do site em um ambiente próprio

## Status

Aceita (2026-10-30). Proposta em 2026-10-26 e reescrita em 2026-10-29 depois de conversa com o criador; aceita quando o criador criou o ambiente `stats`. A implementação é o [plano dos números automáticos](../superpowers/plans/2026-10-26-probekit-numeros-automaticos.md).

## Contexto

A Home mostra números do repositório (commits, PRs, issues e linguagens) lidos de `/stats.json`. Hoje o arquivo é fixo: `frontend/public/stats.json` tem uma data escrita à mão, e o comentário de `frontend/src/lib/stats.ts` diz que "quem gera o arquivo é o workflow de deploy", o que não é verdade, porque o `deploy-frontend.yml` não tem esse passo.

Gerar o arquivo no deploy resolve só quando há deploy, e o site só é publicado quando `frontend/**` muda. Para os números ficarem frescos sem ninguém fazer nada, é preciso um deploy agendado, algumas vezes ao dia.

Três restrições impedem o caminho óbvio:

- A `main` só aceita pull request ([`docs/README.md`](../README.md), _Proteção da `main`_), então um robô não pode commitar o `stats.json` nela.
- O job `Deploy Frontend` roda no ambiente `production`, que tem **1 revisor obrigatório** ([ADR-0008](./0008-deploy-do-site-pelo-github-actions.md)). Um deploy agendado ficaria parado esperando a aprovação do criador.
- O `production` não protege só o site: o `deploy-api-golang.yml` e os dois workflows de rollback (`rollback-api-golang.yml` e `rollback-frontend.yml`) também rodam nele. Tirar o revisor dele para o cron funcionar tiraria a aprovação do deploy da API.

## Decisão

1. **Gerar o `stats.json` em `dist/` no build**, com `npm run stats` e o `GITHUB_TOKEN` automático do job (`contents: read`). Nenhum token novo. O arquivo não é commitado: `frontend/public/stats.json` sai do git e entra no `.gitignore`.
2. **O mesmo `deploy-frontend.yml` ganha um gatilho `schedule`**, com `17 12,15,18,21,00,03 * * *` (UTC), ou seja, **09:17, 12:17, 15:17, 18:17, 21:17 e 00:17 em Brasília**, além do `workflow_dispatch`. O minuto 17 evita o começo da hora, quando o GitHub atrasa ou descarta execuções agendadas por excesso de carga. Não há workflow separado.
3. **O ambiente do job de deploy é escolhido por expressão**: `stats` quando o evento é o agendado, `production` nos demais. O `stats` é um ambiente do GitHub **sem revisor**, que só aceita a branch `main`, com dois secrets próprios, de mesmo nome dos do `production` (`CF_API_TOKEN` e `CF_ACCOUNT_ID`, só os nomes aparecem aqui). O GitHub guarda os secrets por ambiente e não os mostra depois de salvos, então os valores do `stats` foram cadastrados à parte, a partir da Cloudflare. O `production` continua com a aprovação para tudo o que é mudança de código, rollback e deploy da API.
4. **No agendado, só publica quando os números mudaram.** Antes do build, `npm run stats:changed -- --live https://probekit.cc/stats.json` compara os números novos com os do site no ar e escreve `changed=true|false`. Com `false`, o workflow termina verde sem publicar. Se a API do GitHub falhar, o resultado é `false` com aviso: nunca se publica às cegas.
5. **No deploy normal (push em `frontend/**`), se `npm run stats` não gravar o arquivo**, o passo baixa o `/stats.json` que está no ar e o coloca no `dist`. Um deploy de código não apaga os números por causa de um soluço da API do GitHub.
6. O `concurrency` é o mesmo do deploy normal (`deploy-frontend`, sem cancelar o que está rodando).

## Alternativas consideradas

### Aprovar o `production` a cada execução

O deploy agendado usaria o `production` como está.

**Motivo da não escolha:** a automação deixa de ser automática; vira um lembrete que o criador precisa aprovar até seis vezes ao dia para publicar um arquivo de números.

### Tirar o revisor do `production`

Um só ambiente, sem aprovação, e o cron entraria nele.

**Motivo da não escolha:** o `production` também gate o deploy da API e os rollbacks (ver _Contexto_). Simplificar o site tiraria a aprovação de operações sobre a infraestrutura.

### Workflow agendado separado, em outro arquivo

Um `stats-deploy.yml` próprio, com o ambiente `stats`.

**Motivo da não escolha:** duplica build, verificações e `concurrency` do `deploy-frontend.yml`, e os dois caminhos precisam ser mantidos iguais. A escolha do ambiente por expressão dá o mesmo isolamento em um arquivo só.

### Secrets do repositório, sem ambiente

O cron usaria `CF_API_TOKEN` e `CF_ACCOUNT_ID` como secrets do repositório, sem criar ambiente.

**Motivo da não escolha:** qualquer workflow de qualquer branch passaria a poder ler o token da Cloudflare. O ambiente `stats` só entrega os secrets a jobs da `main`.

### Gerar no build e agendar só um lembrete semanal

Os números mudam em todo deploy normal, e um agendamento semanal dispara o deploy para o criador aprovar com um clique.

**Motivo da não escolha:** não resolve o pedido; entre deploys os números continuam parados, e a aprovação continua manual.

### Worker agendado com KV, sem deploy

Um Worker com _Cron Trigger_ leria a API do GitHub e guardaria os números no KV da Cloudflare, e o site serviria `/stats.json` a partir dele.

**Motivo da não escolha:** o site deixa de ser só arquivos estáticos (hoje é "Worker só de arquivos estáticos", ver `frontend/wrangler.toml`), ganha código de servidor, um recurso novo para manter e outra superfície de falha, e o dado deixa de ir no HTML pré-renderizado. É mais peça do que o problema pede.

### Workflow agendado que abre um pull request

Um cron geraria o `stats.json` e abriria um PR.

**Motivo da não escolha:** a `main` exige PR com CI verde e o deploy continua atrás da aprovação do `production`; seriam duas aprovações para atualizar um arquivo.

### O navegador consulta a API do GitHub direto

A Home buscaria os números em `api.github.com` a cada visita, sem `stats.json`.

**Motivo da não escolha:** o limite é por visitante (60 requisições por hora sem token, e 10 por minuto na busca de PRs e issues), a faixa passa a depender do GitHub estar no ar para cada pessoa, e os números saem do HTML pré-renderizado.

## Consequências

### Positivas

- Os números do site se atualizam sozinhos seis vezes ao dia, sem commit de robô e sem aprovação.
- O `production` mantém a aprovação para qualquer mudança de código, rollback e deploy da API; o ambiente novo só publica o que já está na `main` e só roda a partir dela (workflows agendados rodam só na branch padrão).
- Nenhum token novo: o GitHub é lido com o `GITHUB_TOKEN` do próprio job, e a Cloudflare com o mesmo token de uso exclusivo do site (ADR-0008).
- Sem mudança nos números, o job agendado termina sem publicar, o que evita versões inúteis no Cloudflare e mantém o `wrangler rollback` apontando para uma versão de código.

### Negativas

- O token do site passa a existir em **dois** ambientes (`production` e `stats`), e o do `stats` é usado sem revisor. Mitigação: o token já é de uso exclusivo do site, com o mínimo de permissões (ADR-0008), o ambiente só aceita a `main`, e a `main` só recebe código por PR com CI verde.
- O ambiente escolhido por expressão (`environment` dependente do evento) é um ponto fácil de errar. Por isso a _Validação_ abaixo confere, em um run de cada tipo, qual ambiente foi usado.
- O GitHub pode atrasar execuções agendadas e as desativa em repositório público depois de 60 dias sem atividade. Como os números só mudam com atividade no repositório, o efeito é inofensivo, mas o criador precisa saber que isso pode acontecer.
- O `frontend/public/stats.json` deixa de existir no git: quem quiser a faixa de números no desenvolvimento local roda `npm run stats -- --out public/stats.json`.

## Validação

Em andamento. Serão avaliados, com a data de cada verificação:

- ✅ (2026-10-30) o ambiente `stats` não tem revisor e só aceita a `main`: `gh api repos/msouza10/probekit/environments/stats` mostrou só a regra `branch_policy` (sem `required_reviewers`), e `.../deployment-branch-policies` listou apenas `main`. `gh secret list --env stats` mostrou `CF_API_TOKEN` e `CF_ACCOUNT_ID`;
- um run por `workflow_dispatch` usa o `production` (pede aprovação) e um run agendado usa o `stats` (não pede);
- ✅ parcial (2026-10-31) o caminho "sem mudança": as execuções agendadas de 2026-10-30 22:26 UTC e de 2026-10-31 05:39 UTC terminaram em `success`, com o job `Decide` rodando e os jobs `Build Frontend` e `Deploy Frontend` pulados (`skipped`). O log do `Decide` da segunda mostra `números iguais aos do ar` e `changed=false`. **Falta** ver uma execução agendada que publica quando os números mudam, e com isso o ambiente `stats` em uso (nas duas observadas o deploy foi pulado);
- `https://probekit.cc/stats.json` com `generated_at` do dia do deploy e números iguais aos do repositório;
- um deploy normal e um agendado disparados juntos não rodam em paralelo;
- um push em `frontend/**` com a API do GitHub indisponível (simulado) mantém no ar os números anteriores.

## Referências

- [ADR-0008: deploy do site pelo GitHub Actions](./0008-deploy-do-site-pelo-github-actions.md)
- [Plano dos números automáticos](../superpowers/plans/2026-10-26-probekit-numeros-automaticos.md)
- [Usando ambientes para deploy (GitHub Docs)](https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Eventos que disparam workflows: schedule (GitHub Docs)](https://docs.github.com/actions/using-workflows/events-that-trigger-workflows#schedule)
