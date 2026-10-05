export interface Tool {
  name: string
  description: string
  href: string
}

export const tools: Tool[] = [
  {
    name: "Ping",
    description: "Meça latência, perda de pacotes e jitter até um host.",
    href: "/ping",
  },
  {
    name: "DNS Lookup",
    description: "Consulte os registros DNS de um domínio.",
    href: "/dns-lookup",
  },
]
