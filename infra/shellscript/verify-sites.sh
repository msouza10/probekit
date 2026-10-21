#!/usr/bin/env bash

set -euo pipefail

readonly MAX_RETRIES=12
readonly RETRY_INTERVAL=5
readonly CONNECT_TIMEOUT=3
readonly REQUEST_TIMEOUT=10

readonly -a SITES=(
    "https://probekit.cc/"
    "https://www.probekit.cc/"
    "https://probekit.cc/ping"
    "https://probekit.cc/dns-lookup"
)

check_endpoint() {
    local url="$1"
    local attempt
    local status_code
    local curl_exit

    echo "Checking endpoint: $url"

    for ((attempt = 1; attempt <= MAX_RETRIES; attempt++)); do

        curl_exit=0

        status_code=$(curl \
            --silent \
            --show-error \
            --output /dev/null \
            --write-out "%{http_code}" \
            --connect-timeout "$CONNECT_TIMEOUT" \
            --max-time "$REQUEST_TIMEOUT" \
            "$url") || curl_exit=$?

        if [[ "$curl_exit" -eq 0 && "$status_code" == "200" ]]; then
            echo "[OK] $url | HTTP $status_code | Attempt $attempt"
            return 0
        fi

        echo "[RETRY] $url | HTTP $status_code | Attempt $attempt/$MAX_RETRIES | curl exit $curl_exit"

        if ((attempt < MAX_RETRIES)); then
            sleep "$RETRY_INTERVAL"
        fi
    done

    echo "[ERROR] $url | Last HTTP status: $status_code | curl exit: $curl_exit"

    return 1
}

main() {
    local failed=0

    for url in "${SITES[@]}"; do
        if ! check_endpoint "$url"; then
            ((failed += 1))
        fi
    done

    echo
    echo "================================"

    if ((failed > 0)); then
        echo "[FAILED] $failed endpoint(s) unavailable"
        exit 1
    fi

    echo "[SUCCESS] All endpoints are available"
}

main "$@"