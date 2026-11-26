"""Peças de teste compartilhadas entre test_analyzer.py e test_job.py."""

import json


class ProvedorFalso:
    """Um provedor de LLM de mentira: `name` e `async complete(system, user) -> str`.

    Devolve as respostas em ordem (a última se repete). Uma `Exception` é levantada
    em vez de devolvida. `chamadas` guarda cada (system, user) recebido.
    """

    def __init__(self, name: str, *respostas) -> None:
        self.name = name
        self._respostas = list(respostas)
        self.chamadas: list[tuple[str, str]] = []

    async def complete(self, system: str, user: str) -> str:
        self.chamadas.append((system, user))
        resposta = self._respostas.pop(0) if len(self._respostas) > 1 else self._respostas[0]
        if isinstance(resposta, Exception):
            raise resposta
        return resposta


def json_do_llm(**campos) -> str:
    """Uma resposta válida do LLM (uma promoção de 50% da AWS), com campos trocáveis."""
    base = {"is_voucher": True, "confidence": 0.9, "vendor": "aws", "discount": "50% off"}
    base.update(campos)
    return json.dumps(base)
