package utils

import (
	"sync"
	"time"
)

type RateLimiter struct {
	requests map[string]int
	lastSeen map[string]time.Time
	mu       sync.Mutex
}

func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		requests: make(map[string]int),
		lastSeen: make(map[string]time.Time),
	}
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
