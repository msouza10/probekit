variable "instance_ocpus" { default = 1 }

variable "instance_shape_config_memory_in_gbs" { default = 1 }

data "oci_identity_availability_domain" "ad" {
  compartment_id = var.tenancy_ocid
  ad_number      = 1
}

data "oci_core_images" "ubuntu_image" {
  compartment_id           = var.compartment_id
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "26.04"
  shape                    = "VM.Standard.E2.1.Micro"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_instance" "api-probekit" {
    async               = true
    count               = 2
    availability_domain = data.oci_identity_availability_domain.ad.name
    compartment_id      = var.compartment_id
    shape               = "VM.Standard.E2.1.Micro"
    display_name        = "api-probekit-${count.index}"

    shape_config {
        ocpus = var.instance_ocpus
        memory_in_gbs = var.instance_shape_config_memory_in_gbs
    }

    create_vnic_details {
      subnet_id        = oci_core_subnet.api_subnet.id
      display_name     = "api-probekit-vnic-${count.index}"
      assign_public_ip = true
    }

    metadata = {
      ssh_authorized_keys = file(var.ssh_public_key)
    }

    source_details {
        source_id = data.oci_core_images.ubuntu_image.images[0].id
        source_type = "image"
    }

    
}