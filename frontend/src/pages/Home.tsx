import { motion, useReducedMotion } from "motion/react"
import { Reveal } from "@/components/Reveal"
import { useState } from "react"
import { ArrowDown, CheckCircle2, Search } from "lucide-react"
import { ToolCard } from "@/components/ToolCard"
import { Button } from "@/components/ui/button"
import { tools } from "@/lib/tools"

export function Home() {
  const reducedMotion = useReducedMotion()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Todas")

  const categories = ["Todas", "Rede", "DNS", "Segurança", "Utilitários"]

  const filteredTools = tools.filter((tool) => {
    const matchesCategory =
      selectedCategory === "Todas" || tool.category === selectedCategory
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tool.tags &&
        tool.tags.some((t) =>
          t.toLowerCase().includes(searchQuery.toLowerCase()),
        ))
    return matchesCategory && matchesSearch
  })

  return (
    <main className="home-page flex flex-col gap-14 pb-10 sm:gap-20 sm:pb-20">
      {/* Hero Section */}
      <section className="hero-section relative mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-8 text-center">
        <div className="type-eyebrow flex items-center gap-3 text-blue-cornflower">
          <span
            aria-hidden="true"
            className="h-px w-5 shrink-0 bg-blue-cornflower sm:w-8"
          />
          <span>SUA REDE, EM PERSPECTIVA</span>
          <span
            aria-hidden="true"
            className="h-px w-5 shrink-0 bg-blue-cornflower sm:w-8"
          />
        </div>

        {/* Headline & Subhead */}
        <div className="w-full">
          <div className="flex min-w-0 flex-col items-center gap-6">
            <h1 className="hero-title text-foreground">
              Menos dúvidas.
              <br />
              <span className="text-blue-cornflower">Mais diagnóstico.</span>
            </h1>
            <p className="hero-description max-w-[48ch] text-muted-foreground">
              Entenda o que acontece na sua rede. Meça latência, consulte DNS e
              investigue conexões com ferramentas diretas, no navegador.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Button
                asChild
                className="hero-cta bg-snow text-page-ink hover:bg-snow/90 font-medium px-5 py-2.5 h-auto text-body-sm"
              >
                <a href="#ferramentas">
                  <span>Explorar Ferramentas</span>
                  <ArrowDown className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-graphite text-snow hover:border-steel-border bg-transparent px-5 py-2.5 h-auto text-body-sm"
              >
                <a href="/sobre">Conheça o projeto</a>
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 pt-2 text-caption text-ash">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-cornflower" />
                Sem cadastro
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-cornflower" />
                Código aberto
              </span>
            </div>
          </div>
        </div>
        <a
          href="#ferramentas"
          className="hero-scroll flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Conheça as ferramentas <ArrowDown className="h-4 w-4" />
        </a>
      </section>

      {/* Tools Catalog Section */}
      <section id="ferramentas" className="flex flex-col gap-8 scroll-mt-20">
        <Reveal className="flex flex-col gap-3">
          <span className="type-eyebrow text-blue-cornflower">
            // CATÁLOGO DE FERRAMENTAS
          </span>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="section-title text-foreground">
                Uma ferramenta para cada pergunta.
              </h2>
              <p className="text-body-sm text-muted-foreground">
                Explore o catálogo e acompanhe as próximas ferramentas.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                aria-label="Filtrar ferramentas"
                placeholder="Buscar ferramenta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-steel-border bg-deep-coal py-2 pl-9 pr-3 text-body-sm text-snow placeholder:text-fog focus:border-blue-cornflower focus:outline-none"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 pt-2">
            {categories.map((category) => (
              <button
                key={category}
                aria-pressed={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-md px-3 py-1.5 text-caption font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-snow text-page-ink"
                    : "border border-steel-border bg-card text-ash hover:border-graphite hover:text-snow"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((tool) => (
            <motion.div
              key={tool.href}
              layout={reducedMotion ? false : "position"}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.28 }}
              className="h-full"
            >
              <Reveal className="h-full">
                <ToolCard {...tool} />
              </Reveal>
            </motion.div>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-steel-border p-12 text-center">
            <Search className="h-8 w-8 text-fog" />
            <p className="mt-3 text-body-sm text-ash">
              Nenhuma ferramenta encontrada para &quot;{searchQuery}&quot;.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("Todas")
              }}
              className="mt-4 border-steel-border"
            >
              Limpar filtros
            </Button>
          </div>
        )}
      </section>

      {/* How It Works Architecture Pipeline */}
      <section className="execution-section flex flex-col gap-6 border-t border-steel-border py-10">
        <div className="flex flex-col gap-2">
          <span className="type-eyebrow text-blue-cornflower">
            // TRANSPARÊNCIA DE EXECUÇÃO
          </span>
          <h2 className="section-title text-snow">
            Como os diagnósticos são executados
          </h2>
          <p className="text-body-sm text-muted-foreground max-w-[70ch]">
            Entenda o caminho de cada requisição. Informamos de onde partem os
            testes para que os resultados de rede sejam interpretáveis e
            reprodutíveis.
          </p>
        </div>

        <Reveal className="execution-steps grid grid-cols-1 gap-6 md:grid-cols-3 pt-4">
          <div className="flex flex-col gap-3 border-l border-steel-border pl-5">
            <span className="font-mono text-caption text-blue-cornflower font-semibold">
              01. SOLICITAÇÃO NA BORDA
            </span>
            <h3 className="text-body font-medium text-snow">
              Frontend no Navegador
            </h3>
            <p className="text-body-sm text-muted-foreground">
              A SPA em React 19 é carregada estaticamente da CDN global. Os
              parâmetros são enviados via HTTPS diretamente para a API.
            </p>
          </div>

          <div className="flex flex-col gap-3 border-l border-steel-border pl-5">
            <span className="font-mono text-caption text-blue-cornflower font-semibold">
              02. VALIDAÇÃO & SEGURANÇA
            </span>
            <h3 className="text-body font-medium text-snow">
              Filtro no Backend Go
            </h3>
            <p className="text-body-sm text-muted-foreground">
              O backend resolve o hostname antes do teste e descarta alvos em
              faixas reservadas (RFC 1918) ou metadata de cloud.
            </p>
          </div>

          <div className="flex flex-col gap-3 border-l border-steel-border pl-5">
            <span className="font-mono text-caption text-blue-cornflower font-semibold">
              03. SONDA DE REDE (OCI)
            </span>
            <h3 className="text-body font-medium text-snow">
              Nó Dedicado Ashburn
            </h3>
            <p className="text-body-sm text-muted-foreground">
              Os pacotes ICMP ou requisições DNS partem da VM em Ashburn (EUA) e
              as métricas precisas voltam estruturadas em JSON.
            </p>
          </div>
        </Reveal>
      </section>
    </main>
  )
}

export default Home
