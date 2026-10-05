import { MotionConfig } from "motion/react"
import { AnimatedRoutes } from "./AnimatedRoutes"
import { Layout } from "./Layout"

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Layout>
        <AnimatedRoutes />
      </Layout>
    </MotionConfig>
  )
}

export default App
