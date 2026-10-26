import { MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PROBE_LOCATION, PROBE_PROVIDER_SHORT } from "@/lib/api"

/**
 * Selo que diz de onde sai o teste, com um pino de localização. Antes do
 * primeiro resultado mostra o local fixo da sonda; depois, a região que a API
 * devolveu.
 */
export function OriginStrip({ region }: { region?: string }) {
  return (
    <Badge
      variant="secondary"
      className="gap-1.5 px-2.5 py-1 font-sans text-caption [&>svg]:size-3.5"
    >
      <MapPin aria-hidden="true" />
      <span className="text-muted-foreground">Sonda:</span>
      <span className="text-foreground">
        {PROBE_PROVIDER_SHORT} · {region ?? PROBE_LOCATION}
      </span>
    </Badge>
  )
}
