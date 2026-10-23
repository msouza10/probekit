#!/usr/bin/env bash
# Entrada dentro do conteiner: instala os fakes e roda os cenarios.

set -uo pipefail

install -m 0755 /tests/fakes/* /usr/local/bin/

# shellcheck source=/dev/null
source /tests/lib.sh
# shellcheck source=/dev/null
source /tests/scenarios.sh

filter="${1:-}"

for scenario in $(declare -F | awk '{print $3}' | grep -E '^s[0-9]{2}_'); do
    if [[ -n "$filter" && "$scenario" != *"$filter"* ]]; then
        continue
    fi
    echo "== $scenario"
    "$scenario"
done

echo
echo "Resultado: $PASS ok, $FAIL falha(s)"
[[ "$FAIL" -eq 0 ]]
