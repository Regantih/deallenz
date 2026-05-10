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
| D-010 | TBD | LLM primary model | Quality vs cost benchmark to be run. | Pending |
| D-011 | 2026-05-10 | Auth: email magic link + GitHub OAuth | Magic link = zero password friction; GitHub OAuth = natural fit for technical founders sharing deal rooms. No Google-only lock-in. | Locked |
| D-012 | TBD | Pricing tier launch with v3 or post-pilot | Revenue timing. | Pending |
| D-013 | TBD | Custom domain `deallenz.com` | Brand vs cost. | Pending |
| D-014 | 2026-05-04 | Bootstrap monorepo locally with Claude Code, then push as PR | Web UI is too slow for 40+ files; locally generated tree is cleaner. | Locked |
| D-015 | 2026-05-04 | Expand IA from 7 → 14 chapters | User flagged Customer/Problem/Comp/Macro/Micro/Geo gaps; non-negotiable for institutional memos. | Locked |
| D-016 | 2026-05-04 | Group nav by 5 acts (Why/What/Who/How/So-what) | 14 pills overflow on mobile; acts give cognitive grouping. | Locked |
| D-017 | 2026-05-04 | autoresearch citation required per chapter | Non-cited chapter fails CI; protects analyst output quality. | Locked |
| D-018 | 2026-05-04 | Macro/Geo data sources fixed | FRED, World Bank, OFAC, BIS, USTR — all open APIs. | Locked |
| D-019 | 2026-05-04 | Unit-economics formulas locked | CAC, LTV, payback, burn multiple, NDR canonical definitions. | Locked |
| D-020 | 2026-05-04 | No third-party brand names in product copy | Inspirations stay internal; product reads neutral. | Locked |
| D-021 | 2026-05-10 | StorageClient interface; real Supabase adapter in PR#2 | Decouples storage from orchestrator; enables USE_MOCKS gate in dev. | Locked |
| D-022 | 2026-05-10 | MockModelRouter returns deterministic stubs; USE_MOCKS gate prevents prod use | Safety net against billing surprises during development. | Locked |
| D-023 | 2026-05-10 | Path B: Google Drive + Dropbox first; email-forward deferred | Drive and Dropbox cover 90%+ of data rooms seen in practice. | Locked |
| D-024 | 2026-05-10 | Critic rubric: 14 items, 6 blocking; approved=true only when all blocking pass | Mirrors IC committee gate criteria; prevents low-quality memos reaching partners. | Locked |
| D-025 | 2026-05-10 | Next.js App Router as the server framework | Server Components + Edge Middleware enable auth-gated pages without a separate backend; Vercel deployment is zero-config. | Locked |
| D-026 | 2026-05-10 | Supabase Auth (magic link + GitHub OAuth) | Zero-password friction; GitHub covers founder-facing use; Supabase RLS ties auth to data ownership natively. | Locked |
| D-027 | 2026-05-10 | NEXT_PUBLIC_ prefix for browser Supabase vars | Next.js requires NEXT_PUBLIC_ to include env vars in browser bundles; SUPABASE_SECRET_KEY must never be prefixed. | Locked |
| D-028 | 2026-05-10 | profiles.is_owner bypasses usage_counters; no hard cap for owners | Marketlogic operators must never be blocked from analysing a live deal regardless of monthly volume. | Locked |
| D-029 | 2026-05-10 | Free tier: 3 deals/month + $5 LLM budget; separate upgrade screen | Matches prospect's willingness to trial; upgrade friction lives on a dedicated page, not an inline modal. | Locked |
| D-030 | 2026-05-10 | supabase/migrations/ timestamped 20260510000001–03 | Supabase CLI applies migrations in filename order; timestamp prefix prevents ordering bugs when PRs merge out of order. | Locked |
| D-031 | 2026-05-10 | tsconfig.lib.json extends root tsconfig for PR#3 lib/api files | Keeps NodeNext module resolution for standalone lib compilation while the root tsconfig targets Next.js/bundler resolution. | Locked |
| D-032 | 2026-05-10 | Auth trigger handle_new_user + belt-and-suspenders upsert in callback | Trigger is the primary path; callback upsert catches edge cases where trigger fires before session cookie is written. | Locked |
| D-033 | 2026-05-10 | deal-uploads bucket private; reads via service-role signed URLs only | Prevents direct URL enumeration of deal files; all file access is mediated by the server. | Locked |

## How to add a decision

1. Append a row with next D-### number.
2. State the decision in 1 line.
3. State the rationale in 1–2 lines.
4. Status starts Pending and moves to Locked once acted on; if reversed, mark Superseded and reference replacement D-###.
