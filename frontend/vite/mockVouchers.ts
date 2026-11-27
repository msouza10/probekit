/*
 * API falsa de `GET /api/vouchers` para o servidor de desenvolvimento, enquanto o
 * backend Go não serve a rota. Liga sozinha no `npm run dev` (só no servidor,
 * nunca no build); `npm run dev:real` (MOCK_VOUCHERS=0) desliga e o Vite
 * encaminha `/api/vouchers` para a API de verdade. Os dados são inventados e as datas andam junto com o relógio, para
 * a lista sempre ter promoções vigentes e encerradas.
 */
import type { Plugin } from "vite"

interface MockItem {
  id: string
  url: string
  title: string
  vendor: string | null
  promotion_name: string | null
  promotion_type: string
  discount_text: string | null
  discount_percent: number | null
  certifications: string[]
  voucher_code: string | null
  start_date: string | null
  end_date: string | null
  regions: string[]
  published_at: string | null
  source_name: string
}

const DAY = 86_400_000

const day = (now: Date, offsetDays: number) =>
  new Date(now.getTime() + offsetDays * DAY).toISOString().slice(0, 10)

// `end` é quantos dias faltam para acabar (negativo: já acabou; null: sem data).
type Spec = Partial<MockItem> & {
  title: string
  vendor: string | null
  end?: number | null
}

// Variedade de propósito: percentuais diferentes, com e sem código, prazos de
// hoje a semanas, sem data de término, encerrados e entradas hostis.
const SPECS: Spec[] = [
  {
    title: "Exame de certificação com 50% de desconto até o fim da semana",
    vendor: "aws",
    promotion_type: "voucher",
    certifications: ["SAA-C03", "DVA-C02", "SOA-C02"],
    voucher_code: "SAVE50",
    end: 2,
    source_name: "AWS Training and Certification Blog",
  },
  {
    title: "Segunda tentativa grátis nos exames de Azure",
    vendor: "microsoft",
    promotion_type: "other",
    discount_text: "Retake grátis",
    discount_percent: null,
    certifications: ["AZ-104", "AZ-900", "AZ-305"],
    end: 14,
    source_name: "Microsoft Learn Blog",
  },
  {
    title: "Voucher de US$ 100 para o Associate Cloud Engineer",
    vendor: "Google Cloud",
    promotion_type: "voucher",
    discount_text: "US$ 100 off",
    discount_percent: null,
    certifications: ["Associate Cloud Engineer"],
    end: null,
    source_name: "Google Cloud Blog",
  },
  {
    title: "Security+ com 30% de desconto no primeiro exame",
    vendor: "comptia",
    discount_percent: 30,
    discount_text: "30% off",
    certifications: ["SY0-701"],
    voucher_code: "SEC30",
    regions: ["EUA", "Canadá"],
    end: 0,
    source_name: "CompTIA Blog",
  },
  {
    title: "<img src=x onerror=alert(1)>",
    url: "javascript:alert(1)",
    vendor: "cisco",
    certifications: ["<b>CCNA</b>"],
    voucher_code: "<b>X</b>",
    end: 9,
    source_name: "Entrada hostil (mock)",
  },
  {
    title: "Terraform Associate (003) com voucher promocional",
    vendor: "hashicorp",
    promotion_type: "voucher",
    discount_percent: 25,
    discount_text: "25% off",
    certifications: ["Terraform Associate"],
    voucher_code: "TFA25",
    end: 21,
    source_name: "HashiCorp Blog",
  },
  {
    title: "Kubernetes: CKA, CKAD e CKS com 40% de desconto",
    vendor: "linux foundation",
    promotion_type: "voucher",
    discount_percent: 40,
    discount_text: "40% off",
    certifications: ["CKA", "CKAD", "CKS"],
    voucher_code: "KUBE40",
    end: 1,
    source_name: "Linux Foundation Training",
  },
  {
    title: "Exame de CCNP Enterprise com tentativa extra",
    vendor: "cisco",
    promotion_type: "other",
    discount_text: "Tentativa extra grátis",
    discount_percent: null,
    certifications: ["350-401 ENCOR"],
    end: 30,
    source_name: "Cisco Learning Network",
  },
  {
    title: "Oracle Cloud Infrastructure: exame beta aberto com preço reduzido",
    vendor: "oracle",
    promotion_type: "beta_exam",
    discount_percent: 75,
    discount_text: "75% off",
    certifications: ["OCI Architect Associate"],
    end: 12,
    source_name: "Oracle University",
  },
  {
    title: "Red Hat: RHCSA com 20% de desconto em novembro",
    vendor: "red hat",
    promotion_type: "discount",
    discount_percent: 20,
    discount_text: "20% off",
    certifications: ["EX200"],
    end: 4,
    source_name: "Red Hat Training",
  },
  {
    title: "Docker Certified Associate com voucher para a comunidade",
    vendor: "docker",
    promotion_type: "voucher",
    discount_percent: 35,
    discount_text: "35% off",
    certifications: ["DCA"],
    voucher_code: "DOCKER35",
    end: 18,
    source_name: "Docker Blog",
  },
  {
    title: "Simulados e voucher com desconto para a prova de Azure",
    vendor: "Tutorials Dojo",
    promotion_type: "discount",
    discount_percent: 15,
    discount_text: "15% off",
    certifications: ["AZ-104"],
    end: 8,
    source_name: "Tutorials Dojo",
  },
  {
    title: "Exame gratuito para quem concluir o curso de IA generativa",
    vendor: "Amazon Web Services",
    promotion_type: "free_exam",
    discount_percent: 100,
    discount_text: "100% off",
    certifications: ["AIF-C01"],
    end: 6,
    source_name: "AWS Training and Certification Blog",
  },
  {
    title: "Promoção de fim de ano do Terraform e do Vault",
    vendor: "hashicorp",
    discount_percent: 20,
    discount_text: "20% off",
    certifications: ["Terraform Associate", "Vault Associate"],
    end: -3,
    source_name: "HashiCorp Blog",
  },
  {
    title: "Desconto de Black Friday em exames de nível Associate",
    vendor: "aws",
    discount_percent: 50,
    discount_text: "50% off",
    certifications: ["SAA-C03"],
    end: -20,
    source_name: "AWS Training and Certification Blog",
  },
]

