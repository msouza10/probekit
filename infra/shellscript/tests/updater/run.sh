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
# Precisa de podman. O script de producao entra no conteiner so para leitura.

set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$HERE/../../../.." && pwd)
IMAGE="${UPDATER_TEST_IMAGE:-docker.io/library/ubuntu:24.04}"

exec podman run --rm \
    -e VERBOSE="${VERBOSE:-}" \
    -v "$REPO_ROOT/infra/shellscript/deploy-api-go.sh:/under-test/deploy-api-go.sh:ro" \
    -v "$HERE:/tests:ro" \
    "$IMAGE" bash /tests/in-container.sh "$@"
