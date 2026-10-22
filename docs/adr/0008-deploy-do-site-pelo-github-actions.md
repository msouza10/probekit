# ADR-0008: Deploy do site pelo GitHub Actions

## Status

Aceita (2026-10-21).

## Contexto

O site é um Worker da Cloudflare com assets estáticos (`frontend/wrangler.toml`), publicado à mão com o Wrangler. O epic de CI/CD (#13) pede que um push em `frontend/**` na `main` publique o site, com verificação depois e um jeito de voltar à versão anterior.

Duas escolhas foram feitas: **como** publicar (o pipeline em que roda) e **onde** guardar o token da Cloudflare que publica.

## Decisão

1. **O deploy roda no GitHub Actions** (`.github/workflows/deploy-frontend.yml`), em dois jobs:
   - `Build Frontend`, sem token: instala, roda lint, formatação e testes, faz o build com `VITE_API_BASE_URL=https://api.probekit.cc`, confere que o `dist/` contém essa URL e sobe o `dist` como artefato de 1 dia. O artefato não é sensível: é o site que será público.
   - `Deploy Frontend`, no ambiente `production` (com revisor, só a `main`): **pede a aprovação depois** de o build passar, baixa o `dist`, publica com `npx wrangler deploy` (a versão do Wrangler travada no `package-lock.json`) e roda `verify-sites.sh` e `verify-api-routes.sh`, que falham o job se o site ou o CORS da API não responderem como esperado.
2. **O token fica como secret do ambiente `production` do GitHub** (`CF_API_TOKEN` e `CF_ACCOUNT_ID`), e não no Infisical. É uma decisão **temporária**: o Infisical ainda será reorganizado, e guardar o token lá, como está, o entregaria também aos jobs de infraestrutura. O job do site referencia só esses dois secrets, e o token é de uso exclusivo do site, com o mínimo de permissões.
3. **O rollback** é o do Wrangler (`wrangler rollback`) ou o do painel; está no runbook, seção 5.4.

## Alternativas consideradas

### Workers Builds (a integração Git da Cloudflare)

A Cloudflare constrói e publica o Worker a cada push na branch de produção, com uma URL de prévia por branch.

**Motivo da não escolha:** a configuração (comando de build, diretório, variáveis, filtros) fica no painel da Cloudflare e não no repositório, sem revisão em PR nem histórico no git. O pipeline passaria a ficar dividido entre o GitHub Actions (API) e o painel (site). E não há um passo que falhe o job quando a verificação pós-deploy não passa. O projeto é também um laboratório de DevOps, e escrever esse pipeline faz parte do objetivo. A comodidade que se perde (sem token no GitHub, prévias prontas) é real, mas não foi decisiva.

### Hospedar em outro lugar (GitHub Pages, Netlify, Vercel, OCI)

**Motivo da não escolha:** não houve ganho claro. O domínio e o DNS já estão na Cloudflare, e a documentação da Cloudflare diz que as requisições a assets estáticos são gratuitas e ilimitadas em Workers. Essas alternativas foram comparadas apenas por argumento, sem teste.

### Token no Infisical

**Motivo da não escolha (por ora):** o login do workflow lê o ambiente `prod` inteiro, então o token chegaria aos jobs de infraestrutura, inclusive ao `plan`, que roda sem aprovação. Isolá-lo exigiria um ambiente separado no Infisical, o que fica para a reorganização dele.

## Consequências

### Positivas

- O pipeline do site fica no repositório, revisado por PR, e visível no mesmo lugar do da API.
- A aprovação só é pedida para um build que já passou, e o site publicado é exatamente o `dist` verificado.
- O token só existe no passo de deploy, e as verificações falham o job se o site ou o CORS quebrarem.
- O rollback não depende do código: é uma operação da Cloudflare.

### Negativas

- O token da Cloudflare fica **fora do Infisical**, o que contraria em parte o objetivo do [ADR-0007](./0007-gestao-de-segredos-com-infisical.md) de ter os segredos em um lugar só.
- O ambiente `production` passa a guardar também o token do site, junto das credenciais da API. A aprovação do site fica amarrada ao mesmo ambiente: desligá-la só para o site exigiria um ambiente próprio.
- Sem as prévias por pull request que o Workers Builds oferece. Elas ficam como objetivo futuro.
- Se o token tiver data de validade, o deploy do site falha quando ela vencer.

## Validação

Verificado em 2026-10-21, em um run manual do workflow (run `39539547916`):

- os dois jobs passaram, incluindo a checagem da URL no `dist` e a verificação do site e da API;
- a aprovação do `production` ficou registrada, e o `Deploy Frontend` só começou cerca de 38 segundos depois do fim do `Build Frontend`;
- o artefato do `dist` ficou com retenção de 1 dia.

Verificado em 2026-10-22: o disparo por push em `frontend/**` (run `39698488264`, evento `push` na `main`, com uma mudança só no `frontend/README.md`): os dois jobs passaram, com a aprovação do `production` registrada.

Verificado em 2026-10-22: o rollback em produção com `wrangler rollback`. A versão ativa passou de `f0e2ba05` para a anterior (`782d862d`) em um novo deployment, e o site continuou respondendo 200. As duas versões serviam os mesmos arquivos, então o teste não alterou o conteúdo no ar.

## Referências

- [Runbook de deploy](../runbook-deploy.md), seção 5
- [ADR-0004](./0004-chamada-frontend-api-com-cors.md) e [ADR-0007](./0007-gestao-de-segredos-com-infisical.md)
- [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
