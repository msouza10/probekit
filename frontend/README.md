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

## Placeholders `/ping` e `/dns-lookup`

As páginas `/ping` e `/dns-lookup` são placeholders estáticos intencionais ("Em breve") neste scaffold. A lógica real dessas ferramentas (contrato de API, UI de resultado, tratamento de erro) pertence a uma spec separada: [`docs/superpowers/specs/2026-10-01-probekit-ping-dns-feature-design.md`](../docs/superpowers/specs/2026-10-01-probekit-ping-dns-feature-design.md).
