# ADR-0012: Coletor de descontos como Container Apps Job

## Status

Proposta (2026-11-24). A escolha é do criador, feita na conversa de 2026-11-24; o status passa a Aceita quando ele revisar este texto. Contexto e desenho no [spec dos descontos de certificações](../superpowers/specs/2026-11-24-probekit-descontos-certificacoes-design.md). O que falta confirmar está em _Validação_.

## Contexto

A página de descontos precisa de um coletor que, de hora em hora, leia feeds públicos, filtre, peça a um LLM os dados da promoção e grave o resultado. O Probekit não tem uma máquina disponível para rodar um serviço ligado o tempo todo, e a infraestrutura tem de caber no free tier.

O que o coletor é, medido em 2026-11-24 com um script descartável (41 feeds do catálogo do VoucherBot, um GET por feed, `robots.txt` respeitado, 2 s entre requisições ao mesmo servidor, Python 3.14 num ambiente isolado, com as bibliotecas do coletor carregadas):

- 38 feeds responderam, 2 deram HTTP 404 e 1 veio sem itens. Nenhum foi barrado pelo `robots.txt`.
- A coleta levou de 78 a 81 s, e o pico de memória foi de 144 a 145 MB.
- Dos 840 itens lidos, 338 passam no filtro de palavras-chave do VoucherBot (corte 1), mas só 44 foram publicados nas últimas 24 h. O filtro é frouxo (as palavras `exam` e `certification` valem 1 ponto sozinhas), então o LLM é quem classifica de verdade.

Em outras palavras, é uma tarefa que começa, trabalha de 1 a 4 minutos (a coleta mais as chamadas ao LLM) e termina, a cada hora.

Restrições:

- Rodar de hora em hora, sem servidor próprio.
- Python, reaproveitando o código do VoucherBot, que usa `lxml` (extensão nativa).
- Segredos (chaves do Groq e do Gemini) fora do repositório e da imagem.
- Gravar no banco sem guardar uma chave dele, se possível.
- Ficar dentro do free tier. O repositório é público, e o criador aceita uma assinatura com cartão desde que haja alerta de orçamento.

## Decisão

O coletor roda como **Azure Container Apps Job**, com gatilho agendado (`Schedule`, cron `0 * * * *`, avaliado em UTC), no plano Consumption.

- **Imagem de container pública no GHCR**, construída e publicada por um workflow do GitHub Actions. A imagem não leva nenhum segredo.
- **Tamanho: o mínimo**, 0,25 vCPU e 0,5 GiB (decisão do criador).
- **Segredos** (chaves do Groq e do Gemini) como _secrets_ do job, lidos por `secretref`. O repositório cita só os nomes.
- **Acesso ao banco** por identidade gerenciada do job (ver [ADR-0013](./0013-banco-de-descontos-no-cosmos-db.md)).
- **Tentativas:** limite de pelo menos 1, porque a documentação avisa que a manutenção da plataforma pode interromper uma execução. A gravação é idempotente (chave pelo hash da URL), então repetir é seguro.
- **Teto de tempo da execução** definido no Terraform, bem abaixo do padrão de 30 minutos. Com 0,25 vCPU, 730 execuções por mês cabem na franquia até cerca de 16 minutos cada.
- **Logs** no destino padrão (Log Analytics). O volume esperado é de poucos megabytes por mês, contra 5 GB gratuitos.
- **Assinatura pay-as-you-go** com alerta de orçamento. A conta gratuita da Azure dura 30 dias, e depois valem só os limites "sempre grátis".

O Dockerfile, o workflow de build da imagem e o Terraform são do criador.

## Alternativas consideradas

### Azure Functions, plano Flex Consumption

Gatilho de timer, pacote `zip`, Python 3.10 a 3.15. A franquia é de 250 mil execuções e 100 mil GB-s por mês.

**Motivo da não escolha:** o coletor é uma tarefa que roda até terminar, e não uma função disparada por evento. A memória padrão do Flex é 2 GB, e nessa conta (2 GB × 120 s × 720 execuções = 172 800 GB-s) a franquia estoura se alguém esquecer de reduzir para 512 MB. As dependências com código nativo, como o `lxml`, ficam sujeitas ao empacotamento do Flex. O timeout máximo de execução não consta nas páginas lidas, e o plano exige uma storage account cobrada à parte. Sobre o grátis só valer em "assinaturas de consumo pagas", a documentação não esclarece. Com Container Apps, a imagem roda igual na máquina do criador e na cloud.

### AWS Lambda com EventBridge Scheduler

**Motivo da não escolha:** o plano gratuito da AWS expira em até 6 meses, a conta é suspensa e os dados são apagados 90 dias depois. O histórico de 1 ano ou mais exige o plano pago. O preço do EventBridge Scheduler não pôde ser lido (a página deu 404), e as páginas da AWS se contradizem sobre quando os créditos expiram.

### Google Cloud Run functions e Cloud Scheduler

**Motivo da não escolha:** exige conta de cobrança com cartão, e os jobs gratuitos do Cloud Scheduler não foram confirmados. Não oferecia vantagem sobre o Azure para este caso.

### Workflow agendado do GitHub Actions

