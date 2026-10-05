import type { ReactNode } from "react"
import { Header } from "./components/Header"

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-[1200px] px-8">
      <Header />
      {children}
    </div>
  )
}
