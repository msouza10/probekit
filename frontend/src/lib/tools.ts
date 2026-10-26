export interface Tool {
  name: string
  description: string
  href: string
  category?: "Rede" | "DNS" | "Segurança" | "Utilitários"
  status?: "Disponível" | "Em breve" | "Planejado"
  tags?: string[]
  /** Por que a ferramenta existe no laboratório (texto da Home, em primeira pessoa). */
  why?: string
  iconName?:
    "Activity" | "Globe" | "Network" | "ShieldCheck" | "FileCode2" | "Clock"
}

export const tools: Tool[] = [
  {
    name: "Ping",
    description:
      "O site ou servidor responde? Mostra quanto demora, quantos pacotes se perdem no caminho e quanto o tempo varia.",
    href: "/ping",
    category: "Rede",
    status: "Disponível",
    why: "Queria medir a distância até um servidor em vez de supor. Mandar ICMP de verdade, de uma máquina minha na nuvem, é o jeito mais direto que achei de praticar rede.",
    tags: ["ICMP", "Latência", "Jitter", "Perda"],
    iconName: "Activity",
  },
  {
    name: "DNS Lookup",
    description:
      "Que registros um domínio publica? Endereços (A, AAAA), apelidos (CNAME), e-mail (MX), textos (TXT) e servidores de nome (NS); SRV quando pedido.",
    href: "/dns-lookup",
    category: "DNS",
    status: "Disponível",
    why: "Muito problema estranho de rede acaba sendo DNS. Ver os registros crus, do jeito que o resolvedor devolve, me ajuda a entender o que um domínio anuncia de fato.",
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
