
resource "cloudflare_dns_record" "api" {
  zone_id = var.zone_id
  name    = "api.${var.fqdn_name}"
  type    = "A"
  content = var.nlb_ip_address
  ttl     = 1
  proxied = true
}