# DealLens v2 — Decision Log

Live log of significant decisions. Each decision is final until explicitly superseded.

| # | Date | Decision | Rationale | Status |
|---|---|---|---|---|
| D-001 | 2026-05-04 | Repo name `deallenz` | `deallens` taken; `deallenz` available, on-brand. | Locked |
| D-002 | 2026-05-04 | Public visibility | OSS strategy, builds Marketlogic credibility. | Locked |
| D-003 | 2026-05-04 | MIT license | Maximum reuse of plug-in modules. | Locked |
| D-004 | 2026-05-04 | Node `.gitignore` | TS/React monorepo. | Locked |
| D-005 | 2026-05-04 | Editorial scrollytelling UI | Credibility for VC audience; long-form journalism cues. | Locked |
| D-006 | 2026-05-04 | 14 fixed chapters across 5 acts | Forces narrative discipline; covers Customer/Problem/Solution/Comp/Macro/Micro/Geo gaps surfaced in review. | Locked |
| D-007 | 2026-05-04 | gstack + paperclip + autoresearch + feynman + evaluation | Reuse depth-first open work. | Locked |
| D-008 | TBD | Vector DB: Firestore embeddings (v2) vs Pinecone (v3) | Cost vs latency. | Pending |
| D-009 | TBD | Live `/deallens/` redesign vs parallel `/deallenz/` first | Risk vs speed. Currently shipping `/deallenz/` in parallel. | Pending |
| D-010 | 2026-05-10 | MVI router: Opus reserved for `write` tasks only | Opus is 5× the cost of Sonnet; long-form memo writing is the only task that justifies it. All other tasks route to Sonnet (mid) or Haiku (cheap). | Locked |
| D-011 | TBD | Auth: Google-only vs email+Google | Friction vs reach. | Pending |
| D-012 | TBD | Pricing tier launch with v3 or post-pilot | Revenue timing. | Pending |
| D-013 | TBD | Custom domain `deallenz.com` | Brand vs cost. | Pending |
| D-014 | 2026-05-04 | Bootstrap monorepo locally with Claude Code, then push as PR | Web UI is too slow for 40+ files; locally generated tree is cleaner. | Locked |
| D-015 | 2026-05-04 | Expand IA from 7 → 14 chapters | User flagged Customer/Problem/Comp/Macro/Micro/Geo gaps; non-negotiable for institutional memos. | Locked |
| D-016 | 2026-05-04 | Group nav by 5 acts (Why/What/Who/How/So-what) | 14 pills overflow on mobile; acts give cognitive grouping. | Locked |
| D-017 | 2026-05-04 | autoresearch citation required per chapter | Non-cited chapter fails CI; protects analyst output quality. | Locked |
| D-018 | 2026-05-04 | Macro/Geo data sources fixed | FRED, World Bank, OFAC, BIS, USTR — all open APIs. | Locked |
| D-019 | 2026-05-04 | Unit-economics formulas locked | CAC, LTV, payback, burn multiple, NDR canonical definitions. | Locked |
| D-020 | 2026-05-04 | No third-party brand names in product copy | Inspirations stay internal; product reads neutral. | Locked |
| D-021 | 2026-05-10 | StorageClient interface; real Supabase adapter deferred to PR#2 | Interface-first approach lets the swarm run in mock mode without a database. | Locked |
| D-022 | 2026-05-10 | MockModelRouter returns deterministic `[MOCK]`-prefixed stubs | Makes mock output unmistakable in UI and logs; guards prevent prod use. | Locked |
| D-023 | 2026-05-10 | Path B priority: Google Drive folder + Dropbox folder first; Notion, email-forward later | Drive and Dropbox cover 80%+ of VC data-room formats. Notion and email-forward are deferred to PR#5. | Locked |
| D-024 | 2026-05-10 | Critic rubric: 14 items, 6 blocking; `approved=true` only when all blocking items pass | Mirrors IC committee sign-off logic; non-blocking failures are advisory. | Locked |
| D-025 | 2026-05-10 | Path B UI shows honest error if backend not running | Static HTML can't run the ingest API; we explain the gap rather than faking success. | Locked |
| D-026 | 2026-05-10 | `tsconfig.json` added with strict mode + NodeNext module resolution | TypeScript strict mode catches interface mismatches early; NodeNext required for `node:` imports. | Locked |

## How to add a decision

1. Append a row with next D-### number.
2. State the decision in 1 line.
3. State the rationale in 1–2 lines.
4. Status starts Pending and moves to Locked once acted on; if reversed, mark Superseded and reference replacement D-###.
