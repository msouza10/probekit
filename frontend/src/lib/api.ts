export interface PingResult {
  target: string
  ip_addr: string
  packets_sent: number
  packets_recv: number
  packet_loss: number
  min_rtt: string
  avg_rtt: string
  max_rtt: string
  origin_region?: string
}

export interface MXRecord {
  host: string
  priority: number
}

export interface SRVRecord {
  name: string
  port: number
  priority: number
  weight: number
}

export interface DnsLookupResult {
  domain: string
  addrs: string[]
  cname: string
  mx: MXRecord[]
  txt: string[]
  ns: string[]
  srv: SRVRecord[]
  ip: string[]
  origin_region?: string
}

export interface ApiError {
  error: string
  code: string
}

// Quem hospeda a sonda e onde fica. Valores fixos, porque a API roda sempre na
// mesma região; `origin_region` na resposta, se vier, não é usado para isso.
export const PROBE_PROVIDER = "Oracle Cloud"
export const PROBE_PROVIDER_SHORT = "OCI"
export const PROBE_LOCATION = "São Paulo"

// Em produção VITE_API_BASE_URL aponta para a API (https://api.probekit.cc).
// Vazio, o caminho fica relativo e o proxy do Vite (dev) encaminha para o Go.
function apiUrl(path: string): string {
  const base = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(
    /\/+$/,
    "",
  )
  return `${base}${path}`
}

const BACKEND_UNREACHABLE: ApiError = {
  error: "Não foi possível conectar à API. Tente novamente em instantes.",
  code: "backend_unreachable",
}

export async function runPing(
  target: string,
  count = 5,
  timeout = 2,
): Promise<PingResult> {
  const params = new URLSearchParams({
    target: target.trim(),
    count: String(count),
    timeout: String(timeout),
  })

  try {
    const res = await fetch(apiUrl(`/api/ping?${params.toString()}`))
    const data = await res.json()

    if (!res.ok) {
      throw {
        error: data.error || "Falha ao executar ping",
        code: data.code || "unknown_error",
      } as ApiError
    }

    return data as PingResult
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err) {
      throw err as ApiError
    }
    // Network or server unreachable fallback
    throw { ...BACKEND_UNREACHABLE }
  }
}

export async function runDnsLookup(
  domain: string,
  service?: string,
  proto?: string,
): Promise<DnsLookupResult> {
  const params = new URLSearchParams({ domain: domain.trim() })
  if (service && proto) {
    params.set("service", service.trim())
    params.set("proto", proto.trim())
  }

  try {
    const res = await fetch(apiUrl(`/api/dns-lookup?${params.toString()}`))
    const data = await res.json()

    if (!res.ok) {
      throw {
        error: data.error || "Falha na consulta DNS",
        code: data.code || "unknown_error",
      } as ApiError
    }

    return data as DnsLookupResult
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err) {
      throw err as ApiError
    }
    throw { ...BACKEND_UNREACHABLE }
  }
}
