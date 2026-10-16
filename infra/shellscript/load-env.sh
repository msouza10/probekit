#!/usr/bin/env bash
# Uso: source ./load-env.sh   (precisa ser "source", senão os exports somem ao fim do script)
# Lê terraform.tfvars e exporta cada chave como TF_VAR_<chave>.
# A chave privada da OCI não vem do tfvars: o script aponta para o .pem.

unset TF_VAR_private_key_path

_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_tfvars="${1:-$_dir/terraform.tfvars}"
_default_key="$_dir/../ssh/probekit-oci.pem"

if [ ! -f "$_tfvars" ]; then
  echo "arquivo nao encontrado: $_tfvars" >&2
  return 1 2>/dev/null || exit 1
fi

while IFS= read -r line || [ -n "$line" ]; do
  # ignora comentarios e linhas vazias
  [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
  # so aceita linhas do tipo chave = valor
  [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*(.*)$ ]] || continue

  key="${BASH_REMATCH[1]}"
  value="${BASH_REMATCH[2]}"

  # a chave privada vem do .pem, nao do tfvars
  [ "$key" = "private_key" ] && continue

  # remove espacos no fim e aspas externas
  value="${value%"${value##*[![:space:]]}"}"
  value="${value#\"}"; value="${value%\"}"

  export "TF_VAR_${key}=${value}"
  echo "exportado TF_VAR_${key}"
done < "$_tfvars"

# Caminho do .pem: usa o do tfvars (private_key_path) se existir, senao o padrao.
if [ -z "${TF_VAR_private_key_path:-}" ]; then
  export TF_VAR_private_key_path="$(cd "$(dirname "$_default_key")" 2>/dev/null && pwd)/$(basename "$_default_key")"
fi

if [ ! -f "$TF_VAR_private_key_path" ]; then
  echo "AVISO: .pem nao encontrado em $TF_VAR_private_key_path" >&2
fi

# Backend OCI nao le var.*; usa o mesmo .pem e a mesma regiao.
export TF_VAR_region="sa-saopaulo-1"
echo "exportado TF_VAR_region e TF_VAR_private_key_path ($TF_VAR_private_key_path)"

unset _dir _tfvars _default_key key value line
