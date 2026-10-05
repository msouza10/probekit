package tests

import (
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"

	"api-service-golang/utils"
)

func TestSetJSON(t *testing.T) {
	t.Run("sets status, content-type and encodes the body", func(t *testing.T) {
		rec := httptest.NewRecorder()

		utils.SetJSON(rec, http.StatusTeapot, utils.Response{
			Message: "hello",
			Code:    "example",
		})

		if rec.Code != http.StatusTeapot {
			t.Errorf("status = %d, want %d", rec.Code, http.StatusTeapot)
		}
		if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
			t.Errorf("Content-Type = %q, want %q", ct, "application/json")
		}

		var body utils.Response
		if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
			t.Fatalf("decoding response body: %v", err)
		}
		if body.Message != "hello" || body.Code != "example" {
			t.Errorf("body = %+v, want Message=hello Code=example", body)
		}
	})

	// encoding/json falha ao serializar +Inf/-Inf/NaN. Quando isso acontece,
	// o SetJSON já chamou w.WriteHeader(status) com o status original ANTES
	// de tentar o Encode — então o http.Error(..., 500) de dentro do `if err
	// != nil` não consegue mais mudar o status (já foi escrito). Isto
	// documenta o comportamento ATUAL (um bug conhecido), não o ideal: o
	// cliente recebe o status pedido originalmente, não um 500, quando a
	// serialização falha.
	t.Run("encode failure keeps the original status (known bug, not ideal)", func(t *testing.T) {
		rec := httptest.NewRecorder()

		utils.SetJSON(rec, http.StatusOK, math.Inf(1))

		if rec.Code != http.StatusOK {
			t.Errorf("status = %d, want %d (comportamento atual, não ideal)", rec.Code, http.StatusOK)
		}
		if rec.Body.String() == "" {
			t.Error("expected a non-empty body describing the encoding error")
		}
	})
}
