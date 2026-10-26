---
target: Home page
total_score: 18
max_score: 24
na_heuristics: 5,7,9,10
p0_count: 0
p1_count: 2
target_identity: "file:/home/msouza/Projects/probekit/frontend/src/pages/Home.tsx"
target_fingerprint: "sha256:b8a76c024f875b280ca0fff2270d64277a7640acd48c9fea263738f07e47db86"
target_path: /home/msouza/Projects/probekit/frontend/src/pages/Home.tsx
timestamp: 2026-10-26T00-45-19Z
slug: frontend-src-pages-home-tsx
closed: true
---
Method: dual-agent (A: design-review sub-agent · B: detector sub-agent). Browser inspection unavailable (Chrome profile locked); visual claims are source-inferred.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Nothing on Home says whether the API is up. |
| 2 | Match System / Real World | 3 | /ping, ICMP, VMs, ADRs, specs unglossed for a non-technical audience. |
| 3 | User Control and Freedom | 3 | Stateless page, no traps. |
| 4 | Consistency and Standards | 3 | Ad hoc font-sans on two <p> (Home.tsx:129,159); focus offset drift. |
| 5 | Error Prevention | n/a | No inputs or destructive actions on Home. |
| 6 | Recognition Rather Than Recall | 3 | "Outras ideias..." line is a dead end. |
| 7 | Flexibility and Efficiency | n/a | Landing surface. |
| 8 | Aesthetic and Minimalist Design | 3 | Hero prose before first tool; sm:gap-28 large for 2 tools. |
| 9 | Error Recovery | n/a | No errors possible on Home. |
| 10 | Help and Documentation | n/a | Landing surface; Arquitetura/GitHub links serve. |
| **Total** | | **18/24** | **75%, Good** |

## Design Specificity Verdict
Authored, not category-interchangeable: first-person lab-notebook voice, per-tool "why", honest spec-sheet profile, ASCII owl mascot, serif/paper/amber palette, no card grid or invented numbers. Residual sameness: hairline name|description tool list; standard split hero. The signature dark "bench" never appears on Home. Deterministic scan: 0 findings in Home.tsx and frontend/src/components. No overlay (browser unavailable).

## Overall Impression
Coherent, honest, well executed. The problem is order and content: it talks about its creator before showing what the tools return. Biggest opportunity: a sample result on Home.

## What's Working
1. Voice and honesty (Home.tsx:72-80, tools.ts "why").
2. Disciplined system: single accent, flat hairlines, full-row links, 44px targets.
3. A11y and motion plumbing: aria-labelledby, semantic dl, reduced-motion, Reveal fallback, aria-hidden owl.

## Priority Issues
1. [P1] Home never shows a result. Fix: static bench-styled labelled example between hero and list. Command: $impeccable delight / layout.
2. [P1] Hero front-loads biography (Home.tsx:70-81). Fix: one short paragraph; move GitHub link out of hero. Command: $impeccable distill / clarify.
3. [P2] Weak ending; unglossed ADRs/specs/Worker; vague section title. Fix: closing nudge back to tools, plain-language glosses, rename section. Command: $impeccable clarify.
4. [P2] "Outras ideias..." has no link (Home.tsx:129-132). Fix: link to issues/Project or list planned names as plain text. Command: $impeccable clarify.
5. [P3] System drift: route <code> noise (Home.tsx:111-113), ad hoc font-sans, sm:gap-28. Command: $impeccable polish / typeset.

## Persona Red Flags
Jordan: cannot see what ping/DNS returns; unglossed jargon; hero about creator. Casey: tall hero stack before list, CTAs outside thumb zone, route code may wrap (unverified). Sam: whole-row overlay link accessible name excludes description; target=_blank unannounced (Home.tsx:20); check Reveal at 200% zoom.

## Minor Observations
inlineLink outline-offset-2 vs global 4px (index.css:240-243). H1 max-w-[20ch] + text-display may reach ~3 lines at lg beside the owl. scroll-padding-top ignores header (only #ferramentas covered).

## Questions to Consider
What does a visitor see after reading only the H1 and pressing one button? Is the biography or the tools the hero? What would 70 words spent on a real labelled example look like? Does hiding "Planejado" make the lab look smaller than it is?
