export interface Tool {
  name: string
  description: string
  href: string
  category?: "Rede" | "DNS" | "Segurança" | "Utilitários"
  status?: "Disponível" | "Em breve" | "Planejado"
  tags?: string[]
  iconName?:
    "Activity" | "Globe" | "Network" | "ShieldCheck" | "FileCode2" | "Clock"
}

export const tools: Tool[] = [
  {
    name: "Ping",
    description:
      "Meça latência, perda de pacotes e jitter com ICMP nativo a partir do nó de nuvem.",
    href: "/ping",
    category: "Rede",
    status: "Em breve",
    tags: ["ICMP", "Latência", "Jitter", "Perda"],
    iconName: "Activity",
  },
  {
    name: "DNS Lookup",
    description:
      "Consulte e inspecione registros DNS autoritativos (A, AAAA, CNAME, MX, TXT, NS e SRV).",
    href: "/dns-lookup",
    category: "DNS",
    status: "Em breve",
    tags: ["A / AAAA", "MX", "TXT", "NS", "SRV"],
    iconName: "Globe",
  },
  {
    name: "Calculadora CIDR",
    description:
      "Analise blocos IPv4/IPv6, máscaras de rede, faixas utilizáveis e endereços de broadcast.",
    href: "/cidr",
    category: "Rede",
    status: "Planejado",
    tags: ["IPv4/IPv6", "Subnet", "Netmask"],
    iconName: "Network",
  },
  {
    name: "Inspetor SSL/TLS",
    description:
      "Valide validade de certificados, autoridade emissora (CA), SANs e versões de protocolo.",
    href: "/ssl",
    category: "Segurança",
    status: "Planejado",
    tags: ["X.509", "TLS 1.3", "Expiração"],
    iconName: "ShieldCheck",
  },
  {
    name: "Headers HTTP & CORS",
    description:
      "Inspecione cabeçalhos de resposta HTTP, políticas CSP, HSTS e configurações de segurança.",
    href: "/headers",
    category: "Segurança",
    status: "Planejado",
    tags: ["HTTP/2", "Security", "CORS"],
    iconName: "FileCode2",
  },
  {
    name: "Tradutor Cron",
    description:
      "Decodifique expressões de agendamento cron para linguagem natural com próximos disparos.",
    href: "/cron",
    category: "Utilitários",
    status: "Planejado",
    tags: ["Cron", "Agendamento", "DevOps"],
    iconName: "Clock",
  },
]
