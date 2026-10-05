import { Link } from "react-router-dom"
import { ArrowLeft, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-steel-border bg-card text-blue-cornflower shadow-xl">
        <Radio className="h-10 w-10 animate-pulse text-blue-cornflower" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal-red opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-signal-red"></span>
        </span>
      </div>

      <span className="font-mono text-caption uppercase tracking-wider text-blue-cornflower">
        ERRO 404 // ROTA NÃO ENCONTRADA
      </span>

      <h1 className="mt-2 text-heading font-semibold text-foreground">
        Página não encontrada
      </h1>

      <p className="mt-3 max-w-[50ch] text-body text-muted-foreground">
        O destino solicitado não corresponde a nenhuma sonda ou utilitário
        conhecido nesta malha de diagnóstico.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Button
          asChild
          className="bg-snow text-page-ink hover:bg-snow/90 font-medium"
        >
          <Link to="/" aria-label="Voltar para a página inicial">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a página inicial
          </Link>
        </Button>
      </div>

      <div className="mt-12 rounded border border-steel-border/60 bg-deep-coal/60 px-4 py-2 font-mono text-caption text-fog">
        <span>STATUS: 404_ROUTE_UNRESOLVED</span>
      </div>
    </main>
  )
}

export default NotFound
