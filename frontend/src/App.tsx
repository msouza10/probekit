import { MotionConfig } from "motion/react"
import { AnimatedRoutes } from "./AnimatedRoutes"

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AnimatedRoutes />
    </MotionConfig>
  )
}

export default App
