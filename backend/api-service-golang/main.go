package main

import (
	"api-service-golang/handler"
	"api-service-golang/utils"
	"log"
	"net/http"
	"net"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			utils.SetJSON(w, http.StatusMethodNotAllowed, utils.ErrorResponse{
				Error: "Method not allowed",
				Code:    "invalid_method",
			})
			return
		}

		res := utils.Response{
			Message: "OK",
		}

		utils.SetJSON(w, http.StatusOK, res)
	})

	rl := utils.NewRateLimiter()

	WithRateLimit := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				ip = r.RemoteAddr
			}
			if !rl.Allow(ip) {
				utils.SetJSON(w, http.StatusTooManyRequests, utils.ErrorResponse{
					Error: "Too many requests, try again later",
					Code:  "rate_limited",
				})
				return
			}
			next.ServeHTTP(w, r)
		})
	}

	log.Printf("Server running on %s", "http://localhost:8080")
	log.Println("root endpoint - /")

	http.Handle("/api/ping", WithRateLimit(handler.Ping()))
	log.Println("ping endpoint - /api/ping?target=<target>&count=<count>&timeout=<timeout>")

	http.Handle("/api/dns-lookup", WithRateLimit(handler.Lookup()))
	log.Println("lookup endpoint - /api/lookup?domain=<domain>")

	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}