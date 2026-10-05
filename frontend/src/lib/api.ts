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

export const ORIGIN_REGION = "Oracle Cloud us-ashburn-1 (East)"

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
    const res = await fetch(`/api/ping?${params.toString()}`)
    const data = await res.json()

    if (!res.ok) {
      throw {
        error: data.error || "Falha ao executar ping",
        code: data.code || "unknown_error",
      } as ApiError
    }

    return {
      ...data,
      origin_region: ORIGIN_REGION,
    }
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err) {
      throw err as ApiError
    }
    // Network or server unreachable fallback
    throw {
      error:
        "Não foi possível conectar ao backend Go (verifique se http://localhost:8080 está ativo).",
      code: "backend_unreachable",
    } as ApiError
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
    const res = await fetch(`/api/dns-lookup?${params.toString()}`)
    const data = await res.json()

    if (!res.ok) {
      throw {
        error: data.error || "Falha na consulta DNS",
        code: data.code || "unknown_error",
      } as ApiError
    }

    return {
      ...data,
      origin_region: ORIGIN_REGION,
    }
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err) {
      throw err as ApiError
    }
    throw {
      error:
        "Não foi possível conectar ao backend Go (verifique se http://localhost:8080 está ativo).",
      code: "backend_unreachable",
    } as ApiError
  }
}
