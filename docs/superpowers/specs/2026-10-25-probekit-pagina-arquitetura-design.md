# Probekit — página Arquitetura e Home mais simples

## Contexto

Ver `OVERVIEW.md` (propósito e decisões), `AGENTS.md` (papéis) e a spec do redesign visual, [`2026-10-23-probekit-frontend-redesign-design.md`](./2026-10-23-probekit-frontend-redesign-design.md), que define o visual (papel e serifa, tema escuro próprio, bancada, movimento com blur) e que este trabalho **estende**. Duas coisas dessa spec mudam aqui:

- A "etapa 1" deixou **Arquitetura** de fora (páginas, rota e item de menu). Esta spec a cobre.
- A decisão "Painel de bancada na Home" (um `ping` de exemplo rotulado) é **substituída**: o terminal de exemplo sai da Home. O criador o achou com cara de demo de produto, e sem nada que mostrasse o que está por trás do site.

Responsável pela implementação: assistente (frontend), conforme `AGENTS.md`.

## Intenção

O Probekit é um laboratório pessoal feito para testes e estudo, e quem entra deve entender isso sem ler um manifesto. A forma de mostrar é contar **como o laboratório é montado**: a arquitetura do site e da API, o pipeline de CI/CD e a infraestrutura em Terraform. Referência de postura (não de layout): a página "About" do ZerxLab, que diz o que é ("não é uma empresa nem um time de produto"), mostra um **perfil do laboratório** com fatos reais e fecha com princípios curtos, sem demos.

Cada diagrama **explica** (o movimento mostra o fluxo); nenhum enfeita. O criador aprovou o estilo no mockup animado: linhas que fluem, pacotes que viajam, um portão de aprovação que segura o deploy e recursos que aparecem em sequência.

## Objetivos

- Uma página **Arquitetura** (`/arquitetura`) com três diagramas animados: **Arquitetura** (caminho de um pedido), **Pipeline** (CI/CD) e **Infraestrutura** (Terraform).
- Uma **Home mais simples**: abertura, perfil do laboratório, "O que já funciona" (Ping e DNS Lookup) e uma linha que leva à Arquitetura.
- Cada afirmação dos diagramas e dos textos é **verdadeira e rastreável** a um arquivo do repositório.
- Diagramas legíveis em 375 px e em 1280 px, nos dois temas, com texto alternativo e sem depender do movimento para serem entendidos.

## Fora de escopo

- Linha do tempo e Artigos (specs próprias, depois).
- Dados ao vivo (versão da API, tempo de resposta): ficam de fora desta spec.
- Qualquer mudança em Ping, DNS Lookup, API, infraestrutura ou workflows.
- Internacionalização. O site continua em português.

## Anti-objetivos (seria falha, mesmo que "funcione")

- Parecer "Engineering Playground": demos, trechos de código decorativos, terminais fingindo resultado.
- Dado inventado apresentado como real; afirmação que o repositório não sustenta (o exemplo a evitar: as VMs se atualizando sozinhas, que ainda não está no ar).
- Detalhe que exponha infraestrutura (IPs, nomes de recursos, portas além do que já é público no `OVERVIEW.md`).
- Movimento que chama atenção para si, que não pare com `prefers-reduced-motion`, ou que gaste CPU fora da tela.
- Diagrama ilegível no celular (texto de 14 px reduzido a 7 px por um SVG encolhido).

## Decisões do criador

- A página se chama **Arquitetura** e é uma aba do menu.
- A Home fica mais simples e os diagramas vão para a página própria.
- Os três diagramas e o nível de movimento do mockup foram aprovados ([`assets/2026-10-25-diagramas-animados.html`](./assets/2026-10-25-diagramas-animados.html), referência de tom e de movimento, não de código).

## Decisões do assistente (o criador confere)

