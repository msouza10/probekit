/*
 * Quem oferece a promoção. O `vendor` vem do LLM em texto livre ("AWS",
 * "Amazon Web Services", "Google Cloud", "GCP"); aqui ele vira uma chave
 * conhecida (para o logo, o nome e o filtro tratarem tudo como um provider só).
 */

export type ProviderKey =
  | "aws"
  | "microsoft"
  | "google"
  | "cisco"
  | "comptia"
  | "hashicorp"
  | "linux-foundation"
  | "red-hat"
  | "vmware"
  | "canonical"
  | "oracle"
  | "docker"
  | "elastic"
  | "databricks"
  | "neo4j"

interface Provider {
  key: ProviderKey
  name: string
  aliases: string[]
}

const PROVIDERS: Provider[] = [
  {
    key: "aws",
    name: "AWS",
    aliases: ["aws", "amazon web services", "amazon"],
  },
  {
    key: "microsoft",
    name: "Microsoft",
    aliases: ["microsoft", "azure"],
  },
  {
    key: "google",
    name: "Google Cloud",
    aliases: ["google cloud", "google", "gcp"],
  },
  { key: "cisco", name: "Cisco", aliases: ["cisco"] },
  { key: "comptia", name: "CompTIA", aliases: ["comptia"] },
  { key: "hashicorp", name: "HashiCorp", aliases: ["hashicorp"] },
  {
    key: "linux-foundation",
    name: "Linux Foundation",
    aliases: ["linux foundation", "cncf"],
  },
  { key: "red-hat", name: "Red Hat", aliases: ["red hat", "redhat"] },
  { key: "vmware", name: "VMware", aliases: ["vmware"] },
  { key: "canonical", name: "Canonical", aliases: ["canonical", "ubuntu"] },
  { key: "oracle", name: "Oracle", aliases: ["oracle"] },
  { key: "docker", name: "Docker", aliases: ["docker"] },
  { key: "elastic", name: "Elastic", aliases: ["elastic", "elasticsearch"] },
  { key: "databricks", name: "Databricks", aliases: ["databricks"] },
  { key: "neo4j", name: "Neo4j", aliases: ["neo4j"] },
]

/** Minúsculas, sem acento nem pontuação, espaços únicos: "Microsoft®" -> "microsoft". */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** A chave do provider conhecido, ou `null`. Só casa palavras inteiras ("awsome" não é "aws"). */
export function providerKey(
  vendor: string | null | undefined,
): ProviderKey | null {
  const text = normalizeText(vendor ?? "")
  if (!text) return null
  const padded = ` ${text} `
  const found = PROVIDERS.find((p) =>
    p.aliases.some((alias) => padded.includes(` ${alias} `)),
  )
  return found?.key ?? null
}

/** Identificador para filtrar: a chave se o provider é conhecido, senão o nome normalizado. */
export function providerId(vendor: string | null | undefined): string {
  return providerKey(vendor) ?? normalizeText(vendor ?? "")
}

/** Nome para mostrar: o nome da marca se conhecido; senão até 4 letras em maiúsculas, ou cada palavra capitalizada. */
export function providerName(vendor: string): string {
  const key = providerKey(vendor)
  if (key) return PROVIDERS.find((p) => p.key === key)!.name
  const name = vendor.trim()
  if (name.length <= 4) return name.toUpperCase()
  return name
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
