# ADR-0014: Leitura dos descontos pela API Go

## Status

Proposta (2026-11-24). Escrita a pedido do criador, no desenho do [spec dos descontos de certificações](../superpowers/specs/2026-11-24-probekit-descontos-certificacoes-design.md). Depende da [ADR-0012](./0012-coletor-de-descontos-em-container-apps-job.md) e da [ADR-0013](./0013-banco-de-descontos-no-cosmos-db.md), que deixou a credencial da leitura para esta ADR. O status passa a Aceita quando o criador revisar este texto. O que falta confirmar está em _Validação_.

## Contexto

A API Go roda em duas VMs da OCI, atrás de um balanceador, e hoje só tem duas rotas de sondagem (`/api/ping` e `/api/dns-lookup`). Ela é um binário com uma única dependência direta (`pro-bing`), configurado por variáveis de ambiente que o script de deploy grava na unidade do systemd. O certificado TLS chega por arquivo, instalado com permissão `0600`, e as credenciais mais sensíveis ficam como secrets de ambiente do GitHub, liberados só depois da aprovação do `production` ([ADR-0007](./0007-gestao-de-segredos-com-infisical.md)).

A rota nova (`GET /api/vouchers`) vai ler do Cosmos DB, que está em outra cloud (Azure). Dois fatos pesam:

- **A Home chama a rota em toda visita** (o aviso do último desconto). O número de leituras no banco não pode depender do tráfego do site.
- **As VMs ficam fora da Azure.** Não há identidade gerenciada para elas: precisam de uma credencial que viaja até lá.

O limite atual de requisições da API é um contador único por IP, que só protege as duas rotas de sondagem. O contador não limpa IPs antigos da memória.

## Decisão

### Como a API lê

A API mantém **um instantâneo em memória** dos itens mais recentes e o atualiza **em segundo plano**, a cada 10 minutos (valor inicial, ajustável), com uma consulta ao Cosmos. As requisições da rota e da Home **saem do instantâneo** e nunca esperam o banco.

- **Carga no início:** a API tenta carregar o instantâneo ao subir. Se a primeira carga falha, a rota responde erro no contrato padrão (`{error, code}`, código `vouchers_unavailable`, HTTP 503) até a primeira atualização funcionar.
- **Falha depois da primeira carga:** a API continua servindo o último instantâneo, registra o erro em log e tenta de novo na próxima rodada. Não existe idade máxima: a resposta traz o momento da última coleta, e o site o exibe.
- **Tamanho do instantâneo, ordenação e paginação:** definidos na ADR do formato do item.
- **Duas VMs:** cada uma mantém o seu instantâneo. Dá no máximo 12 consultas por hora no total. Mesmo que cada consulta custasse 1 000 RU, seriam 12 000 RU por hora, contra os cerca de 3,6 milhões de RU por hora do free tier (1 000 RU/s × 3 600 s). O custo real de uma consulta ainda não foi medido.
- **A leitura fica atrás de uma interface** (um tipo que devolve itens), com a implementação do Cosmos separada. Assim os testes da rota usam uma versão falsa, sem Azure.
- **Limite de requisições próprio** para a rota: uma instância nova do limitador, separada da das rotas de sondagem, com valores definidos na implementação. Como as respostas saem da memória, o limite protege o processo da API e não o banco. O CORS já vale para a rota, porque envolve o roteador inteiro.

### Qual credencial

A API se autentica no Cosmos como um **principal de serviço do Microsoft Entra ID** (um app registration), com uma **credencial de certificado**.

- **Papel:** _Cosmos DB Built-in Data Reader_, com escopo no contêiner do projeto (`/dbs/<banco>/colls/<contêiner>`), nunca na conta inteira. Dá leitura e consulta, sem escrita.
- **Certificado:** autoassinado, gerado pelo criador. A parte pública é cadastrada no app registration, e o arquivo com a chave privada vai para a VM como o certificado TLS vai hoje: secret do ambiente `production` do GitHub, instalado com permissão `0600` e dono o usuário do serviço, **fora da unidade do systemd** (as linhas `Environment=` são legíveis por `systemctl show`).
- **Configuração não secreta** (identificadores do tenant e do app, endpoint do Cosmos, nomes do banco e do contêiner) segue o caminho das demais configurações, pelo Infisical.
- **Biblioteca:** `azcosmos` com `azidentity` (credencial de certificado), no lugar da chave. O código lê o caminho do arquivo por variável de ambiente.
- **Chaves da conta** continuam ligadas só até a leitura por Entra funcionar de ponta a ponta nas duas VMs. Depois disso, `disableLocalAuth` é ativado (ADR-0013).
- **Rotação:** a validade do certificado é definida na criação e registrada no runbook. Se ele expirar, a API continua servindo o último instantâneo, e a página mostra a hora da última coleta (que passa a ficar velha), mas o erro aparece só no log.

