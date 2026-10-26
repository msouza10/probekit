# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Qualquer pessoa curiosa, inclusive sem formação técnica, que quer checar algo rápido: se um site ou IP responde, que registros DNS um domínio tem. Acesso sem login. O criador também usa o produto, mas não é o público-alvo exclusivo.

## Product Purpose
Caixa de ferramentas técnicas na web, aberta ao público, nascida das necessidades do criador. Primeiro recorte: ping (ICMP) e DNS lookup (A, AAAA, CNAME, MX, TXT, NS, SRV opcional). O catálogo cresce aos poucos (rede, arquivos, texto, cron e outros utilitários). Sucesso: resolver uma tarefa técnica real com uma ferramenta simples de acessar e usar. O projeto é também um laboratório pessoal de DevOps do criador.

## Positioning
Em aberto. O criador não definiu um diferencial frente a ping.eu ou dnschecker.org; não inventar um.

## Operating Context
- Frontend: Cloudflare Worker com assets estáticos. API em `api.probekit.cc` (Go, duas VMs OCI atrás de um NLB), chamada pelo navegador com CORS.
- Os testes de rede partem do servidor, não do usuário. Cada resultado informa a origem do teste, para ser interpretável: o site mostra "Sonda: OCI · São Paulo" com valores fixos (`frontend/src/lib/api.ts`), porque há uma única sonda. A API ainda não devolve `origin_region`; se um dia houver mais de uma sonda, a origem passa a vir da resposta.
- Rate limit de 50 requisições por IP a cada 5 minutos, pelo IP real do cliente (`CF-Connecting-IP`, aceito só quando a conexão vem de faixa da Cloudflare; em produção desde a release 1.2.1); destinos privados ou reservados são rejeitados (erro 400 padronizado `{"error","code"}`).

## Capabilities and Constraints
- Sem contas nem autenticação.
- Ferramentas atuais: `/api/ping` (`count`/`timeout` configuráveis, jitter) e `/api/dns-lookup`.
- Free tier dos provedores; frontend em um único provedor.
- Preferir processamento no navegador quando a operação permitir.
- Limites do resultado (já explicados na página Sobre): uma única sonda, em São Paulo; um ping sem resposta não prova que o destino está fora do ar (muitos hosts descartam ICMP); a consulta DNS usa o resolvedor da máquina da sonda, não os servidores autoritativos do domínio.
- Terminologia: "ping", "DNS lookup" (consulta de registros DNS), "ferramenta".

## Brand Commitments
- Nome: Probekit.
- Interface e voz em português do Brasil, em primeira pessoa do criador ("eu testo, aprendo, construo"), sem tom de empresa.
- O criador assina o projeto: Marcos Souza, infraestrutura, cloud e DevOps, com GitHub e LinkedIn na página Sobre.
- A coruja ASCII (AsciiOwl) é a mascote; logo e favicon atuais são identidade a preservar.

## Evidence on Hand
Não há depoimentos, números de uso, casos de cliente nem promessa de uptime. Nada disso pode ser inventado em copy. O que existe de real e pode aparecer no site: o retrato e a bio do criador (`frontend/public/brand/marcos.webp` e a página Sobre), o repositório público e seus números (commits, PRs, issues) e os ADRs e specs em `docs/`. O sistema visual está documentado em `DESIGN.md`.

## Product Principles
- Resolver a tarefa em poucos segundos, sem cadastro.
- Resultado legível por quem não é técnico, sem esconder o dado bruto de quem é.
- Dizer a verdade sobre o que foi medido e de onde partiu o teste.
- Dizer também o que a medição não prova: uma sonda só, em São Paulo; sem resposta ao ping não é o mesmo que fora do ar.
- Crescer o catálogo aos poucos, sem prometer ferramentas que não existem.

## Accessibility & Inclusion
Contraste WCAG AA e respeito a `prefers-reduced-motion` em todas as animações, inclusive a coruja ASCII.
