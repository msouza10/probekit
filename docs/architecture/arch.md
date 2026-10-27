# Probekit — Arquitetura

Status: No ar (primeiro marco: ping e DNS lookup)
Última atualização: 17/10/2026
Tipo: Documento vivo
Projeto: Probekit

## 1. Visão geral

O Probekit é uma plataforma de ferramentas e utilitários voltada à administração de sistemas, redes e infraestrutura. Além de disponibilizar ferramentas acessíveis por uma interface web, o projeto serve como ambiente de aprendizado e experimentação de tecnologias relacionadas a DevOps, Cloud Computing, automação e arquitetura multicloud.

A arquitetura inicial usa Cloudflare para hospedar o frontend e Oracle Cloud Infrastructure (OCI) para executar e distribuir as requisições destinadas à API.

## 2. Diagrama de arquitetura

```
                    USUÁRIO
                       │
                       │ HTTPS
                       ▼
              ┌──────────────────┐
              │    Cloudflare    │
              │     Workers      │
              │                  │
              │ Frontend         │
              │ probekit.cc      │
              └──────────────────┘
                       │
                       │ o navegador chama a API em outra origem
                       │ (api.probekit.cc, com CORS)
                       ▼
              ┌──────────────────┐
              │    Cloudflare    │
              │    DNS / Proxy   │
              └──────────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │       OCI        │
              │ Network Load     │
              │ Balancer (L4)    │
              └──────────────────┘
                       │
               distribuição TCP
                       │
                ┌──────┴──────┐
                ▼             ▼
          ┌───────────┐ ┌───────────┐
          │ OCI VM 01 │ │ OCI VM 02 │
          │  API Go   │ │  API Go   │
          └───────────┘ └───────────┘
```

## 3. Componentes

| Componente | Endpoint | Responsabilidade |
|---|---|---|
| Frontend | `probekit.cc` e `www.probekit.cc` | SPA React servida por um Cloudflare Worker só com assets estáticos (`frontend/wrangler.toml`). Publicado manualmente com o Wrangler |
| Backend | `api.probekit.cc` | API Go: ping ICMP, DNS lookup, rate limit e CORS |
| Network Load Balancer | Entrada da API na OCI | Distribuição L4 (TCP/443) das conexões, sem terminar TLS. Preserva o IP de origem da conexão |
| VMs OCI | Endereços privados | Execução da API Go, incluindo terminação de TLS (Origin CA) |
| Terraform | `infra/terraform/` | Rede, VMs e NLB na OCI; registro DNS `api` (proxied) na Cloudflare. State remoto em bucket OCI |
| GitHub Actions | `.github/workflows/` | *Build & Release API* (release do binário a cada merge no backend) e *Deploy* (manual: Terraform, certificado e script nas VMs) |
| GitHub Releases | `probekit-linux-amd64-api-go-X.Y.Z` | Binário e `SHA256SUMS` que as VMs baixam |

## 4. Fluxo de uma requisição

### 4.1 Carregar o site

O navegador abre `https://probekit.cc`. A Cloudflare entrega os arquivos estáticos pelo Worker `probekit`. O build pré-renderiza cada rota em um HTML próprio (`index.html`, `ping.html`, `dns-lookup.html`, `arquitetura.html`, `sobre.html`), com o `<head>` da página e o conteúdo já no HTML; o Worker serve `/ping` pelo `ping.html` e o React hidrata a página no navegador. Quando há artigos em `frontend/content/artigos/*.md`, o mesmo build compila cada um (markdown para uma árvore, com o código colorido), grava `artigos.html` e `artigos/<slug>.html` e gera a imagem social `og/<slug>.png`; nada disso roda no servidor depois do deploy ([runbook de artigos](../runbook-artigos.md)). Qualquer outro endereço recebe o `404.html` com status **404** (`not_found_handling = "404-page"` no `wrangler.toml`), para os buscadores não indexarem URLs inexistentes.

### 4.2 Chamar a API

