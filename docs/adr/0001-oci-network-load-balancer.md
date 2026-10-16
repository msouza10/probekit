# ADR-0001: OCI Network Load Balancer

## Contexto

O ProbeKit é um projeto pessoal desenvolvido com o objetivo de aprimorar conhecimentos em DevOps, infraestrutura e arquitetura multicloud.

A aplicação possui uma API desenvolvida em Go, que será executada em duas instâncias de computação na Oracle Cloud Infrastructure (OCI).

É necessário distribuir as conexões recebidas entre essas instâncias, considerando as seguintes restrições:

- Utilizar os recursos disponíveis no OCI Always Free.
- Evitar custos adicionais de infraestrutura.
- Não provisionar uma terceira instância exclusivamente para balanceamento.
- Manter a arquitetura simples e de fácil manutenção.

O OCI Load Balancer tradicional, disponível no Always Free, possui uma limitação de largura de banda de 10 Mbps, motivando a avaliação de outras alternativas.

## Decisão

Utilizar o **OCI Network Load Balancer (NLB)** para distribuir conexões entre as duas instâncias que executam a API Go.

O NLB opera nas camadas de rede e transporte (L3/L4), permitindo distribuir conexões sem a necessidade de interpretar requisições HTTP.

A distribuição será baseada nos algoritmos de hash disponibilizados pelo serviço, não utilizando Round Robin por requisição HTTP.

## Alternativas consideradas

### OCI Load Balancer (L7)

Permite balanceamento HTTP, incluindo algoritmos como Weighted Round Robin.

**Motivo da não escolha:** limitação de 10 Mbps no Always Free e recursos L7 desnecessários para os requisitos iniciais da aplicação.

### Cloudflare DNS Round Robin

Permite configurar múltiplos registros DNS apontando para diferentes instâncias.

**Motivo da não escolha:** menor controle sobre a distribuição das requisições e ausência de garantias de distribuição uniforme.

### HAProxy / Nginx

Permitem implementar balanceamento de carga com diferentes algoritmos, incluindo Round Robin.

**Motivo da não escolha:** necessidade de executar e administrar um serviço adicional de proxy reverso. A utilização de uma das instâncias existentes como balanceador também centralizaria o tráfego nessa máquina.

## Consequências

### Positivas

- Não exige provisionamento de uma terceira instância.
- Utiliza um serviço gerenciado pela OCI.
- Compatível com os recursos disponíveis no Always Free.
- Não possui a mesma limitação configurada de 10 Mbps do Load Balancer gratuito tradicional.
- Permite distribuir conexões entre diferentes instâncias.
- Reduz a necessidade de manutenção de componentes adicionais de infraestrutura.

### Negativas

- Não oferece roteamento baseado em caminhos ou cabeçalhos HTTP.
- Não permite Round Robin por requisição HTTP.
- A distribuição de conexões não garante divisão uniforme de requisições entre as instâncias.
- A terminação TLS e outros recursos L7 precisam ser tratados por componentes adicionais, quando necessários.

## Validação

A implementação será validada por meio de testes de carga e distribuição de conexões entre as duas instâncias.

Serão avaliados:

- Distribuição de conexões entre os backends.
- Comportamento da aplicação sob requisições simultâneas.
- Consumo de recursos das instâncias.
- Latência e throughput.
- Comportamento diante da indisponibilidade de um backend.

## Referências

- [OCI Network Load Balancer](https://docs.oracle.com/en-us/iaas/Content/NetworkLoadBalancer/overview.htm)
- [OCI Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)

---