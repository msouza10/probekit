# Probekit

O **Probekit** é um projeto pessoal que une uma caixa de ferramentas técnicas na web a um laboratório de aprendizado. A ideia é resolver necessidades do dia a dia e, ao mesmo tempo, experimentar novas tecnologias e aplicá-las em um projeto real, do código à operação.



## Por que este projeto existe

O Probekit é um espaço para aprender fazendo. Cada ferramenta oferece uma oportunidade de explorar uma tecnologia, entender suas escolhas e limitações e acompanhar como ela se comporta na prática.

O aprendizado passa por diferentes partes do projeto:

- **Backend:** praticar Go e Python na construção de APIs e ferramentas úteis.
- **Frontend:** construir uma interface acessível e agradável, com React, Vite e TypeScript como stack planejada.
- **DevOps:** praticar infraestrutura como código com Terraform e automação de integração e publicação com GitHub Actions.
- **Cloud e operação:** explorar a distribuição de serviços entre provedores, respeitando os limites dos respectivos free tiers, e aprender a publicar e manter esses serviços.

As tecnologias entram conforme surgem necessidades e oportunidades de aprendizado. O projeto evolui de forma incremental, com espaço para testar abordagens, rever decisões e aplicar o que foi aprendido nas próximas entregas.

## Estado atual

O projeto está em desenvolvimento. A API em Go já implementa ping ICMP e consulta de registros DNS, com validação de destinos, respostas de erro padronizadas, limite de requisições por IP e testes automatizados.

O frontend e a infraestrutura de publicação ainda estão na fase de planejamento. Os próximos passos são criar as páginas das duas ferramentas e colocar em prática um fluxo de publicação reproduzível com Terraform e GitHub Actions.

## Estrutura

```
backend/api-service-golang/   API em Go e testes automatizados
frontend/                    planejamento do frontend
infra/oci-vm/                espaço reservado para infraestrutura como código
docs/superpowers/specs/      especificações de funcionalidades e arquitetura
```

## Executar localmente

Requer Go **1.25.0 ou superior**, conforme o `go.mod`, e conectividade de rede para as consultas DNS e os testes ICMP.

```bash
cd backend/api-service-golang
go run main.go
```

O servidor fica disponível em `http://localhost:8080`.

### Rotas disponíveis

- `GET /` — health check (`{"message":"OK"}`).
- `GET /api/ping?target=<host>&count=<n>&timeout=<segundos>` — ping ICMP real. `count` (default `5`, máximo `10`) e `timeout` em segundos (default `1`, máximo `5`) são opcionais. Rejeita IPs/hosts privados ou reservados.
- `GET /api/dns-lookup?domain=<domain>&service=<service>&proto=<proto>` — resolve A, AAAA, CNAME, MX, TXT e NS do domínio. `service`/`proto` são opcionais e, se os dois forem passados, incluem registros SRV na resposta.

As duas rotas de ferramentas compartilham um limite de **50 requisições por IP a cada janela de 5 minutos**. Erros seguem o formato `{"error": "mensagem", "code": "categoria_do_erro"}`.

Exemplos de chamadas:

```bash
curl 'http://localhost:8080/'
curl 'http://localhost:8080/api/ping?target=1.1.1.1&count=3&timeout=1'
curl 'http://localhost:8080/api/dns-lookup?domain=example.com'
```

### Testes

No diretório `backend/api-service-golang/`:

```bash
go test ./... -v
```

Os testes do `/api/ping` fazem ping ICMP real contra um IP público (`1.1.1.1`) e contra alvos privados/inválidos — exigem permissão de rede/ICMP de saída no ambiente onde rodam.

## Documentação do projeto

- [`OVERVIEW.md`](./OVERVIEW.md): propósito, decisões, progresso e próximos passos.
- [`Especificações`](./docs/superpowers/specs/): escopo e decisões de design das funcionalidades, do frontend e da infraestrutura.
- [`AGENTS.md`](./AGENTS.md): acordo de colaboração entre o criador e o assistente. Infraestrutura e parte dos backends ficam com o criador como prática; o assistente contribui com frontend, testes, revisão e apoio ao aprendizado.

## Licença

[MIT](./LICENSE).
