package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"api-service-golang/handler"
)

// errorBody espelha o contrato de erro do spec: {"error": "...", "code": "..."}.
// Não usamos utils.Response/utils.ErrorResponse aqui de propósito — este
// teste fixa o contrato JSON que o cliente da API realmente vê.
type errorBody struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

// pingSuccessBody descreve o contrato que a resposta de sucesso DEVE ter:
// durações como strings legíveis (ex: "12.5ms"), não números crus em
// nanossegundos. Não usamos utils.PingResponse aqui de propósito — este é
// o contrato alvo, ainda pendente de implementação em ping.go/utils.
type pingSuccessBody struct {
	Target      string  `json:"target"`
	IPAddr      string  `json:"ip_addr"`
	PacketsSent uint32  `json:"packets_sent"`
	PacketsRecv uint32  `json:"packets_recv"`
	PacketLoss  float64 `json:"packet_loss"`
	MinRtt      string  `json:"min_rtt"`
	AvgRtt      string  `json:"avg_rtt"`
	MaxRtt      string  `json:"max_rtt"`
	Jitter      string  `json:"jitter"`
}

// TestPing cobre a rota /api/ping de ponta a ponta: método inválido,
// parâmetros ausentes/inválidos, alvo que não resolve e o caminho de sucesso.
// Roda tudo via mux.ServeHTTP, sem subir um servidor de verdade.
func TestPing(t *testing.T) {
	mux := handler.Ping()

	t.Run("method not allowed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/ping?target=127.0.0.1", nil)
		rec := httptest.NewRecorder()

		mux.ServeHTTP(rec, req)

		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("status = %d, want %d", rec.Code, http.StatusMethodNotAllowed)
		}
	})

	t.Run("invalid target", func(t *testing.T) {
		cases := []struct {
			name     string
			setParam bool
			target   string
		}{
			{name: "missing target param", setParam: false},
			{name: "empty target param", setParam: true, target: ""},
			{name: "whitespace-only target", setParam: true, target: "   "},
		}

		for _, tc := range cases {
			t.Run(tc.name, func(t *testing.T) {
				u := &url.URL{Path: "/api/ping"}
				if tc.setParam {
					q := u.Query()
					q.Set("target", tc.target)
					u.RawQuery = q.Encode()
				}

				req := httptest.NewRequest(http.MethodGet, u.String(), nil)
				rec := httptest.NewRecorder()

				mux.ServeHTTP(rec, req)

				if rec.Code != http.StatusBadRequest {
					t.Fatalf("status = %d, want %d, body: %s", rec.Code, http.StatusBadRequest, rec.Body.String())
				}

				var body errorBody
				if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
					t.Fatalf("decoding response body: %v", err)
				}
				if body.Error == "" {
					t.Error("expected a non-empty error message")
				}
				if body.Code == "" {
					t.Error("expected a non-empty error code")
				}
			})
		}
	})

	// NewPinger tenta resolver o host na hora da criação, então qualquer
	// target malformado ou inexistente cai no mesmo erro de resolução.
	// É erro de quem pediu (não do servidor), então o status esperado é 400.
	// Se o handler ainda devolve 500 pra esses casos, este teste falha de
	// propósito, sinalizando o que falta ajustar em ping.go.
	t.Run("invalid or unresolvable target", func(t *testing.T) {
		cases := []struct {
			name   string
			target string
		}{
			{name: "unresolvable hostname", target: "this-host-does-not-exist.invalid"},
			{name: "out-of-range IP", target: "999.999.999.999"},
			{name: "URL with scheme", target: "http://127.0.0.1"},
			{name: "host with port", target: "127.0.0.1:8080"},
			{name: "garbage text", target: "' OR 1=1 --"},
		}

		for _, tc := range cases {
			t.Run(tc.name, func(t *testing.T) {
				u := &url.URL{Path: "/api/ping"}
				q := u.Query()
				q.Set("target", tc.target)
				u.RawQuery = q.Encode()

				req := httptest.NewRequest(http.MethodGet, u.String(), nil)
				rec := httptest.NewRecorder()

				mux.ServeHTTP(rec, req)

				if rec.Code != http.StatusBadRequest {
					t.Fatalf("status = %d, want %d, body: %s", rec.Code, http.StatusBadRequest, rec.Body.String())
				}

				var body errorBody
				if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
					t.Fatalf("decoding response body: %v", err)
				}
				if body.Error == "" {
					t.Error("expected a non-empty error message")
				}
				if body.Code == "" {
					t.Error("expected a non-empty error code")
				}
			})
		}
	})

	// Loopback, RFC1918, link-local/metadata e hostnames que resolvem pra
	// essas faixas devem ser rejeitados — é a validação anti-SSRF do spec.
	// ::1 e 127.0.0.1 eram usados como alvo "de sucesso" antes dessa
	// validação existir; agora eles pertencem aqui.
	t.Run("private and reserved targets are rejected", func(t *testing.T) {
		cases := []struct {
			name   string
			target string
		}{
			{name: "IPv4 loopback", target: "127.0.0.1"},
			{name: "IPv6 loopback", target: "::1"},
			{name: "RFC1918 private range", target: "10.0.0.1"},
			{name: "link-local / cloud metadata", target: "169.254.169.254"},
			{name: "hostname resolving to loopback", target: "localhost"},
		}

		for _, tc := range cases {
			t.Run(tc.name, func(t *testing.T) {
				u := &url.URL{Path: "/api/ping"}
				q := u.Query()
				q.Set("target", tc.target)
				u.RawQuery = q.Encode()

				req := httptest.NewRequest(http.MethodGet, u.String(), nil)
				rec := httptest.NewRecorder()

				mux.ServeHTTP(rec, req)

				if rec.Code != http.StatusBadRequest {
					t.Fatalf("status = %d, want %d, body: %s", rec.Code, http.StatusBadRequest, rec.Body.String())
				}

				var body errorBody
				if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
					t.Fatalf("decoding response body: %v", err)
				}
				if body.Code != "private_ip_not_allowed" {
					t.Errorf("code = %q, want %q", body.Code, "private_ip_not_allowed")
				}
			})
		}
	})

	// 1.1.1.1 é um IP público real (sugerido pelo próprio spec pro teste
	// manual) — precisamos de um alvo não-privado pra exercitar o caminho
	// de sucesso, já que loopback agora é rejeitado. Isso introduz uma
	// dependência real de rede/ICMP de saída neste teste.
	t.Run("success with defaults", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/ping?target=1.1.1.1", nil)
		rec := httptest.NewRecorder()

		mux.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d, body: %s", rec.Code, http.StatusOK, rec.Body.String())
		}

		if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
			t.Errorf("Content-Type = %q, want %q", ct, "application/json")
		}

		var body pingSuccessBody
		if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
			t.Fatalf("decoding response body: %v", err)
		}

		if body.Target != "1.1.1.1" {
			t.Errorf("Target = %q, want %q", body.Target, "1.1.1.1")
		}
		if body.IPAddr == "" {
			t.Error("expected a non-empty IPAddr")
		}
		// Default de count é 5 — pinamos o valor exato, não só "maior que zero".
		if body.PacketsSent != 5 {
			t.Errorf("PacketsSent = %d, want %d (default count)", body.PacketsSent, 5)
		}

		for field, value := range map[string]string{"min_rtt": body.MinRtt, "avg_rtt": body.AvgRtt, "max_rtt": body.MaxRtt, "jitter": body.Jitter} {
			if _, err := time.ParseDuration(value); err != nil {
				t.Errorf("%s = %q não é uma duration legível válida: %v", field, value, err)
			}
		}
	})

	t.Run("configurable count and timeout", func(t *testing.T) {
		t.Run("custom count changes packets sent", func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/ping?target=1.1.1.1&count=2", nil)
			rec := httptest.NewRecorder()

			mux.ServeHTTP(rec, req)

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d, body: %s", rec.Code, http.StatusOK, rec.Body.String())
			}

			var body pingSuccessBody
			if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
				t.Fatalf("decoding response body: %v", err)
			}
			if body.PacketsSent != 2 {
				t.Errorf("PacketsSent = %d, want %d", body.PacketsSent, 2)
			}
		})

		t.Run("count above limit is rejected", func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/ping?target=1.1.1.1&count=11", nil)
			rec := httptest.NewRecorder()

			mux.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d, body: %s", rec.Code, http.StatusBadRequest, rec.Body.String())
			}
		})

		t.Run("non-numeric count is rejected", func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/ping?target=1.1.1.1&count=abc", nil)
			rec := httptest.NewRecorder()

			mux.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d, body: %s", rec.Code, http.StatusBadRequest, rec.Body.String())
			}
		})

		t.Run("valid custom timeout is accepted", func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/ping?target=1.1.1.1&timeout=2", nil)
			rec := httptest.NewRecorder()

			mux.ServeHTTP(rec, req)

			if rec.Code != http.StatusOK {
				t.Errorf("status = %d, want %d, body: %s", rec.Code, http.StatusOK, rec.Body.String())
			}
		})

		t.Run("timeout above limit is rejected", func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/ping?target=1.1.1.1&timeout=6", nil)
			rec := httptest.NewRecorder()

			mux.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d, body: %s", rec.Code, http.StatusBadRequest, rec.Body.String())
			}
		})

		t.Run("non-numeric timeout is rejected", func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/ping?target=1.1.1.1&timeout=abc", nil)
			rec := httptest.NewRecorder()

			mux.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d, body: %s", rec.Code, http.StatusBadRequest, rec.Body.String())
			}
		})

		t.Run("count zero is rejected", func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/ping?target=1.1.1.1&count=0", nil)
			rec := httptest.NewRecorder()

			mux.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d, body: %s", rec.Code, http.StatusBadRequest, rec.Body.String())
			}
		})

		t.Run("negative count is rejected", func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/ping?target=1.1.1.1&count=-1", nil)
			rec := httptest.NewRecorder()

			mux.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d, body: %s", rec.Code, http.StatusBadRequest, rec.Body.String())
			}
		})

		// time.NewTicker panica com intervalo <= 0, e esse panic acontece numa
		// goroutine interna da lib pro-bing (via errgroup) que nem o net/http
		// nem o `go test` conseguem recuperar — hoje isso derruba o processo
		// inteiro, não só a requisição. Estes dois testes só vão parar de
		// crashar o binário de teste depois que ping.go rejeitar timeout <= 0
		// ANTES de chamar pinger.Run().
		t.Run("timeout zero is rejected", func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/ping?target=1.1.1.1&timeout=0", nil)
			rec := httptest.NewRecorder()

			mux.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d, body: %s", rec.Code, http.StatusBadRequest, rec.Body.String())
			}
		})

		t.Run("negative timeout is rejected", func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/ping?target=1.1.1.1&timeout=-1", nil)
			rec := httptest.NewRecorder()

			mux.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d, body: %s", rec.Code, http.StatusBadRequest, rec.Body.String())
			}
		})
	})
}
