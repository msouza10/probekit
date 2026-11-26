# Origem: VoucherBot (https://github.com/Devathmaj/VoucherBot), licença Apache-2.0 (THIRD_PARTY/LICENSE-VoucherBot).
# Arquivo original: voucherbot/providers/base.py (commit ab4dc19, lido em 2026-11-26).
# Modificações: removida a classe BaseCollector (o coletor daqui é uma função); mantido NormalizedPost.

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional


@dataclass
class NormalizedPost:
    """Provider-agnostic representation of a single post."""

    url: str
    title: str
    content: Optional[str] = None
    summary: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[datetime] = None
    raw_data: Optional[dict[str, Any]] = field(default_factory=dict)
