package utils

import (
	"errors"
	"os"
)

func TLSFilesFromEnv() (string, string, error) {
	certFile := os.Getenv("TLS_CERT_FILE")
	keyFile := os.Getenv("TLS_KEY_FILE")

	if certFile == "" || keyFile == "" {
		return "", "", errors.New("not found cert and key files")
	}

	return certFile, keyFile, nil
}
