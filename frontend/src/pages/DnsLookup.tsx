import { type ReactNode, useState } from "react"
import { Bench } from "@/components/Bench"
import { Reveal } from "@/components/Reveal"
import { Button } from "@/components/ui/button"
import { type DnsLookupResult, PROBE_PROVIDER, runDnsLookup } from "@/lib/api"

const prose = "max-w-[38rem] text-body text-foreground/90"
const fieldClass =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm text-foreground placeholder:text-muted-foreground"
const labelClass = "text-body-sm font-medium text-foreground"
const groupTitle = "text-xs tracking-wider text-bench-muted uppercase"
const emptyNote = "text-bench-muted"
const th = "pb-1 pr-6 text-left text-xs font-normal text-bench-muted"
const td = "py-1 pr-6 align-top break-all"

function Group({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2 border-t border-bench-border pt-4 first:border-t-0 first:pt-0">
      <h3 className={groupTitle}>
        {title}
        {count !== undefined ? ` (${count})` : ""}
      </h3>
      {children}
    </section>
  )
}

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
      if (import.meta.env.DEV && err.code === "backend_unreachable") {
        // Simulation only in dev (Go backend offline). In production a
        // failure must show as an error, never as made-up results.
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
          origin_region: "Simulação local",
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
    <main className="flex flex-col gap-12 pt-12 pb-8 sm:gap-14 sm:pt-20">
      <Reveal className="flex flex-col gap-5">
        <h1 className="text-[2.125rem] leading-[1.12] font-medium tracking-[-0.02em] text-foreground sm:text-heading-lg">
          DNS Lookup
        </h1>
        <p className="max-w-[36rem] text-body-lg text-muted-foreground">
          Mostra os registros DNS de um domínio: endereços (A e AAAA), CNAME,
          servidores de e-mail (MX), TXT e nameservers (NS). Também consulta
          registros SRV, se você informar serviço e protocolo.
        </p>
      </Reveal>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleLookup()
        }}
        className="flex max-w-[44rem] flex-col gap-6 font-sans"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="dns-domain" className={labelClass}>
            Domínio
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="dns-domain"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="cloudflare.com ou github.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className={`${fieldClass} flex-1 font-mono`}
            />
            <Button
              type="submit"
              size="lg"
              disabled={!domain.trim() || status === "loading"}
              className="min-h-11 sm:px-8"
            >
              {status === "loading" ? "Consultando..." : "Consultar DNS"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-body-sm text-muted-foreground">
            Atalhos:
          </span>
          {presets.map((p) => (
            <Button
              key={p}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleLookup(p)}
              className="min-h-11 sm:min-h-8"
            >
              {p}
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            aria-expanded={showSrv}
            aria-controls="dns-srv"
            onClick={() => setShowSrv(!showSrv)}
            className="inline-flex min-h-11 w-fit items-center text-body-sm font-medium text-foreground underline decoration-highlight/50 underline-offset-4 transition-colors hover:decoration-highlight"
          >
            {showSrv ? "Ocultar consulta SRV" : "Incluir consulta SRV"}
          </button>

          {showSrv && (
            <div
              id="dns-srv"
              className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="dns-service" className={labelClass}>
                  Serviço (ex: _sip ou _xmpp)
                </label>
                <input
                  id="dns-service"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="_sip"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className={`${fieldClass} font-mono`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="dns-proto" className={labelClass}>
                  Protocolo (ex: _tcp ou _udp)
                </label>
                <input
                  id="dns-proto"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="_tcp"
                  value={proto}
                  onChange={(e) => setProto(e.target.value)}
                  className={`${fieldClass} font-mono`}
                />
              </div>
            </div>
          )}
        </div>
      </form>

      {status === "idle" && (
        <div className="flex flex-col gap-4">
          <p className={prose}>
            A consulta sai de uma VM na {PROBE_PROVIDER}, em Ashburn, na
            Virgínia (EUA), e usa o resolvedor de DNS do sistema dessa máquina.
            Ela não pergunta direto aos servidores autoritativos do domínio.
          </p>
          <p className={prose}>
            Cada MX vem com a sua prioridade: quanto menor o número, mais cedo
            aquele servidor é tentado. Os registros TXT costumam carregar
            políticas de e-mail, como SPF, e códigos de verificação de domínio.
          </p>
        </div>
      )}

      <div aria-live="polite">
        {status === "loading" && (
          <p
            role="status"
            className="max-w-[38rem] break-words text-body text-muted-foreground"
          >
            Consultando os registros de {domain}, a partir de {PROBE_PROVIDER}
            ...
          </p>
        )}
      </div>

      {status === "success" && result && (
        <Reveal className="flex max-w-[44rem] flex-col gap-3">
          <Bench label="Registros" meta={result.origin_region}>
            <p className="break-all text-base text-bench-foreground">
              {result.domain}
            </p>
            <div className="mt-4 flex flex-col gap-4">
              <Group title="A e AAAA" count={result.addrs?.length || 0}>
                {result.cname && (
                  <p className="break-all">
                    <span className="text-bench-muted">CNAME </span>
                    {result.cname}
                  </p>
                )}
                {result.addrs && result.addrs.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {result.addrs.map((addr, idx) => (
                      <li key={idx} className="flex flex-wrap gap-x-4">
                        <span className="break-all">{addr}</span>
                        <span className="text-bench-muted">
                          {addr.includes(":") ? "IPv6" : "IPv4"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={emptyNote}>Nenhum registro A/AAAA encontrado.</p>
                )}
              </Group>

              <Group title="MX" count={result.mx?.length || 0}>
                {result.mx && result.mx.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th scope="col" className={th}>
                          Prioridade
                        </th>
                        <th scope="col" className={th}>
                          Servidor
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.mx.map((mx, idx) => (
                        <tr key={idx}>
                          <td className={td}>{mx.priority}</td>
                          <td className={td}>{mx.host}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className={emptyNote}>Nenhum registro MX encontrado.</p>
                )}
              </Group>

              <Group title="NS" count={result.ns?.length || 0}>
                {result.ns && result.ns.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {result.ns.map((ns, idx) => (
                      <li key={idx} className="break-all">
                        {ns}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={emptyNote}>Nenhum registro NS encontrado.</p>
                )}
              </Group>

              <Group title="TXT" count={result.txt?.length || 0}>
                {result.txt && result.txt.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {result.txt.map((txt, idx) => (
                      <li key={idx} className="break-all leading-6">
                        {txt}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={emptyNote}>Nenhum registro TXT encontrado.</p>
                )}
              </Group>

              {result.srv && result.srv.length > 0 && (
                <Group title="SRV" count={result.srv.length}>
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th scope="col" className={th}>
                          Nome
                        </th>
                        <th scope="col" className={th}>
                          Porta
                        </th>
                        <th scope="col" className={th}>
                          Prioridade
                        </th>
                        <th scope="col" className={th}>
                          Peso
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.srv.map((srv, idx) => (
                        <tr key={idx}>
                          <td className={td}>{srv.name}</td>
                          <td className={td}>{srv.port}</td>
                          <td className={td}>{srv.priority}</td>
                          <td className={td}>{srv.weight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Group>
              )}
            </div>
            <pre className="mt-6 border-t border-bench-border pt-4 text-[0.8125rem] leading-6 text-bench-foreground">
              {JSON.stringify(result, null, 2)}
            </pre>
          </Bench>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyJson}
              className="min-h-11 font-sans sm:min-h-8"
            >
              {copied ? "Copiado!" : "Copiar JSON"}
            </Button>
          </div>
        </Reveal>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="flex max-w-[44rem] flex-col gap-3 rounded-md border border-destructive bg-destructive-surface p-5 font-sans"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-body font-semibold text-destructive">
              Falha na consulta DNS
            </h2>
            {errorCode && (
              <code className="rounded-sm border border-destructive/40 px-1.5 py-0.5 text-caption text-destructive">
                {errorCode}
              </code>
            )}
          </div>
          <p className="break-words text-body-sm text-foreground">
            {errorMessage}
          </p>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLookup("cloudflare.com")}
              className="min-h-11 border-destructive text-foreground sm:min-h-8"
            >
              Tentar com domínio padrão (cloudflare.com)
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}

export default DnsLookup
