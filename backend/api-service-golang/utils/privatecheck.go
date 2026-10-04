package utils

import (
	"net"
)

func IsBlockedIP(ip net.IP) bool {
	return ip.IsPrivate() || ip.IsLoopback() || ip.IsLinkLocalUnicast()
}

func ResolveAndCheckIPs(target string) ([]net.IP, error) {
	if ip := net.ParseIP(target); ip != nil {
		return []net.IP{ip}, nil
	}
	return net.LookupIP(target)
}
