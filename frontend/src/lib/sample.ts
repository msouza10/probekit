import type { DnsLookupResult, PingResult } from "@/lib/api"

// Resultados reais, colados de uma chamada à API de produção em 25/10/2026
// (GET /api/ping e /api/dns-lookup contra probekit.cc). São estáticos de
// propósito: a Home não chama a API a cada visita.
export const sampleTarget = "probekit.cc"
export const sampleDate = "25/10/2026"

export const samplePing: Pick<
  PingResult,
  | "target"
  | "ip_addr"
  | "packets_sent"
  | "packets_recv"
  | "packet_loss"
  | "min_rtt"
  | "avg_rtt"
  | "max_rtt"
> = {
  target: "probekit.cc",
  ip_addr: "172.67.154.227",
  packets_sent: 5,
  packets_recv: 5,
  packet_loss: 0,
  min_rtt: "1.486375ms",
  avg_rtt: "1.564151ms",
  max_rtt: "1.621369ms",
}

export const sampleDns: Pick<DnsLookupResult, "domain" | "addrs" | "ns"> = {
  domain: "probekit.cc",
  addrs: [
    "104.21.6.138",
    "172.67.154.227",
    "2606:4700:3037::6815:68a",
    "2606:4700:3035::ac43:9ae3",
  ],
  ns: ["aragorn.ns.cloudflare.com", "reza.ns.cloudflare.com"],
}
