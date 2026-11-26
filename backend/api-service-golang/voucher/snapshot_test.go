package voucher_test

// Testes do instantâneo em memória (voucher.Snapshot) e do formato do item.
//
// Contrato que a produção precisa cumprir pra estes testes passarem:
//
//  1. voucher.Doc: o item como está no banco (a ADR-0015). Tem as tags `json`
//     dos campos do documento (id, url, title, sort_at, hidden, source{...},
//     analysis{status, result{...}}, discount_percent...). Os testes criam um
//     Doc por json.Unmarshal, então só o nome do campo JSON importa, não o do
//     campo Go.
//
//  2. voucher.Source: interface com
//     Latest(ctx context.Context, n int) ([]voucher.Doc, time.Time, error)
//     os n itens mais recentes e a hora da última coleta (finished_at do `run`).
//
//  3. voucher.NewSnapshot(src, every, max) *Snapshot
//     Start(ctx): carrega já e depois a cada `every`, em segundo plano, até o
//     contexto acabar. GeneratedAt(): quando o instantâneo atual foi montado.
//     Page(limit, cursor) ([]Item, next string, lastCollected time.Time, error).
//
//  4. Erros exportados: voucher.ErrNotReady (ainda não houve carga) e
//     voucher.ErrInvalidCursor (cursor que a própria API não gerou).
//
//  5. voucher.Item: o item da resposta. Serializa em JSON com EXATAMENTE as
//     chaves da ADR-0015 (sem snippet, reason, confidence, registration_url).
//
// Rode com -race: o instantâneo é lido por várias requisições enquanto outra
// goroutine o troca.

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	"api-service-golang/voucher"
)

// --- peças de teste ---------------------------------------------------------

// docOpt muda o documento (um mapa JSON) antes de ele virar um voucher.Doc.
type docOpt func(m map[string]any)

func sortAt(v string) docOpt {
	return func(m map[string]any) { m["sort_at"] = v; m["published_at"] = v }
}
func campo(k string, v any) docOpt { return func(m map[string]any) { m[k] = v } }
func fonte(k string, v any) docOpt {
	return func(m map[string]any) { m["source"].(map[string]any)[k] = v }
}
func analise(k string, v any) docOpt {
	return func(m map[string]any) { m["analysis"].(map[string]any)[k] = v }
}
func resultado(k string, v any) docOpt {
	return func(m map[string]any) {
		m["analysis"].(map[string]any)["result"].(map[string]any)[k] = v
	}
}

