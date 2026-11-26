"""Testes do catálogo de fontes (sources.py e sources.yaml).

Formato do arquivo, definido por estes testes:

    sources:
      - id: aws_training_blog          # obrigatório e único
        name: AWS Training Blog        # obrigatório
        kind: blog                     # obrigatório (blog, rss, forum...)
        url: https://exemplo.com/feed  # obrigatório, só https
        vendor_hint: aws               # opcional
        enabled: true                  # opcional, padrão true

`load_sources` devolve só as fontes habilitadas.
"""

import dataclasses
from pathlib import Path

import pytest

from voucher_collector.sources import Source, load_sources

SOURCES_YAML = Path(__file__).resolve().parent.parent / "sources.yaml"


def escrever(tmp_path: Path, texto: str) -> Path:
    arquivo = tmp_path / "sources.yaml"
    arquivo.write_text(texto, encoding="utf-8")
    return arquivo


# --- o formato do arquivo --------------------------------------------------


def test_le_todos_os_campos_de_uma_fonte(tmp_path):
    arquivo = escrever(
        tmp_path,
        """
sources:
  - id: aws_blog
    name: AWS Blog
    kind: blog
    url: https://aws.amazon.com/blogs/feed/
    vendor_hint: aws
    enabled: true
""",
    )

    assert load_sources(arquivo) == [
        Source(
            id="aws_blog",
            name="AWS Blog",
            kind="blog",
            url="https://aws.amazon.com/blogs/feed/",
            vendor_hint="aws",
            enabled=True,
        )
    ]


def test_vendor_hint_e_enabled_sao_opcionais(tmp_path):
    arquivo = escrever(
        tmp_path,
        """
sources:
  - {id: a, name: A, kind: rss, url: "https://a.com/feed"}
""",
    )

    (fonte,) = load_sources(arquivo)

    assert fonte.vendor_hint is None
    assert fonte.enabled is True


def test_fonte_desabilitada_nao_e_devolvida(tmp_path):
    arquivo = escrever(
        tmp_path,
        """
sources:
  - {id: ligada, name: L, kind: rss, url: "https://a.com/feed"}
  - {id: desligada, name: D, kind: rss, url: "https://b.com/feed", enabled: false}
""",
    )

    assert [f.id for f in load_sources(arquivo)] == ["ligada"]


def test_mantem_a_ordem_do_arquivo(tmp_path):
    arquivo = escrever(
        tmp_path,
        """
sources:
  - {id: c, name: C, kind: rss, url: "https://c.com/feed"}
  - {id: a, name: A, kind: rss, url: "https://a.com/feed"}
  - {id: b, name: B, kind: rss, url: "https://b.com/feed"}
""",
    )

    assert [f.id for f in load_sources(arquivo)] == ["c", "a", "b"]


def test_source_e_imutavel():
    fonte = Source(id="a", name="A", kind="rss", url="https://a.com/f", vendor_hint=None, enabled=True)

    with pytest.raises(dataclasses.FrozenInstanceError):
        fonte.url = "https://outra.com"  # type: ignore[misc]


# --- o que o carregador recusa ---------------------------------------------


def test_url_http_sem_s_e_recusada_e_o_erro_diz_qual_fonte(tmp_path):
    arquivo = escrever(
        tmp_path,
        """
sources:
  - {id: velha, name: V, kind: rss, url: "http://velha.com/feed"}
""",
    )

    with pytest.raises(ValueError, match="velha"):
        load_sources(arquivo)


def test_url_que_nao_e_http_nem_https_e_recusada(tmp_path):
    arquivo = escrever(
        tmp_path,
        """
sources:
  - {id: perigosa, name: P, kind: rss, url: "javascript:alert(1)"}
""",
    )

    with pytest.raises(ValueError, match="perigosa"):
        load_sources(arquivo)


def test_id_repetido_e_recusado(tmp_path):
    arquivo = escrever(
        tmp_path,
        """
sources:
  - {id: igual, name: A, kind: rss, url: "https://a.com/feed"}
  - {id: igual, name: B, kind: rss, url: "https://b.com/feed"}
""",
    )

    with pytest.raises(ValueError, match="igual"):
        load_sources(arquivo)


@pytest.mark.parametrize("campo", ["id", "name", "kind", "url"])
def test_campo_obrigatorio_ausente_e_recusado(tmp_path, campo):
    fonte = {"id": "a", "name": "A", "kind": "rss", "url": "https://a.com/feed"}
    del fonte[campo]
    linha = ", ".join(f'{k}: "{v}"' for k, v in fonte.items())
    arquivo = escrever(tmp_path, f"sources:\n  - {{{linha}}}\n")

    with pytest.raises(ValueError):
        load_sources(arquivo)


# --- o sources.yaml de verdade ---------------------------------------------
# São os testes da Task 5: 38 fontes, todas https, sem as que o VoucherBot
# lista mas que não servem (3 estão mortas e o The Register foi tirado).


def test_catalogo_real_tem_38_fontes_habilitadas():
    fontes = load_sources(SOURCES_YAML)

    assert len(fontes) == 38
    assert all(f.enabled for f in fontes)


def test_catalogo_real_so_tem_url_https():
    assert all(f.url.startswith("https://") for f in load_sources(SOURCES_YAML))


def test_catalogo_real_tem_ids_unicos():
    # O VoucherBot tem `blog:cisco_newsroom` e `rss:cisco_newsroom`. Se o prefixo
    # for tirado do id, os dois colidem aqui e o carregador recusa o arquivo.
    ids = [f.id for f in load_sources(SOURCES_YAML)]

    assert len(ids) == len(set(ids))


def test_catalogo_real_nao_tem_as_fontes_mortas_nem_o_the_register():
    fontes = load_sources(SOURCES_YAML)

    for f in fontes:
        assert "theregister.com" not in f.url
        assert "techtarget.com" not in f.url
        assert "suse.com/c/" not in f.url
        for morto in ("the_register", "techtarget_aws", "techtarget_cloud", "suse_c_blog"):
            assert morto not in f.id, f.id


def test_catalogo_real_tem_nome_e_tipo_preenchidos():
    for f in load_sources(SOURCES_YAML):
        assert f.name.strip(), f.id
        assert f.kind.strip(), f.id
