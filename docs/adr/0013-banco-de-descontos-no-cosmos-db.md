# ADR-0013: Banco dos descontos no Cosmos DB for NoSQL

## Status

Proposta (2026-11-24). A escolha é do criador, feita na conversa de 2026-11-24; o status passa a Aceita quando ele revisar este texto. Contexto e desenho no [spec dos descontos de certificações](../superpowers/specs/2026-11-24-probekit-descontos-certificacoes-design.md). Depende da [ADR-0012](./0012-coletor-de-descontos-em-container-apps-job.md). O que falta confirmar está em _Validação_.

## Contexto

O coletor grava, e a API Go (nas VMs da OCI) lê. O histórico das promoções é um requisito e nunca expira.

O volume é pequeno. Medições de 2026-11-24 (descritas na ADR-0012): cerca de 44 itens por dia passam no filtro de palavras-chave e vão ao LLM, e a primeira execução tem um acúmulo de 338 itens. Mesmo com 100 itens por dia, com 2 KB cada, o banco cresce cerca de 73 MB por ano.

O que o banco precisa:

- Guardar os itens com o resultado da extração, sem expirar.
- Aceitar gravação do job sem uma chave guardada no job, se possível.
- Ser lido pela API Go, que está em outra cloud (OCI), com latência tolerável e acesso por credencial de menor privilégio.
- Ficar de graça nesse volume, sem pausar nem ser apagado por inatividade.

## Decisão

Uma conta de **Azure Cosmos DB for NoSQL com o free tier ativado na criação**.

- **Free tier:** 1 000 RU/s e 25 GB, vitalícios. Só pode ser marcado ao criar a conta, vale para uma conta por assinatura e não existe no modo serverless. O que passar disso é cobrado.
- **Throughput provisionado no contêiner** (e não compartilhado no banco, que a documentação não recomenda para a maioria dos casos), com o total de contêineres sempre dentro de 1 000 RU/s. O valor exato respeita o mínimo que o portal aceitar na criação.
- **Consistência:** Session, declarada explicitamente.
- **Sem TTL.** O histórico é permanente.
- **Gravação pelo job:** identidade gerenciada com o papel _Cosmos DB Built-in Data Contributor_, restrito ao banco do projeto (e não à conta inteira).
- **Leitura pela API Go:** credencial de menor privilégio (papel _Data Reader_), definida na ADR do acesso da API. A chave da conta (leitura e escrita) não vai para a API.
- **Chaves da conta** ficam ligadas só até a leitura da API por Entra ser validada. Depois disso, `disableLocalAuth` é ativado.
- **Chave de partição** e formato do item ficam para a ADR do contrato. Os limites confirmados deixam a escolha folgada neste volume.

## Alternativas consideradas

### Postgres no Neon

1 GB, sem cartão, permanente, sem pausa por inatividade, conexão Postgres comum (a API Go leria com `pgx`).

**Motivo da não escolha:** é a melhor alternativa se o criador quiser evitar cartão, mas fica fora da Azure. Com o job no Azure, o Cosmos permite identidade gerenciada, sem segredo de banco no job. O Neon exigiria uma string de conexão como segredo.

### DynamoDB

25 GB e 25 unidades de leitura e de escrita provisionadas, sempre grátis.

**Motivo da não escolha:** exige uma conta AWS, e o plano gratuito expira em até 6 meses, com os dados apagados 90 dias depois. Manter o histórico exigiria o plano pago, e a conta seria só para o banco.

### OCI NoSQL ou Autonomous Database

NoSQL: 133 M leituras e 133 M escritas por mês, 3 tabelas de 25 GB. Autonomous: 2 bancos de 20 GB.

**Motivo da não escolha:** o job roda na Azure, então precisaria de uma credencial da OCI guardada como segredo. O Autonomous Database para após 7 dias sem uso e pode ser apagado após 90 dias parado, e o driver Oracle em Go é mais trabalhoso.

### Firestore

1 GiB e 20 mil escritas por dia, mas exige conta de cobrança, e o TTL gerenciado só funciona com billing. Mais uma cloud para o criador só por causa do banco.

### Azure Table Storage ou Blob Storage

Não aparecem na lista de serviços gratuitos da Azure que foi lida, e a cobrança por operação não ficou legível (os preços vieram como "$-").

### Outros

Turso (5 GB, 10 M escritas por mês) teve o modo de conexão não confirmado. O D1 da Cloudflare teve o acesso externo da API Go não confirmado. Supabase pausa o projeto após 1 semana sem atividade. O MongoDB Atlas pausa após 30 dias sem conexão.

## Consequências

### Positivas