func novoDoc(t *testing.T, id string, opts ...docOpt) voucher.Doc {
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
	for _, o := range opts {
		o(m)
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

// fakeSource é o banco de mentira: devolve o que `Set` mandou.
type fakeSource struct {
	mu        sync.Mutex
	docs      []voucher.Doc
	collected time.Time
	failFirst int
	failAll   bool
	calls     int
	lastN     int
}

func (f *fakeSource) Latest(ctx context.Context, n int) ([]voucher.Doc, time.Time, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls++
	f.lastN = n
	if f.failAll || f.calls <= f.failFirst {
		return nil, time.Time{}, errors.New("banco fora do ar")
	}
	return append([]voucher.Doc(nil), f.docs...), f.collected, nil
}

func (f *fakeSource) Set(docs ...voucher.Doc) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.docs = docs
}
func (f *fakeSource) FailAll() { f.mu.Lock(); f.failAll = true; f.mu.Unlock() }
func (f *fakeSource) Calls() int { f.mu.Lock(); defer f.mu.Unlock(); return f.calls }
func (f *fakeSource) LastN() int { f.mu.Lock(); defer f.mu.Unlock(); return f.lastN }

var coletadoEm = time.Date(2026, 11, 24, 14, 0, 12, 0, time.UTC)

func novaFonte(docs ...voucher.Doc) *fakeSource {
	return &fakeSource{docs: docs, collected: coletadoEm}
}

func esperar(t *testing.T, descricao string, cond func() bool) {
	t.Helper()
	limite := time.Now().Add(3 * time.Second)
	for !cond() {
		if time.Now().After(limite) {
			t.Fatalf("tempo esgotado esperando: %s", descricao)
		}
		time.Sleep(5 * time.Millisecond)
	}
}

// ligar cria o instantâneo, inicia e espera a primeira carga.
func ligar(t *testing.T, src *fakeSource, max int) *voucher.Snapshot {
	t.Helper()
	s := voucher.NewSnapshot(src, 10*time.Millisecond, max)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	s.Start(ctx)
	esperar(t, "primeira carga", func() bool { _, _, _, err := s.Page(1, ""); return err == nil })
	return s
}

func asMap(t *testing.T, item voucher.Item) map[string]any {
	t.Helper()
	b, err := json.Marshal(item)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	return m
}

func ids(t *testing.T, items []voucher.Item) []string {
	t.Helper()
	out := make([]string, 0, len(items))
	for _, it := range items {
		out = append(out, asMap(t, it)["id"].(string))
	}
	return out
}

func igual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// --- antes e depois da carga -----------------------------------------------

func TestAntesDaPrimeiraCargaOInstantaneoNaoEstaPronto(t *testing.T) {
	s := voucher.NewSnapshot(novaFonte(), time.Hour, 500)

	_, _, _, err := s.Page(20, "")

	if !errors.Is(err, voucher.ErrNotReady) {
		t.Fatalf("antes da carga: want ErrNotReady, got %v", err)
	}
}

func TestPrimeiraCargaComErroTentaDeNovoNaHoraSeguinte(t *testing.T) {
	src := novaFonte(novoDoc(t, "a"))
	src.failFirst = 2

	s := ligar(t, src, 500) // só volta quando conseguiu carregar

	items, _, _, err := s.Page(20, "")
	if err != nil || len(items) != 1 {
		t.Fatalf("after retries: want 1 item, got %d (err=%v)", len(items), err)
	}
}

func TestDevolveAHoraDaUltimaColetaEQuandoOInstantaneoFoiMontado(t *testing.T) {
	antes := time.Now().Add(-time.Second)
	s := ligar(t, novaFonte(novoDoc(t, "a")), 500)

	_, _, coletado, _ := s.Page(20, "")

	if !coletado.Equal(coletadoEm) {
		t.Errorf("lastCollected: want %v, got %v", coletadoEm, coletado)
	}
	if g := s.GeneratedAt(); g.Before(antes) || g.After(time.Now().Add(time.Second)) {
		t.Errorf("GeneratedAt: want about now, got %v", g)
	}
}

// --- ordem, filtro e tamanho -----------------------------------------------

func TestOrdemEPorSortAtDecrescenteComDesempatePeloIDCrescente(t *testing.T) {
	src := novaFonte(
		novoDoc(t, "d", sortAt("2026-11-20T09:00:00Z")),
		novoDoc(t, "b", sortAt("2026-11-21T10:00:00Z")),
		novoDoc(t, "c", sortAt("2026-11-22T12:00:00Z")),
		novoDoc(t, "a", sortAt("2026-11-21T10:00:00Z")),
	)
	s := ligar(t, src, 500)

	items, _, _, _ := s.Page(50, "")

	if got := ids(t, items); !igual(got, []string{"c", "a", "b", "d"}) {
		t.Errorf("order: want [c a b d], got %v", got)
	}
}

func TestSoOsItensDeVerdadeEntramNoInstantaneo(t *testing.T) {
	src := novaFonte(
		novoDoc(t, "visivel", sortAt("2026-11-27T00:00:00Z")),
		novoDoc(t, "confianca-no-limite", sortAt("2026-11-26T00:00:00Z"), resultado("confidence", 0.5)),
		novoDoc(t, "escondido", campo("hidden", true)),
		novoDoc(t, "pendente", analise("status", "pending")),
		novoDoc(t, "falhou", analise("status", "failed")),
		novoDoc(t, "nao-e-promocao", resultado("is_voucher", false)),
		novoDoc(t, "confianca-baixa", resultado("confidence", 0.49)),
	)
	s := ligar(t, src, 500)

	items, _, _, _ := s.Page(50, "")

	if got := ids(t, items); !igual(got, []string{"visivel", "confianca-no-limite"}) {
		t.Errorf("visible: want [visivel confianca-no-limite], got %v", got)
	}
}

func TestOInstantaneoGuardaSoOsMaisRecentesDentroDoMaximo(t *testing.T) {
	src := novaFonte(
		novoDoc(t, "e1", sortAt("2026-11-21T00:00:00Z")),
		novoDoc(t, "e2", sortAt("2026-11-22T00:00:00Z")),
		novoDoc(t, "e3", sortAt("2026-11-23T00:00:00Z")),
		novoDoc(t, "e4", sortAt("2026-11-24T00:00:00Z")),
		novoDoc(t, "e5", sortAt("2026-11-25T00:00:00Z")),
	)
	s := ligar(t, src, 3)

	items, _, _, _ := s.Page(50, "")

	if got := ids(t, items); !igual(got, []string{"e5", "e4", "e3"}) {
		t.Errorf("max=3: want [e5 e4 e3], got %v", got)
	}
	if src.LastN() != 3 {
		t.Errorf("a fonte deve ser pedida com n = max (3), got %d", src.LastN())
	}
}

// --- paginação -------------------------------------------------------------

func cincoDocs(t *testing.T) []voucher.Doc {
	return []voucher.Doc{
		novoDoc(t, "e1", sortAt("2026-11-21T00:00:00Z")),
		novoDoc(t, "e2", sortAt("2026-11-22T00:00:00Z")),
		novoDoc(t, "e3", sortAt("2026-11-23T00:00:00Z")),
		novoDoc(t, "e4", sortAt("2026-11-24T00:00:00Z")),
		novoDoc(t, "e5", sortAt("2026-11-25T00:00:00Z")),
	}
}

func TestPaginaDeDoisEmDoisSemRepetirNemPular(t *testing.T) {
	s := ligar(t, novaFonte(cincoDocs(t)...), 500)

	var todos []string
	cursor := ""
	for pagina := 1; pagina <= 5; pagina++ {
		items, next, _, err := s.Page(2, cursor)
		if err != nil {
			t.Fatalf("page %d: %v", pagina, err)
		}
		todos = append(todos, ids(t, items)...)
		if next == "" {
			if pagina != 3 {
				t.Errorf("a última página deveria ser a 3ª, foi a %d", pagina)
			}
			break
		}
		cursor = next
	}

	if !igual(todos, []string{"e5", "e4", "e3", "e2", "e1"}) {
		t.Errorf("all pages: want e5..e1 once each, got %v", todos)
	}
}

func TestUltimaPaginaTemCursorVazio(t *testing.T) {
	s := ligar(t, novaFonte(cincoDocs(t)...), 500)

	_, next, _, _ := s.Page(50, "")

	if next != "" {
		t.Errorf("next cursor: want empty when everything fits, got %q", next)
	}
}

func TestCursorContinuaCertoMesmoQuandoEntramItensNovosEntreAsPaginas(t *testing.T) {
	src := novaFonte(cincoDocs(t)...)
	s := ligar(t, src, 500)
	primeira, cursor, _, _ := s.Page(2, "")
	if got := ids(t, primeira); !igual(got, []string{"e5", "e4"}) {
		t.Fatalf("page 1: want [e5 e4], got %v", got)
	}

	// Entra um item mais novo que todos, e o instantâneo é trocado.
	src.Set(append(cincoDocs(t), novoDoc(t, "e6", sortAt("2026-11-26T00:00:00Z")))...)
	esperar(t, "o item novo aparecer", func() bool {
		items, _, _, _ := s.Page(1, "")
		return len(items) == 1 && ids(t, items)[0] == "e6"
	})

	segunda, _, _, err := s.Page(2, cursor)

	if err != nil {
		t.Fatal(err)
	}
	if got := ids(t, segunda); !igual(got, []string{"e3", "e2"}) {
		t.Errorf("page 2 with the old cursor: want [e3 e2] (no repeat, no skip), got %v", got)
	}
}

func TestCursorQueAAPINaoGerouEErro(t *testing.T) {
	s := ligar(t, novaFonte(cincoDocs(t)...), 500)

	for _, lixo := range []string{"%%%", "lixo", "bGl4bw==", "!!!!"} {
		if _, _, _, err := s.Page(2, lixo); !errors.Is(err, voucher.ErrInvalidCursor) {
			t.Errorf("cursor %q: want ErrInvalidCursor, got %v", lixo, err)
		}
	}
}

// --- vida do instantâneo ---------------------------------------------------

func TestAtualizaEmSegundoPlano(t *testing.T) {
	src := novaFonte(novoDoc(t, "velho"))
	s := ligar(t, src, 500)

	src.Set(novoDoc(t, "novo"))

	esperar(t, "a segunda carga", func() bool {
		items, _, _, _ := s.Page(50, "")
		return igual(ids(t, items), []string{"novo"})
	})
}

func TestSeAAtualizacaoFalhaOInstantaneoAnteriorContinua(t *testing.T) {
	src := novaFonte(novoDoc(t, "a"), novoDoc(t, "b", sortAt("2026-11-19T00:00:00Z")))
	s := ligar(t, src, 500)
	antes := src.Calls()

	src.FailAll()
	esperar(t, "algumas tentativas falhas", func() bool { return src.Calls() >= antes+3 })

	items, _, coletado, err := s.Page(50, "")
	if err != nil {
		t.Fatalf("with a failing source: want the last snapshot, got error %v", err)
	}
	if got := ids(t, items); !igual(got, []string{"a", "b"}) {
		t.Errorf("stale snapshot: want [a b], got %v", got)
	}
	if !coletado.Equal(coletadoEm) {
		t.Errorf("lastCollected: want the old one %v, got %v", coletadoEm, coletado)
	}
}

func TestParaDeAtualizarQuandoOContextoAcaba(t *testing.T) {
	src := novaFonte(novoDoc(t, "a"))
	s := voucher.NewSnapshot(src, 10*time.Millisecond, 500)
	ctx, cancel := context.WithCancel(context.Background())
	s.Start(ctx)
	esperar(t, "primeira carga", func() bool { _, _, _, err := s.Page(1, ""); return err == nil })

	cancel()
	time.Sleep(60 * time.Millisecond)
	parou := src.Calls()
	time.Sleep(80 * time.Millisecond)

	if src.Calls() != parou {
		t.Errorf("a goroutine seguiu chamando a fonte depois do cancelamento (%d -> %d)", parou, src.Calls())
	}
}

func TestVariasLeiturasEmParaleloDuranteAsTrocas(t *testing.T) {
	src := novaFonte(cincoDocs(t)...)
	s := ligar(t, src, 500)

	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				if _, _, _, err := s.Page(2, ""); err != nil {
					t.Error(err)
					return
				}
			}
		}()
	}
	for j := 0; j < 20; j++ {
		src.Set(cincoDocs(t)...)
		time.Sleep(time.Millisecond)
	}
	wg.Wait()
}

