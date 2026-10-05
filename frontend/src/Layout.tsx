import type { ReactNode } from "react"
import { Footer } from "./components/Footer"
import { Header } from "./components/Header"

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div
      id="inicio"
      className="mx-auto flex min-h-screen max-w-[1200px] flex-col px-4 sm:px-8"
    >
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}
