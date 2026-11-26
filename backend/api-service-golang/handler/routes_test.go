package handler_test

// Testes da montagem das rotas (handler.NewMux): limite por IP, IP real atrás
// do proxy e CORS valendo também para a rota nova.
//
// Hoje esta montagem está dentro do main() e não dá para testar de fora (o
// ratelimiter_test.go já avisa isso). Para estes testes valerem, a montagem
// precisa sair do main para uma função exportada:
//
//	handler.NewMux(originRegion string, trusted []*net.IPNet, snap *voucher.Snapshot) http.Handler
//
// que registra /api/ping, /api/dns-lookup e, SÓ se `snap` não for nil,
// /api/vouchers. Cada rota com limite por IP tem o PRÓPRIO contador: gastar a
// cota de um não gasta a do outro. O main passa a chamar NewMux e a aplicar o
// CORS por fora, como hoje (utils.WithCORS).
//
// Por que isso importa: se a rota nova dividisse o contador do /api/ping, quem
// só abriu a página de vouchers (que chama a API sozinha) gastaria a cota de
// 50 requisições do visitante antes de ele usar a ferramenta de ping.

import (
	"net"
	"net/http"
	"net/http/httptest"
	"testing"

	"api-service-golang/handler"
	"api-service-golang/utils"
)

const limitePorJanela = 50 // utils.RateLimiter: 50 requisições por IP

func proxiesConfiaveis(t *testing.T) []*net.IPNet {
	t.Helper()
	_, rede, err := net.ParseCIDR("173.245.48.0/20")
	if err != nil {
		t.Fatal(err)
	}
	return []*net.IPNet{rede}
}

func chamar(h http.Handler, alvo, remoto string, cabecalhos map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, alvo, nil)
	req.RemoteAddr = remoto
	for k, v := range cabecalhos {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

// gastar faz n chamadas e confere que nenhuma foi bloqueada pelo limite.
func gastar(t *testing.T, h http.Handler, alvo, remoto string, cab map[string]string, n int) {
	t.Helper()
	for i := 1; i <= n; i++ {
		if rec := chamar(h, alvo, remoto, cab); rec.Code == http.StatusTooManyRequests {
			t.Fatalf("chamada %d a %s: bloqueada antes de chegar a %d", i, alvo, limitePorJanela)
		}
	}
}

// Ping de um IP de loopback: a API recusa (400) antes de qualquer rede, mas a
// chamada conta para o limite. É o jeito de gastar a cota do /api/ping sem rede.
const pingBarrado = "/api/ping?target=127.0.0.1"

func novoMux(t *testing.T) http.Handler {
	t.Helper()
	return handler.NewMux("", proxiesConfiaveis(t), instantaneo(t, umDoc(t)))
}

// --- cada rota com o seu contador -----------------------------------------

func TestVouchersTemLimitePorIPEoErroEPadronizado(t *testing.T) {
	mux := novoMux(t)
	gastar(t, mux, "/api/vouchers", "198.51.100.7:4000", nil, limitePorJanela)

	rec := chamar(mux, "/api/vouchers", "198.51.100.7:4000", nil)

	esperaErro(t, rec, http.StatusTooManyRequests, "rate_limited")
}

func TestGastarACotaDeVouchersNaoGastaADoPing(t *testing.T) {
	mux := novoMux(t)
	gastar(t, mux, "/api/vouchers", "198.51.100.7:4000", nil, limitePorJanela)
	if rec := chamar(mux, "/api/vouchers", "198.51.100.7:4000", nil); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("pré-condição: o IP deveria estar bloqueado em /api/vouchers, got %d", rec.Code)
	}

	rec := chamar(mux, pingBarrado, "198.51.100.7:4000", nil)

	if rec.Code == http.StatusTooManyRequests {
		t.Fatal("o /api/ping do mesmo IP foi bloqueado pela cota de /api/vouchers: os contadores estão compartilhados")
	}
	esperaErro(t, rec, http.StatusBadRequest, "private_ip_not_allowed")
}

