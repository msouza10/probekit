#!/bin/bash

set -euo pipefail

REPO="msouza10/probekit"
APP_DIR="/opt/probekit"
APP_USER="probekit"
ASSET="probekit-linux-amd64-api-go"
BIN_PATH="$APP_DIR/api-service-golang"
VERSION_FILE="$APP_DIR/VERSION"
UPDATER_PATH="/usr/local/sbin/autodeploy-api-go.sh"
TLS_CERT_FILE="/etc/probekit/origin-ca.pem"
TLS_KEY_FILE="/etc/probekit/origin-ca-key.pem"

TMP_DIR=""

log() {
    echo "[$(date +%H:%M:%S)] $*"
}

acquire_lock() {
    exec 9>/var/lock/probekit-deploy.lock
    if ! flock -n 9; then
        log "outro deploy em andamento, saindo"
        exit 0
    fi
}

calculate_gid() {
    local gid
    gid=$(id -g "$APP_USER")

    if [ -z "$gid" ]; then
        log "nao foi possivel calcular o gid do usuario $APP_USER" >&2
        exit 1
    fi

    echo "$gid"
}

allow_icmp() {
    local gid
    gid=$(calculate_gid)

    echo "net.ipv4.ping_group_range=$gid $gid" > /etc/sysctl.d/99-probekit-ping.conf
    sysctl -p "/etc/sysctl.d/99-probekit-ping.conf"
}

check_tls_files() {
    if [ -f "$TLS_CERT_FILE" ] && [ -f "$TLS_KEY_FILE" ]; then
        return 0
    fi

    log "arquivo de certificado ou chave nao encontrado" >&2
    exit 1
}

install_tls_files() {
    install -D -o "$APP_USER" -g "$APP_USER" -m 0644 "/tmp/origin-ca.pem" "$TLS_CERT_FILE"
    install -D -o "$APP_USER" -g "$APP_USER" -m 0600 "/tmp/origin-ca-key.pem" "$TLS_KEY_FILE"

    if [ -f "$TLS_CERT_FILE" ] && [ -f "$TLS_KEY_FILE" ]; then
        log "arquivo de certificado ou chave movido para" "$TLS_CERT_FILE" "$TLS_KEY_FILE"

        rm -f "/tmp/origin-ca.pem" "/tmp/origin-ca-key.pem"
        return 0
    fi

    log "arquivo de certificado ou chave nao movido para" "$TLS_CERT_FILE" "$TLS_KEY_FILE" >&2
    exit 1
}

install_dependencies() {
    if command -v jq >/dev/null 2>&1; then
        return 0
    fi

    . /etc/os-release
    if [ "$ID" != "ubuntu" ]; then
        log "SO nao suportado: $ID"
        exit 1
    fi

    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get install -y jq
}

free_ports() {
    for port in "$@"; do
        iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport "$port" -j ACCEPT
        # IPv6 e opcional aqui: se falhar, nao pode derrubar o deploy.
        ip6tables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || ip6tables -I INPUT 1 -p tcp --dport "$port" -j ACCEPT || log "ip6tables falhou na porta $port (ignorando)"
    done

    # Sem isso as regras somem no reboot (o timer recoloca, mas ha uma janela).
    if command -v netfilter-persistent >/dev/null 2>&1; then
        netfilter-persistent save || log "netfilter-persistent save falhou (ignorando)"
    fi
}

ensure_user_and_dir() {
    id -u "$APP_USER" >/dev/null 2>&1 || useradd -m "$APP_USER"
    mkdir -p "$APP_DIR"
}

get_latest_tag() {
    local tag
    tag=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | jq -r '.tag_name')

    if [ -z "$tag" ] || [ "$tag" = "null" ]; then
        log "nenhuma release encontrada" >&2
        exit 1
    fi

    echo "$tag"
}

install_binary() {
    local tag="$1"
    local base="https://github.com/$REPO/releases/download/$tag"

    log "baixando $tag"
    curl -fsSL -o "$TMP_DIR/$ASSET" "$base/$ASSET"
    curl -fsSL -o "$TMP_DIR/SHA256SUMS" "$base/SHA256SUMS"

    (cd "$TMP_DIR" && sha256sum -c SHA256SUMS)

    install -o root -g root -m 0755 "$TMP_DIR/$ASSET" "$BIN_PATH.new"
    mv "$BIN_PATH.new" "$BIN_PATH"

    echo "$tag" > "$VERSION_FILE"
}

write_api_service() {
    cat << EOF > /etc/systemd/system/probekit.service
[Unit]
Description=Probekit API
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment="TLS_CERT_FILE=$TLS_CERT_FILE"
Environment="TLS_KEY_FILE=$TLS_KEY_FILE"
ExecStart=$BIN_PATH
Restart=always
AmbientCapabilities=CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_RAW

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable probekit
}

install_updater() {
    local tag="$1"

    curl -fsSL -o "$TMP_DIR/updater.sh" \
        "https://raw.githubusercontent.com/$REPO/$tag/infra/shellscript/deploy-api-go.sh"

    install -o root -g root -m 0750 "$TMP_DIR/updater.sh" "$UPDATER_PATH.new"
    mv "$UPDATER_PATH.new" "$UPDATER_PATH"
}

write_autodeploy_units() {
    cat << EOF > /etc/systemd/system/autodeploy-api-go.service
[Unit]
Description=Autodeploy API Go (atualiza a API se houver release nova)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=$UPDATER_PATH
EOF

    cat << EOF > /etc/systemd/system/autodeploy-api-go.timer
[Unit]
Description=Autodeploy API Go Timer

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
RandomizedDelaySec=30

[Install]
WantedBy=timers.target
EOF

    systemctl daemon-reload
    systemctl enable --now autodeploy-api-go.timer
}

validate_api() {
    for _ in $(seq 1 15); do
        if curl -fsS -k https://localhost:443/ -H "Host: api.probekit.cc" 2>/dev/null | grep -q "OK"; then
            log "API respondendo"
            return 0
        fi
        sleep 2
    done

    log "API nao respondeu"
    journalctl -u probekit -n 20 --no-pager || true
    exit 1
}

main() {
    acquire_lock

    TMP_DIR=$(mktemp -d)
    trap 'rm -rf "$TMP_DIR"' EXIT

    ensure_user_and_dir
    if [ -f "/tmp/origin-ca.pem" ] && [ -f "/tmp/origin-ca-key.pem" ]; then
        install_tls_files
    fi
    check_tls_files

    install_dependencies
    allow_icmp

    # Antes dos downloads: se algo depois falhar, a porta ja esta aberta.
    free_ports 22 443

    local latest installed="" changed=false
    latest=$(get_latest_tag)
    if [ -f "$VERSION_FILE" ]; then
        installed=$(cat "$VERSION_FILE")
    fi

    if [ "$latest" != "$installed" ]; then
        install_binary "$latest"
        changed=true
    else
        log "ja esta na versao $latest"
    fi

    write_api_service

    if [ "$changed" = true ] || [ ! -f "$UPDATER_PATH" ]; then
        install_updater "$latest"
    fi
    write_autodeploy_units

    if [ "$changed" = true ] || ! systemctl is-active --quiet probekit; then
        systemctl restart probekit
    fi

    validate_api
}

main "$@"
exit 0
