package tests

import (
	"testing"

	"api-service-golang/utils"
)

// TestRateLimiter cobre o utils.RateLimiter isoladamente (sem passar pelo
// middleware do main.go, que não é exportado pra teste). A janela é fixa
// em 5 minutos dentro de Allow(), então não testamos o reset por tempo
// real aqui — só o comportamento determinístico: permitir até o limite,
// bloquear depois, e isolar IPs diferentes.
func TestRateLimiter(t *testing.T) {
	t.Run("allows requests up to the limit", func(t *testing.T) {
		rl := utils.NewRateLimiter()
		ip := "203.0.113.10"

		for i := 1; i <= 50; i++ {
			if !rl.Allow(ip) {
				t.Fatalf("request %d: want allowed, got blocked", i)
			}
		}
	})

	t.Run("blocks requests after the limit", func(t *testing.T) {
		rl := utils.NewRateLimiter()
		ip := "203.0.113.11"

		for i := 1; i <= 50; i++ {
			rl.Allow(ip)
		}

		if rl.Allow(ip) {
			t.Error("request 51: want blocked, got allowed")
		}
		// Continua bloqueado, não só na primeira vez que passa do limite.
		if rl.Allow(ip) {
			t.Error("request 52: want blocked, got allowed")
		}
	})

	t.Run("different IPs have independent limits", func(t *testing.T) {
		rl := utils.NewRateLimiter()
		ipA := "203.0.113.20"
		ipB := "203.0.113.21"

		for i := 1; i <= 50; i++ {
			rl.Allow(ipA)
		}
		if rl.Allow(ipA) {
			t.Error("ipA: want blocked after 50 requests, got allowed")
		}

		if !rl.Allow(ipB) {
			t.Error("ipB: want allowed (nunca fez requisição antes), got blocked")
		}
	})
}