- O job grava sem chave de banco, por identidade gerenciada.
- 25 GB e 1 000 RU/s sobram para o volume previsto (cerca de 73 MB por ano).
- O SDK oficial em Go (`azcosmos`, v1.5.0, estável, publicada em 14/07/2026) lê por Entra ou por chave.
- Há controle de acesso fino por RBAC (papéis de leitura e de escrita separados).

### Negativas

- Exige a assinatura paga (cartão), como a ADR-0012. Se o throughput total passar de 1 000 RU/s, o excedente é cobrado.
- Uma só conta com free tier por assinatura, e só marcada na criação. Errar o toggle exige recriar a conta.
- A API na OCI lê de outra cloud: há latência, e o tráfego de saída além de 5 GB por mês é cobrado (Europa e América do Norte). O cache em memória da API reduz as duas coisas.
- É um banco de documentos. Consultas como "os mais recentes de todos os fornecedores" cruzam partições e gastam mais RU do que uma leitura por chave. Neste volume o custo extra é pequeno.
- Dependência de um fornecedor para o histórico. Exportar exige um processo próprio.

## Validação

Verificado em 2026-11-24, na documentação da Microsoft Learn:

- **Free tier:** "1 000 RU/s e 25 GB, para toda a vida da conta"; uma conta por assinatura; ativado só na criação; indisponível no serverless; o excedente é cobrado ao preço normal (página do free tier, atualizada em 2026-04-27). Os "400 RU/s e 5 GB" que aparecem no README do pacote `azcosmos` no pkg.go.dev estão defasados.
- **Papéis de dados por Entra:** _Built-in Data Reader_ (`00000000-0000-0000-0000-000000000001`) e _Built-in Data Contributor_ (`00000000-0000-0000-0000-000000000002`), atribuídos com `az cosmosdb sql role assignment create`, com escopo `/`, `/dbs/<banco>` ou `/dbs/<banco>/colls/<contêiner>`.
- **Desativar chaves:** `disableLocalAuth=true` documentado, com verificação de uso antes de desativar.
- **Firewall por IP:** existe, em CIDR, com propagação de até 15 minutos. A página do free tier não registra exclusão, então o recurso deve valer nele, mas isso é inferência.
- **Partição:** até 20 GB por partição lógica, 10 000 RU/s por partição lógica, consultas que cruzam partições custam 2 a 3 RU por partição física, e contêineres pequenos têm uma ou duas partições físicas.
- **Leitura por chave e id:** 1 RU para um item de cerca de 1 KB.
- **Throughput compartilhado:** até 1 000 RU/s e 25 contêineres grátis; a documentação recomenda configurar no contêiner.
- **Go:** o SDK `azcosmos` tem exemplo com `DefaultAzureCredential` e com chave (`NewClientWithKey`).

**Falta confirmar:**

- Se existe chave **somente de leitura** da conta. As páginas lidas não a documentam como recurso, apenas uma ação `readonlyKeys` aparece indiretamente. Se não existir, a API usa o papel _Data Reader_ por Entra.
- Se a API Go, **fora da Azure**, autentica por Entra com um principal de serviço (segredo ou certificado). O exemplo da Microsoft usa `DefaultAzureCredential`, mas a página não diz de onde ele lê credenciais fora da Azure. Por isso a chave da conta fica ligada até esse teste passar.
- O mínimo de RU/s por contêiner e se o portal aceita um valor baixo na conta com free tier.
- O nível de consistência padrão de uma conta nova (por isso é declarado como Session).
- Se o job escreve no Cosmos com a identidade gerenciada (o papel e o comando estão documentados, mas não foram testados).
- Se o IP firewall é viável para o job: não confirmei se os endereços de saída do job são estáveis. A segurança principal é o Entra, e o firewall é uma camada adicional.
- A latência e o custo de saída da leitura entre a OCI e a região escolhida. A região do Cosmos ainda não foi escolhida.

## Referências

- [Free tier do Azure Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/free-tier)
- [Controle de acesso por papéis no Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/how-to-connect-role-based-access-control)
- [Papéis de segurança do plano de dados](https://learn.microsoft.com/azure/cosmos-db/reference-data-plane-security)
- [Firewall por IP](https://learn.microsoft.com/azure/cosmos-db/how-to-configure-firewall)
- [Particionamento](https://learn.microsoft.com/azure/cosmos-db/partitioning)
- [Unidades de requisição](https://learn.microsoft.com/azure/cosmos-db/request-units)
- [Throughput compartilhado no banco](https://learn.microsoft.com/azure/cosmos-db/how-to-provision-database-throughput)
- [Guia rápido em Go](https://learn.microsoft.com/azure/cosmos-db/nosql/quickstart-go)
- [Pacote `azcosmos`](https://pkg.go.dev/github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos)
