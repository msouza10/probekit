package tests

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"net/http"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

// Contrato (ADR-0009): o GET / devolve também a versão compilada,
// {"message":"OK","version":"1.3.0"}.
//
//  1. Em build local (sem -ldflags) a versão é "dev".
//  2. A release embute a versão com -ldflags "-X main.version=<versão>",
//     e o GET / devolve exatamente esse valor.
//  3. O health check continua valendo: status 200 e message "OK" (o
//     validate_api do updater procura "OK" no corpo).
//
// O teste usa o binário de verdade, como o tls_test.go, e reaproveita os
// ajudantes dele (writeSelfSigned, freeAddr, startServer).

// buildServerWithVersion compila o package main como a release faz. Com
// version vazia compila sem -ldflags, como um build local.
func buildServerWithVersion(t *testing.T, version string) string {
	t.Helper()
	bin := filepath.Join(t.TempDir(), "api-server")

	args := []string{"build"}
	if version != "" {
		args = append(args, "-ldflags", "-X main.version="+version)
	}
	args = append(args, "-o", bin, ".")

	cmd := exec.Command("go", args...)
	cmd.Dir = ".." // tests/ -> raiz do módulo
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("go build failed: %v\n%s", err, out)
	}
	return bin
}

// rootBody sobe o binário e devolve o JSON de GET /.
func rootBody(t *testing.T, bin string) map[string]any {
	t.Helper()
	certPath, keyPath, cert := writeSelfSigned(t)
	addr := freeAddr(t)

	startServer(t, bin, addr,
		"ADDR="+addr,
		"TLS_CERT_FILE="+certPath,
		"TLS_KEY_FILE="+keyPath,
	)

	pool := x509.NewCertPool()
	pool.AddCert(cert)
	client := &http.Client{
		Timeout:   5 * time.Second,
		Transport: &http.Transport{TLSClientConfig: &tls.Config{RootCAs: pool}},
	}

	res, err := client.Get("https://" + addr + "/")
	if err != nil {
		t.Fatalf("GET /: %v", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want %d", res.StatusCode, http.StatusOK)
	}

	var body map[string]any
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatalf("decoding the body of GET /: %v", err)
	}
	return body
}

func TestRootReportsVersion(t *testing.T) {
	t.Run("a local build reports dev", func(t *testing.T) {
		body := rootBody(t, buildServerWithVersion(t, ""))

		if body["message"] != "OK" {
			t.Errorf("message = %v, want %q (o health check precisa continuar valendo)", body["message"], "OK")
		}
		if body["version"] != "dev" {
			t.Errorf("version = %v, want %q", body["version"], "dev")
		}
	})

	t.Run("a release build reports the embedded version", func(t *testing.T) {
		body := rootBody(t, buildServerWithVersion(t, "9.9.9"))

		if body["message"] != "OK" {
			t.Errorf("message = %v, want %q", body["message"], "OK")
		}
		if body["version"] != "9.9.9" {
			t.Errorf("version = %v, want %q", body["version"], "9.9.9")
		}
	})
}
