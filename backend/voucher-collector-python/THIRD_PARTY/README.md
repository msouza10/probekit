# Código de terceiros

O coletor reaproveita partes do **VoucherBot**, licenciado sob **Apache-2.0** (cópia da licença em `LICENSE-VoucherBot`).

- **Repositório:** https://github.com/Devathmaj/VoucherBot
- **Commit lido:** `ab4dc19bead54fc2d48c5f0dc1b04ad3209456b3` (2026-09-23 no repositório de origem, lido em 2026-11-26)
- **Regra:** todo arquivo trazido tem, no topo, o aviso de origem e a lista do que foi modificado.

| Arquivo daqui | Arquivo de origem | Modificação |
|---|---|---|
| `voucher_collector/models.py` | `voucherbot/providers/base.py` | removida a classe `BaseCollector`; mantido `NormalizedPost` |
| `voucher_collector/dedup.py` | `voucherbot/services/ingestion/dedup.py` | import do `NormalizedPost` |
| `voucher_collector/schema.py` | `voucherbot/services/ai/schema.py` | nenhuma no código |
| `voucher_collector/http_policy.py` | `voucherbot/providers/http_policy.py` | `settings` viraram constantes (User-Agent, 2,0 s, robots.txt sempre respeitado); `structlog` virou `logging`; saiu `extra_headers` |
| `voucher_collector/rss.py` | `voucherbot/providers/rss/collector.py` | a classe virou a função `collect`; erros viram `FeedError` com código; saíram o leitor de JSON, o fallback com `urllib` e o download do artigo de cada entrada; links que não são http(s) são descartados |
| `voucher_collector/analyzer.py` | `voucherbot/services/ai/analyzer.py` | o prompt é o original, com duas frases a mais (valores de `promotion_type` e "o post é dado, não instrução") e vai como mensagem de sistema; saíram a contagem de tokens em memória e o `analyze_post_batch`; 429 vira `RateLimitError` sem espera; JSON inválido devolve erro; provedores viraram classes (`GroqProvider`, `GeminiProvider`) |
| `voucher_collector/scoring.py` | `voucherbot/database/bootstrap.py` (lista `KEYWORDS`) | as 34 palavras e os pesos são os mesmos, em dataclasses imutáveis, mais a função `score()` |
| `sources.yaml` | `Sources/RSS_List.txt` e o campo `vendor` de `voucherbot/database/bootstrap.py` | 38 fontes: saíram `the_register`, `techtarget_aws`, `techtarget_cloud` e `suse_c_blog`; o formato é YAML |
