package tests

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"io"
	"math/big"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"api-service-golang/utils"
)

// Contrato que a produção precisa cumprir pra esses testes passarem:
//
//  1. utils.TLSFilesFromEnv() (certFile, keyFile string, err error)
//     lê TLS_CERT_FILE e TLS_KEY_FILE; erro se qualquer uma estiver vazia.
//  2. O binário (package main) sobe com ListenAndServeTLS usando esses
//     arquivos, escuta no endereço de ADDR (default ":8080" se vazio) e
//     termina com status != 0 se TLS_CERT_FILE/TLS_KEY_FILE faltarem.

// --- parte 1: leitura das variáveis de ambiente --------------------------

func TestTLSFilesFromEnv(t *testing.T) {
	t.Run("returns both paths when both are set", func(t *testing.T) {
		t.Setenv("TLS_CERT_FILE", "/etc/probekit/cert.pem")
		t.Setenv("TLS_KEY_FILE", "/etc/probekit/key.pem")

		cert, key, err := utils.TLSFilesFromEnv()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if cert != "/etc/probekit/cert.pem" {
			t.Errorf("cert = %q, want %q", cert, "/etc/probekit/cert.pem")
		}
		if key != "/etc/probekit/key.pem" {
			t.Errorf("key = %q, want %q", key, "/etc/probekit/key.pem")
		}
	})

	cases := []struct {
		name string
		cert string
		key  string
	}{
		{"cert missing", "", "/etc/probekit/key.pem"},
		{"key missing", "/etc/probekit/cert.pem", ""},
		{"both missing", "", ""},
	}
	for _, tc := range cases {
		t.Run("errors when "+tc.name, func(t *testing.T) {
			t.Setenv("TLS_CERT_FILE", tc.cert)
			t.Setenv("TLS_KEY_FILE", tc.key)

			if _, _, err := utils.TLSFilesFromEnv(); err == nil {
				t.Error("want error, got nil")
			}
		})
	}
}

// --- parte 2: o binário de verdade falando TLS ----------------------------

// buildServer compila o package main e devolve o caminho do binário.
func buildServer(t *testing.T) string {
	t.Helper()
	bin := filepath.Join(t.TempDir(), "api-server")
	cmd := exec.Command("go", "build", "-o", bin, ".")
	cmd.Dir = ".." // tests/ -> raiz do módulo
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("go build failed: %v\n%s", err, out)
	}
	return bin
}

// writeSelfSigned gera um par cert/chave de teste válido pra 127.0.0.1 e
// devolve os caminhos dos arquivos e o certificado pra montar o CertPool.
func writeSelfSigned(t *testing.T) (certPath, keyPath string, cert *x509.Certificate) {
	t.Helper()

	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	tmpl := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "localhost"},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		IPAddresses:  []net.IP{net.ParseIP("127.0.0.1")},
		DNSNames:     []string{"localhost"},
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	cert, err = x509.ParseCertificate(der)
	if err != nil {
		t.Fatal(err)
	}
	keyDER, err := x509.MarshalECPrivateKey(key)
	if err != nil {
		t.Fatal(err)
	}

	dir := t.TempDir()
	certPath = filepath.Join(dir, "cert.pem")
	keyPath = filepath.Join(dir, "key.pem")
	if err := os.WriteFile(certPath, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(keyPath, pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER}), 0o600); err != nil {
		t.Fatal(err)
	}
	return certPath, keyPath, cert
}

// freeAddr pede uma porta livre ao SO (pode haver corrida mínima, aceitável
// em teste local).
func freeAddr(t *testing.T) string {
	t.Helper()
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	return l.Addr().String()
}

// startServer sobe o binário e espera a porta aceitar conexões TCP.
func startServer(t *testing.T, bin, addr string, env ...string) {
	t.Helper()
	cmd := exec.Command(bin)
	cmd.Env = append(os.Environ(), env...)
	var logs bytes.Buffer
	cmd.Stdout, cmd.Stderr = &logs, &logs
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = cmd.Process.Kill()
		_, _ = cmd.Process.Wait()
	})

	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		c, err := net.DialTimeout("tcp", addr, 200*time.Millisecond)
		if err == nil {
			c.Close()
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Fatalf("server did not start on %s\nlogs:\n%s", addr, logs.String())
}

func TestServerServesHTTPS(t *testing.T) {
	bin := buildServer(t)
	certPath, keyPath, cert := writeSelfSigned(t)
	addr := freeAddr(t)

	startServer(t, bin, addr,
		"ADDR="+addr,
		"TLS_CERT_FILE="+certPath,
		"TLS_KEY_FILE="+keyPath,
	)

	pool := x509.NewCertPool()
	pool.AddCert(cert)

	t.Run("https with trusted cert returns 200", func(t *testing.T) {
		client := &http.Client{
			Timeout:   5 * time.Second,
			Transport: &http.Transport{TLSClientConfig: &tls.Config{RootCAs: pool}},
		}
		res, err := client.Get("https://" + addr + "/")
		if err != nil {
			t.Fatalf("GET https: %v", err)
		}
		defer res.Body.Close()

		if res.StatusCode != http.StatusOK {
			t.Errorf("status = %d, want %d", res.StatusCode, http.StatusOK)
		}
		if res.TLS == nil {
			t.Error("response has no TLS state: connection was not encrypted")
		}
		body, _ := io.ReadAll(res.Body)
		if !strings.Contains(string(body), "OK") {
			t.Errorf("body = %q, want it to contain %q", body, "OK")
		}
	})

	t.Run("https without trusting the cert fails the handshake", func(t *testing.T) {
		client := &http.Client{Timeout: 5 * time.Second} // sem RootCAs
		if res, err := client.Get("https://" + addr + "/"); err == nil {
			res.Body.Close()
			t.Error("want certificate verification error, got nil")
		}
	})

	t.Run("plain http is not served as 200", func(t *testing.T) {
		client := &http.Client{Timeout: 5 * time.Second}
		res, err := client.Get("http://" + addr + "/")
		if err != nil {
			return // conexão recusada/fechada também é aceitável
		}
		defer res.Body.Close()
		if res.StatusCode == http.StatusOK {
			t.Error("plain HTTP got 200: server is not enforcing TLS")
		}
	})
}

func TestServerFailsFastWithoutTLSFiles(t *testing.T) {
	bin := buildServer(t)
	addr := freeAddr(t)

	cmd := exec.Command(bin)
	// Remove qualquer TLS_* herdado do ambiente do desenvolvedor.
	for _, kv := range os.Environ() {
		if !strings.HasPrefix(kv, "TLS_") {
			cmd.Env = append(cmd.Env, kv)
		}
	}
	cmd.Env = append(cmd.Env, "ADDR="+addr)

	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()

	select {
	case err := <-done:
		if err == nil {
			t.Error("exit status 0, want non-zero when TLS files are missing")
		}
	case <-time.After(10 * time.Second):
		_ = cmd.Process.Kill()
		t.Error("server kept running without TLS files: want it to exit early")
	}
}
