import { Link } from "react-router-dom"
import { Activity, Globe, Network, Search } from "lucide-react"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { tools } from "@/lib/tools"
import { GithubIcon } from "./icons/GithubIcon"

export function Header() {
  return (
    <header className="site-header relative z-20 flex items-center justify-between border-b border-border py-4">
      {/* Brand & Nav */}
      <div className="flex items-center gap-6">
        <Link
          to="/"
          className="group flex items-center gap-2.5 text-body font-semibold text-foreground transition-opacity hover:opacity-90"
          aria-label="Probekit início"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-steel-border bg-deep-coal text-blue-cornflower transition-colors group-hover:border-blue-cornflower/60">
            <Activity className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-cornflower opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-cornflower"></span>
            </span>
          </div>
          <span className="text-subheading tracking-tight">Probekit</span>
          <span className="rounded border border-steel-border/50 bg-deep-coal px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-ash">
            BETA
          </span>
        </Link>

        {/* Navigation */}
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent text-body-sm text-ash hover:bg-card hover:text-snow">
                Ferramentas
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[280px] gap-1 p-2 bg-card border border-steel-border shadow-xl">
                  {tools.map((tool) => (
                    <li key={tool.href}>
                      <NavigationMenuLink asChild>
                        <Link
                          to={tool.href}
                          className="group flex items-center justify-between rounded-md p-2 transition-colors hover:bg-deep-coal"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-steel-border bg-page-ink text-blue-cornflower group-hover:border-blue-cornflower/40">
                              {tool.iconName === "Globe" ? (
                                <Globe className="h-3.5 w-3.5" />
                              ) : tool.iconName === "Network" ? (
                                <Network className="h-3.5 w-3.5" />
                              ) : (
                                <Activity className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <span className="text-body-sm font-medium text-snow group-hover:text-blue-cornflower">
                              {tool.name}
                            </span>
                          </div>
                          {tool.status && (
                            <span className="rounded border border-steel-border/70 px-1 font-mono text-[9px] text-fog">
                              {tool.status}
                            </span>
                          )}
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  to="/sobre"
                  className="rounded-md px-3 py-2 text-body-sm text-ash transition-colors hover:bg-card hover:text-snow"
                >
                  Sobre
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Active Probe Node Pill */}
        <div className="hidden items-center gap-2 rounded-full border border-steel-border bg-deep-coal/80 px-3 py-1 text-[12px] sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="font-mono text-[11px] text-ash">
            us-ashburn-1 <span className="text-fog">•</span> 12ms
          </span>
        </div>

        {/* Quick Search trigger anchor */}
        <a
          href="/#ferramentas"
          className="flex h-9 items-center gap-2 rounded-md border border-steel-border bg-card px-2.5 text-caption text-ash transition-colors hover:border-graphite hover:text-snow"
          title="Buscar ferramentas"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Buscar</span>
          <kbd className="hidden rounded bg-deep-coal px-1.5 py-0.5 font-mono text-[10px] text-fog sm:inline">
            /
          </kbd>
        </a>

        {/* GitHub Link */}
        <a
          href="https://github.com/msouza10/probekit"
          target="_blank"
          rel="noreferrer"
          aria-label="Código fonte no GitHub"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-steel-border bg-card text-ash transition-colors hover:border-graphite hover:text-snow"
        >
          <GithubIcon className="h-4 w-4" />
        </a>
      </div>
    </header>
  )
}
