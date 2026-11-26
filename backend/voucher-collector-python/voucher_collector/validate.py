"""Validação do que o LLM devolve: a última barreira antes do banco e do site.

A resposta do LLM é dado NÃO confiável: um post pode tentar instruí-lo a devolver
um código com HTML, um link de golpe ou um percentual absurdo. Cada função aqui
LIMPA o valor e o devolve, ou devolve `None` quando ele não serve. Nenhuma levanta
exceção por causa de um valor ruim.

As regras vêm da ADR-0015 (docs/adr/0015-formato-do-item-de-desconto.md).
"""

import re
from urllib.parse import urlparse

from voucher_collector.schema import ExtractedEvent

# Conjunto fechado de tipos de promoção. O prompt pede ao LLM um destes valores;
# qualquer outra coisa vira "other".
PROMOTION_TYPES = frozenset({"voucher", "discount", "free_exam", "beta_exam", "other"})

# Um percentual inteiro de 1 a 3 dígitos. Não pode vir colado em outro dígito nem num
# ponto decimal ("1500%" e "12.5%" não são "500%" nem "5%"). `[0-9]` e não `\d`, que
# também casa dígitos de outros alfabetos.
_PERCENT = re.compile(r"(?<![0-9.])([0-9]{1,3})\s*%")

# 3 a 40 caracteres, só ASCII: letras maiúsculas, dígitos, hífen e sublinhado.
_VOUCHER_CODE = re.compile(r"[A-Z0-9_-]{3,40}")

_SEPARATORS = re.compile(r"[\s-]+")


def parse_discount_percent(text: str | None) -> int | None:
    """O percentual de um texto de desconto ("50% off" -> 50), de 1 a 100; senão None."""
    if not isinstance(text, str):
        return None
    found = _PERCENT.search(text)
    if found is None:
        return None
    percent = int(found.group(1))
    return percent if 1 <= percent <= 100 else None


def clean_voucher_code(code: str | None) -> str | None:
    """O código em maiúsculas, se tiver 3 a 40 caracteres de A-Z, 0-9, - e _; senão None."""
    if not isinstance(code, str):
        return None
    cleaned = code.strip().upper()
    return cleaned if _VOUCHER_CODE.fullmatch(cleaned) else None


def safe_http_url(url: str | None) -> str | None:
    """O endereço, se for http ou https e tiver servidor; senão None."""
    if not isinstance(url, str):
        return None
    cleaned = url.strip()
    parts = urlparse(cleaned)
    if parts.scheme.lower() in ("http", "https") and parts.netloc:
        return cleaned
    return None


def normalise_promotion_type(raw: str | None) -> str:
    """O tipo de promoção dentro do conjunto fechado ("Free Exam" -> "free_exam")."""
    if not isinstance(raw, str):
        return "other"
    normalised = _SEPARATORS.sub("_", raw.strip().lower())
    return normalised if normalised in PROMOTION_TYPES else "other"


def sanitize(event: ExtractedEvent) -> ExtractedEvent:
    """Uma CÓPIA do evento com o código, a URL, o tipo e a confiança já limpos."""
    return event.model_copy(
        update={
            "voucher_code": clean_voucher_code(event.voucher_code),
            "registration_url": safe_http_url(event.registration_url),
            "promotion_type": normalise_promotion_type(event.promotion_type),
            # O pydantic já limita a confiança ao criar o evento, mas `model_copy` e
            # `model_construct` não validam: aqui não se confia que alguém já limpou.
            "confidence": max(0.0, min(1.0, event.confidence)),
        }
    )
