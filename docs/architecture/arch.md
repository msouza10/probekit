# Probekit — Arquitetura

Status: Em desenvolvimento
Última atualização: 08/10/2026
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
                       │ api.probekit.cc
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
| Frontend | `probekit.cc` | Interface do usuário |
| Backend | `api.probekit.cc` | Processamento e regras de negócio |
| Network Load Balancer | Entrada da API na OCI | Distribuição L4 (TCP) das conexões |
| VMs OCI | Endereços privados | Execução da API Go, incluindo terminação de TLS (Origin CA) |

## 4. Fluxo de uma requisição

1. Navegador (ou `curl`) acessa `api.probekit.cc` via HTTPS — TLS termina na borda da Cloudflare (certificado público automático, Universal SSL).
2. Com a zona em modo **Full (strict)** (ver [ADR-0002](../adr/0002-terminacao-tls-cloudflare-full-strict.md)), a Cloudflare reencripta a conexão até a origem e encaminha pro Network Load Balancer da OCI.
3. O Network Load Balancer distribui a conexão (L4, TCP puro — não termina TLS) entre `api-probekit-01` e `api-probekit-02`.
4. A VM escolhida termina essa segunda camada de TLS direto no binário Go (`net/http` + certificado Origin CA), processa a requisição e devolve a resposta pelo mesmo caminho.

## 5. Decisões resolvidas

- ~~Webserver na frente da API Go (nginx ou Apache, se necessário) — ainda não decidido.~~ **Resolvido em 2026-10-08** (ver [ADR-0002](../adr/0002-terminacao-tls-cloudflare-full-strict.md)): TLS termina direto no binário Go (`net/http` com `ListenAndServeTLS`), usando um certificado Origin CA emitido pela Cloudflare, com o modo SSL/TLS da zona em **Full (strict)**. Sem webserver dedicado — a API não precisa de nenhum recurso L7 adicional.