**Motivo da não escolha:** os limites do Actions não foram levantados nesta rodada, e o criador preferiu um serviço de cloud com imagem e identidade gerenciada, que é parte do objetivo de prática do projeto. Continua sendo a alternativa mais simples caso o Container Apps Job não se sustente.

### Cloudflare Workers com Cron Trigger

**Motivo da não escolha:** no plano grátis, cada execução tem 10 ms de CPU e 50 subrequisições. Os 41 feeds, mais um `robots.txt` por servidor, passam de 50. O status do Python Workers (beta ou GA) não foi confirmado.

### Cron nas VMs da OCI

**Motivo da não escolha:** acopla o coletor às máquinas que servem a API, que é o oposto da separação desejada. Functions e Scheduler da OCI não aparecem na lista Always Free que foi lida. A duplicidade entre as duas VMs não seria problema, porque a gravação é idempotente, mas o acoplamento é.

## Consequências

### Positivas

- O job só cobra enquanto roda, e pelas contas abaixo fica dentro da franquia grátis.
- O código do VoucherBot roda como está, inclusive com `lxml`.
- A mesma imagem roda no computador do criador e na cloud.
- Não há servidor para manter, e a identidade gerenciada dispensa uma chave do banco no job.
- Há mais prática de DevOps: Dockerfile, publicação da imagem e Terraform.

### Negativas

- Há mais peças do que no Functions: imagem, workflow de build, ambiente, job e identidade.
- Exige uma assinatura paga (cartão). O alerta de orçamento é obrigatório.
- A imagem pública no GHCR expõe o código empacotado. O código já é público, mas qualquer segredo colocado na imagem por engano vaza; por isso a imagem não leva segredo.
- O Container Apps é um serviço de Azure a mais para aprender e operar.
- 0,5 GiB deixa pouca folga se as bibliotecas crescerem. O pico medido foi de 145 MB.

## Validação

Verificado em 2026-11-24:

- **Gatilho agendado:** o job aceita cron de 5 campos, em UTC. Fonte: página de jobs do Container Apps na Microsoft Learn.
- **Timeout e tentativas:** o padrão do timeout da réplica é 1800 s e o das tentativas é 0 (referência do `az containerapp job create`). A documentação manda usar pelo menos 1 tentativa.
- **Cobrança:** por segundo, só enquanto o job roda, e sem custo de ingress para jobs. O tamanho mínimo é 0,25 vCPU e 0,5 GiB. A franquia é de 180 000 vCPU-s e 360 000 GiB-s por mês por assinatura.
- **Conta de consumo (do criador, não da documentação):** 730 execuções por mês de 4 min, no tamanho mínimo, dão 43 800 vCPU-s e 87 600 GiB-s, cerca de 24% da franquia. O limite de cerca de 16 min por execução sai de 0,25 vCPU × 730 × t = 180 000.
- **Medições locais:** 78 a 81 s de coleta e 145 MB de pico, descritos em _Contexto_. Não incluem as chamadas ao LLM.
- **Identidade gerenciada:** o job pode receber identidade gerenciada, e o token vem por `DefaultAzureCredential`, segundo a página de identidade gerenciada do Container Apps.
- **Logs:** o destino padrão é um workspace do Log Analytics, com 5 GB por mês gratuitos no nível pay-as-you-go. Existe a opção `none`.

**Falta confirmar:**

- Se a franquia gratuita vale para jobs, e se alguma assinatura fica de fora. A documentação sugere que sim para jobs ("cobra os recursos alocados à réplica enquanto ela roda"), mas não afirma, e a página de serviços gratuitos não lista o Container Apps. A conferência é pela análise de custos da assinatura depois das primeiras execuções.
- Se o job baixa a imagem pública do GHCR sem credencial. A documentação diz "qualquer registro público ou privado", sem citar o GHCR. O teste é o primeiro deploy.
- Se o Container Apps Job existe na região escolhida (a página de preços lista o Brazil South, mas isso não é garantia de disponibilidade). Quem consulta é o criador, com a CLI da Azure logada.
- O valor máximo do timeout e das tentativas (só os padrões foram confirmados).
- Se a identidade gerenciada do job escreve no Cosmos DB na prática. A documentação do Cosmos confirma o papel e o comando de atribuição (ver ADR-0013), mas ninguém testou a combinação.
- O tempo de uma execução real com o LLM e o consumo da franquia, a medir depois da primeira semana.

## Referências

- [Jobs no Azure Container Apps](https://learn.microsoft.com/azure/container-apps/jobs)
- [Cobrança do Azure Container Apps](https://learn.microsoft.com/azure/container-apps/billing)
- [`az containerapp job create`](https://learn.microsoft.com/cli/azure/containerapp/job)
- [Containers no Azure Container Apps](https://learn.microsoft.com/azure/container-apps/containers)
- [Identidade gerenciada no Container Apps](https://learn.microsoft.com/azure/container-apps/managed-identity)
- [Opções de log do Container Apps](https://learn.microsoft.com/azure/container-apps/log-options)
- [Plano Flex Consumption](https://learn.microsoft.com/azure/azure-functions/flex-consumption-plan)
- [Free Tier da AWS: termos](https://aws.amazon.com/free/terms/)
