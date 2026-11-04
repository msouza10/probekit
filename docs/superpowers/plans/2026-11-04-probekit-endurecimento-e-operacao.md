# Endurecimento e operação — plano

> **Para quem for executar:** task por task. Os passos usam caixas (`- [ ]`) como roteiro; o estado oficial de cada task está na issue e no GitHub Project. Terraform e operação na OCI são do **criador**; o assistente revisa e atualiza os documentos. Commit, push e PR são do criador.

**Goal:** reduzir a superfície de acesso da API, provar que uma VM fora do ar não derruba o serviço e deixar a operação do certificado documentada.

**Contexto:** o [plano do primeiro deploy](./2026-10-09-probekit-first-deploy.md) entregou a API no ar e deixou estas pendências para o Project. As duas VMs ficam no mesmo availability domain, sem fault domain definido; as regras de entrada da rede são mais largas do que o [ADR-0002](../../adr/0002-terminacao-tls-cloudflare-full-strict.md) prevê; o modo Full (strict) da Cloudflare nunca foi confirmado no painel; e nenhuma VM foi derrubada para provar a alta disponibilidade.

**Restrições globais:** o repositório é público: nenhum IP, segredo, certificado ou o detalhe de quais regras estavam abertas aparece em issue, comentário ou documento. Toda mudança de rede ou de instância passa por `terraform plan` revisado e é aplicada pelo _Deploy_.

**Ordem:** primeiro as verificações (Tasks 1 a 3), que não mexem na infraestrutura; depois as mudanças (Tasks 4 e 5).

### Task 1: Confirmar o modo Full (strict) da Cloudflare

**Resultado esperado:** o painel mostra Full (strict), `https://api.probekit.cc/` responde 200 e o runbook registra a confirmação com a data. Destrava a Task 4.

- [ ] **Step 1 (criador):** conferir _SSL/TLS → Overview_ no painel; se não estiver em Full (strict), alterar e rodar `curl -sS -o /dev/null -w "%{http_code}\n" https://api.probekit.cc/` (esperado: 200; um 526 indica hostname fora da lista do certificado ou certificado vencido).
- [ ] **Step 2 (assistente):** registrar a confirmação, com a data, em `docs/runbook-deploy.md` (seção do painel da Cloudflare).

### Task 2: Derrubar uma VM e confirmar que o NLB continua respondendo

**Resultado esperado:** evidência de que a API segue respondendo com uma VM fora do ar, e de quanto dura a janela de falha. O health check do NLB é TCP na 443 a cada 10 s; um backend leva cerca de 30 s para ser marcado _Critical_. Esse check não detecta uma API que escuta e responde errado.

- [ ] **Step 1 (criador):** base: 60 chamadas a `https://api.probekit.cc/` em laço, todas 200.
- [ ] **Step 2 (criador):** variante A (serviço parado em uma VM) e variante B (VM desligada no portal); em cada uma, o mesmo laço, contando as respostas que falham e por quanto tempo. Religar, esperar o backend voltar a _OK_ e repetir com a outra VM. Fazer fora de horário de uso e sem coincidir com uma release.
- [ ] **Step 3 (assistente):** registrar resultado, duração da janela e data em `docs/runbook-deploy.md`.

### Task 3: Validade e renovação do certificado Origin CA

**Resultado esperado:** o runbook diz até quando o certificado vale e quando renovar, com lembrete antes do vencimento. Um certificado vencido derruba a API com erro 526.

- [ ] **Step 1 (criador):** ler **só a data de validade** do certificado instalado na VM (nunca o conteúdo) e criar um lembrete com antecedência.
- [ ] **Step 2 (assistente):** registrar a data no runbook (seções 3.1 e 6) e revisar o procedimento de troca, anotando o que precisa mudar (por exemplo, o restart manual depois de trocar o par).

### Task 4: Restringir os acessos de rede ao necessário

**Depende da Task 1.**

**Resultado esperado:** as regras de rede só permitem o tráfego necessário e a API continua respondendo por `api.probekit.cc`. O NLB preserva o IP de origem, então uma regra na security list funciona. O health check do NLB precisa continuar permitido, e o acesso por SSH do _Deploy_ pode ser afetado: se restringir quebrar o workflow, abra uma **decision** antes de mexer.

- [ ] **Step 1 (criador):** definir o modelo de acesso (e abrir a decision se o SSH do _Deploy_ for afetado).
- [ ] **Step 2 (criador):** alterar o Terraform com as faixas vindas de variável ou _data source_, não coladas à mão; `terraform plan` revisado pelo assistente antes do apply.
- [ ] **Step 3 (criador):** conferir `https://api.probekit.cc/` → 200, os dois backends _OK_ no portal e que a conexão direta ao endereço do NLB deixou de responder. Manter o console da OCI aberto para reverter: a security list é da subnet e afeta as duas VMs de uma vez.

### Task 5: Distribuir as instâncias em fault domains distintos

**Resultado esperado:** as duas VMs ficam em fault domains diferentes, para uma manutenção ou falha de hardware não derrubar as duas. O shape é o do free tier; confirmar que ele aceita a escolha de fault domain.

- [ ] **Step 1 (criador):** definir o fault domain por instância e ver no `terraform plan` se a mudança **recria** a VM (muda o IP público e perde certificado e serviço instalados pelo _Deploy_).
- [ ] **Step 2 (criador):** se recriar, uma VM por vez, para o NLB manter ao menos um backend, e rodar o _Deploy_ em seguida; durante a troca, `curl` em laço contando as falhas.
- [ ] **Step 3 (criador):** conferir no portal que os fault domains diferem e que os dois backends estão _OK_.

### Fechamento

- [ ] **Step 1 (assistente):** quando a última task fechar, banner `> **Status: concluído.** …` neste plano e mais nenhuma edição.
