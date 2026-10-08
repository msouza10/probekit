output "nlb_ip_address" {
  value = oci_network_load_balancer_network_load_balancer.api-probekit.ip_addresses[0].ip_address
}