func TestGastarACotaDoPingNaoGastaADeVouchers(t *testing.T) {
	mux := novoMux(t)
	gastar(t, mux, pingBarrado, "198.51.100.8:4000", nil, limitePorJanela)
	if rec := chamar(mux, pingBarrado, "198.51.100.8:4000", nil); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("pré-condição: o IP deveria estar bloqueado em /api/ping, got %d", rec.Code)
	}

	rec := chamar(mux, "/api/vouchers", "198.51.100.8:4000", nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("/api/vouchers: want 200 (cota própria), got %d (%s)", rec.Code, rec.Body.String())
	}
}

func TestIPsDiferentesTemCotasDiferentes(t *testing.T) {
	mux := novoMux(t)
	gastar(t, mux, "/api/vouchers", "198.51.100.7:4000", nil, limitePorJanela)

	rec := chamar(mux, "/api/vouchers", "198.51.100.9:4000", nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("outro IP: want 200, got %d", rec.Code)
	}
}

// --- o IP que conta é o do cliente real ------------------------------------

func TestAtrasDoProxyConfiavelConsideraOIPDoCliente(t *testing.T) {
	mux := novoMux(t)
	proxy := "173.245.48.10:4000"
	cliente1 := map[string]string{"Cf-Connecting-IP": "203.0.113.1"}
	cliente2 := map[string]string{"Cf-Connecting-IP": "203.0.113.2"}
	gastar(t, mux, "/api/vouchers", proxy, cliente1, limitePorJanela)

	bloqueado := chamar(mux, "/api/vouchers", proxy, cliente1)
	livre := chamar(mux, "/api/vouchers", proxy, cliente2)

	if bloqueado.Code != http.StatusTooManyRequests {
		t.Errorf("cliente 1 (esgotou a cota): want 429, got %d", bloqueado.Code)
	}
	if livre.Code != http.StatusOK {
		t.Errorf("cliente 2 pelo mesmo proxy: want 200 (o IP do proxy não é o que conta), got %d", livre.Code)
	}
}

func TestCabecalhoDeIPDeQuemNaoEProxyConfiavelEIgnorado(t *testing.T) {
	// Sem isto, qualquer um fugiria do limite trocando o Cf-Connecting-IP a cada chamada.
	mux := novoMux(t)
	remoto := "198.51.100.77:4000"
	for i := 1; i <= limitePorJanela; i++ {
		cab := map[string]string{"Cf-Connecting-IP": net.IPv4(203, 0, 113, byte(i)).String()}
		if rec := chamar(mux, "/api/vouchers", remoto, cab); rec.Code == http.StatusTooManyRequests {
			t.Fatalf("chamada %d bloqueada cedo demais", i)
		}
	}

	rec := chamar(mux, "/api/vouchers", remoto, map[string]string{"Cf-Connecting-IP": "203.0.113.200"})

	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("a chamada %d, com outro Cf-Connecting-IP forjado: want 429, got %d", limitePorJanela+1, rec.Code)
	}
}

// --- a rota só existe quando há banco ---------------------------------------

func TestSemInstantaneoARotaDeVouchersNaoExiste(t *testing.T) {
	mux := handler.NewMux("", proxiesConfiaveis(t), nil)

	if rec := chamar(mux, "/api/vouchers", "198.51.100.7:4000", nil); rec.Code != http.StatusNotFound {
		t.Errorf("/api/vouchers sem instantâneo: want 404, got %d", rec.Code)
	}
	esperaErro(t, chamar(mux, pingBarrado, "198.51.100.7:4000", nil), http.StatusBadRequest, "private_ip_not_allowed")
}

// --- CORS vale para a rota nova --------------------------------------------

func TestCORSVaiParaAsOrigensPermitidasTambemEmVouchers(t *testing.T) {
	h := utils.WithCORS([]string{"https://probekit.cc"}, novoMux(t))

	permitida := chamar(h, "/api/vouchers", "198.51.100.7:4000", map[string]string{"Origin": "https://probekit.cc"})
	barrada := chamar(h, "/api/vouchers", "198.51.100.7:4000", map[string]string{"Origin": "https://evil.example"})

	if got := permitida.Header().Get("Access-Control-Allow-Origin"); got != "https://probekit.cc" {
		t.Errorf("origem permitida: want Allow-Origin https://probekit.cc, got %q", got)
	}
	if got := barrada.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("origem não permitida: want no Allow-Origin, got %q", got)
	}
}
