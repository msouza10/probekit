package tests

import (
	"net"
	"net/http"
	"net/http/httptest"
	"testing"

	"api-service-golang/utils"
)

// Contrato que a produção precisa cumprir pra esses testes passarem:
//
//	utils.RealIP(r *http.Request, trusted []*net.IPNet) string
//
//   - "peer" é o IP de r.RemoteAddr (sem a porta). É quem abriu a conexão,
//     e é o único dado que o cliente não consegue forjar.
//   - Se o peer está dentro de alguma faixa de trusted, o cabeçalho
//     CF-Connecting-IP vale: se for um IP válido, devolve esse IP em forma
//     canônica (net.IP.String). Cabeçalho ausente ou inválido: devolve o peer.
//   - Se o peer NÃO está em trusted, o cabeçalho é ignorado (é forjável):
//     devolve o peer.
//   - X-Forwarded-For nunca é considerado.
//   - O resultado é usado como chave do rate limit, então vem sempre
//     normalizado (IPv4 embrulhado em IPv6 vira IPv4 puro).

// cidrs monta a lista de faixas confiáveis a partir de textos.
func cidrs(t *testing.T, list ...string) []*net.IPNet {
	t.Helper()
	nets := make([]*net.IPNet, 0, len(list))
	for _, c := range list {
		_, n, err := net.ParseCIDR(c)
		if err != nil {
			t.Fatalf("faixa inválida %q: %v", c, err)
		}
		nets = append(nets, n)
	}
	return nets
}

// reqFrom cria uma requisição que parece vir de remoteAddr. Os pares
// chave/valor seguintes são cabeçalhos.
func reqFrom(remoteAddr string, headers ...string) *http.Request {
	r := httptest.NewRequest(http.MethodGet, "/api/ping", nil)
	r.RemoteAddr = remoteAddr
	for i := 0; i+1 < len(headers); i += 2 {
		r.Header.Set(headers[i], headers[i+1])
	}
	return r
}

// Faixas de exemplo (as reais da Cloudflare incluem 172.64.0.0/13 e
// 2606:4700::/32, mas aqui são só valores de teste).
var cfRanges = []string{"172.64.0.0/13", "2606:4700::/32"}

