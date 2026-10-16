terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "5.26.0"
    }
  }
}

variable "instance_availability_domain" {
  type = string
}

variable "tenancy_ocid" {
  type = string
}

variable "compartment_id" {
  type = string
}

# linux variables

variable "ssh_public_key" {
  type = string
}