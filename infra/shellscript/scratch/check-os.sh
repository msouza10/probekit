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