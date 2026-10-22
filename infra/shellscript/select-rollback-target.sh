#!/usr/bin/env bash


set -euo pipefail

readonly UUID_RE='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
readonly MAX_REASON=70

fail() {
    echo "ERRO: $*" >&2
    exit 1
}

load_deployments() {
    if [[ -n "${DEPLOYMENTS_FILE:-}" ]]; then
        cat "$DEPLOYMENTS_FILE"
    else
        npx wrangler deployments list --json
    fi
}

# A versao ativa e a do deployment mais novo. Um deploy gradual (mais de uma
# versao) nao tem uma ativa so, e o script se recusa a decidir.
active_version() {
    jq -er 'sort_by(.created_on) | .[-1]
        | if (.versions | length) != 1
          then error("deploy gradual: mais de uma versao ativa")
          else .versions[0].version_id end' <<<"$1"
}

# A versao imediatamente mais antiga que a ativa, na ordem em que cada versao
# apareceu pela primeira vez. Depois de um rollback o penultimo deployment e a
# versao mais NOVA, por isso nao se usa a posicao no historico.
previous_version() {
    jq -er 'sort_by(.created_on) as $d
        | ($d[-1].versions[0].version_id) as $ativa
        | ($d | map(.versions[0].version_id)
              | reduce .[] as $v ([]; if index($v) then . else . + [$v] end)) as $ordem
        | ($ordem | index($ativa)) as $i
        | if $i == 0 then error("nao ha versao anterior") else $ordem[$i-1] end' <<<"$1"
}

write_summary() {
    local deployments="$1" active="$2" target="$3"

    [[ -n "${GITHUB_STEP_SUMMARY:-}" ]] || return 0

    {
        echo "### Plano do rollback"
        echo
        echo "Vai voltar da versão \`$active\` (ativa) para a versão \`$target\`."
        echo
        jq -r 'sort_by(.created_on) | reverse | to_entries
            | ("| Criado em (UTC) | Versão | Mensagem | Ativa |", "|---|---|---|---|"),
              (.[] | "| \(.value.created_on[0:19]) | `\(.value.versions[0].version_id)` | \(.value.annotations["workers/message"] // "-") | \(if .key == 0 then "sim" else "" end) |")' <<<"$deployments"
    } >>"$GITHUB_STEP_SUMMARY"
}

select_target() {
    local mode="${MODE:-previous}"
    local version_id="${VERSION_ID:-}"
    local reason="${REASON:-}"
    local deployments active target

    if [[ ${#reason} -gt $MAX_REASON ]]; then
        fail "o motivo passa de $MAX_REASON caracteres"
    fi

    case "$mode" in
        specific)
            [[ -n "$version_id" ]] || fail "informe o version_id para voltar a uma versao especifica"
            [[ "$version_id" =~ $UUID_RE ]] || fail "version_id invalido (esperado um UUID)"
            ;;
        previous)
            [[ -z "$version_id" ]] || fail "version_id so vale no modo specific"
            ;;
        *)
            fail "modo invalido: $mode (use previous ou specific)"
            ;;
    esac

    deployments=$(load_deployments)
    active=$(active_version "$deployments")

    if [[ "$mode" == "specific" ]]; then
        target="$version_id"
    else
        target=$(previous_version "$deployments")
    fi

    [[ "$target" != "$active" ]] || fail "a versao $target ja esta ativa"

    if ! jq -e --arg v "$target" 'any(.[]; .versions[].version_id == $v)' <<<"$deployments" >/dev/null; then
        echo "::warning::a versao $target nao aparece nos deployments mais recentes (pode existir mesmo assim)"
    fi

    echo "active=$active"
    echo "target=$target"

    if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
        {
            echo "active=$active"
            echo "target=$target"
        } >>"$GITHUB_OUTPUT"
    fi

    write_summary "$deployments" "$active" "$target"
}

main() {
    case "${1:-select}" in
        select) select_target ;;
        active) active_version "$(load_deployments)" ;;
        *) fail "uso: $0 [select|active]" ;;
    esac
}

main "$@"
