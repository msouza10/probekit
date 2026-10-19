# Documentação do Probekit: o que é cada coisa

Este arquivo é a **fonte da verdade** do padrão de documentação e de tarefas. Quem escreve (o criador, o assistente ou um check de CI) segue as regras daqui. Outros arquivos, como o `AGENTS.md` e a skill `probekit-docs`, apontam para cá em vez de copiar.

> O repositório é **público**. Nada de valor de secret, chave, IP de recurso, nome de recurso interno ou descrição detalhada de uma exposição aberta em documento, issue, comentário ou PR. Secrets aparecem só pelo **nome**.

## 1. Regra de ouro

**O estado vive em um só lugar: o GitHub Project do Probekit.** O que falta, quem faz e em que ordem estão nas issues e no quadro. Spec, ADR, plano e runbook explicam e instruem, mas **não guardam "pendente", "feito" ou "em andamento"**.

O motivo: estado escrito em markdown só fica certo se alguém o atualizar à mão, e é isso que desatualiza. Uma issue fecha sozinha quando o PR que a resolve é mergeado.

## 2. Os tipos

| Tipo | Responde | Onde fica | Vida útil |
|---|---|---|---|
| **README / OVERVIEW** | O que é o projeto, como rodar, qual o rumo | raiz | viva |
| **Spec** | O que vamos construir e por quê (design de uma funcionalidade) | `docs/superpowers/specs/AAAA-MM-DD-nome.md` | longa, muda pouco |
| **ADR** | Qual decisão foi tomada, com as alternativas | `docs/adr/NNNN-nome.md` | **imutável** depois de aceita |
| **Plano** | Passo a passo de **uma** iniciativa | `docs/superpowers/plans/AAAA-MM-DD-nome.md` | curta; ao terminar vira "concluído" e não se edita mais |
| **Arquitetura** | Como as peças se encaixam hoje | `docs/architecture/` | viva |
| **Runbook** | Como operar, publicar e diagnosticar | `docs/runbook-*.md` | viva, atualizada com o sistema |
| **Issue** | Uma unidade de trabalho | GitHub Issues | até o PR fechar |
| **Project** | O estado e a ordem das issues | GitHub Projects | vivo |

### Como escolher

- Mudou **o que o produto faz** → spec.
- Escolheu entre **alternativas reais** (e quer lembrar o porquê) → ADR.
- Vai executar **várias etapas** de uma iniciativa → plano.
- Descobriu **como operar ou consertar** algo → runbook.
- Algo **está por fazer** → issue.

## 3. Padrões

### Issue