### Credenciais e serviços necessários

| Para quê | Credencial | Onde fica | Observação |
|---|---|---|---|
| API Go lê o Cosmos | Certificado do principal de serviço (papel _Data Reader_) | Secret do ambiente `production` do GitHub, arquivo `0600` na VM | **Nova.** Segue o padrão do certificado TLS. |
| Configuração da leitura | Tenant, app, endpoint, banco e contêiner | Infisical | Não são segredos. |
| Job grava no Cosmos | Nenhuma: identidade gerenciada (_Data Contributor_) | Gerada pela Azure | ADR-0012 e ADR-0013. |
| Job chama o Groq e o Gemini | Duas chaves de API | _Secrets_ do job | ADR-0012. |
| Publicar a imagem no GHCR | Nenhuma nova: o token do próprio workflow, com permissão de escrita em pacotes | GitHub | Imagem pública. |
| Terraform cria os recursos na Azure | Autenticação do workflow na Azure | A definir | **Fora desta ADR.** O Terraform na Azure precisa de credencial própria. |

**Serviço complementar necessário: só o Microsoft Entra ID**, para o app registration. Ele já pertence à assinatura da Azure e não tem custo extra pelas páginas lidas. **Não precisam** de Azure Key Vault (os segredos ficam no Infisical e no GitHub, como na ADR-0007), de API Management, de uma função ou aplicação intermediária na Azure, de rede privada nem de endpoint privado.

### Firewall do Cosmos

A segurança principal é o Entra, com papéis mínimos e as chaves desativadas ao final. O firewall por IP **não** é exigido nesta decisão. O job usa a Azure e a API usa a OCI, e eu não confirmei se os endereços de saída do job são estáveis. Sem firewall, a conta fica acessível pela internet **apenas para quem apresentar um token válido** (a documentação diz isso). O firewall com lista de IPs da API, mais a opção para conexões de dentro da Azure, é uma camada adicional a avaliar depois do primeiro deploy.

## Alternativas consideradas

### Chave da conta (leitura e escrita) na API

**Motivo da não escolha:** daria à API poder de escrita e apagamento em todo o banco, e um vazamento na VM comprometeria o histórico.

### Chave somente de leitura

**Motivo da não escolha:** as páginas oficiais lidas **não documentam** esse tipo de chave (só aparece indiretamente uma ação `readonlyKeys` em um papel do plano de controle), e não está dito o que acontece com ela quando as chaves são desativadas. Não dá para planejar em cima do que a documentação não confirma.

### Principal de serviço com segredo de cliente (em vez de certificado)

Uma única string (`AZURE_CLIENT_SECRET`), mais simples de colocar no ambiente. O tempo máximo é de 24 meses, e a Microsoft recomenda menos de 12.

**Motivo da não escolha:** a Microsoft recomenda certificados em vez de segredos para produção, e o projeto já tem um padrão para entregar um arquivo de chave à VM. É o plano B documentado: se o certificado se mostrar trabalhoso na prática, o segredo funciona com a mesma configuração, só mudando o tipo de credencial.

### Federação de identidade a partir da OCI

Trocar um token da OCI por um do Entra, sem guardar nenhum segredo.

**Motivo da não escolha:** a documentação exige um emissor OIDC com descoberta, assinatura RS256 e `sub` exato. Que a OCI emita tokens assim para uma VM **não foi confirmado**.

### Serviço intermediário na Azure (uma segunda aplicação que a API chama)

**Motivo da não escolha:** acrescenta um serviço com custo, uma superfície exposta e uma credencial de qualquer jeito (a da API para chamá-lo), sem resolver o problema.

### O job publica um arquivo (JSON) e a API o baixa

Sem credencial de leitura do Cosmos na OCI.

**Motivo da não escolha:** exige um serviço de armazenamento a mais e uma credencial de escrita nele no job, e tira o benefício de consultar o histórico. Continua sendo o plano C se a leitura por Entra não funcionar fora da Azure.

### Consultar o Cosmos a cada requisição, com cache curto

**Motivo da não escolha:** o número de leituras passaria a depender do tráfego, e a Home chama a rota em toda visita. O instantâneo em segundo plano tira o banco do caminho da requisição.

## Consequências

### Positivas

- O banco recebe um número fixo e pequeno de leituras, qualquer que seja o tráfego.
- A rota continua respondendo quando o Cosmos está fora do ar ou quando o certificado expira.
- A API tem só permissão de leitura, e só no contêiner do projeto.
- O padrão de entrega do segredo (arquivo `0600`, secret do `production`) já existe no projeto.
- A rota é testável sem Azure, graças à interface.

### Negativas

