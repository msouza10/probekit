package tests

import (
	"crypto/tls"
	"crypto/x509"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
	"time"

	"api-service-golang/utils"
)

// Contrato que a produção precisa cumprir pra esses testes passarem:
//
//  1. utils.OriginsFromEnv() []string
//     lê CORS_ALLOWED_ORIGINS (lista separada por vírgula), remove espaços
//     ao redor de cada item e descarta itens vazios. Variável vazia ou
//     ausente devolve lista vazia.
//
//  2. utils.WithCORS(allowedOrigins []string, next http.Handler) http.Handler
//     - sem cabeçalho Origin: passa direto pro next, sem cabeçalhos CORS.
//     - Origin na lista (comparação EXATA): chama o next e responde com
//       Access-Control-Allow-Origin = a origem recebida (nunca "*") e
//       Vary: Origin.
//     - Origin fora da lista: ainda chama o next, mas SEM nenhum cabeçalho
//       Access-Control-*.
//     - Preflight = OPTIONS com Origin E Access-Control-Request-Method:
//         origem permitida -> 204, Allow-Origin, Allow-Methods (com GET),
//         Vary: Origin, e NÃO chama o next;
//         origem não permitida -> sem Allow-Origin/Allow-Methods e NÃO
//         chama o next.
//     - OPTIONS sem Origin, ou com Origin mas sem Request-Method, não é
//       preflight: passa pro next.
//
//  3. O binário (package main) aplica WithCORS a TODAS as rotas, usando
//     OriginsFromEnv(), por fora do rate limit.

var corsAllowed = []string{"https://probekit.cc", "http://localhost:5173"}

// headerHasToken diz se um cabeçalho de lista ("GET, OPTIONS") contém o item.
func headerHasToken(h http.Header, key, token string) bool {
	for _, v := range h.Values(key) {
		for _, part := range strings.Split(v, ",") {
			if strings.EqualFold(strings.TrimSpace(part), token) {
				return true
			}
		}
	}
	return false
}

// --- parte 1: leitura das origens do ambiente ----------------------------

func TestOriginsFromEnv(t *testing.T) {
	t.Run("splits on commas and trims spaces", func(t *testing.T) {
		t.Setenv("CORS_ALLOWED_ORIGINS", "https://probekit.cc,  http://localhost:5173 ")

		got := utils.OriginsFromEnv()
		want := []string{"https://probekit.cc", "http://localhost:5173"}
		if !slices.Equal(got, want) {
			t.Errorf("got %q, want %q", got, want)
		}
	})

	t.Run("drops empty items", func(t *testing.T) {
		t.Setenv("CORS_ALLOWED_ORIGINS", "https://probekit.cc,,  ,")

		got := utils.OriginsFromEnv()
		want := []string{"https://probekit.cc"}
		if !slices.Equal(got, want) {
			t.Errorf("got %q, want %q", got, want)
		}
	})

	t.Run("empty variable means no origin allowed", func(t *testing.T) {
		t.Setenv("CORS_ALLOWED_ORIGINS", "")

		if got := utils.OriginsFromEnv(); len(got) != 0 {
			t.Errorf("got %q, want empty list", got)
		}
	})
}

// --- parte 2: o middleware isolado ----------------------------------------

// serve roda uma requisição pelo middleware e diz se o next foi chamado.
func serve(t *testing.T, allowed []string, method, origin, requestMethod string) (*httptest.ResponseRecorder, bool) {
	t.Helper()

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(method, "/api/ping", nil)
	if origin != "" {
		req.Header.Set("Origin", origin)
	}
	if requestMethod != "" {
		req.Header.Set("Access-Control-Request-Method", requestMethod)
	}

	rec := httptest.NewRecorder()
	utils.WithCORS(allowed, next).ServeHTTP(rec, req)
	return rec, called
}

func TestWithCORSSimpleRequests(t *testing.T) {
	t.Run("no Origin header passes through without CORS headers", func(t *testing.T) {
		rec, called := serve(t, corsAllowed, http.MethodGet, "", "")

		if !called {
			t.Error("next was not called")
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("Allow-Origin = %q, want empty", got)
		}
	})

	for _, origin := range corsAllowed {
		t.Run("allowed origin "+origin+" is echoed back", func(t *testing.T) {
			rec, called := serve(t, corsAllowed, http.MethodGet, origin, "")

			if !called {
				t.Error("next was not called")
			}
			if rec.Code != http.StatusOK {
				t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
			}
			if got := rec.Header().Get("Access-Control-Allow-Origin"); got != origin {
				t.Errorf("Allow-Origin = %q, want %q (exact origin, never *)", got, origin)
			}
			if !headerHasToken(rec.Header(), "Vary", "Origin") {
				t.Errorf("Vary = %q, want it to contain Origin", rec.Header().Values("Vary"))
			}
		})
	}

	rejected := []struct {
		name   string
		origin string
	}{
		{"unknown site", "https://evil.com"},
		{"allowed host as a suffix of another", "https://probekit.cc.evil.com"},
		{"wrong scheme", "http://probekit.cc"},
		{"wrong port", "https://probekit.cc:8443"},
		{"null origin", "null"},
	}
	for _, tc := range rejected {
		t.Run("rejects "+tc.name, func(t *testing.T) {
			rec, called := serve(t, corsAllowed, http.MethodGet, tc.origin, "")

			if !called {
				t.Error("next was not called (CORS is enforced by the browser, not by blocking)")
			}
			if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
				t.Errorf("Allow-Origin = %q, want empty for %q", got, tc.origin)
			}
		})
	}

	t.Run("empty allowlist allows nobody", func(t *testing.T) {
		rec, _ := serve(t, nil, http.MethodGet, "https://probekit.cc", "")

		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("Allow-Origin = %q, want empty", got)
		}
	})
}

