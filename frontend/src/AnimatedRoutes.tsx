import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Route, Routes, useLocation } from "react-router-dom"
import { routeTransition } from "./lib/motion"
import Arquitetura from "./pages/Arquitetura"
import DnsLookup from "./pages/DnsLookup"
import Home from "./pages/Home"
import NotFound from "./pages/NotFound"
import Ping from "./pages/Ping"
import Sobre from "./pages/Sobre"

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
          <Route path="/ping" element={<Ping />} />
          <Route path="/dns-lookup" element={<DnsLookup />} />
          <Route path="/arquitetura" element={<Arquitetura />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}
