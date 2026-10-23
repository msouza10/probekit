#!/usr/bin/env bash
# Funcoes de apoio dos cenarios. O "mundo" simulado vive em /world:
#   /world/releases/<tag>/<arquivos>   o que o GitHub serviria
#   /world/latest                      a tag que releases/latest devolveria
#   /world/state/service               healthy | crashed | stopped
#   /world/log/{curl,systemctl}.log    o que o updater chamou, por execucao

WORLD=/world
ASSET=probekit-linux-amd64-api-go
BIN=/opt/probekit/api-service-golang
VERSION_FILE=/opt/probekit/VERSION

PASS=0
FAIL=0
UPDATER_OUT=""
UPDATER_EXIT=0

reset_world() {
    rm -rf "$WORLD" /opt/probekit /etc/probekit /usr/local/sbin/autodeploy-api-go.sh \
        /etc/systemd/system/probekit.service /var/lock/probekit-deploy.lock
    mkdir -p "$WORLD"/releases "$WORLD"/log "$WORLD"/state \
        /etc/probekit /etc/systemd/system /etc/sysctl.d /usr/local/sbin
    echo dummy >/etc/probekit/origin-ca.pem
    echo dummy >/etc/probekit/origin-ca-key.pem
    echo stopped >"$WORLD/state/service"
}

# make_release <tag> <good|bad>: o "binario" e um texto "GOOD <tag>" ou "BAD <tag>".
make_release() {
    local tag="$1" kind="$2" dir="$WORLD/releases/$1"
    mkdir -p "$dir"
    printf '%s %s\n' "$(tr '[:lower:]' '[:upper:]' <<<"$kind")" "$tag" >"$dir/$ASSET"
    (cd "$dir" && sha256sum "$ASSET" >SHA256SUMS)
}

# Altera o binario depois de calcular o checksum.
tamper_release() {
    echo "adulterado" >>"$WORLD/releases/$1/$ASSET"
}

set_latest() {
    echo "$1" >"$WORLD/latest"
}

# seed_installed <tag> <good|bad>: deixa uma versao ja instalada, sem passar pelo updater.
seed_installed() {
    local tag="$1" kind="$2"
    mkdir -p /opt/probekit
    printf '%s %s\n' "$(tr '[:lower:]' '[:upper:]' <<<"$kind")" "$tag" >"$BIN"
    echo "$tag" >"$VERSION_FILE"
    if [[ "$kind" == "good" ]]; then echo healthy >"$WORLD/state/service"; else echo crashed >"$WORLD/state/service"; fi
}

run_updater() {
    : >"$WORLD/log/curl.log"
    : >"$WORLD/log/systemctl.log"
    UPDATER_OUT=$(bash /under-test/deploy-api-go.sh 2>&1)
    UPDATER_EXIT=$?
    if [[ -n "${VERBOSE:-}" ]]; then
        echo "    --- saida do updater (exit $UPDATER_EXIT) ---"
        while IFS= read -r line; do
            echo "    | $line"
        done <<<"$UPDATER_OUT"
    fi
}

installed_version() { if [[ -f "$VERSION_FILE" ]]; then cat "$VERSION_FILE"; else echo "(nenhuma)"; fi; }
binary_id() { if [[ -f "$BIN" ]]; then head -n1 "$BIN"; else echo "(nenhum)"; fi; }
service_state() { cat "$WORLD/state/service"; }
restart_count() { grep -c '^restart ' "$WORLD/log/systemctl.log" || true; }
download_count() { grep -c "/releases/download/$1/$ASSET\$" "$WORLD/log/curl.log" || true; }
exit_kind() { if [[ "$UPDATER_EXIT" -eq 0 ]]; then echo zero; else echo erro; fi; }

# check <descricao> <esperado> <obtido>
check() {
    if [[ "$2" == "$3" ]]; then
        PASS=$((PASS + 1))
        echo "    ok      $1"
    else
        FAIL=$((FAIL + 1))
        echo "    FALHOU  $1 (esperado: $2 | obtido: $3)"
    fi
}
