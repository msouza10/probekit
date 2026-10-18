#!/usr/bin/env python3
"""Sincroniza um inventário (JSON) com os itens rascunho de um GitHub Project.

O inventário é o dado (o planejamento) e fica FORA do repositório, que é público:
este script só tem a lógica. Ele é idempotente: roda quantas vezes quiser e só
escreve o que difere do estado atual.

Uso:
    python3 project_sync.py --owner msouza10 --project 5 --inventory inventario.json [--dry-run]

Formato do inventário:
    {
      "epic_field": "Epic (rascunho)",
      "epics":  {"E1": "E1 Pipeline", "E2": "E2 Endurecimento"},
      "fields": {"Dono": ["Criador", "Assistente"], "Área": ["api", "docs"]},
      "items":  [{"epic": "E1", "title": "...", "area": "docs", "dono": "Criador",
                  "status": "Backlog", "body": "markdown"}]
    }

O que faz, e o que NÃO faz:
  - cria o item rascunho se o título não existe; atualiza o corpo se mudou;
  - cria os campos que faltam (Dono, Área e o campo de epic); preenche os valores;
  - NÃO apaga itens nem campos, NÃO cria issues e NÃO altera as opções do Status
    (trocar as opções de um campo existente apaga os valores já preenchidos).
  - o Status precisa já ter as opções usadas no inventário; as opções de epic e de
    Dono/Área, se faltarem em um campo que já existe, param o script com uma
    mensagem, em vez de recriar o campo e perder os valores.
"""
import argparse
import json
import subprocess
import sys


def gh(*args, parse=True):
    out = subprocess.run(["gh", *args], capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(f"ERRO gh {' '.join(args[:3])}: {out.stderr.strip()}")
    return json.loads(out.stdout) if parse and out.stdout.strip() else out.stdout


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--owner", required=True)
    ap.add_argument("--project", required=True)
    ap.add_argument("--inventory", required=True)
    ap.add_argument("--dry-run", action="store_true", help="só mostra o que faria")
    a = ap.parse_args()

    inv = json.load(open(a.inventory, encoding="utf-8"))
    epic_field, epics = inv["epic_field"], inv["epics"]
    wanted = {"Status": sorted({i["status"] for i in inv["items"]}), **inv["fields"],
              epic_field: list(epics.values())}
    dry = a.dry_run
    acoes = 0

    def log(msg):
        nonlocal acoes
        acoes += 1
        print(("[dry-run] " if dry else "") + msg)

    base = ["--owner", a.owner, "--format", "json"]
    pid = gh("project", "view", a.project, *base)["id"]

    def load_fields():
        return {f["name"]: f for f in gh("project", "field-list", a.project, *base)["fields"]}

    fields = load_fields()

    # 1) campos: cria os que faltam; nunca recria um campo existente
    for nome, opcoes in wanted.items():
        if nome == "Status":
            faltam = [o for o in opcoes if o not in {x["name"] for x in fields["Status"].get("options", [])}]
            if faltam:
                sys.exit(f"Status sem as opções {faltam}. Ajuste o campo no Project (ou via API) antes: "
                         "este script não altera opções existentes.")
            continue
        if nome not in fields:
            log(f"criar campo {nome} ({', '.join(opcoes)})")
            if not dry:
                gh("project", "field-create", a.project, "--owner", a.owner, "--name", nome,
                   "--data-type", "SINGLE_SELECT", "--single-select-options", ",".join(opcoes), parse=False)
        else:
            existentes = {x["name"] for x in fields[nome].get("options", [])}
            faltam = [o for o in opcoes if o not in existentes]
            if faltam:
                sys.exit(f"Campo {nome} sem as opções {faltam}. Apagar e recriar o campo perde os valores já "
                         "preenchidos; ajuste manualmente ou apague o campo de propósito e rode de novo.")
    if not dry:
        fields = load_fields()

    def opt_id(campo, valor):
        return fields[campo]["id"], next(o["id"] for o in fields[campo]["options"] if o["name"] == valor)

    # 2) itens
    atuais = {i["title"]: i for i in gh("project", "item-list", a.project, "--owner", a.owner,
                                        "--limit", "500", "--format", "json")["items"]}

    # a chave do JSON do gh vem em minúsculas; a de 'Área' vem corrompida (acento), então leio por sufixo
    def valor(item, campo):
        chave = campo.lower()
        for k, v in item.items():
            if k.lower() == chave or (campo == "Área" and k.endswith("rea")):
                return v
        return None

    for it in inv["items"]:
        titulo = it["title"]
        existente = atuais.get(titulo)
        if existente is None:
            log(f"criar: {titulo}")
            if dry:
                continue
            existente = gh("project", "item-create", a.project, "--owner", a.owner, "--title", titulo,
                           "--body", it["body"], "--format", "json")
            atuais[titulo] = existente
        else:
            corpo = existente.get("content", {}).get("body", "")
            if corpo != it["body"]:
                log(f"atualizar corpo: {titulo}")
                if not dry:
                    gh("project", "item-edit", "--id", existente["content"]["id"], "--title", titulo,
                       "--body", it["body"], parse=False)
        for campo, desejado in (("Status", it["status"]), ("Dono", it["dono"]),
                                ("Área", it["area"]), (epic_field, epics[it["epic"]])):
            if valor(existente, campo) == desejado:
                continue
            log(f"campo {campo} = {desejado}: {titulo}")
            if not dry:
                fid, oid = opt_id(campo, desejado)
                gh("project", "item-edit", "--id", existente["id"], "--project-id", pid, "--field-id", fid,
                   "--single-select-option-id", oid, parse=False)

    print(f"\n{'nada a fazer: o Project já está igual ao inventário' if acoes == 0 else str(acoes) + ' ação(ões)'}"
          f" ({len(inv['items'])} itens no inventário)")


if __name__ == "__main__":
    main()
