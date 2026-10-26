---
target: homepage
total_score: 23
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:/home/msouza/Projects/probekit/frontend/src/pages/Home.tsx"
target_fingerprint: "sha256:2604059b6de5283718fab1bdd25ef106030ffec7a088db6a18de0defa7b02af9"
target_path: /home/msouza/Projects/probekit/frontend/src/pages/Home.tsx
timestamp: 2026-10-26T00-26-58Z
slug: frontend-src-pages-home-tsx
closed: true
---
# Critique: Home (frontend/src/pages/Home.tsx)

Method: dual-agent. Browser unavailable (Chrome missing); visual findings inferred from source.

Score: 23/32 (heuristics 7 and 10 n/a) - Good.

Specificity: strong, authored for Probekit. Detector: 1 finding (overused-font, index.css:20), false positive (Inter Fallback @font-face; real Inter use intentional).

Priority issues:
- [P1] No primary action in the hero (clarify, layout)
- [P1] Lab profile (7 rows) competes with tool use (distill)
- [P2] Test origin not shown next to Ping (clarify)
- [P2] /ping metadata is noise (polish)
- [P3] Page ends on a technical link (delight)

Personas: Jordan (title does not say what the page does; jargon), Sam (code href read as loose text; hover contrast untested), Casey (112px header, h1 wraps, tools below second fold).
