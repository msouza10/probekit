package utils

import (
	"net"
	"net/http"
)

func peerIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	ip := net.ParseIP(host)
	if ip != nil {
		host = ip.String()
	}
	return host
}

func inRanges(ip string, ranges []*net.IPNet) bool {
	ipParse := net.ParseIP(ip)
	if ipParse == nil {
		return false
	}

	for _, r := range ranges {
		if r.Contains(ipParse) {
			return true
		}
	}

	return false
}

func RealIP(r *http.Request, ranges []*net.IPNet) string {
	peer := peerIP(r)
	if inRanges(peer, ranges) {
		cfip := r.Header.Get("Cf-Connecting-IP")
		if cfip != "" {
			cfipIP := net.ParseIP(cfip)
			if cfipIP != nil {
				return cfipIP.String()
			}
		}
	}
	return peer
}
