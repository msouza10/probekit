package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

type RateLimiter struct {
	requests map[string]int
	lastSeen map[string]time.Time
	mu       sync.Mutex
}

type cloudflareCIDRs struct {
	Success bool `json:"success"`
	Result  struct {
		IPv4CIDRs []string `json:"ipv4_cidrs"`
		IPv6CIDRs []string `json:"ipv6_cidrs"`
	} `json:"result"`
}

func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		requests: make(map[string]int),
		lastSeen: make(map[string]time.Time),
	}
}

func TrustedProxyCIDRs() ([]string, error) {
	// url to get cloudflare ips
	// https://api.cloudflare.com/client/v4/ips
	// I need build request to get cloudflare ips
	// and return the list of cidrs

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	url := "https://api.cloudflare.com/client/v4/ips"

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request to Cloudflare CIDRs: %w", err)
	}

	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request to Cloudflare CIDRs: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Cloudflare CIDRs returned non-200 status: %d", resp.StatusCode)
	}
	data := cloudflareCIDRs{}

	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("decoding Cloudflare CIDRs: %w", err)
	}

	if !data.Success {
		return nil, fmt.Errorf("Cloudflare CIDRs request failed")
	}

	results := append(data.Result.IPv4CIDRs, data.Result.IPv6CIDRs...)
	if len(results) == 0 {
		return nil, fmt.Errorf("no CIDRs found")
	}

	return results, nil
}

func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	if lastSeen, ok := rl.lastSeen[ip]; ok {
		if now.Sub(lastSeen) > 5*time.Minute {
			rl.requests[ip] = 0
			rl.lastSeen[ip] = now
		}
	} else {
		rl.lastSeen[ip] = now
	}

	if rl.requests[ip] >= 50 {
		return false
	}

	rl.requests[ip]++
	return true
}
