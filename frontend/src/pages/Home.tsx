import { ToolCard } from "@/components/ToolCard"
import { tools } from "@/lib/tools"

function Home() {
  return (
    <main className="flex flex-col gap-12 py-16">
      <div className="flex max-w-[65ch] flex-col gap-4">
        <h1 className="text-heading font-semibold text-foreground">
          Probekit
        </h1>
        <p className="text-body text-muted-foreground">
          Uma caixa de ferramentas técnicas na web, construída aos poucos e
          aberta pra qualquer pessoa usar — sem conta, sem complicação.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {tools.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>
    </main>
  )
}

export default Home
