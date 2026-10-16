# ADR-0002: Terminação de TLS na origem (Cloudflare Full Strict + Origin CA)

## Status
Aceita

## Contexto

O Probekit expõe a API Go (`api.probekit.cc`) atrás de um OCI Network Load Balancer (ver [ADR-0001](0001-oci-network-load-balancer.md)). O NLB opera em L3/L4 e não termina TLS nem interpreta HTTP — quem termina TLS precisa ser a própria instância, na ponta.

O registro DNS `cloudflare_dns_record.api` fica com `proxied = true` (decisão 10 do spec de infraestrutura, `docs/superpowers/specs/2026-10-01-probekit-infra-design.md`): o IP real do Load Balancer fica escondido atrás da Cloudflare, e o firewall do NLB/VMs pode ser restringido só aos ranges de IP da Cloudflare.

Requisito de produto: qualquer pessoa — via navegador ou via terminal (`curl`) — precisa conseguir chamar `https://api.probekit.cc` e receber uma resposta válida, sem aviso de certificado. O projeto roda inteiramente em free tier (OCI Always Free, Cloudflare free), então custo e esforço operacional de manutenção do certificado são critérios relevantes.

Faltava decidir (`docs/architecture/arch.md`, seção 5): quem termina TLS do lado da origem, e com qual tipo de certificado.

## Decisão

Terminar TLS diretamente no binário Go, usando `net/http` com `ListenAndServeTLS` — sem webserver dedicado (nginx/Apache) na frente.

A origem usa um certificado **Origin CA emitido pela própria Cloudflare**, e o modo SSL/TLS da zona é configurado como **Full (strict)**.

## Alternativas consideradas

### Cloudflare Flexible (sem TLS na origem)

O tráfego entre a Cloudflare e a origem (NLB → VM) fica em HTTP puro, sem criptografia nenhuma.

**Motivo da não escolha:** o NLB e as VMs são públicos; deixar esse trecho sem TLS expõe o tráfego na internet pública, mesmo sendo um projeto pessoal.

### Let's Encrypt na origem

Certificado publicamente confiável, validado via desafio HTTP-01 (porta 80) ou DNS-01 (API da Cloudflare), renovado automaticamente a cada 90 dias.

**Motivo da não escolha:** como o DNS fica com `proxied = true`, nenhum cliente externo resolve ou acessa a origem diretamente — o certificado que o navegador/`curl` efetivamente valida é sempre o da borda da Cloudflare (Universal SSL, automático), nunca o da origem. Let's Encrypt exigiria automação de renovação em cada uma das 2 VMs sem trazer nenhum benefício perceptível pro usuário final.

### Webserver dedicado (nginx/Apache) terminando TLS

Um proxy reverso na frente do binário Go, responsável por carregar o certificado e encaminhar as requisições.

**Motivo da não escolha:** a API não precisa de nenhum recurso de L7 que justifique um processo adicional (sem estático pra servir, sem roteamento complexo, sem rate limiting na borda). O `net/http` do Go já suporta TLS nativamente; adicionar nginx seria mais um serviço pra instalar, configurar e manter em cada VM sem ganho real.

## Consequências

### Positivas

- Menos componentes para manter — sem nginx, sem cron/automação de renovação de certificado.
- Certificado Origin CA tem validade longa (até 15 anos), dispensando renovação automatizada.
- Navegador e `curl` sempre validam contra a borda da Cloudflare (Universal SSL), independente do certificado usado na origem — a experiência do usuário final é idêntica nos dois casos.
- Mantém a decisão 10 do spec de infraestrutura (`proxied = true`), permitindo restringir o firewall do NLB/VMs só aos ranges de IP da Cloudflare.

### Negativas

- O certificado Origin CA só é confiável pela própria Cloudflare — se o projeto decidir permitir acesso direto à origem sem proxy no futuro, essa decisão precisa ser revisitada.
- A lógica de TLS (carregar certificado, configurar `tls.Config`) passa a fazer parte do binário Go, acoplando essa responsabilidade ao código da aplicação em vez de isolá-la num processo de borda separado.
- Acoplamento ao ecossistema Cloudflare: o Origin CA só funciona enquanto o proxy da Cloudflare estiver na frente da origem.

## Validação

Após o deploy, confirmar que `https://api.probekit.cc` responde sem aviso de certificado tanto no navegador quanto via `curl`, e que uma tentativa de acessar a origem direto pelo IP do NLB não é alcançável de fora dos ranges de IP da Cloudflare.

Serão avaliados:

- Handshake TLS completo via navegador e via `curl`.
- Resposta correta da API nos dois casos.
- Firewall do NLB/VMs restrito aos ranges de IP da Cloudflare, sem acesso direto de outras origens.

## Referências

- [Cloudflare Origin CA certificates](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)
- [Cloudflare SSL/TLS encryption modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)
- `docs/architecture/arch.md`, seção 5 (decisão em aberto que este ADR resolve)
- `docs/superpowers/specs/2026-10-01-probekit-infra-design.md`, decisão 10 (`proxied = true`)