- **Rota e menu:** `/arquitetura`, item "Arquitetura" entre "Ferramentas" e "Sobre" no cabeçalho e no rodapé.
- **Home:** abertura, "Perfil do laboratório" (lista de chave e valor: foco, API, site, infraestrutura, entrega, decisões, licença), "O que já funciona" e uma linha "Como tudo isso é montado: Arquitetura". Saem o painel `Bench` com o `ping` de exemplo e a seção "Como os diagnósticos são executados" (o conteúdo passa para a Arquitetura).
- **Página Arquitetura:** título e introdução em prosa; três seções numeradas (01 Arquitetura, 02 Pipeline, 03 Infraestrutura), cada uma com um parágrafo, o diagrama e uma linha de links para as fontes no GitHub; ao final, **Princípios** (Roda de verdade, Fica registrado, Código aberto), três linhas curtas.
- **Diagramas em SVG** dentro de componentes React, com o movimento feito pelo Motion que o projeto já usa (desenho das linhas e entrada dos blocos ao entrar na tela) mais fluxo contínuo discreto nas linhas. O movimento só roda enquanto o diagrama está visível e para por completo com `prefers-reduced-motion` (aí o diagrama aparece parado e completo).
- **Celular:** abaixo de 640 px cada diagrama tem uma versão **vertical** (blocos empilhados com setas), com o mesmo texto. Alternativa aceita se o builder preferir: rolagem horizontal dentro de um contêiner focável, com o texto nos 14 px.
- **Acessibilidade:** cada SVG tem `role="img"` e uma descrição em texto; abaixo do diagrama há a mesma informação como lista (visível ou só para leitores de tela). O diagrama nunca é a única fonte da informação.
- **Visual:** tokens semânticos existentes (`highlight` como única cor de destaque, nada de cor nova), tema escuro desenhado e não invertido, sem gradiente, sombra ou ícone decorativo.
- **Links externos:** só `https://github.com/msouza10/probekit/...` (mesma regra do resto do site).
- **Mesma branch:** este trabalho continua na `feat/improve-frontend`, na PR única, por decisão anterior do criador (o site ainda não está em uso).
- **Tamanho mínimo do texto:** no celular os nomes dos blocos têm pelo menos 14 px efetivos e o texto secundário pelo menos 12 px. Um SVG largo apenas encolhido não atende; abaixo de 640 px vale a versão vertical, com a geometria refeita.
- **A versão vertical pode simplificar a topologia**, mantendo todos os blocos e todas as afirmações: a bifurcação do pipeline vira dois ramos empilhados e o rollback vira uma linha de nota. A rolagem interna de um contêiner focável só vale como alternativa, e a página em si nunca rola na horizontal.
- **Mecanismo do movimento:** entrada e desenho das linhas pelo Motion; fluxo contínuo (pontos nas linhas, pulso do portão e das VMs) por CSS com `@keyframes`, ligado só por um atributo `data-motion="on"` que um hook coloca quando o diagrama está visível **e** o usuário não pediu movimento reduzido. **Sem SMIL (`animateMotion`)**, porque não se pausa por CSS nem se testa no jsdom. O teste de movimento reduzido confere que o atributo não é colocado e que nenhum elemento animado é renderizado. O pulso do portão e das VMs faz parte do nível de movimento aprovado.
- **Texto equivalente:** cada diagrama tem uma lista ordenada com o fluxo em passos (o caminho do pedido, a ordem do pipeline, o que o Terraform cria). No celular a versão vertical é essa própria lista, visível. Na versão larga a lista fica só para leitores de tela, para não duplicar o texto.
- **Portão de aprovação:** a afirmação é verdadeira e vem do ADR-0008 (o `Deploy Frontend` roda no ambiente `production`, com revisor, e a aprovação foi registrada) e do ADR-0007 (a pausa de aprovação do deploy da API). O deploy da API e os dois rollbacks também usam o ambiente `production` (conferido nos workflows), então o portão aparece no passo de deploy compartilhado; o que não tiver o ambiente `production` não ganha portão.
- **Perfil do laboratório:** os valores saem do repositório e do próprio `OVERVIEW.md` (licença MIT, stack, ferramentas), sem números que envelheçam (nada de "N ADRs"). Os links vão para `https://github.com/msouza10/probekit/tree/main/docs/adr` e `https://github.com/msouza10/probekit/blob/main/LICENSE`, os mesmos que o rodapé já usa.
- **`Bench`:** continua, porque Ping e DNS Lookup o usam. Só a Home deixa de usá-lo. O texto de "Como os diagnósticos são executados" é reescrito dentro da seção de Arquitetura, sem mapeamento um para um.
- **Cores dos diagramas:** só tokens existentes (preenchimento do bloco com `card`/`background`, borda e zona tracejada com `border`, fluxo e portão com `highlight`, preenchimento do portão com `muted`). Se algum par não passar no contraste do tema escuro, o builder pode acrescentar um alias semântico (sem matiz novo), documentado no `design.md`.

