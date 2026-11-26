package handler_test

// Testes da rota GET /api/vouchers de ponta a ponta (handler.Vouchers), sem
// subir servidor: `Vouchers(snap)` devolve um http.Handler com a rota
// "/api/vouchers" registrada, como `Ping` e `Lookup`.
//
// Decisões destes testes que o plano não fixava (mude código e teste juntos):
//   - `limit` que não é número inteiro ou é menor que 1: 400, código `invalid_limit`;
//   - `limit` acima de 50 não é erro: vira 50;
//   - cursor que a API não gerou: 400, código `invalid_cursor`.

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"api-service-golang/handler"
	"api-service-golang/voucher"
)

// --- peças de teste ---------------------------------------------------------

func novoDoc(t *testing.T, id string, mudancas ...func(m map[string]any)) voucher.Doc {
	t.Helper()
	m := map[string]any{
		"id": id, "pk": "v1", "type": "item",
		"url": "https://exemplo.com/" + id, "title": "Título " + id,
		"snippet":      "SEGREDO-snippet",
		"published_at": "2026-11-20T14:02:00Z", "sort_at": "2026-11-20T14:02:00Z",
		"hidden": false, "keyword_score": 12, "discount_percent": 50,
		"source": map[string]any{"id": "f1", "name": "Fonte Um", "kind": "blog", "vendor_hint": "aws"},
		"analysis": map[string]any{
			"status": "done", "attempts": 1,
			"result": map[string]any{
				"is_voucher": true, "confidence": 0.9, "vendor": "aws",
				"promotion_name": "Promoção", "promotion_type": "discount",
				"certifications": []string{"SAA-C03"}, "voucher_code": nil,
				"discount": "50% off", "registration_url": "https://SEGREDO-golpe.example/x",
				"start_date": "2026-11-20", "end_date": "2026-11-30",
				"regions": []string{"Global"}, "reason": "SEGREDO-reason",
			},
		},
	}
	for _, f := range mudancas {
		f(m)
	}
	b, err := json.Marshal(m)
	if err != nil {
		t.Fatal(err)
	}
	var d voucher.Doc
	if err := json.Unmarshal(b, &d); err != nil {
		t.Fatal(err)
	}
	return d
}

// umDoc é o documento mais simples que vale como item visível.
func umDoc(t *testing.T) voucher.Doc { return novoDoc(t, "item-01") }

// sessentaDocs cria 60 itens visíveis, com ids e datas diferentes.
func sessentaDocs(t *testing.T) []voucher.Doc {
	docs := make([]voucher.Doc, 0, 60)
	for n := 1; n <= 60; n++ {
		quando := fmt.Sprintf("2026-09-%02dT%02d:00:00Z", n%28+1, n%24)
		docs = append(docs, novoDoc(t, fmt.Sprintf("item-%02d", n), func(m map[string]any) {
			m["sort_at"] = quando
			m["published_at"] = quando
		}))
	}
	return docs
}

type fonteFalsa struct {
	mu   sync.Mutex
	docs []voucher.Doc
}

var coletadoEm = time.Date(2026, 11, 24, 14, 0, 12, 0, time.UTC)

func (f *fonteFalsa) Latest(ctx context.Context, n int) ([]voucher.Doc, time.Time, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]voucher.Doc(nil), f.docs...), coletadoEm, nil
}

// instantaneo devolve um Snapshot já carregado com os docs.
func instantaneo(t *testing.T, docs ...voucher.Doc) *voucher.Snapshot {
	t.Helper()
	s := voucher.NewSnapshot(&fonteFalsa{docs: docs}, time.Hour, 500)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	s.Start(ctx)
	limite := time.Now().Add(3 * time.Second)
	for {
		if _, _, _, err := s.Page(1, ""); err == nil {
			return s
		}
		if time.Now().After(limite) {
			t.Fatal("o instantâneo não carregou")
		}
		time.Sleep(5 * time.Millisecond)
	}
}