O JavaScript do site chama `https://api.probekit.cc` diretamente — é outra origem, então vale o CORS: o navegador só entrega a resposta se a API devolver `Access-Control-Allow-Origin` com a origem do site. Para as chamadas simples basta o cabeçalho na resposta; se o navegador pedir antes uma permissão (`OPTIONS` com `Access-Control-Request-Method`, o preflight), a API responde 204 sem executar a ferramenta. As origens permitidas vêm de `CORS_ALLOWED_ORIGINS` ([ADR-0004](../adr/0004-chamada-frontend-api-com-cors.md)). O middleware fica por fora de todas as rotas e do rate limit.

Os passos abaixo detalham o caminho da requisição até a VM.

1. Navegador (ou `curl`) acessa `api.probekit.cc` via HTTPS — TLS termina na borda da Cloudflare (certificado público automático, Universal SSL).
2. Com a zona em modo **Full (strict)** (ver [ADR-0002](../adr/0002-terminacao-tls-cloudflare-full-strict.md)), a Cloudflare reencripta a conexão até a origem e encaminha pro Network Load Balancer da OCI.
3. O Network Load Balancer distribui a conexão (L4, TCP puro — não termina TLS) entre `api-probekit-01` e `api-probekit-02`.
4. A VM escolhida termina essa segunda camada de TLS direto no binário Go (`net/http` + certificado Origin CA), processa a requisição e devolve a resposta pelo mesmo caminho.

**Qual IP o Go enxerga.** O NLB preserva o IP de origem da conexão (padrão do `isPreserveSource`; confirmado em 2026-10-17 listando as conexões estabelecidas na VM com `ss`). Portanto `r.RemoteAddr` é o IP da **borda da Cloudflare** (faixa `172.64.0.0/13` e semelhantes), e o IP do usuário só aparece no cabeçalho `CF-Connecting-IP`. O limite de requisições usa `utils.RealIP` (`backend/api-service-golang/utils/client_ip.go`): só confia no cabeçalho quando a conexão vem de uma faixa de IP da Cloudflare, carregada da API pública da Cloudflare na inicialização do serviço; fora das faixas, usa o IP da própria conexão. Como o NLB preserva a origem, quem acessar o NLB direto aparece com o próprio IP, fora das faixas, e não consegue forjar o cabeçalho. Se a lista de faixas não carregar na inicialização, o erro vai para o log e o limite passa a usar o IP da conexão, ou seja, o da borda. Implementado no commit `4dda529` (release 1.2.1); em 2026-10-26 a API em produção respondia na versão 1.3.0. O comportamento por usuário, de ponta a ponta, ainda não foi testado de fora.

**Health check.** O NLB verifica as VMs abrindo uma conexão TCP na 443 a cada 10 segundos e fechando sem fazer o handshake TLS. O Go registra cada uma como `http: TLS handshake error ... EOF`; é ruído esperado, não falha.

## 5. Decisões resolvidas

Decisões de porta, certificado, CORS e atualização das VMs estão nos ADRs [0003](../adr/0003-porta-origem-e-entrega-do-certificado.md), [0004](../adr/0004-chamada-frontend-api-com-cors.md) e [0005](../adr/0005-atualizacao-das-vms-e-deploy-inicial.md). Outras, com o registro de por quê:

- **ICMP sem privilégio.** O `pro-bing` usa sockets ICMP de datagrama, que no Ubuntu só funcionam para grupos dentro de `net.ipv4.ping_group_range` (o padrão `1 0` é vazio, ou seja, desligado). O `deploy-api-go.sh` grava esse intervalo apenas com o gid do usuário do serviço, em `/etc/sysctl.d/99-probekit-ping.conf`. O serviço também recebe `CAP_NET_RAW` para ferramentas futuras que precisem de sockets raw, como traceroute.

- ~~Webserver na frente da API Go (nginx ou Apache, se necessário) — ainda não decidido.~~ **Resolvido em 2026-10-08** (ver [ADR-0002](../adr/0002-terminacao-tls-cloudflare-full-strict.md)): TLS termina direto no binário Go (`net/http` com `ListenAndServeTLS`), usando um certificado Origin CA emitido pela Cloudflare, com o modo SSL/TLS da zona em **Full (strict)**. Sem webserver dedicado — a API não precisa de nenhum recurso L7 adicional.
