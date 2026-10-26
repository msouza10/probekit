import { useState } from "react"
import { Reveal } from "@/components/Reveal"
import { JsonDisclosure } from "@/components/tool/JsonDisclosure"
import { OriginStrip } from "@/components/tool/OriginStrip"
import { ResultStats } from "@/components/tool/ResultStats"
import { ResultStatus } from "@/components/tool/ResultStatus"
import { ToolPage } from "@/components/tool/ToolPage"
import { Button } from "@/components/ui/button"
import { PROBE_PROVIDER, type PingResult, runPing } from "@/lib/api"

const note = "max-w-[38rem] text-body-sm text-muted-foreground"
const fieldClass =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm text-foreground placeholder:text-muted-foreground"
const labelClass = "text-body-sm font-medium text-foreground"

// O nome não resolve para nenhum endereço: o problema é do destino (ou do que
// foi digitado), não da sonda. É o único erro da API que aparece em vermelho.
const TARGET_NOT_FOUND = "invalid_target"

type PingProps = {
  // Vindo do ping rápido da Home (pelo estado da navegação): um resultado já
  // obtido, para abrir direto nele sem pingar de novo.
  initialResult?: PingResult
}

export function Ping({ initialResult }: PingProps = {}) {
  const [target, setTarget] = useState(initialResult?.target ?? "")
  const [count, setCount] = useState(5)
  const [timeout, setTimeoutSec] = useState(2)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >(initialResult ? "success" : "idle")
  const [result, setResult] = useState<PingResult | null>(initialResult ?? null)
  const [errorMessage, setErrorMessage] = useState("")
  const [errorCode, setErrorCode] = useState("")

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

  const responded = result ? result.packets_recv > 0 : false

  return (
    <ToolPage
      title="Ping"
      meta={<OriginStrip region={result?.origin_region} />}
      description="Mede quanto tempo um pacote leva para ir até um host ou IP público e voltar, e quantos se perdem no caminho. É ICMP enviado pela minha sonda na nuvem."
    >
      <div className="flex max-w-[44rem] flex-col gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handlePing()
          }}
          className="flex flex-col gap-4 font-sans"
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

          <div className="flex flex-col gap-2">
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
      </div>

      {status === "idle" && (
        <div className="flex flex-col gap-2">
          <p className={note}>
            A latência que aparece é a do caminho entre a sonda e o destino, não
            entre você e ele.
          </p>
          <p className={note}>
            Endereços privados e reservados (10.0.0.0/8, 172.16.0.0/12,
            192.168.0.0/16, loopback e metadados de nuvem) são recusados, mesmo
            quando um nome resolve para eles. Assim a sonda não serve de ponte
            para a rede de ninguém.
          </p>
        </div>
      )}

      <div aria-live="polite" className="empty:hidden">
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
        <Reveal className="flex max-w-[44rem] flex-col gap-6">
          <ResultStatus
            tone={responded ? "up" : "down"}
            title={
              !responded
                ? `${result.target} não respondeu`
                : result.packet_loss > 0
                  ? `${result.target} está respondendo, com ${result.packet_loss.toFixed(0)}% de perda`
                  : `${result.target} está respondendo`
            }
          >
            {result.ip_addr !== result.target ? (
              <span className="font-mono">{result.ip_addr}</span>
            ) : null}
            {!responded ? (
              <span className="block">
                {result.packets_sent === 1
                  ? "O pacote não voltou dentro do tempo limite."
                  : `Nenhum dos ${result.packets_sent} pacotes voltou dentro do tempo limite.`}
              </span>
            ) : null}
          </ResultStatus>
          <ResultStats
            items={[
              {
                label: "Latência média",
                value: responded ? result.avg_rtt : "—",
                strong: true,
              },
              {
                label: "Latência mínima",
                value: responded ? result.min_rtt : "—",
              },
              {
                label: "Latência máxima",
                value: responded ? result.max_rtt : "—",
              },
              {
                label: "Perda de pacotes",
                value: `${result.packet_loss.toFixed(0)}%`,
                note: `${result.packets_recv}/${result.packets_sent} recebidos`,
                strong: result.packet_loss > 0,
              },
            ]}
          />
          <JsonDisclosure data={result} />
        </Reveal>
      )}

      {status === "error" && (
        <Reveal className="flex max-w-[44rem] flex-col gap-4">
          <ResultStatus
            tone={errorCode === TARGET_NOT_FOUND ? "down" : "notice"}
            title={
              errorCode === TARGET_NOT_FOUND
                ? `${target} não foi encontrado`
                : "Não foi possível fazer o ping"
            }
          >
            <span className="block text-foreground">
              {errorCode === TARGET_NOT_FOUND
                ? "O nome não resolve para nenhum endereço, ou não é um host válido."
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
              onClick={() => handlePing("1.1.1.1")}
              className="min-h-11 font-sans sm:min-h-8"
            >
              Tentar com destino público (1.1.1.1)
            </Button>
          </div>
        </Reveal>
      )}
    </ToolPage>
  )
}

export default Ping
