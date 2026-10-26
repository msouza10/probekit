---
target: Home page
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/home/msouza/Projects/probekit/frontend/src/pages/Home.tsx"
target_fingerprint: "sha256:9537f7c1aff2cb2de7532d379ac3263f317ca0f6260a7d27667473349bdca52d"
target_path: /home/msouza/Projects/probekit/frontend/src/pages/Home.tsx
timestamp: 2026-10-26T00-01-54Z
slug: frontend-src-pages-home-tsx
closed: true
---
Method: dual-agent (A: design review · B: detector + browser). Browser unavailable (Chrome not installed for MCP): review from source, no overlay, contrast or Lighthouse.

# Critique: Home (frontend/src/pages/Home.tsx)

Score 27/40 (67%). Heuristics: 1=3 2=3 3=3 4=3 5=3 6=2 7=2 8=3 9=2 10=3. Detector: 0 findings.

Specificity: authored (first-person H1, ASCII owl, definition-list profile). Aligned with DESIGN.md.

## Priority issues
- [P1] Tools buried behind an action-less hero and the Profile section (order: hero, perfil, ferramentas). Fix: move tools up or add direct links "Fazer um ping" / "Consultar DNS" with the ink button. Command: layout.
- [P2] Duplicated content and inconsistent labels ("Ping ICMP"/"Consulta DNS" in Footer.tsx:40,45; "catálogo" in Footer.tsx:50 and Header.tsx:106). Fix: use "Ping"/"DNS lookup", shorten footer paragraph. Command: clarify.
- [P2] Technical jargon in tool descriptions (tools.ts:18,29). Fix: lead with the user's question, jargon in tags/why. Command: clarify.
- [P3] ASCII owl shimmers forever and is absent below lg. Fix: stop/slow shimmer; small static mobile version. Commands: quieter, adapt.
- [P3] Header 112px on mobile; search and theme targets are 40px (Header.tsx:140,237). Fix: single-row header, 44px targets. Command: adapt.

## Persona red flags
Jordan: no obvious "test now", Profile full of jargon. Casey: 112px header, no owl, 40px targets. Sam: link underline at 50% opacity unverified.

## Questions
What should a 5-second visitor take away? Is the Profile for visitors or evaluators? Is the owl a signature or an ornament?
