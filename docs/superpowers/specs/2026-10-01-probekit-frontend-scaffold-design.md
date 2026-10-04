# Probekit — scaffold inicial do frontend

## Contexto

Ver `OVERVIEW.md` (propósito e decisões do produto) e `AGENTS.md` (divisão de papéis). Este spec cobre apenas a base do frontend: o projeto, a navegação e a página inicial — sem ainda implementar as ferramentas de ping ou DNS lookup, que têm spec própria (`2026-10-01-probekit-ping-dns-feature-design.md`).

Responsável pela implementação: assistente (Claude Code), conforme `AGENTS.md`.

## Objetivo

Ter um site estático publicável, navegável, com uma página inicial que liste as ferramentas disponíveis (mesmo que ainda nenhuma esteja implementada), pronto para receber as páginas de ferramentas nos próximos specs.

## Escopo

- Projeto React + Vite, em `frontend/`.
- Roteamento entre páginas (ex: `react-router`).
- Página inicial (`/`) listando os cartões/links das ferramentas (ping, DNS lookup), mesmo que cliquem em páginas ainda vazias/"em breve".
- Layout base (cabeçalho, estrutura de página) reutilizável pelas páginas de ferramentas futuras.
- Configuração de build (`vite build`) gerando artefato estático.
- Lint/format básico (ex: ESLint + Prettier) para manter consistência no código que o assistente for gerando.

## Fora de escopo

- Lógica das ferramentas de ping e DNS lookup (spec separado).
- Chamadas a qualquer API de backend.
- Deploy automatizado no Cloudflare Pages (parte do spec de infra, que cuida do pipeline de CI/CD).
- Contas de usuário, autenticação, temas, internacionalização.

## Design

- Estrutura de pastas sugerida:
  ```
  frontend/
    src/
      pages/        # Home, Ping, DnsLookup (placeholders por enquanto)
      components/   # layout compartilhado, cartão de ferramenta
      App.tsx        # rotas
      main.tsx
  ```
- Página inicial renderiza uma lista de "cartões de ferramenta" a partir de uma lista estática simples (nome, descrição curta, rota) — isso facilita adicionar novas ferramentas depois sem reestruturar a página.
- TypeScript desde o início, para dar uma base mais segura ao crescer o catálogo de ferramentas.

## Testes

- Teste de componente (Vitest + Testing Library) garantindo que a página inicial renderiza um link por ferramenta da lista.
- `vite build` sem erros como checagem de CI (a automação do pipeline fica a cargo do spec de infra).

## Critérios de aceite

- `npm run build` gera um `dist/` estático funcional.
- Acessar `/` mostra a lista de ferramentas; clicar leva à rota da ferramenta (mesmo que vazia/placeholder).
- Estrutura permite adicionar uma nova ferramenta à lista sem alterar o layout da página inicial.

## Dependências

- Nenhuma — pode ser implementado em paralelo com o spec de infra.
