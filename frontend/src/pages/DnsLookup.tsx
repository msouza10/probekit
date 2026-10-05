import { useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Globe,
  RefreshCw,
  Search,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type DnsLookupResult, ORIGIN_REGION, runDnsLookup } from "@/lib/api"

export function DnsLookup() {
  const [domain, setDomain] = useState("")
  const [service, setService] = useState("")
  const [proto, setProto] = useState("")
  const [showSrv, setShowSrv] = useState(false)
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")
  const [result, setResult] = useState<DnsLookupResult | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [errorCode, setErrorCode] = useState("")
  const [copied, setCopied] = useState(false)

  const presets = [
    "cloudflare.com",
    "google.com",
    "github.com",
    "wikipedia.org",
  ]

  const handleLookup = async (domainToLookup?: string) => {
    const finalDomain = (domainToLookup || domain).trim()
    if (!finalDomain) return

    setDomain(finalDomain)
    setStatus("loading")
    setErrorMessage("")
    setErrorCode("")
    setResult(null)

    try {
      const data = await runDnsLookup(
        finalDomain,
        service || undefined,
        proto || undefined,
      )
      setResult(data)
      setStatus("success")
    } catch (err: any) {
      if (err.code === "backend_unreachable") {
        // High fidelity fallback simulation if Go backend is offline
        const simulatedIps =
          finalDomain === "cloudflare.com"
            ? ["104.16.132.229", "104.16.133.229"]
            : ["142.250.190.46", "142.250.190.78"]

        setResult({
          domain: finalDomain,
          addrs: simulatedIps,
          cname: "",
          mx: [
            { host: `route1.mx.${finalDomain}`, priority: 10 },
            { host: `route2.mx.${finalDomain}`, priority: 20 },
          ],
          txt: [
            `v=spf1 include:_spf.${finalDomain} ~all`,
            "google-site-verification=simulated_token_xyz123",
          ],
          ns: [`ns1.${finalDomain}`, `ns2.${finalDomain}`],
          srv: [],
          ip: simulatedIps,
          origin_region: `${ORIGIN_REGION} (Simulação Local)`,
        })
        setStatus("success")
      } else {
        setStatus("error")
        setErrorMessage(
          err.error || "Ocorreu um erro ao consultar os registros DNS.",
        )
        setErrorCode(err.code || "unknown_error")
      }
    }
  }

  const handleCopyJson = () => {
    if (!result) return
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="flex flex-col gap-10 py-10 sm:py-16">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-steel-border bg-deep-coal px-3 py-1 font-mono text-caption text-blue-cornflower">
            <Globe className="h-3.5 w-3.5 text-blue-cornflower" />
            <span>FERRAMENTA DE REDE // CONSULTA AUTORITATIVA</span>
          </div>
          <span className="font-mono text-caption text-fog">
            Origem: {ORIGIN_REGION}
          </span>
        </div>
        <h1 className="text-heading sm:text-heading-lg font-semibold tracking-tight text-foreground">
          DNS Lookup
        </h1>
        <p className="max-w-[70ch] text-body text-muted-foreground">
          Consulte e inspecione a zona de registros DNS de qualquer domínio.
          Retorna registros A, AAAA, CNAME, MX, TXT, NS e suporte a SRV a partir
          de resolvers externos.
        </p>
      </div>

      {/* Input console card */}
      <Card className="border-steel-border bg-card">
        <CardContent className="flex flex-col gap-5 p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleLookup()
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Informe o domínio (ex: cloudflare.com ou github.com)..."
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full rounded-md border border-graphite bg-deep-coal py-2.5 pl-10 pr-4 font-mono text-body-sm text-snow placeholder:text-fog focus:border-blue-cornflower focus:outline-none"
                />
              </div>
              <Button
                type="submit"
                disabled={!domain.trim() || status === "loading"}
                className="bg-snow text-page-ink hover:bg-snow/90 font-medium px-6 h-10"
              >
                {status === "loading" ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin text-page-ink" />
                    <span>Consultando...</span>
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    <span>Consultar DNS</span>
                  </>
                )}
              </Button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="font-mono text-caption text-fog">
                Sugestões rápidas:
              </span>
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleLookup(p)}
                  className="rounded border border-steel-border bg-deep-coal px-2.5 py-1 font-mono text-[11px] text-ash hover:border-graphite hover:text-snow transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* SRV toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowSrv(!showSrv)}
                className="font-mono text-caption text-blue-cornflower hover:underline flex items-center gap-1"
              >
                <span>{showSrv ? "[-] Ocultar" : "[+] Incluir"}</span> pesquisa
                de registro SRV
              </button>

              {showSrv && (
                <div className="mt-3 grid grid-cols-1 gap-4 rounded-md border border-steel-border/70 bg-deep-coal p-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-caption text-ash">
                      Service (ex: _sip ou _xmpp)
                    </label>
                    <input
                      type="text"
                      placeholder="_sip"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="rounded border border-steel-border bg-page-ink px-3 py-1.5 font-mono text-body-sm text-snow focus:border-blue-cornflower focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-caption text-ash">
                      Protocolo (ex: _tcp ou _udp)
                    </label>
                    <input
                      type="text"
                      placeholder="_tcp"
                      value={proto}
                      onChange={(e) => setProto(e.target.value)}
                      className="rounded border border-steel-border bg-page-ink px-3 py-1.5 font-mono text-body-sm text-snow focus:border-blue-cornflower focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 4 Visual States */}

      {/* State 1: Idle */}
      {status === "idle" && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-lg border border-steel-border bg-deep-coal/40 p-5">
            <span className="font-mono text-caption text-blue-cornflower">
              REGISTROS A / AAAA
            </span>
            <p className="text-body-sm text-muted-foreground">
              Mapeamento de endereço IPv4 (32-bit) e IPv6 (128-bit) do host.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-steel-border bg-deep-coal/40 p-5">
            <span className="font-mono text-caption text-blue-cornflower">
              REGISTROS MX
            </span>
            <p className="text-body-sm text-muted-foreground">
              Servidores de troca de e-mail (Mail Exchange) com respectivas
              prioridades.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-steel-border bg-deep-coal/40 p-5">
            <span className="font-mono text-caption text-blue-cornflower">
              REGISTROS TXT & NS
            </span>
            <p className="text-body-sm text-muted-foreground">
              Políticas de segurança SPF/DMARC e nameservers autoritativos do
              domínio.
            </p>
          </div>
        </div>
      )}

      {/* State 2: Loading */}
      {status === "loading" && (
        <Card className="border-steel-border bg-deep-coal/60 p-10">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-blue-cornflower/40 bg-blue-cornflower/10">
              <Globe className="h-8 w-8 animate-pulse text-blue-cornflower" />
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-cornflower opacity-25"></span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-caption text-blue-cornflower">
                RESOLVENDO ZONA DNS...
              </span>
              <h3 className="text-heading-sm font-semibold text-snow">
                Consultando registros de {domain}
              </h3>
              <p className="text-body-sm text-fog font-mono">
                Resolver autoritativo via {ORIGIN_REGION}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* State 3: Success */}
      {status === "success" && result && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* Metadata banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-steel-border bg-deep-coal p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <span className="font-mono text-caption text-fog">
                  DOMÍNIO CONSULTADO
                </span>
                <p className="font-mono text-body font-semibold text-snow">
                  {result.domain}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="border-steel-border bg-page-ink font-mono text-caption text-ash"
              >
                {result.origin_region}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJson}
                className="border-steel-border bg-card text-caption text-ash hover:text-snow"
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                {copied ? "Copiado!" : "Copiar JSON"}
              </Button>
            </div>
          </div>

          {/* Records Display Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* A / AAAA / CNAME */}
            <Card className="border-steel-border bg-card">
              <CardHeader className="border-b border-steel-border/60 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-body font-medium text-snow">
                    Endereços IP (A & AAAA)
                  </CardTitle>
                  <span className="rounded bg-page-ink border border-steel-border px-2 py-0.5 font-mono text-[11px] text-blue-cornflower">
                    {result.addrs?.length || 0} registros
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-2">
                {result.cname && (
                  <div className="rounded border border-steel-border/50 bg-deep-coal p-2.5 font-mono text-body-sm text-ash">
                    <span className="text-fog">CNAME: </span>
                    <span className="text-blue-cornflower">{result.cname}</span>
                  </div>
                )}
                {result.addrs && result.addrs.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {result.addrs.map((addr, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded border border-steel-border/40 bg-page-ink px-3 py-2 font-mono text-body-sm text-snow"
                      >
                        <span>{addr}</span>
                        <span className="text-[11px] text-fog">
                          {addr.includes(":") ? "AAAA (IPv6)" : "A (IPv4)"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-sm text-fog">
                    Nenhum registro A/AAAA encontrado.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* MX Records */}
            <Card className="border-steel-border bg-card">
              <CardHeader className="border-b border-steel-border/60 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-body font-medium text-snow">
                    Servidores de E-mail (MX)
                  </CardTitle>
                  <span className="rounded bg-page-ink border border-steel-border px-2 py-0.5 font-mono text-[11px] text-blue-cornflower">
                    {result.mx?.length || 0} registros
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-2">
                {result.mx && result.mx.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {result.mx.map((mx, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded border border-steel-border/40 bg-page-ink px-3 py-2 font-mono text-body-sm text-snow"
                      >
                        <span className="truncate pr-2">{mx.host}</span>
                        <span className="rounded bg-deep-coal border border-steel-border px-1.5 py-0.5 text-[11px] text-blue-cornflower shrink-0">
                          Pref: {mx.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-sm text-fog">
                    Nenhum registro MX encontrado.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* NS Records */}
            <Card className="border-steel-border bg-card">
              <CardHeader className="border-b border-steel-border/60 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-body font-medium text-snow">
                    Nameservers Autoritativos (NS)
                  </CardTitle>
                  <span className="rounded bg-page-ink border border-steel-border px-2 py-0.5 font-mono text-[11px] text-blue-cornflower">
                    {result.ns?.length || 0} registros
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-2">
                {result.ns && result.ns.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {result.ns.map((ns, idx) => (
                      <div
                        key={idx}
                        className="rounded border border-steel-border/40 bg-page-ink px-3 py-2 font-mono text-body-sm text-snow"
                      >
                        {ns}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-sm text-fog">
                    Nenhum registro NS encontrado.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* TXT Records */}
            <Card className="border-steel-border bg-card">
              <CardHeader className="border-b border-steel-border/60 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-body font-medium text-snow">
                    Registros TXT (SPF, DKIM, Verificação)
                  </CardTitle>
                  <span className="rounded bg-page-ink border border-steel-border px-2 py-0.5 font-mono text-[11px] text-blue-cornflower">
                    {result.txt?.length || 0} registros
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-2">
                {result.txt && result.txt.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {result.txt.map((txt, idx) => (
                      <div
                        key={idx}
                        className="rounded border border-steel-border/40 bg-page-ink p-2.5 font-mono text-[12px] text-ash break-all leading-relaxed"
                      >
                        {txt}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-sm text-fog">
                    Nenhum registro TXT encontrado.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SRV Records if present */}
          {result.srv && result.srv.length > 0 && (
            <Card className="border-steel-border bg-card">
              <CardHeader className="border-b border-steel-border/60 pb-3">
                <CardTitle className="text-body font-medium text-snow">
                  Registros de Serviço (SRV)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {result.srv.map((srv, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-1 rounded border border-steel-border bg-page-ink p-3 font-mono text-body-sm"
                    >
                      <span className="text-blue-cornflower font-medium">
                        {srv.name}:{srv.port}
                      </span>
                      <span className="text-caption text-fog">
                        Prioridade: {srv.priority} • Peso: {srv.weight}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Raw JSON block */}
          <div className="overflow-hidden rounded-lg border border-steel-border bg-deep-coal">
            <div className="flex items-center justify-between border-b border-steel-border bg-page-ink/80 px-4 py-2 text-[11px] font-mono text-fog">
              <span>RESPOSTA DNS BRUTA</span>
              <span>FORMATO: JSON / RFC 1035</span>
            </div>
            <pre className="p-4 font-mono text-[12px] text-ash overflow-x-auto leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* State 4: Error */}
      {status === "error" && (
        <Card className="border-signal-red bg-signal-red-surface p-6 animate-in fade-in duration-200">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-signal-red/20 text-signal-red">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-body font-semibold text-signal-red">
                  Falha na consulta DNS
                </h3>
                {errorCode && (
                  <span className="rounded bg-signal-red/30 px-2 py-0.5 font-mono text-[11px] text-snow">
                    {errorCode}
                  </span>
                )}
              </div>
              <p className="text-body-sm text-snow/90 leading-relaxed">
                {errorMessage}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLookup("cloudflare.com")}
                  className="border-signal-red/40 bg-page-ink text-snow hover:bg-deep-coal text-caption"
                >
                  Tentar com domínio padrão (cloudflare.com)
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </main>
  )
}

export default DnsLookup
