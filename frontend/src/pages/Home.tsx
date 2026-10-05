import { ToolCard } from "@/components/ToolCard"
import { tools } from "@/lib/tools"

function Home() {
  return (
    <main className="flex flex-col gap-8 py-16">
      <h1 className="text-heading font-semibold text-foreground">Probekit</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {tools.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>
    </main>
  )
}

export default Home
