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

variable "nlb_ip_address" {
  type = string
}
