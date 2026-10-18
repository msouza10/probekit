#!/usr/bin/env python3
"""Confere os links relativos dos arquivos .md do repositório.

Uso:
    python3 check_links.py            # varre o repositório inteiro
    python3 check_links.py A.md B.md  # só os arquivos informados

Ignora links http(s), mailto e âncoras puras (#secao). Para links com âncora
(arquivo.md#secao) só confere se o arquivo existe. Sai com código 1 se achar
algum link quebrado.
"""
import os
import re
import subprocess
import sys

LINK = re.compile(r"\]\(([^)\s]+)\)")
# pastas de terceiros ou geradas: os .md delas não são nossos
SKIP_DIRS = {"node_modules", ".git", "dist", ".terraform", ".agents"}


def repo_root() -> str:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        )
        return out.stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return os.getcwd()


def markdown_files(root: str):
    for folder, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in files:
            if name.endswith(".md"):
                yield os.path.join(folder, name)


def check(path: str, root: str) -> list[str]:
    broken = []
    base = os.path.dirname(path)
    with open(path, encoding="utf-8") as f:
        text = f.read()
    # ignora blocos de código, onde "](...)" costuma ser exemplo
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    for m in LINK.finditer(text):
        target = m.group(1)
        if target.startswith(("http://", "https://", "mailto:", "#")):
            continue
        target = target.split("#", 1)[0]
        if not target:
            continue
        resolved = os.path.normpath(
            os.path.join(root, target.lstrip("/"))
            if target.startswith("/")
            else os.path.join(base, target)
        )
        if not os.path.exists(resolved):
            broken.append(f"{os.path.relpath(path, root)} -> {m.group(1)}")
    return broken


def main() -> int:
    root = repo_root()
    files = [os.path.abspath(a) for a in sys.argv[1:]] or list(markdown_files(root))
    broken = []
    for path in files:
        broken.extend(check(path, root))
    for line in broken:
        print("QUEBRADO", line)
    print(f"{len(files)} arquivos conferidos, {len(broken)} links quebrados")
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
