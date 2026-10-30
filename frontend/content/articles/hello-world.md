---
title: "Olá, mundo: um ping, duas VMs e um laboratório DevOps"
description: "Por que criar uma ferramenta de ping se o terminal já tem o comando? A história do Probekit, um laboratório de DevOps feito com Go, Terraform e Cloudflare."
date: 2026-10-27
---

![Meme de um código HelloWorld("print") e, abaixo, uma figura de capuz com raios de luz saindo dos olhos](/articles/hello-world.webp)

Se você já está pensando "para que um site de ping, se existe o comando `ping`?", pode ficar tranquilo: eu também pensei. Sei o quanto a ideia parece estúpida e redundante. Mas vamos por partes, porque o ping nunca foi o ponto.

## O problema que eu queria resolver

Eu precisava de uma motivação para colocar em prática conhecimentos de provisionamento de infraestrutura. Não queria subir um Jellyfin ou outro sistema open source qualquer, e também não tinha uma grande ideia de produto. Então procurei algo que eu mesmo usaria e que não levasse meses para ficar de pé.

A faísca veio de um lugar improvável: stories do Instagram. Alguém postou uma senha gerada pelo [gerador de senhas do iponline](https://iponline.com.br/gerador-de-senhas/), um site feito por outra pessoa de tecnologia que eu sigo. Achei a ideia legal. Sabia que não era algo vendável, mas fazia tempo que eu carregava uma pergunta: como desenvolver habilidades em coisas que eu uso pouco, ou nada, no trabalho?

Daí nasceu o Probekit: um laboratório meu, vivo, onde posso testar e implementar ferramentas novas. Hoje não tenho ideia de grandes features. O que eu tinha era vontade de usar mais Terraform, de usar GitHub Actions e de manter um lugar online onde as decisões ficam documentadas: como eu fiz e por que fiz assim.

## Por que Go

Comecei pelo básico: teste de ping e consulta de DNS. Havia uma razão técnica para não fazer isso só no front-end: um navegador não consegue enviar ICMP (o protocolo do ping), então a ferramenta precisa de um servidor de qualquer jeito. E havia uma razão pessoal: desenvolvimento frontend não é meu foco. Meu objetivo é evoluir em DevOps e engenharia de plataforma, então decidi concentrar meus esforços no backend e na infraestrutura.

Preferi algo mais próximo do que eu poderia usar em outros momentos. Já escrevi coisas em Python, mas queria algo diferente, e fui para o Go: o [Kubernetes](https://github.com/kubernetes/kubernetes) é escrito nele, o [Caddy](https://caddyserver.com/) também, e o backend do [Grafana](https://github.com/grafana/grafana) idem. Pareceu um bom lugar para começar a brincar.

As primeiras linhas foram de quebrar a cabeça: entender como funcionam as bibliotecas, as funções, tudo, até a API básica funcionar.

## Colocar no ar sem gastar dinheiro

Com a API funcionando veio a pergunta seguinte: beleza, e agora preciso colocar isso para rodar. Só que eu sou pobre e não quero gastar dinheiro. Foi assim, passo a passo, até o que existe hoje: um laboratório completo, quase todo gratuito, rodando com Terraform, GitHub Actions, Go, TypeScript e mais um monte de coisa. O frontend foi desenvolvido com ajuda de IA, e eu fiquei com o foco em infraestrutura e backend.

O primeiro passo foi entender melhor o que cada cloud oferece de graça. E acredite: todas oferecem alguma coisa, você só precisa ficar ligado nos limites e até quando é grátis. Pesquisando, lembrei que eu já tinha uma conta na Oracle Cloud com uma VM [Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) rodando.

Se você já pesquisou sobre o assunto, sabe que a Oracle consegue liberar máquinas ARM bem parrudas de graça (is real!). Só que precisa correr atrás, e não é tão simples. Eu mesmo não consegui: criei minha conta na região de São Paulo, que é bem concorrida, e não consegui criar uma máquina assim. Além disso, há regras a seguir. A página atual da Oracle fala em 2 OCPUs e 12 GB de memória para contas Always Free, e avisa que instâncias ociosas podem ser recuperadas. O ponto é: eu tinha uma conta na OCI, uma VM e um sonho.

Nesse momento comecei a pensar melhor e a olhar o que tinha ao meu alcance. Eu já conhecia as várias coisas Always Free que a Cloudflare oferece, de outros carnavais, então escolhi manter o frontend em um provedor e o backend em outro, rodando em máquinas. O frontend ficou na Cloudflare como [Worker com assets estáticos](https://developers.cloudflare.com/workers/static-assets/), e as requisições que só devolvem arquivos estáticos [não são cobradas](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/). Isso vale para servir arquivos: requisições que executam código de um Worker entram na cobrança e nos limites do plano.

Com isso as possibilidades foram crescendo. Percebi que a OCI deixa criar não só uma máquina, mas duas, e decidi colocar as duas. Não são as ARM que eu tinha tentado conseguir: são as duas `VM.Standard.E2.1.Micro` (AMD), que a Oracle também libera no Always Free, com 1 GB de memória cada. A conta fecha porque a OCI também oferece [um Network Load Balancer no Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm). Não vou contar tudo sobre ele agora (a decisão está no [ADR-0001](https://github.com/msouza10/probekit/blob/main/docs/adr/0001-oci-network-load-balancer.md)), mas essa parte foi aproveitar o que eu tinha para montar algo do zero e mostrar algumas habilidades.

Só nessa hora percebi que escolher Go foi acertado, e eu não tinha pensado nisso antes: com 1 GB de RAM por máquina, um programa em Go vira um [binário único](https://caddyserver.com/docs/architecture), sem interpretador para instalar, e isso é uma preocupação a menos num servidor tão pequeno.

## Terraform e o pipeline: plan, aprovação e apply

Entre as habilidades que eu pouco uso na prática, uma delas era o Terraform. Já usei em alguns outros projetos, mas sempre fiquei muito preso a um único `apply` em um script só: nada de multicloud, de arquivos com dependências entre eles, de variáveis, de federação de identidade, e tudo isso unido a CI/CD. Por isso, logo de início, a proposta foi fazer um deploy inicial totalmente rodado pelo Actions.

O Terraform do projeto é básico. São dois módulos: um da OCI, com as duas VMs, a rede e o NLB, e um da Cloudflare, com o DNS. O módulo da Cloudflare recebe o IP do NLB como saída do módulo da OCI, então o registro da API aponta sozinho para o balanceador. O state fica em um bucket da OCI, e não na minha máquina, para o pipeline também conseguir rodar `plan` e `apply`. De quebra, consigo dormir tranquilo, sem medo de perder tudo o que já foi feito na minha infra.

Em todo pull request, o CI roda `terraform fmt -check`, `terraform init -backend=false` e `terraform validate`. Isso confere formatação e sintaxe sem credencial nenhuma e sem encostar no state.

O deploy tem dois jobs. O primeiro roda `terraform plan -out=tfplan`, que grava o plano em um arquivo. O segundo só começa depois que eu aprovo no GitHub (o ambiente `production` exige um revisor), baixa esse arquivo e roda `terraform apply` nele. A diferença importa: se o `apply` rodasse sozinho, ele calcularia um plano novo na hora, e a infra poderia ter mudado desde o plano que eu li. Aplicando o arquivo salvo, sobe exatamente o que eu aprovei. Mesmo desenvolvendo sozinho, isso me obriga a ficar de olho na pipeline, sabendo o que está acontecendo, e, se tiver um possível problema, sou o primeiro a saber e posso impedir de subir para prod. (Só porque meu site faz apenas um ping, não quer dizer que não seja um ambiente de prod!)

Também pensei na concorrência. Se outra pessoa passar a mexer no projeto comigo (ou eu comigo mesmo), dois deploys podem tentar alterar a mesma infra ao mesmo tempo, e os planos se embolam. Há duas travas contra isso. A primeira é o `concurrency` do GitHub Actions (grupo `deploy`, `cancel-in-progress: false`): a segunda execução espera a primeira, e a que está rodando nunca é cancelada no meio de um `apply`. A segunda é o [lock do state](https://developer.hashicorp.com/terraform/language/backend/oci#state-locking): o backend `oci` cria um objeto de lock no bucket durante `plan`, `apply` e `destroy`. E, se o state mudar entre o plano e o apply, o Terraform recusa o plano salvo. Em um teste local com um recurso de laboratório, aplicar um plano antigo depois de outro terminou em `Error: Saved plan is stale`.

Um cuidado com o arquivo do plano: segundo a [documentação do Terraform](https://developer.hashicorp.com/terraform/cli/commands/plan), ele pode guardar dados sensíveis em texto puro, mesmo quando a saída do terminal os esconde. Como viaja entre os jobs como artefato do GitHub, eu o cifro com `openssl` (AES-256) e deixo o artefato durar só um dia. A senha vem do Infisical, que o workflow acessa por OIDC, com um token temporário do GitHub e sem nenhuma credencial fixa guardada. A chave SSH e o certificado TLS ficam em secrets do ambiente `production` e só chegam ao job depois da aprovação. A chave da OCI está também no `plan`, porque ele precisa dela e roda sem aprovação. As decisões estão no [ADR-0007](https://github.com/msouza10/probekit/blob/main/docs/adr/0007-gestao-de-segredos-com-infisical.md).

## O backend: a biblioteca de ping e o ICMP sem root

No backend, o ping usa a biblioteca [pro-bing](https://github.com/prometheus-community/pro-bing), da comunidade do Prometheus. Antes de mandar qualquer pacote, o handler resolve o nome que recebeu e confere se algum dos IPs cai em faixa privada ou reservada. Isso vale também para um hostname que aponte para um IP privado, e é o que faz o Probekit recusar um `192.168.x.x`, isso impede que a ferramenta seja utilizada para realizar testes contra endereços privados e reduz o risco de acesso indevido à rede interna pela API.

A biblioteca tem uma exigência que vem do Linux. Segundo o [README do pro-bing](https://github.com/prometheus-community/pro-bing#linux), ela tenta fazer um ping "sem privilégio", o que no Linux só funciona se o grupo do processo estiver na faixa definida em `net.ipv4.ping_group_range`. A outra saída é `SetPrivileged(true)` com `setcap cap_net_raw` no binário. O projeto usa o `sysctl`: no CI ele libera a faixa inteira para os testes rodarem, e nas VMs o script de deploy libera só o grupo do usuário que roda a API, nada que um bom script shell nao resolva para mim né.

## Então, por que um ping na web?

Voltando à pergunta do começo: a única coisa diferente num ping na web é de onde ele sai. Em vez do seu computador, quem manda o pacote são as minhas VMs da OCI, em São Paulo. Se o seu terminal não alcança um host e o Probekit alcança, já é uma pista de que o problema pode estar do seu lado. Mas é só uma pista: firewall e rota também mudam a resposta, e um host que ignora ICMP pode estar servindo o site normalmente.

Ele também não enxerga a sua rede de casa: endereço privado, como o `192.168.x.x` do roteador, é recusado. Para isso, fica com o `ping` do terminal mesmo.

Mas o ponto mais importante não é esse. Quando construí o Probekit, não foi simplesmente para fazer ping: o site em si é só uma interface para uma ferramenta. Foi para ter um playground meu, onde eu monto, desmonto, adiciono peças novas e altero o que quiser, enquanto mantenho uma plataforma no ar, usando as clouds e as tecnologias diferentes, documentando tudo isso e ao mesmo tempo adicionando features que acho que podem ser legais de desenvolver, ou desenvolvendo só por desenvolver. O objetivo real é ir construindo conhecimento e base nas tecnologias que quero aprender.

Se você quiser ver como tudo isso funciona por dentro, o código e as decisões estão no [repositório](https://github.com/msouza10/probekit). E, se quiser testar o ping, é só abrir o [probekit.cc](https://probekit.cc) e tentar com um domínio seu.

## Referências

- [Repositório do Probekit](https://github.com/msouza10/probekit) e as decisões de arquitetura em [`docs/adr`](https://github.com/msouza10/probekit/tree/main/docs/adr).
- [Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), na documentação da Oracle Cloud.
- [Static Assets](https://developers.cloudflare.com/workers/static-assets/), na documentação do Cloudflare Workers.
- [Documentação do Caddy](https://caddyserver.com/docs/), um exemplo de servidor escrito em Go.
