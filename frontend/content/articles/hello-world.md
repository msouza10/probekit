---
title: "Olá, mundo: um ping, duas VMs e um laboratório DevOps"
seoTitle: "Um ping, duas VMs e um laboratório DevOps"
description: "Por que criar uma ferramenta de ping se o terminal já tem o comando? A história do Probekit, um laboratório de DevOps feito com Go, Terraform e Cloudflare."
date: 2026-10-27
---

![Meme de um código HelloWorld("print") e, abaixo, uma figura de capuz com raios de luz saindo dos olhos](/articles/hello-world.webp)

Se você já está pensando "para que um site de ping, se existe o comando `ping`?", pode ficar tranquilo: eu também pensei. Eu precisava de algo que me permitisse experimentar com infraestrutura e backend de forma prática. Mas vamos por partes, porque o ping nunca foi o ponto.

## O problema que eu queria resolver

Eu precisava de uma motivação para colocar em prática conhecimentos de provisionamento de infraestrutura. Não queria subir um Jellyfin ou outro sistema open source qualquer, e também não tinha uma grande ideia de produto. Então procurei algo que eu mesmo usaria e que não levasse meses para ficar de pé.

A faísca veio de um lugar improvável: stories do Instagram. Alguém postou uma senha gerada pelo [gerador de senhas do iponline](https://iponline.com.br/gerador-de-senhas/), um site feito por outra pessoa de tecnologia que eu sigo. Achei a ideia legal. Sabia que não era algo vendável, mas fazia tempo que eu carregava uma pergunta: como aprender de verdade aquilo que minha rotina não me obriga a usar?

Daí nasceu o Probekit: um laboratório meu, vivo, onde posso testar e implementar ferramentas novas. Não precisava de grandes features. Precisava de um lugar para colocar em prática o que eu só conhecia na teoria, ou nem isso, e deixar registrado como fiz e por que fiz assim.

## Por que Go

Comecei pelo básico: teste de ping e consulta de DNS. Havia uma razão técnica para não fazer isso só no front-end: um navegador não consegue enviar ICMP (o protocolo do ping), então a ferramenta precisa de um servidor de qualquer jeito. E havia uma razão pessoal: desenvolvimento frontend não é meu foco. Meu objetivo é evoluir em DevOps e engenharia de plataforma, então decidi concentrar meus esforços no backend e na infraestrutura.

Queria algo mais próximo do dia a dia de DevOps. Já escrevi coisas em Python, mas desta vez quis algo diferente e fui para o Go, a linguagem por trás do Kubernetes, do Terraform e do Prometheus. Aprender Go abre a porta para entender como a infraestrutura moderna é construída por dentro e, quem sabe, contribuir com essas ferramentas no futuro. Pareceu um bom lugar para começar a brincar.

As primeiras linhas foram de quebrar a cabeça: entender como funcionam as bibliotecas, as funções, tudo, até a API básica funcionar.

## Colocar no ar sem gastar dinheiro

Com a API funcionando veio a pergunta seguinte: beleza, agora preciso colocar isso para rodar. Só que eu tinha ambição de engenheiro de big tech e orçamento de estagiário (sem a bolsa). Foi assim, passo a passo, até o que existe hoje: um laboratório no ar, quase todo gratuito, rodando com Terraform, GitHub Actions, Go, TypeScript e mais um monte de coisa. O frontend foi desenvolvido com ajuda de IA, e eu fiquei com o foco em infraestrutura e backend.

O primeiro passo foi pesquisar os recursos gratuitos de cada cloud e seus limites, incluindo o que era permanente e o que era só um período de teste. E acredite: encontrei várias opções interessantes, algumas com limites mensais bem generosos.

Nessa pesquisa, lembrei que eu já tinha uma conta na Oracle Cloud com uma VM [Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) rodando.

Se você já pesquisou sobre o assunto, sabe que a Oracle consegue liberar máquinas ARM bem parrudas de graça (is real!). Só que precisa correr atrás, e não é tão simples. Eu mesmo não consegui: criei minha conta na região de São Paulo, que é bem concorrida, e não consegui criar uma máquina assim. Além disso, há regras a seguir. A página atual da Oracle fala em 2 OCPUs e 12 GB de memória para contas Always Free, e avisa que instâncias ociosas podem ser recuperadas. O ponto é: eu tinha uma conta na OCI, uma VM e um sonho.

Nesse momento comecei a pensar melhor e a olhar o que tinha ao meu alcance. Eu já conhecia as várias coisas Always Free que a Cloudflare oferece, de outros carnavais, então escolhi manter o frontend em um provedor e o backend em outro, rodando em máquinas. O frontend ficou na Cloudflare como [Worker com assets estáticos](https://developers.cloudflare.com/workers/static-assets/), e as requisições que só devolvem arquivos estáticos [não são cobradas](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/). Isso vale para servir arquivos: requisições que executam código de um Worker entram na cobrança e nos limites do plano.

Com isso as possibilidades foram crescendo. Percebi que a OCI deixa criar não só uma máquina, mas duas, e decidi colocar as duas. Não são as ARM que eu tinha tentado conseguir: são as duas `VM.Standard.E2.1.Micro` (AMD), que a Oracle também libera no Always Free, com 1 GB de memória cada. A conta fecha porque a OCI também oferece [um Network Load Balancer no Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm). Não vou contar tudo sobre ele agora (a decisão está no [ADR-0001](https://github.com/msouza10/probekit/blob/main/docs/adr/0001-oci-network-load-balancer.md)), mas essa parte foi aproveitar o que eu tinha para montar algo do zero e mostrar algumas habilidades.

Na hora de publicar, apareceu outra conveniência do Go: eu conseguia distribuir a API como um binário, sem instalar um interpretador nas VMs. Isso simplificou o deploy.

::diagram{name="arquitetura"}

## Terraform e o pipeline: plan, aprovação e apply

Eu já tinha usado Terraform em outros projetos, mas queria ir além de rodar um `apply` local. No Probekit, a proposta foi provisionar a infraestrutura pelo GitHub Actions, com uma etapa para revisar o que seria alterado antes de aplicar.

São dois módulos: um da OCI, com as duas VMs, a rede e o NLB, e um da Cloudflare, com o DNS. O módulo da Cloudflare recebe o IP do NLB como saída do módulo da OCI, então o registro da API aponta para o balanceador. O state, que registra os recursos gerenciados pelo Terraform, fica em um bucket da OCI para também ser acessado pelo pipeline.

Nos pull requests, o CI confere a formatação e valida a configuração do Terraform, sem acessar o state. O deploy da infraestrutura é disparado manualmente no Actions e tem duas etapas: gerar o plano e aplicá-lo depois da aprovação no ambiente `production`.

O detalhe que achei mais interessante foi salvar o plano em um arquivo com `terraform plan -out=tfplan`. Depois da aprovação, o segundo job aplica esse mesmo arquivo. Rodar `terraform apply` sem ele geraria um plano novo; com o arquivo salvo, a aplicação usa o plano que eu revisei. Mesmo desenvolvendo sozinho, quis praticar essa revisão antes de alterar o ambiente que está no ar. Só porque meu site faz apenas um ping, não quer dizer que eu não precise cuidar dele!

::diagram{name="infraestrutura"}

Também configurei o workflow para não executar dois deploys ao mesmo tempo. O backend OCI do Terraform oferece outra proteção: o [lock do state](https://developer.hashicorp.com/terraform/language/backend/oci#state-locking), que impede operações simultâneas sobre o mesmo state. Se ele mudar entre a geração e a aplicação do plano, o Terraform pode recusar o arquivo antigo. Vi isso em um teste local com um recurso de laboratório: a tentativa terminou em `Error: Saved plan is stale`.

Outro aprendizado foi que o arquivo do plano [pode conter dados sensíveis](https://developer.hashicorp.com/terraform/cli/commands/plan), mesmo quando eles aparecem ocultos no terminal. Como ele passa de um job para outro como artefato do GitHub, o workflow o cifra antes do envio e limita sua retenção a um dia. A senha de criptografia vem do Infisical, acessado por OIDC: o job usa uma identidade temporária do GitHub para se autenticar. Registrei essa escolha e a separação dos secrets entre as etapas no [ADR-0007](https://github.com/msouza10/probekit/blob/main/docs/adr/0007-gestao-de-segredos-com-infisical.md).

## O backend: a biblioteca de ping e o ICMP sem root

No backend, o ping usa a biblioteca [pro-bing](https://github.com/prometheus-community/pro-bing), da comunidade do Prometheus. Antes de mandar qualquer pacote, o handler resolve o nome que recebeu e confere se algum dos IPs cai em faixa privada ou reservada. Isso vale também para um hostname que aponte para um IP privado. É por isso que o Probekit recusa um `192.168.x.x`: a validação restringe os destinos aceitos e reduz o risco de acesso indevido à rede interna pela API.

A biblioteca tem uma exigência que vem do Linux. Segundo o [README do pro-bing](https://github.com/prometheus-community/pro-bing#linux), ela tenta fazer um ping "sem privilégio", o que no Linux só funciona se o grupo do processo estiver na faixa definida em `net.ipv4.ping_group_range`. A outra saída é `SetPrivileged(true)` com `setcap cap_net_raw` no binário. O projeto usa o `sysctl`: no CI ele libera a faixa inteira para os testes rodarem, e nas VMs o script de deploy libera só o grupo do usuário que roda a API, nada que um bom script shell não resolva, né?

## Então, por que um ping na web?

Voltando à pergunta do começo: a única coisa diferente num ping na web é de onde ele sai. Em vez do seu computador, quem manda o pacote são as minhas VMs da OCI, em São Paulo. Se o seu terminal não alcança um host e o Probekit alcança, já é uma pista de que o problema pode estar do seu lado. Mas é só uma pista: firewall e rota também mudam a resposta, e um host que ignora ICMP pode estar servindo o site normalmente.

Ele também não enxerga a sua rede de casa: endereço privado, como o `192.168.x.x` do roteador, é recusado. Para isso, fica com o `ping` do terminal mesmo.

Mas o ponto mais importante não é esse. Quando construí o Probekit, não foi simplesmente para fazer ping: o site em si é só uma interface para uma ferramenta. Eu queria um playground meu, onde pudesse montar, desmontar e experimentar enquanto mantenho uma plataforma no ar. As próximas ferramentas podem nascer de uma necessidade ou só da vontade de aprender alguma coisa. A ideia é registrar as escolhas, entender suas consequências e construir uma base nas tecnologias que quero usar.

Se você quiser ver como tudo isso funciona por dentro, o código e as decisões estão no [repositório](https://github.com/msouza10/probekit). E, se quiser testar o ping, é só abrir o [probekit.cc](https://probekit.cc) e tentar com um domínio seu.

## Referências

- [Repositório do Probekit](https://github.com/msouza10/probekit) e as decisões de arquitetura em [`docs/adr`](https://github.com/msouza10/probekit/tree/main/docs/adr).
- [Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), na documentação da Oracle Cloud.
- [Static Assets](https://developers.cloudflare.com/workers/static-assets/), na documentação do Cloudflare Workers.
- [Documentação do Caddy](https://caddyserver.com/docs/), um exemplo de servidor escrito em Go.
