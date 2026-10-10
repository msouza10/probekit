#!/bin/bash

# checar se existe arquivo /etc/os-release
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [ "$ID" = "ubuntu" ]; then
    echo "Ubuntu"
        if ! apt update; then
            echo "Erro ao atualizar apt"
            exit 1
        fi
        if ! apt install -y jq; then
            echo "Erro ao instalar jq"
            exit 1
        fi
    elif [ "$ID" = "redhat" ]; then
        echo "Red Hat"
        if ! dnf update; then
            echo "Erro ao atualizar dnf"
            exit 1
        fi
        if ! dnf install -y jq; then
        echo "Erro ao instalar jq"
        exit 1
        fi
    fi
fi 

# baixar binario o ultimo binario disponivel
# usar curl para buscar o ultimo tag e fazer o download do binario

LATEST=$(curl -fsSL https://api.github.com/repos/msouza10/probekit/releases/latest | jq -r '.tag_name')

if ! curl -fsSL -o api-service-golang https://github.com/msouza10/probekit/releases/download/${LATEST}/probekit-linux-amd64-api-go; then
    echo "Erro ao baixar binario"
    exit 1
fi

# criar pasta
if ! mkdir -p /opt/probekit; then
    echo "Erro ao criar pasta probekit"
    exit 1
fi

# mover binario 
if ! mv api-service-golang /opt/probekit; then
    echo "Erro ao mover binario"
    exit 1
fi

# criar usuario de service
if ! id -u probekit >/dev/null 2>&1; then
    if ! useradd -m probekit; then
        echo "Erro ao criar usuario probekit"
        exit 1
    fi
fi

# alterar permissoes dos arquivos

chown -R probekit:probekit /opt/probekit

chmod 500 -R /opt/probekit/


# criar service
cat << EOF > /etc/systemd/system/probekit.service
[Unit]
Description=Probekit API
After=network.target

[Service]
User=probekit
WorkingDirectory=/opt/probekit
ExecStart=/opt/probekit/api-service-golang
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

# habilitar e iniciar service
if ! systemctl enable probekit; then
    echo "Erro ao habilitar service"
    exit 1
fi

if ! systemctl start probekit; then
    echo "Erro ao iniciar service"
    exit 1
fi

# validar se a api esta rodando

if curl --fail http://localhost:8080/ -H "Host: api.probekit.cc" | grep "OK" > /dev/null 2>&1; then
    echo "Service started successfully"
else
    echo "Service failed to start"
    exit 1
fi