// --- o item da resposta ----------------------------------------------------

func chaves(m map[string]any) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func primeiroItem(t *testing.T, opts ...docOpt) map[string]any {
	t.Helper()
	s := ligar(t, novaFonte(novoDoc(t, "a", opts...)), 500)
	items, _, _, _ := s.Page(1, "")
	if len(items) != 1 {
		t.Fatalf("want 1 item, got %d", len(items))
	}
	return asMap(t, items[0])
}

func TestItemTemExatamenteAsChavesDoContrato(t *testing.T) {
	item := primeiroItem(t)

	want := []string{
		"certifications", "discount_percent", "discount_text", "end_date", "id",
		"promotion_name", "promotion_type", "published_at", "regions",
		"source_name", "start_date", "title", "url", "vendor", "voucher_code",
	}
	if got := chaves(item); !igual(got, want) {
		t.Errorf("item keys:\n want %v\n  got %v", want, got)
	}
}

func TestItemTraduzOsCamposDoBanco(t *testing.T) {
	item := primeiroItem(t)

	checks := map[string]any{
		"id": "a", "url": "https://exemplo.com/a", "title": "Título a",
		"vendor": "aws", "promotion_name": "Promoção", "promotion_type": "discount",
		"discount_text": "50% off", "discount_percent": float64(50),
		"start_date": "2026-11-20", "end_date": "2026-11-30",
		"published_at": "2026-11-20T14:02:00Z", "source_name": "Fonte Um",
	}
	for k, want := range checks {
		if item[k] != want {
			t.Errorf("%s: want %v, got %v", k, want, item[k])
		}
	}
}