- A API sai de uma dependência direta para o SDK da Azure (`azcosmos` e `azidentity`, com as dependências deles), e o binário cresce.
- Um certificado a mais para renovar, no calendário do criador. Se expirar, a falha é silenciosa para o visitante.
- Um dado novo pode levar até 10 minutos para aparecer na API (mais até uma hora da coleta, que é de hora em hora).
- As duas VMs podem mostrar instantâneos ligeiramente diferentes por alguns minutos.
- Cada VM mantém o instantâneo na memória. O tamanho vem da ADR do formato do item.
- O limitador de requisições atual não remove IPs antigos do mapa, e uma nova instância herda esse comportamento.
- O app registration e o certificado ficam na Azure, e o secret e a configuração em outros lugares (GitHub e Infisical). São três lugares para conferir numa rotação.

## Validação

Verificado em 2026-11-24, na documentação oficial:

- **Biblioteca:** `azcosmos.NewClient(endpoint, credencial, opções)` aceita qualquer `TokenCredential` do `azidentity`, e `NewClientWithKey` existe para chave. O pacote está na v1.5.0, estável.
- **Credenciais do `azidentity` para um serviço fora da Azure:** credencial de segredo de cliente e credencial de certificado, e a `EnvironmentCredential` lê `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` e `AZURE_CLIENT_SECRET` (segredo) ou `AZURE_CLIENT_CERTIFICATE_PATH`, com `AZURE_CLIENT_CERTIFICATE_PASSWORD` opcional (certificado). A `DefaultAzureCredential` começa por ela.
- **Recomendação da Microsoft:** certificado em vez de segredo em produção. O segredo de cliente tem prazo máximo de 24 meses, e o recomendado é menos de 12.
- **Atribuição de papel:** `az cosmosdb sql role assignment create --principal-id <identidade> --scope <escopo>`, com escopo `/`, `/dbs/<banco>` ou `/dbs/<banco>/colls/<contêiner>`.
- **Chaves da conta:** podem ser desativadas (`disableLocalAuth`), e a documentação manda testar que o acesso por chave falha.
- **Acesso sem firewall:** "a conta é acessível pela internet se a requisição trouxer um token de autorização válido".
- **Firewall por IP:** lista em CIDR, resposta 403 fora dela, propagação de até 15 minutos. A opção de conexões de dentro da Azure adiciona o endereço `0.0.0.0` e a página adverte que ela libera requisições de qualquer assinatura na Azure.
- **Token:** vem de `login.microsoftonline.com` e, no exemplo da documentação, dura cerca de 1 hora (`expires_in` 3 599).
- **Federação:** o provedor externo precisa ser OIDC com descoberta e assinatura RS256, com o `sub` idêntico.

**Falta confirmar:**

- Se o app Go, na OCI, autentica no Cosmos de ponta a ponta com o certificado. É o teste que decide esta ADR; se falhar, valem o segredo de cliente (plano B) e o arquivo publicado (plano C).
- Se as VMs conseguem sair para o endpoint de login da Microsoft e para o endpoint do Cosmos pela rede atual da OCI. Não olhei as regras de saída.
- O formato do arquivo do certificado aceito pelo `azidentity` (PEM ou PKCS#12) e o que acontece quando ele expira.
- O escopo (audiência) do token do Cosmos e o formato do endpoint da conta. As páginas só trazem marcadores.
- Se `--principal-id` é o identificador do **objeto** do principal de serviço (e não o do app). A página diz só "identificador único"; confirmar com `az ad sp show` na criação.
- Se o criador tem permissão de registrar aplicativos no tenant da assinatura, e se um tenant é criado com a assinatura pay-as-you-go. É provável, mas as páginas lidas não afirmam.
- Se existe chave somente de leitura da conta, e se ela é desativada com `disableLocalAuth`. Esta ADR não depende da resposta.
- O custo em RU de uma consulta de listagem e a latência de leitura entre a OCI e a região do Cosmos (a região ainda não foi escolhida).
- Se os endereços de saída do job são estáveis, o que decide se o firewall por IP é viável.
- Se o Terraform na Azure precisa de uma credencial própria e de qual tipo. Fica para a ADR do Terraform na Azure.

## Referências

- [Pacote `azcosmos`](https://pkg.go.dev/github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos)
- [Pacote `azidentity`](https://pkg.go.dev/github.com/Azure/azure-sdk-for-go/sdk/azidentity)
- [Controle de acesso por papéis no Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/how-to-connect-role-based-access-control)
- [Papéis de segurança do plano de dados](https://learn.microsoft.com/azure/cosmos-db/reference-data-plane-security)
- [Firewall por IP do Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/how-to-configure-firewall)
- [ADR-0007: gestão de segredos](./0007-gestao-de-segredos-com-infisical.md)
