package main

import (
	"fmt"
	probing "github.com/prometheus-community/pro-bing"
)

func main() {
	
	pinger, err := probing.NewPinger("8.8.8.8")
	if err != nil {
		panic(err)
	}

	pinger.Count = 3
	pinger.Timeout = 1

	err = pinger.Run()
	if err != nil {
		panic(err)
	}

	stats := pinger.Statistics()
	fmt.Printf("IPAddr: %s\n", stats.IPAddr)
	fmt.Printf("Addr: %s\n", stats.Addr)
	fmt.Printf("PacketsSent: %d\n", stats.PacketsSent)
	fmt.Printf("PacketsRecv: %d\n", stats.PacketsRecv)
	fmt.Printf("PacketsRecvDuplicates: %d\n", stats.PacketsRecvDuplicates)
	fmt.Printf("PacketLoss: %f\n", stats.PacketLoss)
	fmt.Printf("MinRtt: %s\n", stats.MinRtt)
	fmt.Printf("AvgRtt: %s\n", stats.AvgRtt)
	fmt.Printf("MaxRtt: %s\n", stats.MaxRtt)
	fmt.Printf("StdDevRtt: %s\n", stats.StdDevRtt)
	fmt.Printf("Rtts: %v\n", stats.Rtts)
	fmt.Printf("TTLs: %v\n", stats.TTLs)
}
