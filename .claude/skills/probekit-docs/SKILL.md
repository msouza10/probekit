---
name: probekit-docs
description: Padrão de documentação e de tarefas do Probekit. Use sempre que o pedido for criar ou atualizar qualquer documento (spec, ADR, plano, runbook, README, OVERVIEW, arquitetura), criar, quebrar ou revisar tasks e issues, organizar o backlog ou o GitHub Project, escrever título e descrição de PR, fechar ou reorganizar um plano, ou conferir se a documentação ficou desatualizada depois de uma mudança. Dispare mesmo quando o pedido for informal ("atualiza a doc", "escreve o pr", "cria as tasks disso", "o plano está bagunçado", "registra essa decisão"), sem nomear o tipo de documento.
---

# Documentação e tarefas do Probekit

O padrão completo está em `docs/README.md`. **Leia esse arquivo antes de criar ou editar qualquer coisa**: ele é a fonte da verdade, e esta skill só acrescenta o procedimento. Não copie as regras para outros lugares, porque duas cópias divergem, e foi a divergência que deixou os planos desatualizados.

## A ideia central

O estado das tarefas (o que falta, quem faz, em que ordem) vive **só no GitHub Project e nas issues**. Spec, ADR, plano e runbook explicam; não guardam "pendente" nem "feito". Se você se pegar escrevendo uma pendência dentro de um plano, ela deve virar uma issue.

## Procedimentos

### Escolher o tipo certo

Pergunte o que mudou: o que o produto faz (spec), uma escolha entre alternativas reais (ADR), várias etapas de uma iniciativa (plano), como operar ou consertar (runbook), algo por fazer (issue). A tabela completa está na seção 2 do `docs/README.md`.

### Criar ou quebrar tasks

Escolha o template pela seção 7 do `docs/README.md`: **Epic** (objetivo com várias etapas, um plano), **Task** (cabe em um PR), **Bug** ou **Decision** (termina em ADR). Os campos do Project (Status, Dono, Área, Epic) estão na seção 8.

1. Uma issue por unidade de trabalho, com título `tipo(escopo): resumo`, responsável (`Criador` ou `Assistente`, conforme o `AGENTS.md`), critérios de aceite **verificáveis** em caixas, e link para a spec/ADR/plano em vez de copiar conteúdo. Uma task que não cabe em um PR é um epic: quebre em sub-issues.
2. O repositório é público: nada de segredo, IP, nome de recurso interno nem descrição detalhada de uma exposição aberta (ex.: diga "restringir acessos", não liste quais portas estão abertas ao mundo).
3. **Mostre o rascunho e espere a aprovação antes de rodar `gh issue create`**: issue é pública, fica indexada e é difícil de apagar de verdade. Isso vale também para adicionar ao Project.
4. Respeite a divisão de papéis: Terraform, workflows e o Go escrito como aprendizado são do criador; a task descreve o resultado, não escreve a solução.
5. Para saber quais skills acompanham cada tipo de trabalho, veja a seção 9 do `docs/README.md`.

### Escrever ou atualizar um documento

1. Veja a tabela "Mudou isto, confira aquilo" (seção 5 do `docs/README.md`) e abra **todos** os documentos listados para a mudança, não só o óbvio.
2. ADR aceito **nunca é editado**: crie um novo e marque o antigo como "Substituída por ADR-NNNN". Siga `docs/adr/0000-exemple-adr.md`.
3. Só afirme como feito ou validado o que foi verificado, e escreva a data. Se não deu para verificar, diga isso no texto (ex.: "falta confirmar no painel").
4. Plano: curto, uma iniciativa, aponta para as issues. Ao terminar, banner `> **Status: concluído.** …` e mais nenhuma edição.

### Texto de PR

O **título** é `tipo(escopo): resumo`, igual ao commit principal. O **corpo** é uma lista de itens (`Adiciona…`, `Passa a…`, `Remove…`) no estilo curto dos PRs antigos (`gh pr list --state merged` mostra exemplos), sem repetir a linha do título. Inclua `Closes #N` quando houver issue. Escolha o prefixo pelo efeito na release (`feat` minor, `fix`/`perf` patch, `docs`/`chore`/`ci` nenhuma): corrigir um comportamento errado é `fix`, mesmo que o código seja grande. **A release lê a mensagem de cada commit que toca `backend/api-service-golang/**`, não o título do PR** (o repositório faz merge commit), então o prefixo precisa estar nos commits; ao sugerir mensagens de commit, use o prefixo certo.

### Nome de branch

`tipo/resumo-em-kebab-case`, com o `tipo` do commit principal (`fix/rate-limit-ip-real-cliente`); com issue, inclua o número (`feat/42-origin-region`). Detalhes na seção 3 do `docs/README.md`. Criar a branch é do criador: você só sugere o nome.

### Fechar ou reorganizar um plano

Não reescreva o histórico. Marque o plano antigo como concluído (ou "encerrado, o que sobrou está nas issues"), transforme cada item aberto em issue e, se a iniciativa continuar, comece um plano novo e curto.

## Antes de dizer que terminou

Rode `python3 .claude/skills/probekit-docs/scripts/check_links.py` (confere os links relativos de todos os `.md`; sem argumentos varre o repositório). Depois confirme: `prettier --check` nos `.md` do `frontend/` se tocou neles, nenhum valor de secret, e nenhuma afirmação sem verificação.

## O que não fazer

- Guardar estado ("pendente", "feito", caixas marcadas) em spec, plano ou ADR.
- Editar um ADR aceito.
- Copiar o conteúdo de `docs/README.md` para outro arquivo.
- Criar issue, PR ou item de Project sem mostrar antes o rascunho.
- Fazer commit, push ou criar branch: isso é do criador.