func TestSemFornecedorNoResultadoUsaADicaDaFonte(t *testing.T) {
	item := primeiroItem(t, resultado("vendor", nil), fonte("vendor_hint", "microsoft"))

	if item["vendor"] != "microsoft" {
		t.Errorf("vendor: want the source hint 'microsoft', got %v", item["vendor"])
	}
}

func TestListasAusentesViramListaVaziaENuncaNull(t *testing.T) {
	item := primeiroItem(t, resultado("certifications", nil), resultado("regions", nil))

	for _, k := range []string{"certifications", "regions"} {
		lista, ok := item[k].([]any)
		if !ok || len(lista) != 0 {
			t.Errorf("%s: want [] (never null), got %#v", k, item[k])
		}
	}
}

func TestPercentualAusenteViraNull(t *testing.T) {
	item := primeiroItem(t, campo("discount_percent", nil))

	if v, ok := item["discount_percent"]; !ok || v != nil {
		t.Errorf("discount_percent: want null present, got %#v (present=%v)", v, ok)
	}
}

func TestOItemNaoVazaCampoPrivado(t *testing.T) {
	s := ligar(t, novaFonte(novoDoc(t, "a")), 500)
	items, _, _, _ := s.Page(1, "")

	b, _ := json.Marshal(items)

	for _, segredo := range []string{"SEGREDO-snippet", "SEGREDO-golpe", "SEGREDO-reason", "confidence", "registration_url", "keyword_score"} {
		if strings.Contains(string(b), segredo) {
			t.Errorf("a resposta não pode conter %q: %s", segredo, b)
		}
	}
}
