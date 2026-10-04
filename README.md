# Probekit

Caixa de ferramentas técnicas na web — rede, arquivos, texto, cron e outros utilitários, começando por ping e DNS lookup. Também serve como laboratório pessoal de DevOps (Terraform, GitHub Actions, multicloud).

Propósito, decisões e progresso detalhado em [`OVERVIEW.md`](./OVERVIEW.md). Specs de design de cada feature em [`docs/superpowers/specs/`](./docs/superpowers/specs/).

## Estrutura

```
backend/api-service-golang/   API em Go (ping, DNS lookup)
frontend/                     frontend (ainda não iniciado)
infra/oci-vm/                 infraestrutura como código (ainda não iniciado)
docs/superpowers/specs/       specs de design de cada feature
```

## Backend

Dentro de `backend/api-service-golang/`:

```bash
go run main.go
```

Sobe um servidor em `http://localhost:8080` com as rotas:

- `GET /` — health check (`{"message":"OK"}`).
- `GET /api/ping?target=<host>&count=<n>&timeout=<segundos>` — ping ICMP real. `count` (default `5`, máximo `10`) e `timeout` em segundos (default `1`, máximo `5`) são opcionais. Rejeita IPs/hosts privados ou reservados.
- `GET /api/dns-lookup?domain=<domain>&service=<service>&proto=<proto>` — resolve A, AAAA, CNAME, MX, TXT e NS do domínio. `service`/`proto` são opcionais e, se os dois forem passados, incluem registros SRV na resposta.

Erros seguem o formato `{"error": "mensagem", "code": "categoria_do_erro"}`.

### Testes

```bash
go test ./... -v
```

Os testes do `/api/ping` fazem ping ICMP real contra um IP público (`1.1.1.1`) e contra alvos privados/inválidos — exigem permissão de rede/ICMP de saída no ambiente onde rodam.

## Licença

[MIT](./LICENSE).
