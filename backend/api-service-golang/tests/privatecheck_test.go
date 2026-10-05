package tests

import (
	"net"
	"testing"

	"api-service-golang/utils"
)

func TestIsBlockedIP(t *testing.T) {
	cases := []struct {
		name string
		ip   string
		want bool
	}{
		{name: "RFC1918 10.x", ip: "10.0.0.1", want: true},
		{name: "RFC1918 172.16-31.x", ip: "172.16.0.1", want: true},
		{name: "RFC1918 192.168.x", ip: "192.168.1.1", want: true},
		{name: "IPv4 loopback", ip: "127.0.0.1", want: true},
		{name: "IPv6 loopback", ip: "::1", want: true},
		{name: "link-local / cloud metadata", ip: "169.254.169.254", want: true},
		{name: "public IPv4", ip: "8.8.8.8", want: false},
		{name: "public IPv4 (cloudflare)", ip: "1.1.1.1", want: false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ip := net.ParseIP(tc.ip)
			if ip == nil {
				t.Fatalf("net.ParseIP(%q) returned nil", tc.ip)
			}
			if got := utils.IsBlockedIP(ip); got != tc.want {
				t.Errorf("IsBlockedIP(%q) = %v, want %v", tc.ip, got, tc.want)
			}
		})
	}
}

func TestResolveAndCheckIPs(t *testing.T) {
	t.Run("literal IP is returned without a DNS lookup", func(t *testing.T) {
		ips, err := utils.ResolveAndCheckIPs("8.8.8.8")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(ips) != 1 || ips[0].String() != "8.8.8.8" {
			t.Errorf("ips = %v, want exactly [8.8.8.8]", ips)
		}
	})

	t.Run("resolvable hostname returns at least one IP", func(t *testing.T) {
		ips, err := utils.ResolveAndCheckIPs("example.com")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(ips) == 0 {
			t.Error("expected at least one resolved IP for example.com")
		}
	})

	t.Run("unresolvable hostname returns an error", func(t *testing.T) {
		_, err := utils.ResolveAndCheckIPs("this-host-does-not-exist-abcxyz123.invalid")
		if err == nil {
			t.Error("expected an error for an unresolvable hostname")
		}
	})
}
