package main

import (
	"api-service-golang/handler"
	"api-service-golang/utils"
	"log"
	"net/http"
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

	log.Printf("Server running on %s", "http://localhost:8080")
	log.Println("root endpoint - /")

	http.Handle("/api/ping", handler.Ping())
	log.Println("ping endpoint - /api/ping?target=<target>&count=<count>&timeout=<timeout>")

	http.Handle("/api/dns-lookup", handler.Lookup())
	log.Println("lookup endpoint - /api/dns-lookup?domain=<domain>&service=<service>&proto=<proto>")

	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}