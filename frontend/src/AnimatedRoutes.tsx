import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Route, Routes, useLocation } from "react-router-dom"
import type { PingResult } from "./lib/api"
import { routeTransition } from "./lib/motion"
import Arquitetura from "./pages/Arquitetura"
import DnsLookup from "./pages/DnsLookup"
import Home from "./pages/Home"
import NotFound from "./pages/NotFound"
import Ping from "./pages/Ping"
import Sobre from "./pages/Sobre"

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

export function AnimatedRoutes() {
  const location = useLocation()
  const page = routeTransition(useReducedMotion() ?? false)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={page.initial}
        animate={page.animate}
        exit={page.exit}
        transition={page.transition}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/ping" element={<PingRoute />} />
          <Route path="/dns-lookup" element={<DnsLookup />} />
          <Route path="/arquitetura" element={<Arquitetura />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}
