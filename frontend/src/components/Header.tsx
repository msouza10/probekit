import { useState } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { Dialog, Popover } from "radix-ui"
import { ChevronDown, Search, X } from "lucide-react"
import { tools } from "@/lib/tools"
import { ThemeToggle } from "./ThemeToggle"
import { GithubIcon } from "./icons/GithubIcon"

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
const navLink =
  "rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
const menuRow =
  "block rounded-md px-3 py-3 hover:bg-muted focus-visible:bg-muted"
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
    <header className="sticky top-0 z-40 -mx-4 grid h-[var(--header-height)] grid-cols-[1fr_auto] content-center gap-x-3 gap-y-1 border-b border-border bg-background px-4 sm:-mx-8 sm:flex sm:items-center sm:justify-between sm:px-8">
      <div className="contents sm:flex sm:items-center sm:gap-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-serif text-subheading font-medium tracking-tight text-foreground"
          aria-label="Probekit início"
        >
          <img
            src="/brand/owl.webp"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 object-contain"
          />
          Probekit
        </Link>
        <nav
          className="col-span-2 row-start-2 -ml-3 flex items-center gap-1 sm:ml-0"
          aria-label="Navegação principal"
        >
          <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Popover.Trigger
              className={`${navLink} flex items-center gap-2 data-[state=open]:bg-muted data-[state=open]:text-foreground`}
              aria-label="Ferramentas"
            >
              Ferramentas{" "}
              <ChevronDown
                aria-hidden="true"
                className={`h-3.5 w-3.5 ${menuOpen ? "rotate-180" : ""}`}
              />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="start"
                sideOffset={8}
                collisionPadding={16}
                className="z-60 max-h-(--radix-popover-content-available-height) w-[360px] max-w-[calc(100vw-32px)] overflow-y-auto rounded-lg border border-border bg-popover p-2 text-popover-foreground motion-safe:data-[state=open]:animate-[rise-in_160ms_ease-out]"
                aria-label="Menu de ferramentas"
              >
                <p className="type-eyebrow px-3 pt-2 pb-2 text-muted-foreground">
                  Diagnósticos
                </p>
                {implementedTools.map((tool) => (
                  <Link
                    key={tool.href}
                    to={tool.href}
                    onClick={() => setMenuOpen(false)}
                    className={menuRow}
                  >
                    <span className="block text-sm font-medium text-foreground">
                      {tool.name}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {tool.name === "Ping"
                        ? "Latência e perda de pacotes"
                        : "Registros e resolução de domínios"}
                    </span>
                  </Link>
                ))}
                <div className="mt-2 border-t border-border px-3 pt-3 pb-1">
                  <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
                    CIDR, SSL e outros utilitários estão no roadmap.
                  </p>
                  <a
                    href="/#ferramentas"
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex min-h-11 items-center text-xs font-medium text-highlight underline underline-offset-4"
                  >
                    Todas as ferramentas
                  </a>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          <NavLink
            to="/arquitetura"
            className={({ isActive }) =>
              `${navLink} ${isActive ? "bg-muted text-foreground" : ""}`
            }
          >
            Arquitetura
          </NavLink>
          <NavLink
            to="/sobre"
            className={({ isActive }) =>
              `${navLink} ${isActive ? "bg-muted text-foreground" : ""}`
            }
          >
            Sobre
          </NavLink>
        </nav>
      </div>
      <div className="col-start-2 row-start-1 flex items-center gap-1.5 sm:gap-2">
        <Dialog.Root
          open={searchOpen}
          onOpenChange={(open) => {
            setSearchOpen(open)
            if (open) setQuery("")
          }}
        >
          <Dialog.Trigger
            aria-label="Buscar ferramentas"
            className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground hover:border-input hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Buscar ferramenta…</span>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-70 bg-bench/60" />
            <Dialog.Content className="fixed top-[min(18svh,140px)] left-1/2 z-80 max-h-[80svh] w-[min(580px,calc(100vw-32px))] -translate-x-1/2 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground">
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
                <Search
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-muted-foreground"
                />
                <input
                  aria-label="Pesquisar ferramentas"
                  placeholder="Nome, protocolo ou categoria…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
                <Dialog.Close
                  aria-label="Fechar busca"
                  className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </form>
              <div className="max-h-[min(55svh,420px)] overflow-y-auto p-3">
                <p
                  role="status"
                  className="px-3 py-2 text-xs text-muted-foreground"
                >
                  {results.length}{" "}
                  {results.length === 1
                    ? "ferramenta encontrada"
                    : "ferramentas encontradas"}
                </p>
                {results.map((tool) =>
                  tool.status === "Planejado" ? (
                    <div
                      key={tool.href}
                      className="flex items-center justify-between gap-3 rounded-md px-3 py-3 text-xs text-muted-foreground"
                    >
                      <span>{tool.name}</span>
                      <span className="shrink-0 text-[11px]">Planejado</span>
                    </div>
                  ) : (
                    <button
                      key={tool.href}
                      type="button"
                      onClick={() => openTool(tool.href)}
                      className={`${menuRow} w-full text-left`}
                    >
                      <span className="block text-sm text-foreground">
                        {tool.name}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {tool.category} · {tool.tags?.slice(0, 2).join(" / ")}
                      </span>
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
              <p className="border-t border-border px-6 py-3 text-[11px] text-muted-foreground">
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
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground max-[360px]:hidden"
        >
          <GithubIcon className="h-4 w-4" />
        </a>
      </div>
    </header>
  )
}
