import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { runDnsLookup, runPing } from "./api"

const pingBody = {
  target: "1.1.1.1",
  ip_addr: "1.1.1.1",
  packets_sent: 2,
  packets_recv: 2,
  packet_loss: 0,
  min_rtt: "1ms",
  avg_rtt: "1ms",
  max_rtt: "1ms",
}

const dnsBody = {
  domain: "example.com",
  addrs: [],
  cname: "",
  mx: [],
  txt: [],
  ns: [],
  srv: [],
  ip: [],
}

function mockFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(Response.json(body, { status })),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function calledUrl(fetchMock: ReturnType<typeof mockFetch>): string {
  return String((fetchMock.mock.calls[0] as unknown[])[0])
}

beforeEach(() => {
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("runPing", () => {
  it("prefixes the request with VITE_API_BASE_URL when it is set", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.probekit.cc")
    const fetchMock = mockFetch(pingBody)

    await runPing("1.1.1.1", 2, 3)

    expect(calledUrl(fetchMock)).toBe(
      "https://api.probekit.cc/api/ping?target=1.1.1.1&count=2&timeout=3",
    )
  })

  it("uses a relative path when VITE_API_BASE_URL is empty (dev proxy)", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "")
    const fetchMock = mockFetch(pingBody)

    await runPing("1.1.1.1", 2, 3)

    expect(calledUrl(fetchMock)).toBe(
      "/api/ping?target=1.1.1.1&count=2&timeout=3",
    )
  })

  it("does not produce a double slash when the base URL ends with one", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.probekit.cc/")
    const fetchMock = mockFetch(pingBody)

    await runPing("1.1.1.1", 2, 3)

    expect(calledUrl(fetchMock)).toBe(
      "https://api.probekit.cc/api/ping?target=1.1.1.1&count=2&timeout=3",
    )
  })

  it("returns the origin_region sent by the API", async () => {
    mockFetch({ ...pingBody, origin_region: "sa-saopaulo-1" })

    const result = await runPing("1.1.1.1")

    expect(result.origin_region).toBe("sa-saopaulo-1")
  })

  it("does not invent an origin_region when the API omits it", async () => {
    mockFetch(pingBody)

    const result = await runPing("1.1.1.1")

    expect(result.origin_region).toBeUndefined()
  })

  it("throws the API error body on a non-2xx response", async () => {
    mockFetch(
      {
        error: "Private ip address is not allowed",
        code: "private_ip_not_allowed",
      },
      400,
    )

    await expect(runPing("10.0.0.1")).rejects.toEqual({
      error: "Private ip address is not allowed",
      code: "private_ip_not_allowed",
    })
  })

  it("reports backend_unreachable without mentioning localhost when the network fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    )

    const error = await runPing("1.1.1.1").catch((e) => e)

    expect(error.code).toBe("backend_unreachable")
    expect(error.error).not.toMatch(/localhost|8080/)
  })
})

describe("runDnsLookup", () => {
  it("prefixes the request with VITE_API_BASE_URL when it is set", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.probekit.cc")
    const fetchMock = mockFetch(dnsBody)

    await runDnsLookup("example.com")

    expect(calledUrl(fetchMock)).toBe(
      "https://api.probekit.cc/api/dns-lookup?domain=example.com",
    )
  })

  it("sends service and proto when both are given", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "")
    const fetchMock = mockFetch(dnsBody)

    await runDnsLookup("example.com", "_sip", "_tcp")

    expect(calledUrl(fetchMock)).toBe(
      "/api/dns-lookup?domain=example.com&service=_sip&proto=_tcp",
    )
  })

  it("returns the origin_region sent by the API", async () => {
    mockFetch({ ...dnsBody, origin_region: "sa-saopaulo-1" })

    const result = await runDnsLookup("example.com")

    expect(result.origin_region).toBe("sa-saopaulo-1")
  })

  it("does not invent an origin_region when the API omits it", async () => {
    mockFetch(dnsBody)

    const result = await runDnsLookup("example.com")

    expect(result.origin_region).toBeUndefined()
  })

  it("reports backend_unreachable without mentioning localhost when the network fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    )

    const error = await runDnsLookup("example.com").catch((e) => e)

    expect(error.code).toBe("backend_unreachable")
    expect(error.error).not.toMatch(/localhost|8080/)
  })
})
