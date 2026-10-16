terraform {
  backend "oci" {
    namespace = "grqgyccf1nek"
    bucket    = "bucket-20261013-1648"
    region    = "sa-saopaulo-1"
    key       = "probekit/infra/terraform/terraform.tfstate"
  }
}