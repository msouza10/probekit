---
name: probekit-docs
description: Padrão de documentação e de tarefas do Probekit. Use sempre que o pedido for criar ou atualizar qualquer documento (spec, ADR, plano, runbook, README, OVERVIEW, arquitetura), criar, quebrar ou revisar tasks e issues, organizar o backlog ou o GitHub Project, escrever título e descrição de PR, fechar ou reorganizar um plano, ou conferir se a documentação ficou desatualizada depois de uma mudança. Dispare mesmo quando o pedido for informal ("atualiza a doc", "escreve o pr", "cria as tasks disso", "o plano está bagunçado", "registra essa decisão"), sem nomear o tipo de documento.
---

# Documentação e tarefas do Probekit

O padrão completo está em `docs/README.md`. **Leia esse arquivo antes de criar ou editar qualquer coisa**: ele é a fonte da verdade, e esta skill só acrescenta o procedimento. Não copie as regras para outros lugares, porque duas cópias divergem, e foi a divergência que deixou os planos desatualizados.

## A ideia central

O estado das tarefas (o que falta, quem faz, em que ordem) vive **só no GitHub Project e nas issues**. Spec, ADR, plano e runbook explicam; não guardam "pendente" nem "feito". Se você se pegar escrevendo uma pendência dentro de um plano, ela deve virar uma issue.

## A ordem do trabalho: plano primeiro

Um **epic** nasce com um **plano real**, e as **tasks são as Tasks desse plano** (cada uma vira uma sub-issue). Nunca invente tasks de cima para baixo e depois procure um plano para elas. Uma **Decision** termina em um **ADR**, e o ADR passa a registrar também a implementação (Status e Validação, com data). Quando o último task do plano fecha, o epic fecha e o plano ganha o banner de concluído.

## Procedimentos

### Escolher o tipo certo

Pergunte o que mudou: o que o produto faz (spec), uma escolha entre alternativas reais (ADR), várias etapas de uma iniciativa (plano), como operar ou consertar (runbook), algo por fazer (issue). A tabela completa está na seção 2 do `docs/README.md`.

### Criar ou quebrar tasks

Escolha o template pela seção 7 do `docs/README.md`: **Epic** (objetivo com várias etapas, um plano), **Task** (cabe em um PR), **Bug** ou **Decision** (termina em ADR). Os campos do Project (Status, Dono, Área, Epic) estão na seção 8.

1. Uma issue por unidade de trabalho, com título `tipo(escopo): resumo`, responsável (`Criador` ou `Assistente`, conforme o `AGENTS.md`), critérios de aceite **verificáveis** em caixas, e link para a spec/ADR/plano em vez de copiar conteúdo. Uma task que não cabe em um PR é um epic: ela precisa de um plano, e as sub-issues saem das Tasks desse plano. Se o epic ainda não tem plano, escreva o plano primeiro (`superpowers:writing-plans`).
2. O repositório é público: nada de segredo, IP, nome de recurso interno nem descrição detalhada de uma exposição aberta (ex.: diga "restringir acessos", não liste quais portas estão abertas ao mundo).
3. **Mostre o rascunho e espere a aprovação antes de rodar `gh issue create`**: issue é pública, fica indexada e é difícil de apagar de verdade. Para validar um desenho com o criador, crie primeiro **rascunhos no Project** (privados; veja "Sincronizar o Project" abaixo) e só converta em issues depois da validação e depois de os templates estarem na `main`.
4. Respeite a divisão de papéis: Terraform, workflows e o Go escrito como aprendizado são do criador; a task descreve o resultado, não escreve a solução.
5. Para saber quais skills acompanham cada tipo de trabalho, veja a seção 9 do `docs/README.md`.

### Escrever ou atualizar um documento

