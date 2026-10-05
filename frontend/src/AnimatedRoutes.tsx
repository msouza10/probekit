import { AnimatePresence, motion } from "motion/react"
import { Route, Routes, useLocation } from "react-router-dom"
import DnsLookup from "./pages/DnsLookup"
import Home from "./pages/Home"
import NotFound from "./pages/NotFound"
import Ping from "./pages/Ping"
import Sobre from "./pages/Sobre"

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={pageTransition.initial}
        animate={pageTransition.animate}
        exit={pageTransition.exit}
        transition={{ duration: 0.2 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/ping" element={<Ping />} />
          <Route path="/dns-lookup" element={<DnsLookup />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}
