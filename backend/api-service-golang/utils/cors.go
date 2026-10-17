package utils

import (
	"net/http"
	"os"
	"slices"
	"strings"
)

func OriginsFromEnv() []string {

	raw := os.Getenv("CORS_ALLOWED_ORIGINS")
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	cleaned := make([]string, 0, len(parts))
	for _, p := range parts {
		clean := strings.TrimSpace(p)
		if clean != "" {
			cleaned = append(cleaned, clean)
		}
	}
	return cleaned
}

func WithCORS(allowedOrigins []string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if origin == "" {
			next.ServeHTTP(w, r)
			return
		}
		w.Header().Add("Vary", "Origin")

		allowed := slices.Contains(allowedOrigins, origin)
		if allowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		isPreflight := r.Method == http.MethodOptions &&
			r.Header.Get("Access-Control-Request-Method") != ""
		if isPreflight {
			if !allowed {
				w.WriteHeader(http.StatusForbidden)
				return
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