/** Os itens falsos, do mais novo ao mais antigo, como a API de verdade devolve. */
export function mockItems(now: Date): MockItem[] {
  const items: MockItem[] = []
  for (let n = 0; n < 70; n += 1) {
    const spec = SPECS[n % SPECS.length]
    const { end, ...rest } = spec
    const endOffset = end === undefined ? 10 : end
    items.push({
      id: `mock${String(n).padStart(4, "0")}`,
      url: `https://exemplo.com/promocao-${n}`,
      promotion_name: null,
      promotion_type: "discount",
      discount_text: "50% off",
      discount_percent: 50,
      certifications: [],
      voucher_code: null,
      start_date: day(now, -n - 2),
      end_date: endOffset === null ? null : day(now, endOffset),
      regions: ["Global"],
      published_at: new Date(now.getTime() - n * 0.8 * DAY).toISOString(),
      source_name: "Blog oficial (mock)",
      ...rest,
      // Depois da primeira volta, o título muda para a lista não repetir.
      title: n < SPECS.length ? spec.title : `${spec.title} (${n})`,
    })
  }
  return items
}

/** Uma página da lista; o cursor é só o ponto onde a página anterior parou. */
export function mockVouchersPage(now: Date, limit: number, cursor?: string) {
  const all = mockItems(now)
  const start = cursor ? Number(cursor.replace(/^o/, "")) : 0
  const from = Number.isInteger(start) && start >= 0 ? start : 0
  const slice = all.slice(from, from + limit)
  const next = from + limit
  return {
    last_collected_at: new Date(now.getTime() - 12 * 60_000).toISOString(),
    generated_at: now.toISOString(),
    items: slice,
    next_cursor: next < all.length ? `o${next}` : null,
  }
}

export function mockVouchersPlugin(): Plugin {
  return {
    name: "probekit-mock-vouchers",
    apply: "serve",
    configureServer(server) {
      // Sem retorno de função: roda antes do proxy de `/api`.
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost")
        if (url.pathname !== "/api/vouchers") return next()
        const limit = Math.min(
          Math.max(Number(url.searchParams.get("limit")) || 20, 1),
          50,
        )
        const body = mockVouchersPage(
          new Date(),
          limit,
          url.searchParams.get("cursor") ?? undefined,
        )
        res.setHeader("Content-Type", "application/json")
        res.end(JSON.stringify(body))
      })
    },
  }
}