func TestRealIP_TrustedPeer(t *testing.T) {
	trusted := cidrs(t, cfRanges...)

	tests := []struct {
		name       string
		remoteAddr string
		header     string
		want       string
	}{
		{"uses IPv4 header", "172.71.1.5:54321", "203.0.113.5", "203.0.113.5"},
		{"uses IPv6 header", "172.71.1.5:54321", "2001:db8::1", "2001:db8::1"},
		{"normalizes IPv6 header", "172.71.1.5:54321", "2001:0db8:0:0:0:0:0:1", "2001:db8::1"},
		{"normalizes IPv4-mapped header", "172.71.1.5:54321", "::ffff:203.0.113.5", "203.0.113.5"},
		{"IPv6 peer is trusted too", "[2606:4700::1234]:443", "203.0.113.5", "203.0.113.5"},
		{"IPv4-mapped peer is trusted", "[::ffff:172.71.1.5]:54321", "203.0.113.5", "203.0.113.5"},
		{"empty header falls back to peer", "172.71.1.5:54321", "", "172.71.1.5"},
		{"garbage header falls back to peer", "172.71.1.5:54321", "nao-sou-ip", "172.71.1.5"},
		{"header with port falls back to peer", "172.71.1.5:54321", "203.0.113.5:4000", "172.71.1.5"},
		{"header with list falls back to peer", "172.71.1.5:54321", "203.0.113.5, 1.1.1.1", "172.71.1.5"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var r *http.Request
			if tt.header == "" {
				r = reqFrom(tt.remoteAddr)
			} else {
				r = reqFrom(tt.remoteAddr, "CF-Connecting-IP", tt.header)
			}

			if got := utils.RealIP(r, trusted); got != tt.want {
				t.Errorf("RealIP = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestRealIP_UntrustedPeerIgnoresHeader(t *testing.T) {
	trusted := cidrs(t, cfRanges...)

	tests := []struct {
		name       string
		remoteAddr string
		want       string
	}{
		{"IPv4 outside the ranges", "198.51.100.9:40000", "198.51.100.9"},
		{"IPv6 outside the ranges", "[2001:db8::99]:40000", "2001:db8::99"},
		{"neighbor of a range, not inside", "172.72.0.1:40000", "172.72.0.1"},
		{"RemoteAddr without port", "198.51.100.9", "198.51.100.9"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// o cabeçalho forjado não pode vencer o peer
			r := reqFrom(tt.remoteAddr, "CF-Connecting-IP", "9.9.9.9")

			if got := utils.RealIP(r, trusted); got != tt.want {
				t.Errorf("RealIP = %q, want %q (o cabeçalho forjado foi aceito?)", got, tt.want)
			}
		})
	}

	for _, remoteAddr := range []string{"[::ffff:198.51.100.9]:40000", "::ffff:198.51.100.9"} {
		t.Run("normalizes an IPv4-mapped peer "+remoteAddr, func(t *testing.T) {
			r := reqFrom(remoteAddr)

			if got, want := utils.RealIP(r, trusted), "198.51.100.9"; got != want {
				t.Errorf("RealIP = %q, want %q", got, want)
			}
		})
	}
}

func TestRealIP_NoTrustedRanges(t *testing.T) {
	// Se a busca das faixas da Cloudflare falhar, a lista fica vazia e o
	// comportamento tem que ser o antigo: vale o peer, sempre.
	for _, trusted := range [][]*net.IPNet{nil, {}} {
		r := reqFrom("172.71.1.5:54321", "CF-Connecting-IP", "203.0.113.5")

		if got, want := utils.RealIP(r, trusted), "172.71.1.5"; got != want {
			t.Errorf("RealIP = %q, want %q", got, want)
		}
	}
}

func TestRealIP_IgnoresXForwardedFor(t *testing.T) {
	trusted := cidrs(t, cfRanges...)

	t.Run("from a trusted peer", func(t *testing.T) {
		r := reqFrom("172.71.1.5:54321", "X-Forwarded-For", "203.0.113.5")

		if got, want := utils.RealIP(r, trusted), "172.71.1.5"; got != want {
			t.Errorf("RealIP = %q, want %q", got, want)
		}
	})

	t.Run("from an untrusted peer", func(t *testing.T) {
		r := reqFrom("198.51.100.9:40000", "X-Forwarded-For", "203.0.113.5")

		if got, want := utils.RealIP(r, trusted), "198.51.100.9"; got != want {
			t.Errorf("RealIP = %q, want %q", got, want)
		}
	})
}

// O que importa na prática: quem fala direto com a VM (sem passar pela
// Cloudflare) e troca o cabeçalho a cada pedido NÃO pode escapar do limite.
func TestRealIP_ForgedHeaderCannotEvadeRateLimit(t *testing.T) {
	trusted := cidrs(t, cfRanges...)
	rl := utils.NewRateLimiter()

	allowed := 0
	for i := 0; i < 200; i++ {
		forged := net.IPv4(10, 0, byte(i/250), byte(i%250+1)).String()
		r := reqFrom("198.51.100.9:40000", "CF-Connecting-IP", forged)

		if rl.Allow(utils.RealIP(r, trusted)) {
			allowed++
		}
	}

	if allowed >= 200 {
		t.Fatalf("todas as 200 requisições passaram: o cabeçalho forjado burlou o limite")
	}
}

// E o inverso: visitantes diferentes atrás da mesma borda da Cloudflare não
// podem dividir a mesma cota.
func TestRealIP_DifferentVisitorsDoNotShareQuota(t *testing.T) {
	trusted := cidrs(t, cfRanges...)
	rl := utils.NewRateLimiter()

	// um visitante gasta a cota inteira
	heavy := reqFrom("172.71.1.5:54321", "CF-Connecting-IP", "203.0.113.5")
	for i := 0; i < 1000; i++ {
		rl.Allow(utils.RealIP(heavy, trusted))
	}
	if rl.Allow(utils.RealIP(heavy, trusted)) {
		t.Fatal("o visitante pesado deveria estar bloqueado")
	}

	// outro visitante, pela mesma borda, ainda passa
	other := reqFrom("172.71.1.5:54999", "CF-Connecting-IP", "203.0.113.77")
	if !rl.Allow(utils.RealIP(other, trusted)) {
		t.Error("outro visitante foi bloqueado pela cota do primeiro")
	}
}
