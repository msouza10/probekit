import { Link } from "react-router-dom"
import {
  Activity,
  ArrowRight,
  Clock,
  FileCode2,
  Globe,
  Network,
  ShieldCheck,
  Terminal,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Tool } from "@/lib/tools"

const iconMap = {
  Activity,
  Globe,
  Network,
  ShieldCheck,
  FileCode2,
  Clock,
}

export function ToolCard({
  name,
  description,
  href,
  category,
  status = "Em breve",
  tags = [],
  iconName,
}: Tool) {
  const IconComponent =
    iconName && iconMap[iconName as keyof typeof iconMap]
      ? iconMap[iconName as keyof typeof iconMap]
      : Terminal

  return (
    <Card className="tool-card group relative flex flex-col justify-between overflow-hidden border-border bg-card transition-all duration-200 hover:border-steel-border/80">
      <div>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-steel-border bg-deep-coal text-blue-cornflower transition-colors duration-200 group-hover:border-blue-cornflower/50 group-hover:bg-deep-coal/80">
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-body font-medium text-foreground">
                {name}
              </CardTitle>
              {category && (
                <span className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">
                  {category}
                </span>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 border-steel-border text-caption text-ash"
          >
            {status}
          </Badge>
        </CardHeader>

        <Separator />

        <CardContent className="flex flex-col gap-4 pt-5">
          <p className="min-h-[68px] text-body-sm text-muted-foreground">
            {description}
          </p>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-steel-border/60 bg-page-ink px-2 py-0.5 font-mono text-[11px] text-fog"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </div>

      <div className="p-6 pt-0">
        <Button
          asChild
          variant="secondary"
          className="w-full justify-between border border-steel-border bg-deep-coal text-snow transition-all hover:border-blue-cornflower hover:text-snow"
        >
          <Link to={href} aria-label={`Abrir ${name}`}>
            <span>Abrir {name}</span>
            <ArrowRight className="h-4 w-4 text-ash transition-transform duration-200 group-hover:translate-x-1 group-hover:text-blue-cornflower" />
          </Link>
        </Button>
      </div>
    </Card>
  )
}
