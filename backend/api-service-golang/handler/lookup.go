package handler

import (
	"api-service-golang/utils"
	"net"
	"net/http"
	"strings"
)

func Lookup() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/dns-lookup", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			utils.SetJSON(w, http.StatusMethodNotAllowed, utils.ErrorResponse{
				Error: "Method not allowed",
				Code:  "invalid_method",
			})
			return
		}

		domain := strings.TrimSpace(r.URL.Query().Get("domain"))

		if domain == "" {
			utils.SetJSON(w, http.StatusBadRequest, utils.ErrorResponse{
				Error: "Domain is required",
				Code:  "domain_required",
			})
			return
		}

		// A / AAAA
		addrs, _ := net.LookupHost(domain)

		// CNAME
		cname, _ := net.LookupCNAME(domain)
		cname = strings.TrimSuffix(cname, ".")

		// TXT
		txt, _ := net.LookupTXT(domain)

		// IP
		ipRecords, _ := net.LookupIP(domain)

		ipList := make([]string, 0, len(ipRecords))

		for _, ip := range ipRecords {
			ipList = append(ipList, ip.String())
		}

		// NS
		nsRecords, _ := net.LookupNS(domain)

		nsList := make([]string, 0, len(nsRecords))

		for _, ns := range nsRecords {
			nsList = append(
				nsList,
				strings.TrimSuffix(ns.Host, "."),
			)
		}

		// MX
		mxRecords, _ := net.LookupMX(domain)

		mxList := make([]utils.MXRecord, 0, len(mxRecords))

		for _, mx := range mxRecords {
			mxList = append(mxList, utils.MXRecord{
				Host:     strings.TrimSuffix(mx.Host, "."),
				Priority: mx.Pref,
			})
		}

		// SRV
		srvList := []utils.SRVRecord{}

		service := strings.TrimSpace(r.URL.Query().Get("service"))
		proto := strings.TrimSpace(r.URL.Query().Get("proto"))

		if service != "" && proto != "" {
			_, srvRecords, err := net.LookupSRV(
				service,
				proto,
				domain,
			)

			if err == nil {
				for _, srv := range srvRecords {
					srvList = append(srvList, utils.SRVRecord{
						Name:     strings.TrimSuffix(srv.Target, "."),
						Port:     srv.Port,
						Priority: srv.Priority,
						Weight:   srv.Weight,
					})
				}
			}
		}

		utils.SetJSON(w, http.StatusOK, utils.LookupResponse{
			Domain: domain,
			Addrs:  addrs,
			Cname:  cname,
			Mx:     mxList,
			Txt:    txt,
			Ns:     nsList,
			Srv:    srvList,
			Ip:     ipList,
		})
	})

	return mux
}