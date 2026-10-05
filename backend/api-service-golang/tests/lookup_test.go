package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"api-service-golang/handler"
	"api-service-golang/utils"
)

// TestLookup cobre a rota /api/dns-lookup: método inválido, domínio
// ausente/inválido, domínio que não resolve, alvo privado e o caminho de
// sucesso contra um domínio público real.
func TestLookup(t *testing.T) {
	mux := handler.Lookup()

	t.Run("method not allowed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/dns-lookup?domain=example.com", nil)
		rec := httptest.NewRecorder()

		mux.ServeHTTP(rec, req)

		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("status = %d, want %d", rec.Code, http.StatusMethodNotAllowed)
		}
	})

	t.Run("invalid domain", func(t *testing.T) {
		cases := []struct {
			name     string
			setParam bool
			domain   string
		}{
			{name: "missing domain param", setParam: false},
			{name: "empty domain param", setParam: true, domain: ""},
			{name: "whitespace-only domain", setParam: true, domain: "   "},
		}

		for _, tc := range cases {
			t.Run(tc.name, func(t *testing.T) {
				u := &url.URL{Path: "/api/dns-lookup"}
				if tc.setParam {
					q := u.Query()
					q.Set("domain", tc.domain)
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

	// O spec pede validação de IP privado/reservado nas duas rotas
	// (ping e dns-lookup). "localhost" resolve pra 127.0.0.1 (loopback).
	// Este teste falha de propósito até essa validação ser implementada
	// em lookup.go, igual já é feito em ping.go.
	t.Run("private or reserved domain is rejected", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/dns-lookup?domain=localhost", nil)
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

	// net.LookupHost descarta o erro hoje (addrs, _ := ...), então um
	// domínio inexistente não é tratado como erro — este teste falha de
	// propósito, sinalizando que falta checar esse erro em lookup.go.
	t.Run("unresolvable domain is rejected", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/dns-lookup?domain=this-domain-does-not-exist-abcxyz123.invalid", nil)
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
	})

	t.Run("success with a real public domain", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/dns-lookup?domain=example.com", nil)
		rec := httptest.NewRecorder()

		mux.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d, body: %s", rec.Code, http.StatusOK, rec.Body.String())
		}

		if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
			t.Errorf("Content-Type = %q, want %q", ct, "application/json")
		}

		var body utils.LookupResponse
		if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
			t.Fatalf("decoding response body: %v", err)
		}

		if body.Domain != "example.com" {
			t.Errorf("Domain = %q, want %q", body.Domain, "example.com")
		}
		if len(body.Addrs) == 0 {
			t.Error("expected at least one address (A/AAAA)")
		}
		if len(body.Ip) == 0 {
			t.Error("expected at least one IP (campo Ip, redundante com Addrs de propósito)")
		}
		if len(body.Ns) == 0 {
			t.Error("expected at least one NS record")
		}
		// Sem service/proto na query, srv deve voltar vazio, não nil.
		if body.Srv == nil {
			t.Error("expected Srv to be an empty slice, not nil")
		}
	})

	t.Run("srv is empty without service/proto params", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/dns-lookup?domain=example.com", nil)
		rec := httptest.NewRecorder()

		mux.ServeHTTP(rec, req)

		var body utils.LookupResponse
		if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
			t.Fatalf("decoding response body: %v", err)
		}
		if len(body.Srv) != 0 {
			t.Errorf("Srv = %v, want empty", body.Srv)
		}
	})

	t.Run("unknown service/proto does not error, just returns empty srv", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/dns-lookup?domain=example.com&service=naoexiste&proto=tcp", nil)
		rec := httptest.NewRecorder()

		mux.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d, body: %s", rec.Code, http.StatusOK, rec.Body.String())
		}

		var body utils.LookupResponse
		if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
			t.Fatalf("decoding response body: %v", err)
		}
		if len(body.Srv) != 0 {
			t.Errorf("Srv = %v, want empty", body.Srv)
		}
	})
}
