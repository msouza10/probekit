output "nlb_ip_address" {
  value = oci_network_load_balancer_network_load_balancer.api-probekit.ip_addresses[0].ip_address
}

output "api_probekit_public_ip" {
  value = [for instance in oci_core_instance.api-probekit : instance.public_ip]
}