func TestWithCORSPreflight(t *testing.T) {
	t.Run("allowed origin gets 204 and does not reach next", func(t *testing.T) {
		rec, called := serve(t, corsAllowed, http.MethodOptions, "https://probekit.cc", http.MethodGet)

		if called {
			t.Error("next was called: preflight must not run the real handler")
		}
		if rec.Code != http.StatusNoContent {
			t.Errorf("status = %d, want %d", rec.Code, http.StatusNoContent)
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://probekit.cc" {
			t.Errorf("Allow-Origin = %q, want %q", got, "https://probekit.cc")
		}
		if !headerHasToken(rec.Header(), "Access-Control-Allow-Methods", http.MethodGet) {
			t.Errorf("Allow-Methods = %q, want it to contain GET", rec.Header().Values("Access-Control-Allow-Methods"))
		}
		if !headerHasToken(rec.Header(), "Vary", "Origin") {
			t.Errorf("Vary = %q, want it to contain Origin", rec.Header().Values("Vary"))
		}
	})

	t.Run("disallowed origin gets no CORS headers and does not reach next", func(t *testing.T) {
		rec, called := serve(t, corsAllowed, http.MethodOptions, "https://evil.com", http.MethodGet)

		if called {
			t.Error("next was called")
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("Allow-Origin = %q, want empty", got)
		}
		if got := rec.Header().Get("Access-Control-Allow-Methods"); got != "" {
			t.Errorf("Allow-Methods = %q, want empty", got)
		}
	})

	t.Run("OPTIONS without Origin is not a preflight", func(t *testing.T) {
		_, called := serve(t, corsAllowed, http.MethodOptions, "", "")

		if !called {
			t.Error("next was not called")
		}
	})

	t.Run("OPTIONS with Origin but no Request-Method is not a preflight", func(t *testing.T) {
		_, called := serve(t, corsAllowed, http.MethodOptions, "https://probekit.cc", "")

		if !called {
			t.Error("next was not called")
		}
	})
}

// --- parte 3: o binário de verdade ----------------------------------------

func TestServerCORS(t *testing.T) {
	bin := buildServer(t)
	certPath, keyPath, cert := writeSelfSigned(t)
	addr := freeAddr(t)

	startServer(t, bin, addr,
		"ADDR="+addr,
		"TLS_CERT_FILE="+certPath,
		"TLS_KEY_FILE="+keyPath,
		"CORS_ALLOWED_ORIGINS=https://probekit.cc,http://localhost:5173",
	)

	pool := x509.NewCertPool()
	pool.AddCert(cert)
	client := &http.Client{
		Timeout:   5 * time.Second,
		Transport: &http.Transport{TLSClientConfig: &tls.Config{RootCAs: pool}},
	}

	do := func(t *testing.T, method, path, origin, requestMethod string) *http.Response {
		t.Helper()
		req, err := http.NewRequest(method, "https://"+addr+path, nil)
		if err != nil {
			t.Fatal(err)
		}
		if origin != "" {
			req.Header.Set("Origin", origin)
		}
		if requestMethod != "" {
			req.Header.Set("Access-Control-Request-Method", requestMethod)
		}
		res, err := client.Do(req)
		if err != nil {
			t.Fatalf("%s %s: %v", method, path, err)
		}
		t.Cleanup(func() { res.Body.Close() })
		return res
	}

	for _, path := range []string{"/", "/api/ping", "/api/dns-lookup"} {
		t.Run("preflight on "+path+" from allowed origin returns 204", func(t *testing.T) {
			res := do(t, http.MethodOptions, path, "https://probekit.cc", http.MethodGet)

			if res.StatusCode != http.StatusNoContent {
				t.Errorf("status = %d, want %d", res.StatusCode, http.StatusNoContent)
			}
			if got := res.Header.Get("Access-Control-Allow-Origin"); got != "https://probekit.cc" {
				t.Errorf("Allow-Origin = %q, want %q", got, "https://probekit.cc")
			}
			if !headerHasToken(res.Header, "Access-Control-Allow-Methods", http.MethodGet) {
				t.Errorf("Allow-Methods = %q, want it to contain GET", res.Header.Values("Access-Control-Allow-Methods"))
			}
		})
	}

	t.Run("GET from allowed origin carries Allow-Origin", func(t *testing.T) {
		res := do(t, http.MethodGet, "/", "http://localhost:5173", "")

		if res.StatusCode != http.StatusOK {
			t.Errorf("status = %d, want %d", res.StatusCode, http.StatusOK)
		}
		if got := res.Header.Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
			t.Errorf("Allow-Origin = %q, want %q", got, "http://localhost:5173")
		}
	})

	t.Run("GET from disallowed origin has no Allow-Origin", func(t *testing.T) {
		res := do(t, http.MethodGet, "/", "https://evil.com", "")

		if got := res.Header.Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("Allow-Origin = %q, want empty", got)
		}
	})

	t.Run("preflight from disallowed origin has no Allow-Origin", func(t *testing.T) {
		res := do(t, http.MethodOptions, "/api/ping", "https://evil.com", http.MethodGet)

		if got := res.Header.Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("Allow-Origin = %q, want empty", got)
		}
	})
}
