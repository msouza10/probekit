# ADR-0004: O frontend chama a API diretamente, com CORS por lista de origens

## Status
Aceita

## Contexto

O site é servido por um Cloudflare Worker em `probekit.cc` e `www.probekit.cc`, e a API fica em `api.probekit.cc`. São origens diferentes (o host muda), então o navegador só entrega ao JavaScript do site a resposta da API se ela autorizar essa origem por cabeçalhos CORS. Antes desta decisão a API não tinha CORS: um `OPTIONS` respondia 405, e a chamada pelo navegador falharia mesmo com `curl` funcionando.

Era preciso decidir como o site alcança a API (decisão D2 do plano do primeiro deploy).

## Decisão

O navegador chama `https://api.probekit.cc` **diretamente**, e a API implementa CORS.

**API (`utils.WithCORS`, aplicado por fora de todas as rotas e do rate limit):**

- As origens permitidas vêm da variável `CORS_ALLOWED_ORIGINS` (lista separada por vírgula), definida na unit do systemd pelo `deploy-api-go.sh`: `https://probekit.cc,https://www.probekit.cc`. Variável vazia significa que ninguém é liberado.
- A comparação é **exata** (esquema, host e porta). `http://probekit.cc`, `https://probekit.cc.evil.com` e `https://probekit.cc:8443` não passam. Não há curinga.
- Origem permitida: a resposta devolve `Access-Control-Allow-Origin` com a própria origem recebida (nunca `*`) e `Vary: Origin`.
- Preflight (`OPTIONS` com `Origin` e `Access-Control-Request-Method`): origem permitida recebe **204** com `Access-Control-Allow-Methods: GET, OPTIONS`, sem executar a ferramenta; origem não permitida recebe **403** sem cabeçalhos CORS.
- Origem não permitida em uma requisição comum ainda chega ao handler, sem cabeçalhos CORS: quem esconde a resposta é o navegador.
- Sem `Origin` (curl, health check) nada muda.
- Só `GET` e `OPTIONS` são anunciados, e nenhum cabeçalho personalizado: a API não usa `POST` nem `Authorization`.

**Frontend:** a URL base vem de `VITE_API_BASE_URL`, embutida no **build** (`https://api.probekit.cc` em produção). Em desenvolvimento a variável fica vazia e o proxy do Vite encaminha `/api` para a API local, na mesma origem, sem CORS.

## Alternativas consideradas

### Proxy no Worker (`/api` do site encaminhando para a API)

O navegador falaria só com `probekit.cc`, sem CORS.

**Motivo da não escolha:** exige código no Worker (hoje ele só serve arquivos estáticos), acrescenta um salto a cada chamada e consome requisições do Worker. A API passaria a receber o tráfego de um único ponto, o que também complicaria o limite por IP.

### `Access-Control-Allow-Origin: *`

**Motivo da não escolha:** libera qualquer site. A lista de origens deixa claro quem pode usar a API pelo navegador e custa pouco.

### Subdomínios por padrão (`https://*.probekit.cc`)

**Motivo da não escolha:** o cabeçalho `Access-Control-Allow-Origin` não aceita padrões. Suportá-los exigiria validar o host por código, e é nesse tipo de atalho que nascem falhas de segurança. Cada origem nova entra na lista explicitamente.

## Consequências

### Positivas

- Um salto a menos e nenhum código no Worker.
- Em desenvolvimento nada muda: o proxy do Vite mantém tudo na mesma origem.
- Origens fora da lista não recebem permissão, e o `Vary: Origin` evita que um cache da Cloudflare sirva a resposta de uma origem para outra.

### Negativas

- A URL da API é fixada **no build**: um build sem `VITE_API_BASE_URL` publicado em produção chama `/api` no próprio Worker e as ferramentas falham.
- Liberar uma origem nova (um `app.probekit.cc`, por exemplo) exige mudar a lista no `deploy-api-go.sh` e rodar o *Deploy*.
- O CORS **não protege a API**: `curl` e qualquer outro cliente que não seja navegador continuam passando. O rate limit segue sendo a defesa contra abuso.

## Validação

Verificado em produção em 2026-10-17, contra `api.probekit.cc`:

| Requisição | Resultado |
|---|---|
| `OPTIONS /api/ping` de `https://probekit.cc` | 204, `allow-origin: https://probekit.cc`, `allow-methods: GET, OPTIONS`, `vary: Origin` |
| `OPTIONS /api/dns-lookup` de `https://www.probekit.cc` | 204, `allow-origin: https://www.probekit.cc` |
| `OPTIONS /api/ping` de `https://evil.com` | 403, sem cabeçalhos CORS |
| `GET /` com `Origin` permitida | 200, `allow-origin` e `vary` presentes |
| `GET /` sem `Origin` | 200, sem cabeçalhos CORS |

Testes automatizados em `backend/api-service-golang/tests/cors_test.go`: leitura das origens, o middleware isolado (origem permitida, sufixo, esquema e porta errados, `null`, preflight) e o binário real respondendo preflight em `/`, `/api/ping` e `/api/dns-lookup`. No frontend, `src/lib/api.test.ts` cobre o prefixo da URL.

## Referências

- [MDN: Cross-Origin Resource Sharing](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/CORS)
- [ADR-0003](0003-porta-origem-e-entrega-do-certificado.md)
- `backend/api-service-golang/utils/cors.go`, `frontend/src/lib/api.ts`
