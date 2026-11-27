import { useEffect, useState } from "react"
import { getVouchers, type VoucherItem } from "./api"
import { pickBannerItem } from "./vouchers"

export interface FeaturedVoucher {
  item: VoucherItem
  // O dia de hoje no navegador de quem vê, usado para o prazo e o carimbo.
  today: Date
}

/**
 * O voucher em destaque da Home: o mais recente que tem fornecedor e desconto e
 * ainda está ativo (ver `pickBannerItem`). Busca uma vez, depois que a página
 * carregou, e devolve `null` até a resposta chegar, e depois dela se a API falha
 * ou nada serve. O selo, o mini-ingresso e a seção da Home leem este mesmo
 * resultado, para a API ser consultada só uma vez.
 */
export function useFeaturedVoucher(): FeaturedVoucher | null {
  const [featured, setFeatured] = useState<FeaturedVoucher | null>(null)

  useEffect(() => {
    let active = true
    getVouchers({ limit: 20 }).then(
      (data) => {
        const today = new Date()
        const item = pickBannerItem(data.items, today)
        if (active && item) setFeatured({ item, today })
      },
      () => {
        // Sem a API, a Home segue sem o destaque.
      },
    )
    return () => {
      active = false
    }
  }, [])

  return featured
}
