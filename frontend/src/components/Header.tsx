import { Link } from "react-router-dom"

export function Header() {
  return (
    <header className="border-b border-border px-8 py-4">
      <Link to="/" className="text-body font-medium text-foreground">
        Probekit
      </Link>
    </header>
  )
}
