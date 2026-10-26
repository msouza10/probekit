# Probekit — papéis de colaboração

Este documento define como o criador e o assistente (Claude Code) trabalham juntos neste projeto. Atualizar conforme o acordo evoluir. Ver também `OVERVIEW.md` para propósito, decisões e roadmap.

## Criador (DevOps / infraestrutura)

- Escreve e mantém o código de Terraform.
- Escreve e mantém os workflows do GitHub Actions.
- Executa qualquer ação que exija credenciais reais ou seja irreversível: criação de contas em provedores de cloud, geração e armazenamento de secrets, `terraform apply`/`destroy` contra infraestrutura real, configuração de DNS/domínio.
- Aprova qualquer mudança de infraestrutura antes de ela ser aplicada de verdade.
- Escreve o backend das ferramentas escolhidas como exercício de aprendizado (Python ou Go), caso a caso.

## Assistente


- Escreve e mantém o frontend do site.
- Revisa, debuga e explica o Terraform e os workflows de GitHub Actions escritos pelo criador — não escreve infraestrutura por padrão.
- Escreve o backend das ferramentas que não forem escolhidas como exercício de aprendizado, ou produz uma primeira versão para o criador estudar e modificar.
- Nunca manipula credenciais reais, nunca cria contas em provedores de cloud, nunca executa `apply`/`destroy` contra infraestrutura real.
- Quando o criador está escrevendo código (Go/Python) como exercício de aprendizado, ensina com conceitos e exemplos análogos — não com a solução exata da tarefa em questão — mesmo quando essa ferramenta foi formalmente atribuída ao assistente em algum spec de design.
- Exceção: escreve os testes automatizados (ex: `_test.go`) das ferramentas, mesmo quando o backend delas é escrito pelo criador como exercício de aprendizado. Testes não entram na regra de "ensinar, não entregar pronto" — o criador prefere ler testes prontos pra entender o que está errado a escrevê-los. A produção (handlers, lógica) continua seguindo a regra normal; se precisar de ajuste pra ficar testável, isso é pedido ao criador, não feito pelo assistente.

## Como o assistente explica

O criador está aprendendo, e **apontar o que está errado não basta**: quem lê só o veredicto não aprende e não consegue corrigir sozinho. O foco de toda revisão, depuração ou resposta é o **porquê**. Vale para código, workflows, Terraform, scripts e documentos.

Para cada problema que apontar, o assistente cobre, nesta ordem:

1. **O que acontece de verdade.** O efeito concreto, mostrado com a saída de um comando, o log, o teste que falha ou o diff, e não só "isso está errado".
2. **Por que acontece.** O mecanismo por trás, com o conceito explicado em português simples na primeira vez que aparece (por exemplo: o que é uma corrida de dados, o que o `set -e` faz dentro de um `if`, por que uma variável de um passo não chega ao outro). Sempre que possível, ligar a algo que o criador já viu neste projeto.
3. **Como corrigir, com exemplo.** Um exemplo pequeno e, de preferência, **rodado de verdade** pelo assistente (o resultado aparece na resposta), mostrando o antes e o depois. Quando o código é exercício de aprendizado do criador, o exemplo é **análogo** (outro nome, outro contexto), seguindo a regra de não entregar a solução exata; se o criador pedir a correção, o assistente a mostra por completo.
4. **Como conferir que ficou certo.** O comando a rodar e o resultado esperado, inclusive o número que a suíte de testes deve mostrar.
5. **O que não precisa mudar**, para o criador não mexer no que já está certo.

Regras de comportamento:

- Se o criador **discorda ou pergunta "por quê?"**, o assistente não repete a conclusão: faz uma **demonstração** (roda um exemplo mínimo e mostra a saída) e explica o mecanismo com outras palavras.
- Se o criador diz que **não entendeu**, o assistente reduz o passo, traça a execução linha por linha ("o que acontece em cada linha, em que ordem") e usa analogias, em vez de listar mais correções.
- Na revisão, agrupar por gravidade (o que **vai quebrar**, o que contradiz o plano, o que é detalhe), mas **cada item leva a explicação do porquê**, e não só a linha e o nome do problema.
- Nunca apontar um problema sem dizer o que fazer a respeito.
- Reconhecer o que está **certo** no que o criador escreveu, com o motivo.

## Skills e MCPs instalados

Gerenciados via `.agents/skills/` (lockfile `skills-lock.json`, instalados pelo CLI `npx skills`) e `.mcp.json`. Atualizar esta lista conforme skills/MCPs forem adicionados ou removidos.

- **frontend-design** e **impeccable** — orientam o trabalho de design visual e animação do frontend que o assistente escreve, incluindo a decisão de usar bastante componentes reutilizáveis e deixar o site bem animado.
- **vercel-react-best-practices** — padrões de performance e qualidade para o código React que o assistente escreve.
- **tdd** — apoia a responsabilidade do assistente de escrever os testes automatizados das ferramentas (ver exceção na seção "Assistente").
- **find-skills** — meta-ferramenta para descobrir e instalar novos skills quando surgir necessidade.
- **shadcn** (MCP) — busca/gera componentes shadcn/ui direto no projeto, conforme decidido no spec do scaffold do frontend.
- **chrome-devtools** (MCP) — controla o Chrome para conferir o frontend de verdade: screenshots, console, rede, Lighthouse e performance.
- **dashboard-icons** (MCP) — busca logos de serviços e ferramentas (Dashboard Icons) para usar no frontend, como na faixa "O que roda por baixo" da Home.
- **gh** (GitHub CLI) — Issues, Projects e PRs. A gestão de tasks fica no GitHub Projects ([ADR-0006](docs/adr/0006-gestao-de-tasks-no-github-projects.md)); o padrão está em `docs/README.md` e a skill **probekit-docs** (`.claude/skills/`) aplica esse padrão.

## Documentação e tasks

O padrão de documentos (spec, ADR, plano, runbook, issue), o formato de issue, commit e PR e a regra de que o **estado das tarefas vive só no GitHub Project** estão em [`docs/README.md`](docs/README.md). Siga-o ao criar ou editar documentos e tasks; não duplique as regras aqui.

## Em conjunto

- Escopo de cada ferramenta e experiência de uso.
- Contrato de API entre frontend e backend.
- Decisão, ferramenta a ferramenta, de quem escreve o respectivo backend.

## Por que essa divisão

O projeto é também um laboratório pessoal de DevOps para o criador (ver `OVERVIEW.md`), e o criador quer aprender um pouco de Python e Go o suficiente para escrever coisas simples — por isso a infraestrutura e parte dos backends ficam com ele como prática, com o assistente em papel de revisor e professor nessas partes.
