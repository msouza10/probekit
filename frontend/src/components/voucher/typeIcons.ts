import {
  BadgePercent,
  FlaskConical,
  Gift,
  Sparkles,
  Ticket,
  type LucideIcon,
} from "lucide-react"

/** O ícone de cada tipo de promoção que o coletor classifica (o resto é "Promoção"). */
export const TYPE_ICONS: Record<string, LucideIcon> = {
  voucher: Ticket,
  discount: BadgePercent,
  free_exam: Gift,
  beta_exam: FlaskConical,
}

export const FALLBACK_TYPE_ICON: LucideIcon = Sparkles
