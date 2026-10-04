package utils

import (
	"encoding/json"
	"net/http"
)

type Response struct {
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
}

type ErrorResponse struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

type LookupResponse struct {
	Domain string      `json:"domain"`
	Addrs  []string    `json:"addrs"`
	Cname  string      `json:"cname"`
	Mx     []MXRecord  `json:"mx"`
	Txt    []string    `json:"txt"`
	Ns     []string    `json:"ns"`
	Srv    []SRVRecord `json:"srv"`
	Ip     []string    `json:"ip"`
}

type SRVRecord struct {
	Port     uint16 `json:"port"`
	Priority uint16 `json:"priority"`
	Weight   uint16 `json:"weight"`
	Name     string `json:"name"`
}

type MXRecord struct {
	Host     string `json:"host"`
	Priority uint16 `json:"priority"`
}

type PingResponse struct {
	Target      string  `json:"target"`
	IPAddr      string  `json:"ip_addr"`
	PacketsSent uint32  `json:"packets_sent"`
	PacketsRecv uint32  `json:"packets_recv"`
	PacketLoss  float64 `json:"packet_loss"`
	MinRtt      string  `json:"min_rtt"`
	AvgRtt      string  `json:"avg_rtt"`
	MaxRtt      string  `json:"max_rtt"`
}

func SetJSON(w http.ResponseWriter, status int, res interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(res); err != nil {
		http.Error(
			w,
			"error encoding response",
			http.StatusInternalServerError,
		)
	}
}