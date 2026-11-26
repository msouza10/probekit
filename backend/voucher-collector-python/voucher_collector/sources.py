"""O catálogo de fontes: lê o `sources.yaml` e devolve só as fontes habilitadas.

Formato do arquivo:

    sources:
      - id: aws_training_blog          # obrigatório e único
        name: AWS Training Blog        # obrigatório
        kind: blog                     # obrigatório (blog, rss, forum...)
        url: https://exemplo.com/feed  # obrigatório, só https
        vendor_hint: aws               # opcional: o fornecedor, se o LLM não disser
        enabled: true                  # opcional, padrão true
"""

from dataclasses import dataclass
from pathlib import Path

import yaml


@dataclass(frozen=True)
class Source:
    id: str
    name: str
    kind: str
    url: str
    vendor_hint: str | None
    enabled: bool


_REQUIRED = ("id", "name", "kind", "url")


def load_sources(path: Path | str) -> list[Source]:
    """As fontes habilitadas de `path`, na ordem do arquivo.

    Levanta ValueError (dizendo qual fonte) se faltar um campo obrigatório, se um id
    se repetir ou se a URL não for https.
    """
    data = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    seen: set[str] = set()
    sources: list[Source] = []
    for raw in data.get("sources") or []:
        for field in _REQUIRED:
            if not raw.get(field):
                raise ValueError(f"fonte sem o campo '{field}': {raw!r}")
        source_id = str(raw["id"])
        if source_id in seen:
            raise ValueError(f"id de fonte repetido: {source_id}")
        seen.add(source_id)
        url = str(raw["url"])
        if not url.startswith("https://"):
            raise ValueError(f"fonte {source_id}: a URL precisa ser https ({url})")
        if raw.get("enabled", True):
            sources.append(
                Source(
                    id=source_id,
                    name=str(raw["name"]),
                    kind=str(raw["kind"]),
                    url=url,
                    vendor_hint=raw.get("vendor_hint"),
                    enabled=True,
                )
            )
    return sources
