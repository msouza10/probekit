#/bin/bash

if [ -f /etc/debian_version ]; then
    apt update
    apt install -y golang=1.26
elif [ -f /etc/redhat-release ]; then
    dnf update
    dnf install -y golang=1.26
fi

# baixar binario
if ! curl -o probekit https://github.com/msouza10/probekit.git; then
    echo "Erro ao baixar binario"
    exit 1
fi

# criar diretorio
if ! mkdir -p /opt/probekit; then
    echo "Erro ao criar diretorio"
    exit 1
fi

# mover binario 
if ! mv probekit /opt/probekit/probekit; then
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

chmod +x /opt/probekit/probekit


# criar service
cat << EOF > /etc/systemd/system/probekit.service
[Unit]
Description=Probekit API
After=network.target

[Service]
User=probekit
WorkingDirectory=/opt/probekit/backend/api-service-golang
ExecStart=go run .
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

if curl --fail http://localhost:8080/ -H "Host: api.probekit.cc" | grep "OK" > /dev/null 2>&1; then
    echo "Service started successfully"
else
    echo "Service failed to start"
    exit 1
fi


