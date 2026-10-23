package tests

import (
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"api-service-golang/utils"
)

// Contrato (ADR-0009): utils.Response ganha o campo Version, serializado como
// "version" e omitido quando vazio (omitempty). Usa reflexão pra o pacote de
// testes continuar compilando enquanto o campo ainda não existe.
func TestResponseVersionField(t *testing.T) {
	field, ok := reflect.TypeOf(utils.Response{}).FieldByName("Version")
	if !ok {
		t.Fatal("utils.Response precisa do campo Version (string, tag json:\"version,omitempty\")")
	}
	if field.Type.Kind() != reflect.String {
		t.Fatalf("Version é %s, want string", field.Type.Kind())
	}
	if tag := field.Tag.Get("json"); tag != "version,omitempty" {
		t.Errorf("tag json = %q, want %q", tag, "version,omitempty")
	}

	encode := func(version string) map[string]any {
		var res utils.Response
		res.Message = "OK"
		reflect.ValueOf(&res).Elem().FieldByName("Version").SetString(version)

		rec := httptest.NewRecorder()
		utils.SetJSON(rec, http.StatusOK, res)

		var body map[string]any
		if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
			t.Fatalf("decoding response body: %v", err)
		}
		return body
	}

	t.Run("includes version when set", func(t *testing.T) {
		body := encode("1.3.0")
		if body["message"] != "OK" || body["version"] != "1.3.0" {
			t.Errorf("body = %v, want message=OK version=1.3.0", body)
		}
	})

	t.Run("omits version when empty", func(t *testing.T) {
		body := encode("")
		if _, present := body["version"]; present {
			t.Errorf("body = %v, want no version key when empty", body)
		}
	})
}

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
