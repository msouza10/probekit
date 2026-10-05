package handler

import (
	"api-service-golang/utils"
	"net/http"
	"strings"
	"time"
	"strconv"

	probing "github.com/prometheus-community/pro-bing"
)

func Ping() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/ping", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			utils.SetJSON(w, http.StatusMethodNotAllowed, utils.ErrorResponse{
				Error: "Method not allowed",
				Code:    "invalid_method",
			})
			return
		}

		target := r.URL.Query().Get("target")

		if target == "" || strings.TrimSpace(target) == "" {
			utils.SetJSON(w, http.StatusBadRequest, utils.ErrorResponse{
				Error: "Target is required",
				Code:  "target_required",
			})
			return
		}

		resolvedIPs, err := utils.ResolveAndCheckIPs(target)
		if err != nil {
			utils.SetJSON(w, http.StatusBadRequest, utils.ErrorResponse{
				Error: "Invalid target",
				Code: "invalid_target",
			})
			return
		}

		for _, ip := range resolvedIPs {
			if utils.IsBlockedIP(ip) {
				utils.SetJSON(w, http.StatusBadRequest, utils.ErrorResponse{
					Error: "Private ip address is not allowed",
					Code:  "private_ip_not_allowed",
				})
				return
			}
		}

		pinger, err := probing.NewPinger(resolvedIPs[0].String())
		if err != nil {
			utils.SetJSON(w, http.StatusBadRequest, utils.ErrorResponse{
				Error: "Invalid target",
				Code: "invalid_target",
			})
			return
		}

		pinger.Interval = 200 * time.Millisecond

		countStr := r.URL.Query().Get("count")
		timeoutStr := r.URL.Query().Get("timeout")

		var count int
		if countStr != "" {
			var err error
			count, err = strconv.Atoi(countStr)
			if err != nil {
				utils.SetJSON(w, http.StatusBadRequest, utils.ErrorResponse{
					Error: "Invalid count",
					Code: "invalid_count",
				})
				return
			}
		} else {
			count = 5
		}

		var timeout time.Duration
		if timeoutStr != "" {
			var err error
			timeout, err = time.ParseDuration(timeoutStr + "s")
			if err != nil {
				utils.SetJSON(w, http.StatusBadRequest, utils.ErrorResponse{
					Error: "Invalid timeout",
					Code: "invalid_timeout",
				})
				return
			}
		} else {
			timeout = time.Duration(time.Second)
		}

		if count > 10 || timeout > 5*time.Second {
			utils.SetJSON(w, http.StatusBadRequest, utils.ErrorResponse{
				Error: "Maximum count is 10 and maximum timeout is 5 seconds",
				Code: "invalid_count",
			})
			return
		}

		if count <= 0 || timeout <= 0 {
			utils.SetJSON(w, http.StatusBadRequest, utils.ErrorResponse{
				Error: "Minimum count is 1 and minimum timeout is 1 second",
				Code: "invalid_count",
			})
			return
		}

		pinger.Count = count
		pinger.Timeout = timeout

		err = pinger.Run()
		if err != nil {
			utils.SetJSON(w, http.StatusInternalServerError, utils.ErrorResponse{
				Error: "Internal server error",
				Code: "internal_error",
			})
			return
		}

		stats := pinger.Statistics()

		res := utils.PingResponse{
			Target:         target,
			IPAddr:         stats.IPAddr.String(),
			PacketsSent:    uint32(stats.PacketsSent),
			PacketsRecv:    uint32(stats.PacketsRecv),
			PacketLoss:     stats.PacketLoss,
			MinRtt:         stats.MinRtt.String(),
			AvgRtt:         stats.AvgRtt.String(),
			MaxRtt:         stats.MaxRtt.String(),
			StdDevRtt:      stats.StdDevRtt.String(),
		}

		utils.SetJSON(w, http.StatusOK, res)

	})

	return mux
}