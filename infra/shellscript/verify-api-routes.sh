#!/usr/bin/env bash
#
# Verifica a API publica.
#   verify-api-routes.sh [quick|full]
#     quick (padrao): saude e CORS, o que o deploy do site usa
#     full: quick + as ferramentas (ping, dns-lookup, IP privado), o que o deploy da API usa
#   EXPECTED_VERSION=1.3.0 confere tambem a versao informada por GET /
#   API_URL, MAX_RETRIES e RETRY_INTERVAL ajustam o alvo e as tentativas.

set -euo pipefail

readonly MAX_RETRIES="${MAX_RETRIES:-12}"
readonly RETRY_INTERVAL="${RETRY_INTERVAL:-5}"
readonly CONNECT_TIMEOUT=3
readonly REQUEST_TIMEOUT=10

readonly API_URL="${API_URL:-https://api.probekit.cc}"
readonly SITE_ORIGIN="https://probekit.cc"
readonly BLOCKED_ORIGIN="https://evil.com"

BODY_FILE=""

readonly -a CASES=(
    "health|GET|/||200|\"message\":\"OK\""
    "preflight ping|OPTIONS|/api/ping|${SITE_ORIGIN}|204"
    "preflight dns-lookup|OPTIONS|/api/dns-lookup|${SITE_ORIGIN}|204"
    "preflight blocked origin|OPTIONS|/api/ping|${BLOCKED_ORIGIN}|403"
)

readonly -a FULL_CASES=(
    "ping|GET|/api/ping?target=1.1.1.1&count=2&timeout=3||200|\"packets_recv\":2"
    "dns-lookup|GET|/api/dns-lookup?domain=example.com||200|\"domain\":\"example.com\""
    "private ip is rejected|GET|/api/ping?target=10.0.0.1||400|private_ip_not_allowed"
)

check_case() {
    local description="$1"
    local method="$2"
    local path="$3"
    local origin="$4"
    local expected="$5"
    local body_contains="$6"
    local url="${API_URL}${path}"
    local attempt
    local body_ok
    local status_code="000"
    local curl_exit=0
    local -a curl_args

    echo "Checking: $description ($method $url, origin: ${origin:-none}, expected $expected${body_contains:+, body contains: $body_contains})"

    curl_args=(
        --silent
        --show-error
        --output "$BODY_FILE"
        --write-out "%{http_code}"
        --connect-timeout "$CONNECT_TIMEOUT"
        --max-time "$REQUEST_TIMEOUT"
        --request "$method"
    )

    if [[ -n "$origin" ]]; then
        curl_args+=(--header "Origin: $origin")
        if [[ "$method" == "OPTIONS" ]]; then
            curl_args+=(--header "Access-Control-Request-Method: GET")
        fi
    fi

    for ((attempt = 1; attempt <= MAX_RETRIES; attempt++)); do

        curl_exit=0

        status_code=$(curl "${curl_args[@]}" "$url") || curl_exit=$?

        body_ok=true
        if [[ -n "$body_contains" ]] && ! grep -qF -- "$body_contains" "$BODY_FILE"; then
            body_ok=false
        fi

        if [[ "$curl_exit" -eq 0 && "$status_code" == "$expected" && "$body_ok" == true ]]; then
            echo "[OK] $description | HTTP $status_code | Attempt $attempt"
            return 0
        fi

        echo "[RETRY] $description | HTTP $status_code (expected $expected) | Attempt $attempt/$MAX_RETRIES | curl exit $curl_exit"
        if [[ "$body_ok" == false ]]; then
            echo "        body does not contain: $body_contains (got: $(head -c 200 "$BODY_FILE"))"
        fi

        if ((attempt < MAX_RETRIES)); then
            sleep "$RETRY_INTERVAL"
        fi
    done

    echo "[ERROR] $description | Last HTTP status: $status_code (expected $expected) | curl exit: $curl_exit"

    return 1
}

usage() {
    echo "uso: $0 [quick|full]   (EXPECTED_VERSION=X.Y.Z confere a versao)" >&2
    exit 2
}

main() {
    local failed=0
    local profile="${1:-quick}"
    local -a cases=("${CASES[@]}")

    case "$profile" in
        quick) ;;
        full) cases+=("${FULL_CASES[@]}") ;;
        *) usage ;;
    esac

    if [[ -n "${EXPECTED_VERSION:-}" ]]; then
        if ! [[ "$EXPECTED_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "EXPECTED_VERSION invalida: $EXPECTED_VERSION (esperado X.Y.Z)" >&2
            exit 2
        fi
        cases+=("version|GET|/||200|\"version\":\"${EXPECTED_VERSION}\"")
    fi

    BODY_FILE=$(mktemp)
    trap 'rm -f "$BODY_FILE"' EXIT
    local case_line
    local description method path origin expected body_contains

    for case_line in "${cases[@]}"; do
        IFS='|' read -r description method path origin expected body_contains <<< "$case_line"

        if ! check_case "$description" "$method" "$path" "$origin" "$expected" "$body_contains"; then
            ((failed += 1))
        fi
    done

    echo
    echo "================================"

    if ((failed > 0)); then
        echo "[FAILED] $failed case(s) did not match the expected response"
        exit 1
    fi

    echo "[SUCCESS] All cases returned the expected response"
}

main "$@"
