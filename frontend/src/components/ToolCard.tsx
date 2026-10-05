import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Tool } from "@/lib/tools"

export function ToolCard({ name, description, href }: Tool) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{name}</CardTitle>
        <Badge variant="outline">Em breve</Badge>
      </CardHeader>
      <Separator />
      <CardContent className="flex flex-col gap-4 pt-6">
        <p className="text-body-sm text-muted-foreground">{description}</p>
        <Button asChild>
          <Link to={href} aria-label={`Abrir ${name}`}>
            Abrir
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
