package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"api-service-golang/handler"
)

// TestOriginRegion confere o campo origin_region nas duas rotas que o expõem.
// O valor vem do parâmetro do handler (o main.go lê ORIGIN_REGION uma vez).
//
// Decodificamos para map[string]any de propósito: assim dá para distinguir
// "campo omitido" de "campo presente com texto vazio", que é o contrato
// (variável vazia → o campo some, e o badge do site fica escondido).
func TestOriginRegion(t *testing.T) {
	routes := []struct {
		name string
		url  string
		mux  func(region string) http.Handler
	}{
		{"ping", "/api/ping?target=1.1.1.1&count=1", handler.Ping},
		{"dns-lookup", "/api/dns-lookup?domain=example.com", handler.Lookup},
	}

	for _, rt := range routes {
		t.Run(rt.name, func(t *testing.T) {
			t.Run("region defined", func(t *testing.T) {
				body := getJSON(t, rt.mux("sa-saopaulo-1"), rt.url)

				got, ok := body["origin_region"]
				if !ok {
					t.Fatalf("origin_region ausente, body: %v", body)
				}
				if got != "sa-saopaulo-1" {
					t.Errorf("origin_region = %v, want %q", got, "sa-saopaulo-1")
				}
			})

			t.Run("region empty is omitted", func(t *testing.T) {
				body := getJSON(t, rt.mux(""), rt.url)

				if v, ok := body["origin_region"]; ok {
					t.Errorf("origin_region deveria ser omitido, veio %v", v)
				}
			})
		})
	}
}

// TestRootReportsOriginRegion cobre o GET /: o main.go lê ORIGIN_REGION do
// ambiente, então aqui sobe o binário de verdade (como o version_test.go).
func TestRootReportsOriginRegion(t *testing.T) {
	bin := buildServerWithVersion(t, "")

	t.Run("region defined", func(t *testing.T) {
		body := rootBody(t, bin, "ORIGIN_REGION=sa-saopaulo-1")

		if body["origin_region"] != "sa-saopaulo-1" {
			t.Errorf("origin_region = %v, want %q", body["origin_region"], "sa-saopaulo-1")
		}
		if body["message"] != "OK" {
			t.Errorf("message = %v, want %q (o health check precisa continuar valendo)", body["message"], "OK")
		}
	})

	t.Run("region unset is omitted", func(t *testing.T) {
		// ORIGIN_REGION= (vazia) sobrescreve qualquer valor herdado do shell.
		body := rootBody(t, bin, "ORIGIN_REGION=")

		if v, ok := body["origin_region"]; ok {
			t.Errorf("origin_region deveria ser omitido, veio %v", v)
		}
	})
}

func getJSON(t *testing.T, h http.Handler, url string) map[string]any {
	t.Helper()

	req := httptest.NewRequest(http.MethodGet, url, nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var body map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decoding response body: %v", err)
	}
	return body
}
