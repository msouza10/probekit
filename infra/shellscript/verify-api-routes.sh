#!/usr/bin/env bash

set -euo pipefail

readonly MAX_RETRIES=12
readonly RETRY_INTERVAL=5
readonly CONNECT_TIMEOUT=3
readonly REQUEST_TIMEOUT=10

readonly API_URL="https://api.probekit.cc"
readonly SITE_ORIGIN="https://probekit.cc"
readonly BLOCKED_ORIGIN="https://evil.com"

readonly -a CASES=(
    "health|GET|/||200"
    "preflight ping|OPTIONS|/api/ping|${SITE_ORIGIN}|204"
    "preflight dns-lookup|OPTIONS|/api/dns-lookup|${SITE_ORIGIN}|204"
    "preflight blocked origin|OPTIONS|/api/ping|${BLOCKED_ORIGIN}|403"
)

check_case() {
    local description="$1"
    local method="$2"
    local path="$3"
    local origin="$4"
    local expected="$5"
    local url="${API_URL}${path}"
    local attempt
    local status_code="000"
    local curl_exit=0
    local -a curl_args

    echo "Checking: $description ($method $url, origin: ${origin:-none}, expected $expected)"

    curl_args=(
        --silent
        --show-error
        --output /dev/null
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

        if [[ "$curl_exit" -eq 0 && "$status_code" == "$expected" ]]; then
            echo "[OK] $description | HTTP $status_code | Attempt $attempt"
            return 0
        fi

        echo "[RETRY] $description | HTTP $status_code (expected $expected) | Attempt $attempt/$MAX_RETRIES | curl exit $curl_exit"

        if ((attempt < MAX_RETRIES)); then
            sleep "$RETRY_INTERVAL"
        fi
    done

    echo "[ERROR] $description | Last HTTP status: $status_code (expected $expected) | curl exit: $curl_exit"

    return 1
}

main() {
    local failed=0
    local case_line
    local description method path origin expected

    for case_line in "${CASES[@]}"; do
        IFS='|' read -r description method path origin expected <<< "$case_line"

        if ! check_case "$description" "$method" "$path" "$origin" "$expected"; then
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
