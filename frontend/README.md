# Probekit — frontend

Frontend do Probekit: uma SPA em React + Vite + TypeScript, estilizada com Tailwind CSS v4 e componentes shadcn/ui, com transições de página via Motion e roteamento via react-router-dom.

## Scripts

Dentro de `frontend/`:

```bash
npm run dev           # servidor de desenvolvimento com HMR
npm run test           # roda a suíte de testes (Vitest) uma vez
npm run test:watch     # roda a suíte de testes em modo watch
npm run build          # type-check (tsc -b) + build de produção (Vite)
npm run lint           # lint (oxlint)
npm run format         # formata o código (Prettier)
npm run format:check   # verifica formatação sem alterar arquivos
```

## Cadeia de design tokens

[`frontend/design.md`](./design.md) é a referência visual do projeto (cores, tipografia, espaçamento, componentes, regras de "do's and don'ts"). Esses tokens vivem como variáveis CSS nos blocos `@theme` e `:root` de [`src/index.css`](./src/index.css); as utilities do Tailwind e os componentes shadcn/ui consomem essas variáveis diretamente, então qualquer mudança de token nesse arquivo se propaga para o app inteiro.

## Como adicionar uma nova ferramenta

Edite [`src/lib/tools.ts`](./src/lib/tools.ts) — tanto a lista da home page quanto o dropdown "Ferramentas" do header leem desse mesmo array automaticamente. Basta adicionar um novo item (`name`, `description`, `href`) e, se a rota ainda não existir, registrar a página correspondente em `src/AnimatedRoutes.tsx`.

## Páginas `/ping` e `/dns-lookup`

As duas páginas chamam a API de verdade por [`src/lib/api.ts`](./src/lib/api.ts) (`runPing` e `runDnsLookup`) e tratam os estados de carregando, sucesso e erro. O contrato da API e o comportamento esperado estão na spec [`docs/superpowers/specs/2026-10-01-probekit-ping-dns-feature-design.md`](../docs/superpowers/specs/2026-10-01-probekit-ping-dns-feature-design.md).

- A região de origem exibida vem do campo `origin_region` da resposta. Enquanto a API não o devolver, o badge simplesmente não aparece.
- Se a API não responder, **em produção** a página mostra o erro. A simulação de resultados (valores aleatórios, marcada como "Simulação local") só existe em desenvolvimento (`import.meta.env.DEV`), para um resultado inventado nunca passar por verdadeiro.

## Variáveis de ambiente

Veja [`.env.example`](./.env.example). Há uma só variável:

| Variável            | Função                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_API_BASE_URL` | URL base da API. Em produção: `https://api.probekit.cc`. Vazia (padrão no desenvolvimento), as chamadas ficam relativas (`/api/...`) e o proxy do Vite as encaminha para a API local |

O Vite embute essa variável **no momento do build**. Um build feito sem ela, publicado em produção, chama `/api/...` no próprio Worker (que só serve arquivos) e as ferramentas falham.

## Desenvolvimento com a API local

O proxy do Vite (`vite.config.ts`) encaminha `/api` para `https://localhost:8443`, aceitando o certificado autoassinado. Suba a API como descrito no [README raiz](../README.md#backend) (`ADDR=:8443` e um par de certificado de teste) e rode `npm run dev`. Como o navegador vê tudo na mesma origem, o CORS não entra em jogo no desenvolvimento.

## Publicação

O site é um **Cloudflare Worker com assets estáticos**, definido em [`wrangler.toml`](./wrangler.toml): o Worker `probekit` serve o conteúdo de `dist/`, devolve o `index.html` para rotas desconhecidas (o React Router assume, inclusive para `/ping` e `/dns-lookup` acessados direto) e liga os domínios `probekit.cc` e `www.probekit.cc`, para os quais a Cloudflare cria o DNS e o certificado.

Hoje o deploy é **manual**:

```bash
cd frontend
npx wrangler login        # uma vez, autentica na conta da Cloudflare
VITE_API_BASE_URL=https://api.probekit.cc npm run build
npx wrangler deploy
```

Para validar a configuração sem publicar nada: `npx wrangler deploy --dry-run`.

Efeito colateral do fallback de SPA: rotas inexistentes respondem **HTTP 200** com a página de "não encontrado" do React, não 404.

O workflow de deploy automático (`cloudflare/wrangler-action` na `main`) ainda não existe; está no plano do primeiro deploy, Task 12.
