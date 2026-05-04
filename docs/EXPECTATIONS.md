# DealLens v2 — Expectations Charter

**Owner:** Marketlogic Investors LLC
**Repo:** Regantih/deallenz
**Last updated:** 2026-05-04

## 1. Application Expectations

Vision: turn a raw deck or data-room into a publishable, narratively-structured investment memo — a single-column scrollytelling journey through 14 fixed chapters across 5 acts.

Primary users:
- Analyst: upload deck/URL → auto-generated 14-chapter memo → edit inline → export PDF/share link.
- Partner: scroll the journey → see cited evidence per claim → vote Pass / Track / Invest.
- LP/Stakeholder: read-only public/share-link view of the full narrative.

Information architecture:
- Act I Why: Customer, Problem, Solution
- Act II What: Company, Market, Competition
- Act III Who: Team
- Act IV How: Traction, Moat, Macro, Micro, Geopolitics
- Act V So-what: Risks, Verdict

Must-haves:
- Sticky chapter-pill nav with scroll-spy highlight; collapses to act-rail on mobile.
- Editorial typography (warm canvas #f5f1e8, dark ink, serif/sans pair).
- Bordered card visualizations, monospace data blocks, accent-bar insight callouts.
- Inline citations on every quantitative claim (autoresearch evidence).
- Founder team-evaluation radar (7 axes).
- Macro/Micro/Geo data dashboards with live API hydration.
- Composite verdict score + Pass/Track/Invest recommendation.

Out of scope (v2): live cap-table modeling, LP portal, e-signature, deal-flow CRM (planned v3).

## 2. Technical Expectations

| Layer | Decision |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind + custom editorial design tokens |
| Motion | Framer Motion + IntersectionObserver |
| Routing | Hash router |
| State | Zustand + URL-hydrated deal state |
| Backend | Firebase Auth + Firestore + Functions |
| Agents | gstack → paperclip / autoresearch / feynman tools |
| LLM | Primary + fallback routing with budget cap |
| Vector | Firestore embeddings (v2) → Pinecone (v3 if cost-justified) |
| Hosting | GitHub Pages + Firebase |
| CI/CD | GitHub Actions: lint, typecheck, build, deploy on main |
| Testing | Vitest (unit), Playwright (E2E) |
| Quality bars | Lighthouse Perf>=90, A11y>=95, TS strict, 0 ESLint errors |

## 3. Financial Expectations

| Item | Estimate |
|---|---|
| GitHub Pages | $0 |
| Firebase (pilot) | ~$25/mo |
| LLM API budget | $150/mo cap, alert at 80% |
| Macro/Geo APIs | $0 (FRED/World Bank/OFAC/BIS/USTR open) |
| Pilot run-rate | ~$200/mo |
| Per-deal cost target | <= $1.50 |

Monetization (planned, not in v2): $99/analyst/mo, $499/team/mo, enterprise custom.

## 4. Operational Expectations

- Cadence: PR2 scaffold → PR3 autoresearch → PR4 team+macro/micro → PR5 verdict+export.
- Branching: trunk-based, short-lived branches, squash-merge.
- Reviews: every PR self-reviewed against acceptance criteria + CI green.
- Issue tracking: GitHub Projects (Backlog / In progress / Review / Done).
- Docs: every chapter ships with an ADR in docs/adr/.
- Release: weekly tag vX.Y.Z, auto-deploy main to Pages.
- Observability: Crashlytics + LLM cost log per deal.
- Security: secrets only in GH Actions / Firebase config; never client.

## 5. Compliance / Legal

- MIT license.
- Third-party data via authorized APIs only.
- Memos carry disclaimer: "Not investment advice. For Marketlogic Investors internal review."
- Quotes from sources <15 words; always paraphrase + link.
- Geopolitics chapter checks OFAC/EU sanctions before showing investability rating.

## 6. UX / Design

- Sticky pill nav grouped by act; numbered small-caps chapter labels (e.g. "03. THE SOLUTION").
- Bordered cards, monospace data blocks, accent-bar callouts.
- Mobile: nav collapses to dot-rail; charts re-flow vertically.
- Motion 200–400ms ease-out; respects prefers-reduced-motion.
- A11y: keyboard nav, ARIA landmarks per chapter, AA+ contrast.

## 7. Per-chapter acceptance criteria

1. Editorial card layout.
2. >=1 autoresearch-cited claim.
3. >=1 visualization (SVG/Canvas).
4. Section-level a11y audit pass.
5. ADR in docs/adr/ describing data sources and edge cases.

## 8. Macro / Micro / Geo data sources

- Macro: FRED (rates, CPI), World Bank (GDP), BIS (capital flows).
- Micro: computed from data-room inputs using locked formulas (see README).
- Geopolitics: OFAC SDN, EU consolidated sanctions, USTR tariffs, data-residency map.
