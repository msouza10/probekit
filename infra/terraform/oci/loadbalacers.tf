resource "oci_network_load_balancer_network_load_balancer" "api-probekit" {
    compartment_id = var.compartment_id
    subnet_id      = oci_core_subnet.api_subnet.id
    is_private     = false
    display_name   = "api-probekit"
}

resource "oci_network_load_balancer_backend_set" "api-probekit-backend-set" {
    name = "api-probekit-backend-set"
    network_load_balancer_id = oci_network_load_balancer_network_load_balancer.api-probekit.id
    policy = "FIVE_TUPLE"
    health_checker {
        protocol = "TCP"
        port = 8080
        interval_in_millis = 10000
        timeout_in_millis = 3000
        retries = 3
    }   
}

resource "oci_network_load_balancer_backend" "api-probekit-backend" {
    count = 2
    network_load_balancer_id = oci_network_load_balancer_network_load_balancer.api-probekit.id
    backend_set_name = oci_network_load_balancer_backend_set.api-probekit-backend-set.name
    target_id = oci_core_instance.api-probekit[count.index].id
    port = 8080
    weight = 1
}

resource "oci_network_load_balancer_listener" "api-probekit-listener" {
    name = "api-probekit-listener"
    network_load_balancer_id = oci_network_load_balancer_network_load_balancer.api-probekit.id
    default_backend_set_name = oci_network_load_balancer_backend_set.api-probekit-backend-set.name
    port = 8080
    protocol = "TCP"
}
