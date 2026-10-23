#!/usr/bin/env bash
#
# Escolhe a release da API para a qual voltar. So decide e recusa: quem marca a
# release como latest e o passo seguinte do workflow.
#
#   MODE=previous                  a maior versao menor que a latest
#   MODE=specific VERSION=1.3.0    a versao informada
#   REASON="..."                   opcional, so aparece no resumo
#   RELEASES_FILE=arquivo.json     usa o arquivo em vez de chamar o gh (testes)

set -euo pipefail

readonly PREFIX="probekit-linux-amd64-api-go-"
# Primeira release cujo updater sabe fazer rollback (#16). Voltar para uma
# anterior reinstala o updater antigo nas VMs e tira essa protecao.
readonly MIN_VERSION="1.3.0"
readonly VERSION_RE='^[0-9]+\.[0-9]+\.[0-9]+$'

fail() {
    echo "ERRO: $*" >&2
    exit 1
}

load_releases() {
    if [[ -n "${RELEASES_FILE:-}" ]]; then
        cat "$RELEASES_FILE"
    else
        gh release list --limit 100 --json tagName,isLatest,isDraft,isPrerelease
    fi
}

# Versoes publicadas desta API (sem rascunho nem pre-release), da mais nova para
# a mais antiga. sort -V ordena como versao: 1.10.0 vem depois de 1.9.0.
published_versions() {
    jq -r --arg p "$PREFIX" '.[]
        | select((.isDraft or .isPrerelease) | not)
        | .tagName | select(startswith($p)) | ltrimstr($p)' <<<"$1" | sort -V -r
}

active_version() {
    jq -er --arg p "$PREFIX" '[.[] | select(.isLatest) | .tagName | ltrimstr($p)] | .[0]' <<<"$1"
}

# A linha seguinte a ativa na lista ja ordenada.
previous_version() {
    local versions="$1" active="$2" previous

    previous=$(awk -v a="$active" 'found { print; exit } $0 == a { found = 1 }' <<<"$versions")
    [[ -n "$previous" ]] || fail "nao ha versao anterior a $active"

    echo "$previous"
}

# O menor dos dois, na ordem de versao, e o piso: entao a versao esta no piso ou acima.
at_or_above_min() {
    [[ "$(printf '%s\n%s\n' "$MIN_VERSION" "$1" | sort -V | head -n1)" == "$MIN_VERSION" ]]
}

write_summary() {
    local versions="$1" active="$2" target="$3" version note

    [[ -n "${GITHUB_STEP_SUMMARY:-}" ]] || return 0

    {
        echo "### Plano do rollback da API"
        echo
        echo "Vai marcar a versão \`$target\` como latest (hoje a latest é \`$active\`)."
        echo "Motivo: ${REASON:-não informado}"
        echo
        echo "| Versão | Observação |"
        echo "|---|---|"
        while IFS= read -r version; do
            note=""
            [[ "$version" == "$active" ]] && note="latest agora"
            [[ "$version" == "$target" ]] && note="alvo"
            at_or_above_min "$version" || note="${note:+$note, }abaixo do piso $MIN_VERSION"
            echo "| \`$version\` | $note |"
        done <<<"$versions"
    } >>"$GITHUB_STEP_SUMMARY"
}

select_target() {
    local mode="${MODE:-previous}"
    local version="${VERSION:-}"
    local releases versions active target

    case "$mode" in
        specific)
            [[ -n "$version" ]] || fail "informe a versao para voltar a uma versao especifica"
            [[ "$version" =~ $VERSION_RE ]] || fail "versao invalida: $version (esperado X.Y.Z)"
            ;;
        previous)
            [[ -z "$version" ]] || fail "a versao so vale no modo specific"
            ;;
        *)
            fail "modo invalido: $mode (use previous ou specific)"
            ;;
    esac

    releases=$(load_releases)
    versions=$(published_versions "$releases")
    active=$(active_version "$releases") || fail "nenhuma release esta marcada como latest"

    if [[ "$mode" == "specific" ]]; then
        target="$version"
    else
        target=$(previous_version "$versions" "$active")
    fi

    grep -qxF -- "$target" <<<"$versions" || fail "a release $target nao existe (ou e rascunho/pre-release)"
    [[ "$target" != "$active" ]] || fail "a versao $target ja e a latest"
    at_or_above_min "$target" || fail "a versao $target e anterior a $MIN_VERSION: o updater dela nao tem rollback automatico"

    echo "active=$active"
    echo "target=$target"
    echo "tag=$PREFIX$target"

    if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
        {
            echo "active=$active"
            echo "target=$target"
            echo "tag=$PREFIX$target"
        } >>"$GITHUB_OUTPUT"
    fi

    write_summary "$versions" "$active" "$target"
}

main() {
    select_target
}

main "$@"
