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
- Os testes de rede partem do servidor, não do usuário. As diretrizes do OVERVIEW pedem informar a origem do teste (`origin_region`, ainda não implementado) para o resultado ser interpretável.
- Rate limit de 50 requisições por IP a cada 5 minutos; destinos privados ou reservados são rejeitados (erro 400 padronizado `{"error","code"}`).

## Capabilities and Constraints
- Sem contas nem autenticação.
- Ferramentas atuais: `/api/ping` (`count`/`timeout` configuráveis, jitter) e `/api/dns-lookup`.
- Free tier dos provedores; frontend em um único provedor.
- Preferir processamento no navegador quando a operação permitir.
- Terminologia: "ping", "DNS lookup" (consulta de registros DNS), "ferramenta".

## Brand Commitments
- Nome: Probekit.
- Interface e voz em português do Brasil.
- A coruja ASCII (AsciiOwl) é a mascote; logo e favicon atuais são identidade a preservar.

## Evidence on Hand
Não há depoimentos, números de uso, casos de cliente nem promessa de uptime. Nada disso pode ser inventado em copy. O sistema visual está documentado em `DESIGN.md`.

## Product Principles
- Resolver a tarefa em poucos segundos, sem cadastro.
- Resultado legível por quem não é técnico, sem esconder o dado bruto de quem é.
- Dizer a verdade sobre o que foi medido e de onde partiu o teste.
- Crescer o catálogo aos poucos, sem prometer ferramentas que não existem.

## Accessibility & Inclusion
Contraste WCAG AA e respeito a `prefers-reduced-motion` em todas as animações, inclusive a coruja ASCII.
