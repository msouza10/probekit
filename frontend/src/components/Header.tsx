import { useState } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { Dialog, Popover } from "radix-ui"
import {
  Activity,
  ArrowRight,
  ChevronDown,
  Globe,
  Search,
  X,
} from "lucide-react"
import { tools } from "@/lib/tools"
import { ThemeToggle } from "./ThemeToggle"
import { GithubIcon } from "./icons/GithubIcon"

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
const implementedTools = tools.filter((tool) => tool.status !== "Planejado")

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const navigate = useNavigate()
  const results = tools.filter((tool) =>
    normalize(
      [tool.name, tool.description, tool.category, ...(tool.tags ?? [])].join(
        " ",
      ),
    ).includes(normalize(query.trim())),
  )
  function openTool(href: string) {
    setSearchOpen(false)
    navigate(href)
  }

  return (
    <header className="site-header sticky top-0 z-40 flex items-center justify-between border-b border-border">
      <div className="flex items-center gap-8">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-semibold text-foreground"
          aria-label="Probekit início"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-cornflower/25 bg-blue-cornflower/10 text-blue-cornflower">
            <Activity className="h-5 w-5" />
          </span>
          <span className="text-subheading tracking-tight">Probekit</span>
        </Link>
        <nav
          className="header-nav flex items-center gap-1"
          aria-label="Navegação principal"
        >
          <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Popover.Trigger
              className="header-nav-link flex items-center gap-2"
              aria-label="Ferramentas"
            >
              Ferramentas{" "}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="start"
                sideOffset={16}
                collisionPadding={16}
                className="tools-popover"
                aria-label="Menu de ferramentas"
              >
                <p className="px-3 pb-3 text-[11px] uppercase tracking-widest text-fog">
                  Diagnósticos
                </p>
                {implementedTools.map((tool) => {
                  const Icon = tool.iconName === "Globe" ? Globe : Activity
                  return (
                    <Link
                      key={tool.href}
                      to={tool.href}
                      onClick={() => setMenuOpen(false)}
                      className="tool-menu-link group"
                    >
                      <span className="tool-menu-icon">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">
                          {tool.name}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {tool.name === "Ping"
                            ? "Latência e perda de pacotes"
                            : "Registros e resolução de domínios"}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-fog transition-transform group-hover:translate-x-1" />
                    </Link>
                  )
                })}
                <div className="mt-3 border-t border-border px-3 pt-3">
                  <p className="mb-3 text-xs leading-relaxed text-fog">
                    CIDR, SSL e outros utilitários estão no roadmap.
                  </p>
                  <a
                    href="/#ferramentas"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between py-2 text-xs text-blue-cornflower"
                  >
                    Explorar catálogo <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          <NavLink to="/sobre" className="header-nav-link">
            Sobre
          </NavLink>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <Dialog.Root
          open={searchOpen}
          onOpenChange={(open) => {
            setSearchOpen(open)
            if (open) setQuery("")
          }}
        >
          <Dialog.Trigger
            aria-label="Buscar ferramentas"
            className="header-search flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:border-graphite hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Buscar ferramenta…</span>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="search-overlay" />
            <Dialog.Content className="search-dialog">
              <Dialog.Title className="sr-only">
                Buscar ferramentas
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                Pesquise por nome, categoria ou protocolo. Use Tab para navegar
                pelos resultados e Enter para abrir.
              </Dialog.Description>
              <form
                className="flex items-center gap-3 border-b border-border p-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  const first = results.find(
                    (tool) => tool.status !== "Planejado",
                  )
                  if (first) openTool(first.href)
                }}
              >
                <Search className="h-5 w-5 shrink-0 text-blue-cornflower" />
                <input
                  aria-label="Pesquisar ferramentas"
                  placeholder="Nome, protocolo ou categoria…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-fog"
                />
                <Dialog.Close
                  aria-label="Fechar busca"
                  className="rounded-md p-2 text-fog hover:bg-card hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </form>
              <div className="max-h-[min(55svh,420px)] overflow-y-auto p-3">
                <p role="status" className="px-3 py-2 text-xs text-fog">
                  {results.length}{" "}
                  {results.length === 1
                    ? "ferramenta encontrada"
                    : "ferramentas encontradas"}
                </p>
                {results.map((tool) =>
                  tool.status === "Planejado" ? (
                    <div
                      key={tool.href}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-xs text-fog"
                    >
                      <span>{tool.name}</span>
                      <span className="shrink-0 text-[10px]">Planejado</span>
                    </div>
                  ) : (
                    <button
                      key={tool.href}
                      type="button"
                      onClick={() => openTool(tool.href)}
                      className="tool-menu-link w-full text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-foreground">
                          {tool.name}
                        </span>
                        <span className="mt-1 block text-xs text-fog">
                          {tool.category} · {tool.tags?.slice(0, 2).join(" / ")}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-blue-cornflower" />
                    </button>
                  ),
                )}
                {results.length === 0 && (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma ferramenta encontrada. Tente “DNS”, “ping” ou
                    “latência”.
                  </p>
                )}
              </div>
              <p className="border-t border-border px-6 py-3 text-[11px] text-fog">
                Enter para abrir · Esc para fechar
              </p>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <ThemeToggle />
        <a
          href="https://github.com/msouza10/probekit"
          target="_blank"
          rel="noreferrer"
          aria-label="Código fonte no GitHub"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
        >
          <GithubIcon className="h-4 w-4" />
        </a>
      </div>
    </header>
  )
}
