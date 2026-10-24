import { useState } from "react"
import { Bench } from "@/components/Bench"
import { Reveal } from "@/components/Reveal"
import { Button } from "@/components/ui/button"
import { PROBE_PROVIDER, type PingResult, runPing } from "@/lib/api"

const prose = "max-w-[38rem] text-body text-foreground/90"
const fieldClass =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm text-foreground placeholder:text-muted-foreground"
const labelClass = "text-body-sm font-medium text-foreground"

export function Ping() {
  const [target, setTarget] = useState("")
  const [count, setCount] = useState(5)
  const [timeout, setTimeoutSec] = useState(2)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")
  const [result, setResult] = useState<PingResult | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [errorCode, setErrorCode] = useState("")
  const [copied, setCopied] = useState(false)

  const presets = [
    { label: "Cloudflare (1.1.1.1)", value: "1.1.1.1" },
    { label: "Google (8.8.8.8)", value: "8.8.8.8" },
    { label: "Quad9 (9.9.9.9)", value: "9.9.9.9" },
    { label: "github.com", value: "github.com" },
  ]

  const handlePing = async (targetToPing?: string) => {
    const finalTarget = (targetToPing || target).trim()
    if (!finalTarget) return

    setTarget(finalTarget)
    setStatus("loading")
    setErrorMessage("")
    setErrorCode("")
    setResult(null)

    try {
      const data = await runPing(finalTarget, count, timeout)
      setResult(data)
      setStatus("success")
    } catch (err: any) {
      if (import.meta.env.DEV && err.code === "backend_unreachable") {
        // Simulation only in dev (Go backend not started). In production a
        // failure must show as an error, never as made-up results.
        const simulatedMin = (10 + Math.random() * 5).toFixed(1)
        const simulatedAvg = (parseFloat(simulatedMin) + 1.2).toFixed(1)
        const simulatedMax = (parseFloat(simulatedAvg) + 2.5).toFixed(1)

        setResult({
          target: finalTarget,
          ip_addr: finalTarget.match(/^\d+\.\d+\.\d+\.\d+$/)
            ? finalTarget
            : "104.21.75.19",
          packets_sent: count,
          packets_recv: count,
          packet_loss: 0,
          min_rtt: `${simulatedMin}ms`,
          avg_rtt: `${simulatedAvg}ms`,
          max_rtt: `${simulatedMax}ms`,
          origin_region: "Simulação local",
        })
        setStatus("success")
      } else {
        setStatus("error")
        setErrorMessage(
          err.error || "Ocorreu um erro ao tentar executar o ping.",
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
          Ping
        </h1>
        <p className="max-w-[36rem] text-body-lg text-muted-foreground">
          Mede quanto tempo um pacote leva para ir até um host ou IP público e
          voltar, e quantos se perdem no caminho. É ICMP de verdade, enviado
          pela minha sonda na nuvem.
        </p>
      </Reveal>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handlePing()
        }}
        className="flex max-w-[44rem] flex-col gap-6 font-sans"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="ping-target" className={labelClass}>
            Host ou IP
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="ping-target"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="1.1.1.1 ou github.com"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={`${fieldClass} flex-1 font-mono`}
            />
            <Button
              type="submit"
              size="lg"
              disabled={!target.trim() || status === "loading"}
              className="min-h-11 sm:px-8"
            >
              {status === "loading" ? "Executando..." : "Disparar Ping"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-body-sm text-muted-foreground">
            Atalhos:
          </span>
          {presets.map((preset) => (
            <Button
              key={preset.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePing(preset.value)}
              className="min-h-11 sm:min-h-8"
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            aria-expanded={showAdvanced}
            aria-controls="ping-advanced"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex min-h-11 w-fit items-center text-body-sm font-medium text-foreground underline decoration-highlight/50 underline-offset-4 transition-colors hover:decoration-highlight"
          >
            {showAdvanced ? "Ocultar opções avançadas" : "Opções avançadas"}
          </button>

          {showAdvanced && (
            <div
              id="ping-advanced"
              className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ping-count" className={labelClass}>
                  Pacotes (1 a 10)
                </label>
                <input
                  id="ping-count"
                  type="number"
                  min={1}
                  max={10}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className={`${fieldClass} font-mono`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ping-timeout" className={labelClass}>
                  Timeout por pacote, em segundos (1 a 5)
                </label>
                <input
                  id="ping-timeout"
                  type="number"
                  min={1}
                  max={5}
                  value={timeout}
                  onChange={(e) => setTimeoutSec(Number(e.target.value))}
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
            Os pacotes saem de uma VM na {PROBE_PROVIDER}. A latência que
            aparece é a do caminho entre essa máquina e o destino, não entre
            você e ele.
          </p>
          <p className={prose}>
            Endereços privados e reservados (10.0.0.0/8, 172.16.0.0/12,
            192.168.0.0/16, loopback e metadados de nuvem) são recusados, mesmo
            quando um nome resolve para eles. Assim a sonda não serve de ponte
            para a rede de ninguém.
          </p>
        </div>
      )}

      <div aria-live="polite">
        {status === "loading" && (
          <p
            role="status"
            className="max-w-[38rem] break-words text-body text-muted-foreground"
          >
            Enviando {count} {count === 1 ? "pacote" : "pacotes"} para {target},
            a partir de {PROBE_PROVIDER}...
          </p>
        )}
      </div>

      {status === "success" && result && (
        <Reveal className="flex max-w-[44rem] flex-col gap-3">
          <Bench label="Resultado" meta={result.origin_region}>
            <p className="break-all text-base text-bench-foreground">
              {result.target}{" "}
              <span className="text-bench-muted">({result.ip_addr})</span>
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-bench-muted">Latência média</dt>
                <dd className="text-lg text-bench-foreground">
                  {result.avg_rtt}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-bench-muted">Latência mínima</dt>
                <dd className="text-lg text-bench-foreground">
                  {result.min_rtt}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-bench-muted">Latência máxima</dt>
                <dd className="text-lg text-bench-foreground">
                  {result.max_rtt}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-bench-muted">Perda de pacotes</dt>
                <dd
                  className={`text-lg ${
                    result.packet_loss === 0
                      ? "text-bench-ok"
                      : "text-bench-highlight"
                  }`}
                >
                  {result.packet_loss.toFixed(0)}%
                </dd>
                <dd className="text-xs text-bench-muted">
                  {result.packets_recv}/{result.packets_sent} recebidos
                </dd>
              </div>
            </dl>
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
              Falha ao executar o ping
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
              onClick={() => handlePing("1.1.1.1")}
              className="min-h-11 border-destructive text-foreground sm:min-h-8"
            >
              Tentar com destino público (1.1.1.1)
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}

export default Ping
