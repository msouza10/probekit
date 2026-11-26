# Origem: VoucherBot (https://github.com/Devathmaj/VoucherBot), licença Apache-2.0 (THIRD_PARTY/LICENSE-VoucherBot).
# Arquivo original: voucherbot/database/bootstrap.py, lista KEYWORDS (commit ab4dc19, lido em 2026-11-26).
# Modificações: as 34 palavras e os pesos são os mesmos; viraram dataclasses imutáveis e ganharam a função score().

"""Filtro de palavras-chave: decide quais posts valem uma chamada ao LLM.

`score(texto)` soma o peso de cada palavra de KEYWORDS que aparece no texto (sem
diferenciar maiúsculas) e devolve a soma e as palavras que casaram, na ordem de
KEYWORDS. A busca é por trecho do texto, não por palavra inteira, como no VoucherBot.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Keyword:
    keyword: str
    score: int


KEYWORDS: tuple[Keyword, ...] = (
    Keyword("voucher", 5),
    Keyword("coupon", 5),
    Keyword("100% off", 5),
    Keyword("promo code", 5),
    Keyword("free exam", 5),
    Keyword("exam voucher", 5),
    Keyword("certification voucher", 5),
    Keyword("free certification", 4),
    Keyword("free access", 4),
    Keyword("discount", 4),
    Keyword("redeem", 4),
    Keyword("50% off", 4),
    Keyword("retake", 3),
    Keyword("safeguard", 3),
    Keyword("limited time", 3),
    Keyword("beta access", 3),
    Keyword("free tier", 3),
    Keyword("register now", 1),
    Keyword("webinar", 1),
    Keyword("virtual event", 1),
    Keyword("virtual training", 2),
    Keyword("free training", 2),
    Keyword("live session", 1),
    Keyword("certification", 1),
    Keyword("exam", 1),
    Keyword("pearsonvue", 2),
    Keyword("beta exam", 4),
    Keyword("exam credit", 5),
    Keyword("free trial", 3),
    Keyword("sponsored", 2),
    Keyword("waived", 4),
    Keyword("no cost", 4),
    Keyword("complimentary", 4),
    Keyword("free badge", 3),
)

# Um post só vai para o LLM se a soma chegar a este valor.
THRESHOLD: int = 1


def score(text: str) -> tuple[int, list[str]]:
    """Soma dos pesos e lista das palavras que casaram (na ordem de KEYWORDS)."""
    lowered = text.lower()
    matched = [k for k in KEYWORDS if k.keyword in lowered]
    return sum(k.score for k in matched), [k.keyword for k in matched]
