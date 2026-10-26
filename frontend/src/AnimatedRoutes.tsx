import { lazy, Suspense } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Route, Routes, useLocation } from "react-router-dom"
import type { PingResult } from "./lib/api"
import { routeTransition } from "./lib/motion"
import { usePageMeta } from "./lib/pageMeta"
import Home from "./pages/Home"

// A Home entra no bundle principal; as outras páginas são carregadas quando
// a rota é aberta (code splitting), para a primeira visita baixar menos.
const Arquitetura = lazy(() => import("./pages/Arquitetura"))
const DnsLookup = lazy(() => import("./pages/DnsLookup"))
const NotFound = lazy(() => import("./pages/NotFound"))
const Ping = lazy(() => import("./pages/Ping"))
const Sobre = lazy(() => import("./pages/Sobre"))

function isPingResult(value: unknown): value is PingResult {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.target === "string" &&
    typeof v.ip_addr === "string" &&
    typeof v.packets_sent === "number" &&
    typeof v.packets_recv === "number" &&
    typeof v.packet_loss === "number" &&
    typeof v.min_rtt === "string" &&
    typeof v.avg_rtt === "string" &&
    typeof v.max_rtt === "string"
  )
}

// O ping rápido da Home entrega o resultado pelo estado da navegação. O estado
// vem do histórico do navegador, então é validado antes.
function PingRoute() {
  const state = useLocation().state as { pingResult?: unknown } | null
  const initialResult = isPingResult(state?.pingResult)
    ? state.pingResult
    : undefined
  return <Ping initialResult={initialResult} />
}

// Enquanto a página da rota carrega, reserva a altura de uma tela: sem isso o
// rodapé aparece no topo e salta para baixo quando o conteúdo chega (CLS).
function RouteFallback() {
  return <div aria-hidden="true" className="min-h-[75vh]" />
}

export function AnimatedRoutes() {
  const location = useLocation()
  const page = routeTransition(useReducedMotion() ?? false)
  usePageMeta(location.pathname)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={page.initial}
        animate={page.animate}
        exit={page.exit}
        transition={page.transition}
      >
        <Suspense fallback={<RouteFallback />}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/ping" element={<PingRoute />} />
            <Route path="/dns-lookup" element={<DnsLookup />} />
            <Route path="/arquitetura" element={<Arquitetura />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}
