# Probekit — visão geral do projeto

Documento vivo para registrar o propósito, as decisões e o progresso do projeto. Atualizar conforme as definições evoluírem. (Antigo `NORTE.md`.)

## Propósito

Construir uma caixa de ferramentas técnicas na web, baseada nas necessidades do criador e aberta ao público. O Probekit não se limita a testes: poderá reunir ferramentas de rede, arquivos, texto, cron e outros utilitários.

O projeto também será um laboratório pessoal de DevOps, com infraestrutura como código usando Terraform e automação usando GitHub Actions.

## Objetivos

- Resolver tarefas técnicas reais com ferramentas simples de acessar e usar.
- Começar pequeno e expandir o catálogo conforme surgirem necessidades.
- Praticar provisionamento, integração contínua, publicação e operação de serviços.
- Distribuir ferramentas e serviços entre provedores de cloud, dentro dos respectivos free tiers.
- Manter registradas as decisões de produto e arquitetura.

## Decisões confirmadas

- Nome: **Probekit**.
- Público: o criador e qualquer pessoa interessada.
- Acesso inicial sem login.
- Primeiro recorte: ping e DNS lookup (a antiga "tradução" — esclarecido como consulta de registros DNS).
- Expansão gradual depois desse primeiro recorte.
- Multicloud inicialmente significa distribuir ferramentas e serviços entre provedores.
- Hospedar o frontend simultaneamente em várias clouds não é requisito inicial.
- Terraform e GitHub Actions fazem parte da abordagem DevOps.
- A infraestrutura deve respeitar o free tier; provedores, limites e mecanismos de controle ainda serão definidos.
- Gestão de tasks/backlog via **Azure Boards**, conectado ao repositório GitHub (código/CI/CD continuam só no GitHub — Azure Boards é usado apenas pra work items/sprints, via integração oficial GitHub ↔ Azure Boards).

## Responsabilidades

- **Criador:** DevOps, infraestrutura, Terraform e GitHub Actions; backend das ferramentas escolhidas como exercício de aprendizado de Python/Go.
- **Assistente:** frontend do site; backend das ferramentas que não forem escolhidas como aprendizado; revisão e suporte no Terraform/GitHub Actions escritos pelo criador; testes automatizados das ferramentas, mesmo quando o backend é exercício do criador.
- **Em conjunto:** escopo das ferramentas, experiência de uso, contratos de integração e a decisão, ferramenta a ferramenta, de quem escreve o backend.

Detalhes completos do acordo de colaboração em `AGENTS.md`. Spec detalhado do primeiro marco em `docs/superpowers/specs/2026-10-01-probekit-ping-dns-feature-design.md`.

## Progresso do primeiro marco

**Backend — `/api/ping`:**
- ✅ Ping ICMP real, com `count`/`timeout` configuráveis pelo cliente (defaults e limites definidos).
- ✅ Validação de IP privado/reservado (RFC1918, loopback, link-local/metadata, incluindo hostnames que resolvem pra essas faixas).
- ✅ Contrato de erro padronizado (`{"error", "code"}`).
- ✅ Suite de testes automatizados (23 casos) cobrindo validação, erros e sucesso.
- ✅ Jitter (`stats.StdDevRtt` da lib, exposto como `jitter` na resposta).
- ✅ Rate limiting por IP de origem (ver abaixo).

**Backend — `/api/dns-lookup`:**
- ✅ Resolve A, AAAA, CNAME, MX (com prioridade), TXT, NS; suporte opcional a SRV.
- ✅ Contrato de erro padronizado, consistente com `/api/ping`.
- ✅ Validação de IP privado/reservado, igual ao `/api/ping`.
- ✅ Suite de testes automatizados cobrindo validação, erros e sucesso.
- ✅ Rate limiting por IP de origem (ver abaixo).

**Rate limiting (`/api/ping` e `/api/dns-lookup`):**
- ✅ `utils.RateLimiter`: janela fixa de 5 minutos, 50 requisições/IP, aplicado via middleware em `main.go`, compartilhado entre as duas rotas.
- ✅ Testes automatizados do `RateLimiter` em isolamento (permite até o limite, bloqueia depois, IPs independentes).
- ⏳ O middleware em si (dentro de `main()`) não é testável automaticamente hoje — só a lógica do `RateLimiter`; validado manualmente ponta a ponta.
- ⏳ Sem limpeza periódica de IPs antigos ainda (mapas crescem indefinidamente) — aceitável na escala atual do projeto.

**Frontend:** não iniciado.

**Infraestrutura/deploy:** não iniciado (depende do spec de infra, `docs/superpowers/specs/2026-10-01-probekit-infra-design.md`).

## Diretrizes propostas

- Informar de onde partem os testes de rede, para tornar os resultados interpretáveis.
- Usar processamento no navegador quando a operação permitir.
- Organizar as ferramentas de modo que novas páginas e serviços possam ser adicionados gradualmente.
- Definir limites de uso e validação de destinos antes de disponibilizar operações de rede no backend ao público.
- Verificar as condições atuais de free tier antes de escolher serviços; nenhum provedor ou custo foi validado até agora.

## Fora do escopo inicial

- Contas de usuário e autenticação.
- Um catálogo amplo de ferramentas já na primeira entrega.
- Frontend ativo em múltiplos provedores simultaneamente.
- Definir agora todas as ferramentas futuras.

## Próximos passos

1. Começar o frontend (páginas `/ping` e `/dns-lookup`, 4 estados visuais), com React + Vite + TypeScript.
2. Fluxo de publicação reproduzível (Terraform + GitHub Actions, VM OCI + Cloudflare Pages).
