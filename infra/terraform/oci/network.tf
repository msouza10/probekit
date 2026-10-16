resource "oci_core_virtual_network" "probekit_vcn" {
  cidr_block     = "10.1.0.0/16"
  compartment_id = var.compartment_id
  display_name   = "probekitVCN"
  dns_label      = "probekitvcn"
}

resource "oci_core_subnet" "api_subnet" {
  cidr_block        = "10.1.20.0/24"
  display_name      = "probekit-subnet"
  dns_label         = "probekit-subnet"
  security_list_ids = [oci_core_security_list.probekit_security_list.id]
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_virtual_network.probekit_vcn.id
  route_table_id    = oci_core_route_table.probekit_route_table.id
  dhcp_options_id   = oci_core_virtual_network.probekit_vcn.default_dhcp_options_id
}

resource "oci_core_internet_gateway" "probekit_internet_gateway" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_virtual_network.probekit_vcn.id
  display_name   = "probekitInternetGateway"
}

resource "oci_core_route_table" "probekit_route_table" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_virtual_network.probekit_vcn.id
  display_name   = "probekitRouteTable"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.probekit_internet_gateway.id
  }
}

resource "oci_core_security_list" "probekit_security_list" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_virtual_network.probekit_vcn.id
  display_name   = "probekitSecurityList"

  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"

    tcp_options {
      max = "22"
      min = "22"
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"

    tcp_options {
      max = "443"
      min = "443"
    }
  }
}


