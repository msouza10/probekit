import { useState } from "react"
import { Reveal } from "@/components/Reveal"
import { JsonDisclosure } from "@/components/tool/JsonDisclosure"
import { OriginStrip } from "@/components/tool/OriginStrip"
import { EmptyRecords, RecordGroup } from "@/components/tool/RecordGroup"
import { ResultStatus } from "@/components/tool/ResultStatus"
import { ToolPage } from "@/components/tool/ToolPage"
import { Button } from "@/components/ui/button"
import { type DnsLookupResult, PROBE_PROVIDER, runDnsLookup } from "@/lib/api"

const note = "max-w-[38rem] text-body-sm text-muted-foreground"
const fieldClass =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm text-foreground placeholder:text-muted-foreground"
const labelClass = "text-body-sm font-medium text-foreground"
const th =
  "pb-1 pr-6 text-left font-sans text-caption font-normal text-muted-foreground"
const td = "py-1 pr-6 align-top break-all"

// O domínio não existe: o problema é dele, não da sonda nem do pedido.
const DOMAIN_NOT_FOUND = "domain_not_found"

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

/** "2 endereços · 1 MX · 1 NS": só o que existe, para o veredicto não ficar cheio. */
function summary(result: DnsLookupResult): string {
  const parts: string[] = []
  const addrs = result.addrs?.length ?? 0
  if (addrs) parts.push(plural(addrs, "endereço", "endereços"))
  if (result.cname) parts.push("CNAME")
  if (result.mx?.length) parts.push(`${result.mx.length} MX`)
  if (result.ns?.length) parts.push(`${result.ns.length} NS`)
  if (result.txt?.length) parts.push(`${result.txt.length} TXT`)
  if (result.srv?.length) parts.push(`${result.srv.length} SRV`)
  return parts.join(" · ")
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

  const found = result ? summary(result) !== "" : false
  const hasAddrs = (result?.addrs?.length ?? 0) > 0

  return (
    <ToolPage
      title="DNS Lookup"
      meta={<OriginStrip region={result?.origin_region} />}
      description="Mostra os registros DNS de um domínio: endereços (A e AAAA), CNAME, servidores de e-mail (MX), TXT e nameservers (NS). Também consulta registros SRV, se você informar serviço e protocolo."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleLookup()
        }}
        className="flex max-w-[44rem] flex-col gap-4 font-sans"
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

        <div className="flex flex-col gap-2">
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
        <div className="flex flex-col gap-2">
          <p className={note}>
            A consulta usa o resolvedor de DNS do sistema da sonda. Ela não
            pergunta direto aos servidores autoritativos do domínio.
          </p>
          <p className={note}>
            Cada MX vem com a sua prioridade: quanto menor o número, mais cedo
            aquele servidor é tentado. Os registros TXT costumam carregar
            políticas de e-mail, como SPF, e códigos de verificação de domínio.
          </p>
        </div>
      )}

      <div aria-live="polite" className="empty:hidden">
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
        <Reveal className="flex max-w-[44rem] flex-col gap-6">
          <ResultStatus
            tone={found ? "up" : "down"}
            title={
              !found
                ? `${result.domain} não tem registros`
                : hasAddrs
                  ? `${result.domain} está resolvendo`
                  : `${result.domain} tem registros, mas nenhum endereço`
            }
          >
            {found ? summary(result) : "Nenhum registro foi encontrado."}
          </ResultStatus>

          <div className="flex flex-col gap-5 border-t border-border pt-5">
            <RecordGroup title="A e AAAA" count={result.addrs?.length || 0}>
              {result.cname && (
                <p className="break-all">
                  <span className="font-sans text-muted-foreground">
                    CNAME{" "}
                  </span>
                  {result.cname}
                </p>
              )}
              {result.addrs && result.addrs.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {result.addrs.map((addr, idx) => (
                    <li key={idx} className="flex flex-wrap gap-x-4">
                      <span className="break-all">{addr}</span>
                      <span className="font-sans text-muted-foreground">
                        {addr.includes(":") ? "IPv6" : "IPv4"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyRecords>Nenhum registro A/AAAA encontrado.</EmptyRecords>
              )}
            </RecordGroup>

            <RecordGroup title="MX" count={result.mx?.length || 0}>
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
                <EmptyRecords>Nenhum registro MX encontrado.</EmptyRecords>
              )}
            </RecordGroup>

            <RecordGroup title="NS" count={result.ns?.length || 0}>
              {result.ns && result.ns.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {result.ns.map((ns, idx) => (
                    <li key={idx} className="break-all">
                      {ns}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyRecords>Nenhum registro NS encontrado.</EmptyRecords>
              )}
            </RecordGroup>

            <RecordGroup title="TXT" count={result.txt?.length || 0}>
              {result.txt && result.txt.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {result.txt.map((txt, idx) => (
                    <li key={idx} className="break-all leading-6">
                      {txt}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyRecords>Nenhum registro TXT encontrado.</EmptyRecords>
              )}
            </RecordGroup>

            {result.srv && result.srv.length > 0 && (
              <RecordGroup title="SRV" count={result.srv.length}>
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
              </RecordGroup>
            )}
          </div>

          <JsonDisclosure data={result} />
        </Reveal>
      )}

      {status === "error" && (
        <Reveal className="flex max-w-[44rem] flex-col gap-4">
          <ResultStatus
            tone={errorCode === DOMAIN_NOT_FOUND ? "down" : "notice"}
            title={
              errorCode === DOMAIN_NOT_FOUND
                ? `${domain} não foi encontrado`
                : "Não foi possível consultar o DNS"
            }
          >
            <span className="block text-foreground">
              {errorCode === DOMAIN_NOT_FOUND
                ? "O domínio não existe ou não tem nenhum registro."
                : errorMessage}
            </span>
            {errorCode && (
              <code className="mt-1 inline-block rounded-sm border border-border px-1.5 py-0.5 text-caption">
                {errorCode}
              </code>
            )}
          </ResultStatus>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLookup("cloudflare.com")}
              className="min-h-11 font-sans sm:min-h-8"
            >
              Tentar com domínio padrão (cloudflare.com)
            </Button>
          </div>
        </Reveal>
      )}
    </ToolPage>
  )
}

export default DnsLookup
