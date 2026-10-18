# ADR-0006: Gestão de tasks no GitHub Issues e Projects

## Status
Aceita

## Contexto

A decisão inicial, registrada no `OVERVIEW.md`, era gerir tasks e backlog no Azure Boards, ligado ao repositório. Na prática isso nunca saiu do papel: as tarefas passaram a viver dentro dos planos (`docs/superpowers/plans/`), como caixas de seleção e textos de "pendente". O resultado foi estado desatualizado (caixas sem marcar, pendências já resolvidas) e planos que misturavam design, passo a passo e lista de tarefas.

Restrições: projeto de um operador só, código e CI no GitHub, repositório **público**, e o assistente (Claude Code) precisa conseguir ler e criar itens.

## Decisão

**As tarefas vivem em GitHub Issues, organizadas em um GitHub Project.** O estado (o que falta, quem faz, em que ordem) fica só ali. Specs, ADRs, planos e runbooks não guardam "pendente" nem "feito".

- Uma issue por unidade de trabalho, com título no formato do commit e critérios de aceite verificáveis.
- O PR que resolve a tarefa leva `Closes #N`, e a issue fecha no merge.
- O padrão completo está em [`docs/README.md`](../README.md).
- Issues são públicas (o repositório é público); por isso não carregam segredo nem descrição detalhada de exposição. O Project pode ser mantido privado.

## Alternativas consideradas

### Azure Boards

Work items, quadro e sprints, ligados ao GitHub pela integração oficial.

**Motivo da não escolha:** o ganho (hierarquia formal, capacidade de sprint, relatórios) pesa pouco para um operador só, e o custo é real: duas ferramentas, o ID `AB#` que precisa chegar a cada PR, e o acesso do assistente depender de um MCP que falhou ao conectar. O principal benefício, a privacidade do backlog, é obtido também com um Project privado.

### Só markdown (planos e um roadmap)

**Motivo da não escolha:** é o que já existia e é o que desatualizou. O estado só fica certo se alguém o atualiza à mão.

## Consequências

### Positivas

- Tarefa, branch, PR, CI e merge no mesmo lugar; o PR fecha a issue e o estado se atualiza sozinho.
- O assistente trabalha direto com o `gh`, sem integração extra.
- Planos voltam a ser curtos e descartáveis.

### Negativas

- Issues em repositório público expõem o que está planejado; exige disciplina com o conteúdo (ver `docs/README.md`).
- Menos recursos de planejamento do que o Azure Boards (sem capacidade de sprint nem relatórios de velocidade). Aceitável com um só operador.
- Se o objetivo de aprender Azure DevOps voltar, a migração de poucas dezenas de itens é barata, mas manual.

## Validação

Pendente: o Project e a primeira leva de issues ainda serão criados. Esta seção será atualizada (com a data) quando o fluxo `Closes #N` → issue fechada for verificado em um PR real.

## Referências

- [`docs/README.md`](../README.md)
- [`OVERVIEW.md`](../../OVERVIEW.md), `AGENTS.md`
