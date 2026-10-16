terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.26.0"
    }
    oci = {
      source  = "oracle/oci"
      version = "5.26.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cf_api_token
}

provider "oci" {
  region           = "sa-saopaulo-1"
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
}

# linux variables

# chave publica SSH injetada nas maquinas (par: infra/ssh/probekit.key)
variable "ssh_public_key" {
  type = string
}

# cloudflare variables

variable "cf_api_token" {
  type = string
}

variable "fqdn_name" {
  type    = string
  default = "probekit.cc"
}

variable "zone_id" {
  type = string
}

# oci variables

variable "instance_availability_domain" {
  type = string
}

variable "tenancy_ocid" {
  type = string
}

variable "compartment_id" {
  type = string
}

variable "user_ocid" {
  type = string
}

variable "fingerprint" {
  type = string
}

# caminho do .pem da API da OCI (nao e a chave SSH das maquinas)
variable "private_key_path" {
  type = string
}

module "oci" {
  source = "./oci"

  instance_availability_domain = var.instance_availability_domain
  tenancy_ocid                 = var.tenancy_ocid
  compartment_id               = var.compartment_id

  # variables for other module

  ssh_public_key = var.ssh_public_key
}

module "cloudflare" {
  source = "./cloudflare"

  cf_api_token = var.cf_api_token
  fqdn_name    = var.fqdn_name
  zone_id      = var.zone_id

  # variables for other module

  nlb_ip_address = module.oci.nlb_ip_address
}

output "api_probekit_public_ip" {
  value = module.oci.api_probekit_public_ip
}