## Fonte de cada afirmação

O builder confere cada rótulo dos diagramas contra estas fontes e registra a fonte no código (comentário curto) ou no teste; o que não tiver fonte sai.

| Diagrama | Afirmações | Fontes |
|---|---|---|
| Arquitetura | site é Worker estático na Cloudflare; API em Go em duas VMs na OCI em São Paulo, atrás de um balanceador (TCP 443); `api.probekit.cc` passa pelo proxy da Cloudflare; o binário termina o TLS | `OVERVIEW.md`; ADR-0001, ADR-0002; `frontend/wrangler.toml`; `infra/terraform/main.tf` (região), `infra/terraform/oci/loadbalacers.tf` e `instance.tf` |
| Pipeline | CI em pull request (Go, NPM, Terraform); release da API ao entrar mudança em `backend/api-service-golang/**` na `main`; build do site em `frontend/**` na `main`, aprovação do ambiente `production` e deploy; deploy da API manual; rollback da API e do site | `.github/workflows/ci.yml`, `build-api-golang.yml`, `deploy-frontend.yml`, `deploy-api-golang.yml`, `rollback-*.yml`; ADR-0005, ADR-0007, ADR-0008 (a aprovação do ambiente `production`); `docs/runbook-deploy.md` |
| Infraestrutura | Terraform cria rede, duas VMs, balanceador (OCI) e o registro DNS `api` (Cloudflare); estado remoto num bucket da OCI; o Worker do site é publicado pelo pipeline, não pelo Terraform | `infra/terraform/backend.tf`, `infra/terraform/oci/*.tf`, `infra/terraform/cloudflare/`; ADR-0005, ADR-0008 (só OCI e Cloudflare entram; as pastas `aws` e `azure` não fazem parte do que o site conta) |

## O que fica para o builder

- Geometria exata, tamanhos, cores dentro dos tokens, durações e a coreografia do movimento.
- Como fatiar o SVG em componentes e como compartilhar os blocos entre as versões larga e vertical.
- A ordem de execução e a quebra em tasks.
- O texto final dos parágrafos (proposta para o criador revisar; vale o tom das outras páginas).

## Critérios de aceite (verificáveis)

- `npm run build`, `npm run lint`, `npm run test` e `npm run format:check` passam em `frontend/`.
- O cabeçalho e o rodapé têm o link "Arquitetura" para `/arquitetura`; a Home não tem mais `Bench` nem o texto "exemplo", e tem um link para `/arquitetura`.
- A página tem um único `h1`, três diagramas com `role="img"` e descrição, e a lista em texto equivalente a cada um.
- Com `prefers-reduced-motion: reduce`, nenhum elemento anima (sem `animateMotion`, sem dash animado, sem deslocamento ou blur de entrada).
- O design guard continua verde e cobre os arquivos novos; nenhuma ocorrência de gradiente, sombra ou nome antigo de token.
- Lighthouse de acessibilidade em `/arquitetura`, nos dois temas, sem falha de contraste.
- Capturas de tela de `/` e `/arquitetura`, nos dois temas, em 375 px e 1280 px, sem rolagem horizontal da página e com os rótulos legíveis.
- Cada afirmação da tabela "Fonte de cada afirmação" confere com o arquivo citado.