func pegar(h http.Handler, alvo string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, alvo, nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

type corpo struct {
	LastCollectedAt *string          `json:"last_collected_at"`
	GeneratedAt     string           `json:"generated_at"`
	Items           []map[string]any `json:"items"`
	NextCursor      *string          `json:"next_cursor"`
}

func lerCorpo(t *testing.T, rec *httptest.ResponseRecorder) corpo {
	t.Helper()
	var c corpo
	if err := json.Unmarshal(rec.Body.Bytes(), &c); err != nil {
		t.Fatalf("a resposta não é JSON: %v\n%s", err, rec.Body.String())
	}
	return c
}

type erroJSON struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

func esperaErro(t *testing.T, rec *httptest.ResponseRecorder, status int, code string) {
	t.Helper()
	if rec.Code != status {
		t.Fatalf("status: want %d, got %d (%s)", status, rec.Code, rec.Body.String())
	}
	var e erroJSON
	if err := json.Unmarshal(rec.Body.Bytes(), &e); err != nil {
		t.Fatalf("o erro não é JSON {error, code}: %v", err)
	}
	if e.Code != code || e.Error == "" {
		t.Errorf("erro: want code %q com mensagem, got %+v", code, e)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("Content-Type: want application/json, got %q", ct)
	}
}

// --- antes da carga e métodos ----------------------------------------------

func TestAntesDaPrimeiraCargaResponde503ComVouchersUnavailable(t *testing.T) {
	naoIniciado := voucher.NewSnapshot(&fonteFalsa{}, time.Hour, 500) // sem Start

	rec := pegar(handler.Vouchers(naoIniciado), "/api/vouchers")

	esperaErro(t, rec, http.StatusServiceUnavailable, "vouchers_unavailable")
}

func TestMetodoQueNaoEGetResponde405(t *testing.T) {
	h := handler.Vouchers(instantaneo(t, umDoc(t)))
	req := httptest.NewRequest(http.MethodPost, "/api/vouchers", nil)
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	esperaErro(t, rec, http.StatusMethodNotAllowed, "invalid_method")
}

func TestOutroCaminhoResponde404(t *testing.T) {
	h := handler.Vouchers(instantaneo(t, umDoc(t)))

	if rec := pegar(h, "/api/outra-coisa"); rec.Code != http.StatusNotFound {
		t.Errorf("outro caminho: want 404, got %d", rec.Code)
	}
}

// --- o corpo da resposta ---------------------------------------------------

func TestRespostaTemAsChavesETiposDoContrato(t *testing.T) {
	antes := time.Now().Add(-time.Second)
	h := handler.Vouchers(instantaneo(t, umDoc(t)))

	rec := pegar(h, "/api/vouchers")

	if rec.Code != http.StatusOK {
		t.Fatalf("status: want 200, got %d (%s)", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("Content-Type: want application/json, got %q", ct)
	}
	c := lerCorpo(t, rec)
	if c.LastCollectedAt == nil || *c.LastCollectedAt != "2026-11-24T14:00:12Z" {
		t.Errorf("last_collected_at: want 2026-11-24T14:00:12Z, got %v", c.LastCollectedAt)
	}
	gerado, err := time.Parse(time.RFC3339, c.GeneratedAt)
	if err != nil || !strings.HasSuffix(c.GeneratedAt, "Z") || gerado.Before(antes) || gerado.After(time.Now().Add(time.Second)) {
		t.Errorf("generated_at: want an UTC RFC 3339 time about now, got %q (err=%v)", c.GeneratedAt, err)
	}
	if len(c.Items) != 1 {
		t.Fatalf("items: want 1, got %d", len(c.Items))
	}
	if c.NextCursor != nil {
		t.Errorf("next_cursor: want null when there is no next page, got %q", *c.NextCursor)
	}
}

func TestRespostaNuncaTrazCampoPrivado(t *testing.T) {
	h := handler.Vouchers(instantaneo(t, umDoc(t)))

	corpoCru := pegar(h, "/api/vouchers").Body.String()

	for _, proibido := range []string{
		"SEGREDO-snippet", "SEGREDO-golpe", "SEGREDO-reason",
		"snippet", "reason", "confidence", "registration_url", "keyword_score",
		"hidden", "analysis", "matched_keywords", "seen_in", "content_hash",
	} {
		if strings.Contains(corpoCru, proibido) {
			t.Errorf("a resposta não pode conter %q: %s", proibido, corpoCru)
		}
	}
}

func TestSemItensAListaEVaziaENuncaNull(t *testing.T) {
	h := handler.Vouchers(instantaneo(t)) // nenhum item

	rec := pegar(h, "/api/vouchers")

	if rec.Code != http.StatusOK {
		t.Fatalf("status: want 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), `"items":[]`) {
		t.Errorf(`items: want [] (never null), got %s`, rec.Body.String())
	}
}

// --- limit e cursor --------------------------------------------------------

func TestLimitePadraoE20(t *testing.T) {
	h := handler.Vouchers(instantaneo(t, sessentaDocs(t)...))

	c := lerCorpo(t, pegar(h, "/api/vouchers"))

	if len(c.Items) != 20 || c.NextCursor == nil {
		t.Errorf("default: want 20 items and a next_cursor, got %d (cursor=%v)", len(c.Items), c.NextCursor)
	}
}

func TestLimiteMaximoE50(t *testing.T) {
	h := handler.Vouchers(instantaneo(t, sessentaDocs(t)...))

	c := lerCorpo(t, pegar(h, "/api/vouchers?limit=100"))

	if len(c.Items) != 50 {
		t.Errorf("limit=100: want 50 items, got %d", len(c.Items))
	}
}

func TestLimitePequenoFunciona(t *testing.T) {
	h := handler.Vouchers(instantaneo(t, sessentaDocs(t)...))

	c := lerCorpo(t, pegar(h, "/api/vouchers?limit=3"))

	if len(c.Items) != 3 {
		t.Errorf("limit=3: want 3 items, got %d", len(c.Items))
	}
}

func TestLimiteInvalidoResponde400(t *testing.T) {
	h := handler.Vouchers(instantaneo(t, umDoc(t)))

	for _, ruim := range []string{"abc", "0", "-5", "1.5"} {
		esperaErro(t, pegar(h, "/api/vouchers?limit="+ruim), http.StatusBadRequest, "invalid_limit")
	}
}

func TestCursorQueAAPINaoGerouResponde400(t *testing.T) {
	h := handler.Vouchers(instantaneo(t, umDoc(t)))

	esperaErro(t, pegar(h, "/api/vouchers?cursor=lixo"), http.StatusBadRequest, "invalid_cursor")
}

func TestSeguindoOCursorPercorreTudoSemRepetirNemPular(t *testing.T) {
	docs := sessentaDocs(t)
	h := handler.Vouchers(instantaneo(t, docs...))

	vistos := map[string]bool{}
	alvo := "/api/vouchers?limit=25"
	paginas := 0
	for alvo != "" {
		paginas++
		if paginas > 10 {
			t.Fatal("muitas páginas: o cursor não está avançando")
		}
		c := lerCorpo(t, pegar(h, alvo))
		for _, item := range c.Items {
			id := item["id"].(string)
			if vistos[id] {
				t.Errorf("item %s apareceu duas vezes", id)
			}
			vistos[id] = true
		}
		alvo = ""
		if c.NextCursor != nil {
			alvo = "/api/vouchers?limit=25&cursor=" + *c.NextCursor
		}
	}

	if len(vistos) != len(docs) || paginas != 3 {
		t.Errorf("want all %d items in 3 pages, got %d items in %d pages", len(docs), len(vistos), paginas)
	}
}
