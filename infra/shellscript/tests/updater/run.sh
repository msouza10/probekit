#!/usr/bin/env bash
#
# Roda os cenarios do updater (deploy-api-go.sh) dentro de um conteiner
# descartavel, como root, com curl, systemctl e companhia simulados.
#
# Uso:
#   bash infra/shellscript/tests/updater/run.sh              # todos os cenarios
#   bash infra/shellscript/tests/updater/run.sh bad          # so os que tem "bad" no nome
#   VERBOSE=1 bash infra/shellscript/tests/updater/run.sh    # mostra a saida do updater
#
# Precisa de podman ou docker (usa o que existir; CONTAINER_RUNTIME escolhe).
# O script de producao entra no conteiner so para leitura.

set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$HERE/../../../.." && pwd)
IMAGE="${UPDATER_TEST_IMAGE:-docker.io/library/ubuntu:24.04}"

RUNTIME="${CONTAINER_RUNTIME:-}"
if [[ -z "$RUNTIME" ]]; then
    if command -v podman >/dev/null 2>&1; then
        RUNTIME=podman
    elif command -v docker >/dev/null 2>&1; then
        RUNTIME=docker
    else
        echo "ERRO: instale podman ou docker para rodar os testes" >&2
        exit 1
    fi
fi

exec "$RUNTIME" run --rm \
    -e VERBOSE="${VERBOSE:-}" \
    -v "$REPO_ROOT/infra/shellscript/deploy-api-go.sh:/under-test/deploy-api-go.sh:ro" \
    -v "$HERE:/tests:ro" \
    "$IMAGE" bash /tests/in-container.sh "$@"
