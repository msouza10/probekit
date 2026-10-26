---
target: Home
total_score: 24
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 1
target_identity: "file:/home/msouza/Projects/probekit/frontend/src/pages/Home.tsx"
target_fingerprint: "sha256:0a430aaf2760865ab324a2c94681d3aae0da5a349b25b1577229a37d8d802b55"
target_path: /home/msouza/Projects/probekit/frontend/src/pages/Home.tsx
timestamp: 2026-10-26T14-39-12Z
slug: frontend-src-pages-home-tsx
---
Method: dual-agent (A: design review, B: detector + browser)

Design Health Score: 24/32 (n/a: 7, 10) - Good (75%)

Priority issues
- [P1] Pingar button arrives disabled and looks broken (QuickPing.tsx:77). Fix: keep active, validate on submit with a hint. Command: harden, clarify.
- [P2] Logo marquee has no pause control for touch/keyboard (WCAG 2.2.2); reduced-motion branch exists. Fix: visible pause button. Command: harden, quieter.
- [P2] Footer repeats RepoPulse; stats links are 20px tall on mobile. Fix: raise touch height. Command: adapt.
- [P3] "Artigos / Em breve" reads as a heading and a promise. Fix: remove until one exists. Command: distill.
- [P3] Hero does not say where the test runs from. Fix: one helper line. Command: clarify.

Detector: CLI 0 findings. Browser: tight-leading on owl pre (false positive), marquee (real).
Contrast: all measured text >= 6.65.