Os quatro tipos de issue, os campos de cada um e como usá-los estão na [seção 7](#7-issues-e-templates). Regras comuns:

- **Título** no formato do commit: `tipo(escopo): resumo` (ex.: `feat(api): devolve origin_region nas respostas`).
- **Responsável pelo trabalho:** `Criador` ou `Assistente`, conforme o `AGENTS.md`.
- **Critérios de aceite** em caixas e **verificáveis** ("o log da VM mostra N faixas carregadas", não "funciona bem").
- **Contexto:** link para a spec, ADR ou plano relevante. Não copie o conteúdo.
- Sem segredo e sem detalhe de exposição (repositório público).

### ADR

Segue o modelo de [`adr/0000-exemple-adr.md`](./adr/0000-exemple-adr.md): Status, Contexto, Decisão, Alternativas consideradas (com o motivo da não escolha), Consequências (positivas e negativas) e Validação.

- Numeração sequencial. **A decisão de um ADR aceito não se edita**: *Contexto*, *Decisão* e *Alternativas* ficam como foram escritos. Se a decisão mudar, crie um novo ADR e marque o antigo como "Substituída por ADR-NNNN".
- O ADR registra a decisão **e a sua implementação**: as seções *Status* e *Validação* podem ser atualizadas, sempre com a data, conforme a decisão é implementada e verificada (por exemplo, "Pendente" vira o resultado de um teste em produção).
- Só registre como validado o que foi **de fato verificado**, com a data.
- Uma issue *Decision* termina quando o ADR é aceito; a implementação é feita pelas tasks do plano, e o ADR recebe a *Validação* quando elas terminam.

### Plano

- Um plano por **epic**, pequeno, com objetivo, passos e critérios verificáveis. Escreva-o com `superpowers:writing-plans`.
- **O plano vem primeiro.** Cada *Task* do plano vira uma sub-issue do epic; as tasks são derivadas do plano, não inventadas à parte.
- O estado oficial de uma task está na **issue**. As caixas de passo dentro de uma Task do plano são o roteiro de quem executa, sem valor como estado do projeto.
- O epic fecha quando todas as sub-issues fecham. Aí o plano recebe o banner `> **Status: concluído.** <o que foi entregue, PRs>` e fica como registro, sem mais edições.
- O que sobrar vira issue, não "pendente" dentro do plano.

### Runbook

Escrito para quem está com o problema na mão: comando, resultado esperado e o que fazer quando não bate. Atualize junto com a mudança que o torna desatualizado.

### Commit e PR

- Commit em formato convencional, que decide a release da API:

| Prefixo | Quando | Release da API |
|---|---|---|
| `feat:` | funcionalidade nova para quem usa | minor |
| `fix:` / `perf:` | corrige comportamento errado / desempenho | patch |
| `docs:` / `chore:` / `ci:` | sem efeito no binário | nenhuma |
| `!:` ou `BREAKING CHANGE:` | quebra de contrato | major |

- **O prefixo que vale é o da mensagem de cada commit**, não o título do PR. O repositório faz *merge commit*, e o `calculate-version.sh` lê as mensagens dos commits que alteram `backend/api-service-golang/**`. Um commit `fix:` ali gera patch; um PR com título `fix:` e commits sem prefixo **não gera release**.
- Commits que não tocam `backend/api-service-golang/` (docs, frontend, infra, workflows) não geram release, qualquer que seja o prefixo.
- **Título do PR:** `tipo(escopo): resumo`, igual ao commit principal (ex.: `fix(api): usa o IP real do cliente no rate limit`). Ele não decide a release, mas é o que aparece na lista de PRs e no merge commit.
- **Corpo do PR**, no estilo curto do projeto: uma lista de itens (`Adiciona…`, `Passa a…`, `Remove…`) e `Closes #N` para a issue fechar no merge. A linha no formato do commit fica só no título, sem repetir.

### Branch

- Formato `tipo/resumo-em-kebab-case`, com o mesmo `tipo` do commit principal: `feat/api-go-cors`, `fix/rate-limit-ip-real-cliente`, `docs/update-all`.
- Quando houver issue, inclua o número: `feat/42-origin-region`. Ajuda a achar a issue a partir do branch.
- Uma branch por task (ou por PR), criada a partir da `main` atualizada. Depois do merge, a branch não é reaproveitada.
- Criar branch, commitar e abrir o PR é do criador (ver `AGENTS.md`); o assistente sugere o nome e escreve o texto.

### Proteção da `main`

Um ruleset do GitHub (*Settings → Rules → Rulesets*, nome `protection-main`) protege a `main`:

- Só entra código por **pull request**; push direto, force push e exclusão da branch são bloqueados.
- O PR só mergeia com os checks do workflow `CI Test` verdes: **`Go`**, **`NPM`** e **`Terraform`** (a regra usa o nome do job; na aba Checks aparecem como `CI Test / Go`). Quem renomear um job precisa atualizar a regra.
- O único método de merge é o **merge commit**: o `calculate-version.sh` lê a mensagem de cada commit, e squash ou rebase quebrariam o cálculo da versão.
- Aprovações obrigatórias: **0**, porque há um só operador e o GitHub não deixa aprovar o próprio PR.
- O administrador do repositório pode contornar a regra **só por pull request** (nunca com push direto), para não ficar trancado se o CI quebrar por motivo externo. Decisão de 2026-10-19.
- Os jobs do CI **sempre rodam** (o workflow não filtra por caminho): um check obrigatório que não roda deixa o PR pendente para sempre.

## 4. Ciclo de uma mudança

```
ideia → issue no Project
        └─ precisa de design?  → spec / ADR / plano (apontando para a issue)
branch → código + testes → PR (Closes #N) → merge
        └─ a issue fecha sozinha; o Project reflete o estado
        └─ atualize os documentos afetados (seção 5)
```

## 5. Mudou isto, confira aquilo

| Mudança | Verifique |
|---|---|
| Variável de ambiente nova | tabela do `README.md`, `frontend/README.md` (se for do site), runbook, `infra/shellscript/deploy-api-go.sh` |
| Decisão com alternativas | ADR novo (nunca edite um aceito) |
| Contrato da API (rotas, campos) | spec do ping/DNS, `frontend/README.md`, `frontend/src/lib/api.ts` |
| Operação ou diagnóstico novo | runbook |
| Fluxo ou componente novo | `docs/architecture/arch.md` |
| Pendência nova ou resolvida | **issue e Project**, não o plano |
| Iniciativa terminada | banner "concluído" no plano; nada mais |

## 6. Antes de fechar uma mudança de documentação

- Links relativos entre os `.md` conferem.
- `prettier --check` nos `.md` do `frontend/`.
- Nenhum valor de secret, chave, IP ou nome interno de recurso.
- Nada afirmado como feito ou verificado sem ter sido (inclusive datas).

## 7. Issues e templates

O trabalho se organiza em três níveis. Os nomes dos templates são em inglês (são os nomes que o GitHub mostra ao abrir uma issue); o conteúdo e os campos são em português.

```
Epic  (issue "pai") ── tem um Plano real
  ├─ Task  (sub-issue = uma Task do plano; vira um PR com "Closes #N")
  ├─ Task
  └─ Bug / Decision (quando surgirem; a Decision termina em um ADR)
```

**Ordem:** primeiro o epic e o plano, depois as tasks (derivadas do plano). Uma issue de task sem Task correspondente no plano é sinal de que o plano está incompleto ou de que ela é um bug.

| Template | Quando usar | Termina quando | Arquivo |
|---|---|---|---|
| **Epic** | Um objetivo com várias etapas (ex.: "Pipeline de CI/CD") | todas as sub-issues fecharem e os critérios de conclusão estiverem marcados | `.github/ISSUE_TEMPLATE/epic.yml` |
| **Task** | Uma entrega verificável que cabe em um PR | o PR com `Closes #N` é mergeado | `.github/ISSUE_TEMPLATE/task.yml` |
| **Bug** | Algo que deveria funcionar e não funciona | o PR de correção é mergeado | `.github/ISSUE_TEMPLATE/bug.yml` |
| **Decision** | Uma escolha entre alternativas ainda não tomada | o ADR é aceito (a implementação vira task) | `.github/ISSUE_TEMPLATE/decision.yml` |

- O epic aponta para o **plano**; as tasks apontam para o epic, a spec ou o ADR. Ninguém copia o conteúdo do outro.
- Quebre um epic em tasks que caibam em **um PR**. Se uma task não cabe, ela é um epic.
- O **PR** usa `.github/pull_request_template.md`: linha no formato do commit, lista de itens e `Closes #N`.
- Issue em branco está desligada (`config.yml`): toda issue nasce de um dos quatro templates.
- Bug de **segurança** não vira issue pública: avise o criador diretamente.

## 8. GitHub Project

O Project é o único lugar do estado (seção 1). Ele não repete as regras daqui; a descrição dele só aponta para este arquivo.

**Rascunhos antes de issues.** Para validar um desenho sem publicar nada, os itens nascem como *draft items* do Project (privados, não são issues). Só depois da validação eles são convertidos em issues, o que as torna públicas. O script `.claude/skills/probekit-docs/scripts/project_sync.py` sincroniza um inventário (JSON) com esses rascunhos; o inventário é o planejamento e **fica fora do repositório**.

**Trabalho concluído também é registrado**, com Status *Concluída*, apontando para o PR, a release, o ADR e a evidência da verificação. O epic do primeiro deploy (E0) foi registrado assim, a partir do plano `2026-10-09-probekit-first-deploy.md`.

**Campos:**

| Campo | Valores | Observação |
|---|---|---|
| Status | Backlog · Pronta · Em andamento · Em revisão · Concluída | |
| Dono | Criador · Assistente | o mesmo do formulário |
| Área | api · frontend · infra · pipeline · docs | o mesmo do formulário |
| Epic | campo nativo *Parent issue* | agrupa as tasks |

Os campos *Dono* e *Área* existem no formulário (ficam no corpo da issue) e no Project (viram filtros). O Project não os lê do formulário: quem cria a issue também preenche os campos, e o assistente faz isso pelo `gh project item-edit` quando cria itens.

**Visões:**

| Visão | Layout | Para quê |
|---|---|---|
| Quadro | colunas por Status | o dia a dia |
| Por epic | tabela agrupada por *Parent issue* | o panorama e o progresso |
| Meu trabalho | tabela filtrada por Dono | o que é meu agora |

**Automações nativas do Project** (sem workflow nosso): adicionar issue nova ao Project, mover para *Concluída* quando a issue fechar, e fechar a issue quando o PR é mergeado (via `Closes #N`).

**Quem faz o quê:** criar o Project, os campos e liberar o escopo do `gh` (`gh auth refresh -s project`) é do criador (conta e permissões). Depois disso o assistente cria e atualiza itens, **mostrando o rascunho antes** de criar.

## 9. Skills por tipo de trabalho

Cada tipo de trabalho tem as skills que valem usar. A divisão de papéis (quem escreve o quê) continua a do `AGENTS.md`.

| Trabalho | Skills |
|---|---|
| Ideia nova, ainda sem forma | `superpowers:brainstorming`, depois spec com `probekit-docs` |
| Transformar em plano | `superpowers:writing-plans`, com `probekit-docs` |
| Executar um plano | `superpowers:executing-plans` |
| Go (o criador escreve, como aprendizado) | o assistente ensina por passos pequenos; os testes saem com a `tdd` (projeto) ou `superpowers:test-driven-development` |
| Frontend | `frontend-design`, `impeccable`, `vercel-react-best-practices`, `tdd` |
| Deploy do site | `wrangler` |
| Terraform (o criador escreve, o assistente revisa) | `terraform-style-guide`, `terraform-test`, `oci` |
| Workflows do GitHub Actions (idem) | `github-actions-hardening`, `github-actions-efficiency` |
| Bug | `superpowers:systematic-debugging` |
| Revisar o que foi feito | `superpowers:requesting-code-review` |
| Antes de dar como pronto | `superpowers:verification-before-completion`: rodar de fato testes, build e a checagem de links |
| Terminar a branch | `superpowers:finishing-a-development-branch` (o criador faz o commit, o push e o PR) |
| Issue, ADR, plano, runbook, texto de PR | `probekit-docs` |

Regra prática: **comece pela skill do tipo de trabalho**, e passe por `probekit-docs` ao registrar o resultado.