1. Veja a tabela "Mudou isto, confira aquilo" (seção 5 do `docs/README.md`) e abra **todos** os documentos listados para a mudança, não só o óbvio.
2. A **decisão** de um ADR aceito não é editada (Contexto, Decisão e Alternativas ficam como foram escritos): se mudar, crie um novo ADR e marque o antigo como "Substituída por ADR-NNNN". *Status* e *Validação* podem ser atualizados, **com a data**, quando a decisão é implementada e verificada. Siga `docs/adr/0000-exemple-adr.md`.
3. Só afirme como feito ou validado o que foi verificado, e escreva a data. Se não deu para verificar, diga isso no texto (ex.: "falta confirmar no painel").
4. Plano: curto, uma iniciativa, aponta para as issues. Ao terminar, banner `> **Status: concluído.** …` e mais nenhuma edição.

### Texto de PR

O **título** é `tipo(escopo): resumo`, igual ao commit principal. O **corpo** é uma lista de itens (`Adiciona…`, `Passa a…`, `Remove…`) no estilo curto dos PRs antigos (`gh pr list --state merged` mostra exemplos), sem repetir a linha do título. Inclua `Closes #N` quando houver issue. Escolha o prefixo pelo efeito na release (`feat` minor, `fix`/`perf` patch, `docs`/`chore`/`ci` nenhuma): corrigir um comportamento errado é `fix`, mesmo que o código seja grande. **A release lê a mensagem de cada commit que toca `backend/api-service-golang/**`, não o título do PR** (o repositório faz merge commit), então o prefixo precisa estar nos commits; ao sugerir mensagens de commit, use o prefixo certo.

### Nome de branch

`tipo/resumo-em-kebab-case`, com o `tipo` do commit principal (`fix/rate-limit-ip-real-cliente`); com issue, inclua o número (`feat/42-origin-region`). Detalhes na seção 3 do `docs/README.md`. Criar a branch é do criador: você só sugere o nome.

### Fechar ou reorganizar um plano

Não reescreva o histórico. Marque o plano antigo como concluído (ou "encerrado, o que sobrou está nas issues"), transforme cada item aberto em issue e, se a iniciativa continuar, comece um plano novo e curto.

### Registrar o que já foi feito

Trabalho entregue também entra no Project, com Status *Concluída*, para o histórico não se perder. Para cada Task concluída de um plano, um item que aponta para o **PR**, a **release**, o **ADR** e a **evidência da verificação** (data e resultado). Só registre como verificado o que foi verificado. O epic E0 (primeiro deploy) foi feito assim, a partir de `docs/superpowers/plans/2026-10-09-probekit-first-deploy.md`.

### Sincronizar o Project (rascunhos)

O planejamento (os cartões) é **privado** e não vai para este repositório público. Ele vive num arquivo de inventário JSON **fora do repositório** (por exemplo no scratchpad da sessão), e o script faz o Project ficar igual a ele:

```bash
python3 .claude/skills/probekit-docs/scripts/project_sync.py \
  --owner msouza10 --project 5 --inventory <inventario.json> --dry-run   # veja antes
python3 .claude/skills/probekit-docs/scripts/project_sync.py \
  --owner msouza10 --project 5 --inventory <inventario.json>             # aplique
```

O script é idempotente (sem diferença, não faz nada), cria só rascunhos, nunca apaga itens ou campos, não cria issues e não altera as opções do *Status*. O formato do inventário está no cabeçalho do próprio script. Sempre rode com `--dry-run` primeiro e mostre as ações ao criador. Os campos do Project estão na seção 8 do `docs/README.md`.

## Antes de dizer que terminou

Rode `python3 .claude/skills/probekit-docs/scripts/check_links.py` (confere os links relativos de todos os `.md`; sem argumentos varre o repositório). Depois confirme: `prettier --check` nos `.md` do `frontend/` se tocou neles, nenhum valor de secret, e nenhuma afirmação sem verificação.

## O que não fazer

- Guardar estado ("pendente", "feito", caixas marcadas) em spec, plano ou ADR.
- Reescrever a decisão de um ADR aceito (só *Status* e *Validação* se atualizam, com a data).
- Criar tasks de um epic antes de existir o plano dele.
- Colocar o planejamento (inventário, cartões) neste repositório público.
- Copiar o conteúdo de `docs/README.md` para outro arquivo.
- Criar issue, PR ou item de Project sem mostrar antes o rascunho.
- Fazer commit, push ou criar branch: isso é do criador.
