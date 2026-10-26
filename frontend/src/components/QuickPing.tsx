import { useId, useState, type FormEvent } from "react"
import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { runPing, type ApiError, type PingResult } from "@/lib/api"

// Ping rápido do hero: poucos pacotes para a resposta voltar logo. A página
// /ping continua com os 5 de sempre.
const quickCount = 3
const quickTimeout = 2

type Status =
  | { kind: "idle" }
  | { kind: "empty" }
  | { kind: "loading"; target: string }
  | { kind: "success"; result: PingResult }
  | { kind: "error"; message: string }

// "1.564151ms" vira "1.56ms"; o que não tiver esse formato fica como veio.
function shortRtt(rtt: string): string {
  const match = /^([\d.]+)(ms|µs|s)$/.exec(rtt)
  return match ? `${Number(match[1]).toFixed(2)}${match[2]}` : rtt
}

// O link quebra para a linha de baixo quando não cabe ao lado do resultado
// (celular). O resultado em si continua numa linha só.
const lineClass = "flex min-w-0 flex-wrap items-baseline gap-x-4 text-body-sm"
const linkClass =
  "inline-flex min-h-11 shrink-0 items-center gap-1.5 font-sans font-medium text-foreground underline decoration-highlight/50 underline-offset-[0.2em] transition-colors hover:decoration-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:min-h-0"

export function QuickPing() {
  const inputId = useId()
  const [target, setTarget] = useState("")
  const [status, setStatus] = useState<Status>({ kind: "idle" })
  const loading = status.kind === "loading"

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    const host = target.trim()
    if (!host) {
      setStatus({ kind: "empty" })
      return
    }

    setStatus({ kind: "loading", target: host })
    try {
      const result = await runPing(host, quickCount, quickTimeout)
      setStatus({ kind: "success", result })
    } catch (err) {
      const error = err as Partial<ApiError>
      setStatus({
        kind: "error",
        message: error.error || "Não foi possível pingar agora.",
      })
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-[36rem] flex-col gap-1 font-sans"
    >
      <label htmlFor={inputId} className="sr-only">
        Host ou IP
      </label>
      <div className="flex flex-wrap gap-3">
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="1.1.1.1 ou github.com"
          value={target}
          aria-invalid={status.kind === "empty" || undefined}
          onChange={(event) => {
            setTarget(event.target.value)
            if (status.kind === "empty") setStatus({ kind: "idle" })
          }}
          className="min-h-11 min-w-[12rem] flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-body-sm text-foreground placeholder:text-muted-foreground sm:min-h-10"
        />
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-11 sm:h-10"
        >
          {loading ? "Pingando…" : "Pingar"}
        </Button>
      </div>

      <div aria-live="polite" className="min-h-6 pt-2">
        {status.kind === "idle" ? (
          <p className="text-body-sm text-muted-foreground">
            O teste parte do nosso servidor, não do seu navegador.
          </p>
        ) : null}

        {status.kind === "empty" ? (
          <p role="alert" className="text-body-sm text-destructive">
            Digite um host ou IP.
          </p>
        ) : null}

        {status.kind === "loading" ? (
          <p role="status" className={`${lineClass} text-muted-foreground`}>
            Pingando {status.target}…
          </p>
        ) : null}

        {status.kind === "success" ? (
          <p role="status" className={lineClass}>
            <span className="max-w-full min-w-0 truncate font-mono text-foreground">
              média {shortRtt(status.result.avg_rtt)} ·{" "}
              {status.result.packet_loss.toFixed(0)}% de perda ·{" "}
              {status.result.packets_recv}/{status.result.packets_sent}
            </span>
            <Link
              to="/ping"
              state={{ pingResult: status.result }}
              className={linkClass}
            >
              Ver resultado completo
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 text-highlight"
              />
            </Link>
          </p>
        ) : null}

        {status.kind === "error" ? (
          <p role="alert" className={lineClass}>
            <span className="max-w-full min-w-0 truncate text-destructive">
              {status.message}
            </span>
          </p>
        ) : null}
      </div>
    </form>
  )
}
