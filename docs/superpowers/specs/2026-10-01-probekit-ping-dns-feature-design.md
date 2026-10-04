# Probekit — feature: ping e DNS lookup

## Contexto

Ver `OVERVIEW.md` e `AGENTS.md`. Este spec cobre a implementação das duas ferramentas do primeiro marco: ping e DNS lookup ("tradução"), backend e frontend. Assume que o scaffold do frontend (`2026-10-01-probekit-frontend-scaffold-design.md`) e a VM do backend (`2026-10-01-probekit-infra-design.md`) existem ou estão em paralelo.

Responsável pela implementação: assistente (Claude Code), conforme `AGENTS.md`.

## Objetivo

Entregar as duas ferramentas de ponta a ponta: usuário acessa a página da ferramenta, informa um destino, recebe o resultado (ou um erro compreensível), com o backend protegido contra abuso básico.

## Escopo

### Backend (Go, roda na VM do spec de infra)

- `GET /api/ping?target=<host>&count=<n>&timeout=<segundos>`
  - Executa ping ICMP real contra `target`.
  - Retorna: latência mínima/média/máxima (como string legível, ex: `"12.5ms"`, não número cru), percentual de perda de pacotes, jitter.
  - `count` e `timeout` são opcionais e configuráveis pelo cliente: `count` default `5`, máximo `10`; `timeout` (em segundos) default `1`, máximo `5`. Valores fora do limite ou não numéricos são rejeitados com `400`.
  - Resolvido: `timeout` precisa comportar `count × interval` entre pacotes. O interval default da lib é `1s`, o que com os defaults de `count=5`/`timeout=1s` só enviava 1 pacote na prática (confirmado em teste). Fix aplicado: `pinger.Interval = 200ms`, cabendo os 5 pacotes do default dentro do timeout de `1s`.
- `GET /api/dns-lookup?domain=<domain>`
  - Resolve o domínio e retorna registros A, AAAA, CNAME, MX, TXT e NS (os que existirem). Ausência de um tipo de registro não é erro — só os campos correspondentes voltam vazios.
  - `Addrs` (via `net.LookupHost`) e `Ip` (via `net.LookupIP`) voltam os dois no corpo da resposta, com o mesmo conteúdo (A/AAAA), só em formatos diferentes — redundância aceita de propósito, caso o frontend prefira um formato ou outro.
  - `MX` vem como lista de `{host, priority}` (não só a string do host), preservando a prioridade do registro.
  - Suporte opcional a SRV: se os query params `service` e `proto` forem passados junto com `domain`, a resposta inclui `srv` (lista de `{name, port, priority, weight}`). Sem esses params, `srv` vem vazio. Extensão além do escopo original deste spec, adicionada depois por decisão do criador.
- Validação de destino (aplica-se às duas rotas):
  - Rejeita IPs/hosts que resolvam para faixas privadas/reservadas (RFC1918, loopback, link-local, endereço de metadata de cloud `169.254.169.254`).
  - Erro claro (`400`) explicando a rejeição, sem expor detalhes internos.
- Rate limiting por IP de origem (ex: N requisições por minuto); excedido retorna `429` com mensagem indicando quando tentar de novo.
- Resposta sempre inclui de onde partiu o teste (região/provedor da VM), para o resultado ser interpretável — conforme diretriz da `OVERVIEW.md`.

### Frontend (React, usa o scaffold existente)

- Página `/ping`: campo de input para o destino, botão de executar, exibição dos 4 estados (carregando, sucesso com os números formatados, entrada inválida, falha) e exibição de onde partiu o teste.
- Página `/dns-lookup`: campo de input para o domínio, mesma lógica de estados, resultado organizado por tipo de registro.
- Chamadas à API do backend via `fetch`, tratando os códigos de erro (`400`, `429`, `5xx`, timeout de rede) e mapeando cada um para o estado visual correspondente.

## Fora de escopo

- Histórico de buscas, favoritos, ou qualquer persistência de dados do usuário.
- Múltiplas regiões de origem para o ping (só a VM definida no spec de infra, por enquanto).
- Allowlist de destinos ou captcha (ficou definido como fora do escopo da v1 na fase de design).

## Design

- Backend como um único binário Go, pacotes sugeridos: `internal/ping`, `internal/dnslookup`, `internal/validate` (checagem de IP privado), `internal/ratelimit`, `cmd/api` (HTTP server e rotas).
- Contrato de API em JSON, com um formato de erro consistente entre as rotas: `{"error": "mensagem", "code": "invalid_target" | "rate_limited" | "timeout" | "internal_error"}`.
- Frontend consome a API via uma camada fina de cliente HTTP (ex: `src/api/probekit.ts`) para não espalhar `fetch` pelas páginas.

## Testes

- Backend: testes unitários para `internal/validate` (faixas privadas/reservadas) e `internal/ratelimit` (limite estourando e resetando); testes do handler HTTP usando um "executor" de ping/DNS mockável (sem depender de rede real em CI).
- Frontend: testes de componente para `/ping` e `/dns-lookup` cobrindo os 4 estados, mockando a camada de API.
- Teste manual: após deploy, validar ping e DNS lookup contra um destino público real (ex: `1.1.1.1` / `cloudflare.com`) e contra um IP privado (deve ser rejeitado).

## Critérios de aceite

- Ping contra um host público real retorna latência, perda e jitter corretos.
- Ping contra um IP privado (ex: `10.0.0.1`) é rejeitado com erro claro, sem tentar executar.
- DNS lookup contra um domínio real retorna ao menos os registros A e NS.
- Passar do limite de requisições retorna erro de rate limit, sem derrubar o serviço.
- As duas páginas do frontend cobrem os 4 estados visuais corretamente.

## Dependências

- Depende do scaffold do frontend existir para ter onde plugar as páginas.
- Depende da VM do spec de infra existir para o backend ter onde rodar (mas pode ser desenvolvido e testado localmente antes do deploy).
