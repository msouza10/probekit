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

## Code Review Rules

Estas regras valem para a revisão de pull requests (o Codex lê esta seção). O Probekit é um repositório **público**: site em React/Vite publicado no Cloudflare Workers, API em Go em VMs na Oracle Cloud, infraestrutura em Terraform e deploy por GitHub Actions. Escreva os comentários em português do Brasil.

### Como revisar

- Comente só problemas **introduzidos por este PR** e que tenham consequência real. Ignore formatação, lint, tipos e o que os testes e o CI já conferem.
- Cada comentário diz, em poucas linhas: **o que acontece** (o efeito concreto, com o arquivo e a linha), **por que acontece** (o mecanismo) e **como corrigir** (um exemplo curto). Não aponte um problema sem dizer o que fazer.
- Cite a regra desta seção que justifica o comentário.
- Se o PR está correto em algum ponto que merecia dúvida, diga em uma linha e por quê.

### Prioridade

- **P0** (bloqueia o merge): expõe segredo, token, IP ou o detalhe de uma exposição aberta; faz um `apply` do Terraform sem o plano revisado ou fora do ambiente `production`; dá acesso a secrets ou a ambiente protegido a código vindo de um PR de fora.
- **P1** (corrigir antes do merge): comportamento errado em CORS, rate limit por IP real ou TLS; mudança nesses pontos sem teste que exercite o caminho; documento que contradiz o workflow ou o Terraform que descreve; decisão de um ADR aceito reescrita; prefixo de commit que gera a versão errada da release.
- Não comente nada abaixo de P1.

### Repositório público

- Nenhum segredo, token, IP, porta, caminho interno ou descrição detalhada de uma exposição aberta em código, workflow, documento, issue ou PR. Caminho seguro: citar só o **nome** do secret ou da variável e escrever "restringir acessos" em vez de listar o que está aberto. Por quê: o que é publicado pode ficar em cache ou indexado mesmo depois de apagado.

### Terraform e GitHub Actions (`infra/**`, `.github/workflows/**`)

- O `apply` deve aplicar exatamente o plano gerado e revisado pelo `plan`, e rodar no ambiente `production`, que exige um revisor. Caminho seguro: o `plan` guarda o plano, o job do `apply` o recebe e o aplica. Por quê: é isso que garante que o aprovado é o que roda.
- `permissions` do job no mínimo necessário, e secrets só em jobs que rodam na `main`. Gatilhos como `pull_request_target` não podem fazer checkout nem executar código do PR.
- Não crie recurso, abra porta nem alargue regra de rede sem que o PR explique a necessidade.

### API em Go (`backend/api-service-golang/**`)

- Mudança em CORS, em rate limit por IP real ou em TLS precisa de teste que exercite o caminho: origem permitida e bloqueada, IP atrás do proxy, certificado. Por quê: são erros que não quebram o build e só aparecem em produção.
- A release lê a **mensagem de cada commit** que toca esta pasta, não o título do PR. Confira o prefixo (`feat` gera minor; `fix` e `perf`, patch; `docs`, `chore` e `ci`, nenhuma versão). Corrigir um comportamento errado é `fix`, mesmo que o diff seja grande.

### Frontend e artigos (`frontend/**`)

- Texto de artigo, diagrama ou página que descreve a infraestrutura deve bater com o workflow ou o Terraform que a sustenta. Exemplo de erro já cometido: "a cada 3 horas" para um cron que roda seis vezes ao dia, com intervalo de até 9 horas; ou chamar de "automático" um deploy disparado à mão. Caminho seguro: conferir no `.yml` ou no `.tf` e escrever só o que ele diz.
- Nenhum valor de URL, chave ou token embutido no código do site. Chamadas a serviços externos devem ir pela API do Probekit, não direto do navegador, quando exigirem credencial ou tiverem limite de uso.

### Documentação (`docs/**`)

- Spec, ADR, plano e runbook explicam; **não guardam estado**. Apontar "pendente", "feito" ou caixas marcadas nesses arquivos: o estado vive na issue e no GitHub Project.
- Não edite a **decisão** de um ADR aceito (Contexto, Decisão, Alternativas). Só _Status_ e _Validação_ mudam, **com data**; uma decisão nova é um ADR novo.
- "Verificado" ou "validado" exige data e a evidência. Sem isso, o texto deve dizer que falta confirmar.

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
