# DealLens — Build Status

> **Last updated:** 2026-05-10  
> **Commit:** `pr7/real-wire` tip (build green — both package pins applied; previously `59d0b27` at time of first draft)  
> **Maintainer rule:** Every meaningful change must update this file. See [docs/DOCS_DISCIPLINE.md](./DOCS_DISCIPLINE.md).

---

## What's on `main` right now

`main` contains only the two earliest merged PRs. All substantive work is in open branches.

| Merged PR | Content |
|---|---|
| PR #1 (pr2/scaffold-v2) | README, 14-chapter scrollytelling `index.html`, `docs/EXPECTATIONS.md`, `docs/DECISIONS.md` D-001–D-020 |
| PR #2 (pr3/deal-intake) | `submit.html` intake form, `deals.html` kanban, `deal.html` memo viewer, `deals/pqc-bank.json`, `agents/README.md` |
| PR #3 (pr/cleanup-foundation) | `localExtract()` expanded to 10 fields, honest empty states, fake data removed from `pipeline.html` + `app.html`, `acme-finance` removed |

---

## Built (working) — across all branches

> Items marked **[main]** are on `main`. Items marked **[PR#N]** are on that open PR branch.

### Static app shell
- [x] `app.html` — 6-tab VC workflow (intake, dossier, pipeline, call prep, IC memo, logs) **[main]**
- [x] `deal.html` — 14-chapter deal deep-dive with sticky TOC sidebar, cost panel, exhibits panel **[PR#5]**
- [x] `deals.html` — 5-stage pipeline kanban **[main]**
- [x] `pipeline.html` — real completeness %, no fake Math.random() data **[main]**
- [x] `submit.html` — conversational intake + `localExtract()` (10 fields: stage, sector, HQ, ask, pre-money, ARR, MoM, logos, NRR, thesis) **[main]**
- [x] `submit.html` — Path B data-room link input + job-status cards **[PR#4]**
- [x] `settings.html` — stub page (4 coming-soon cards) **[PR#5]**
- [x] `styles/tokens.css` — full design token system (colours, spacing, type, shadows) **[PR#5]**
- [x] `build.json` — build manifest (version + commit SHA in footer) **[PR#5]**
- [x] Global header/footer shell on all pages **[PR#5]**
- [x] Print stylesheet on `deal.html` (hides sidebar, full-width content) **[PR#5]**
- [x] Accessibility: skip-to-content, focus-visible rings, ARIA landmarks, WCAG AA contrast **[PR#5]**

### Next.js App Router scaffold
- [x] `package.json` — Next.js 15 + `@supabase/ssr` + `@supabase/supabase-js` + `@anthropic-ai/sdk` **[PR#7]**
- [x] `tsconfig.json` — strict, bundler module resolution, `@/*` path alias **[PR#6]**
- [x] `tsconfig.lib.json` — NodeNext resolution for standalone `lib/` + `api/` compilation **[PR#6]**
- [x] `next.config.ts` — minimal; legacy `.html` files unaffected **[PR#6]**
- [x] `middleware.ts` — session refresh on every request; unauthenticated → `/login?next=` **[PR#6]**

### Supabase Auth
- [x] `lib/supabase/browser.ts` — singleton `createBrowserClient`, throws if env vars absent **[PR#6]**
- [x] `lib/supabase/server.ts` — `getSupabaseServerClient()` (RLS) + `getSupabaseAdminClient()` (bypass) **[PR#6]**
- [x] `lib/supabase/types.ts` — hand-authored `Database` interface (profiles, deals, deal_files, deal_runs, cost_ledger, usage_counters, jobs) **[PR#7]**
- [x] `app/(auth)/login/` — magic link form + GitHub OAuth button + honest error/success states **[PR#6]**
- [x] `app/(auth)/signup/` — same flow, shows free-tier limits **[PR#6]**
- [x] `app/auth/callback/route.ts` — code exchange, session cookie, profile upsert, redirect **[PR#6]**

### Database schema + RLS (4 migrations)
- [x] `supabase/migrations/20260510000001_init.sql` — profiles, deals, deal_files, deal_runs, cost_ledger, usage_counters **[PR#6]**
- [x] `supabase/migrations/20260510000002_rls.sql` — 14 RLS policies + `handle_new_user` auth trigger **[PR#6]**
- [x] `supabase/migrations/20260510000003_storage.sql` — `deal-uploads` private bucket (50 MB, 13 MIME types) + Storage RLS **[PR#6]**
- [x] `supabase/migrations/20260510000004_jobs.sql` — `jobs` table + `claim_next_job()` RPC (SELECT FOR UPDATE SKIP LOCKED) + RLS **[PR#7]**

### Storage
- [x] `lib/storage.ts` — `StorageClient` interface **[PR#4 / ported to PR#7]**
- [x] `lib/storage.supabase.ts` — `SupabaseStorageClient` (real, server-only, uses `SUPABASE_SECRET_KEY`) **[PR#6 / updated PR#7]**
- [x] `lib/storage.mock.ts` — `MockStorageClient` (dev only, throws in prod) **[PR#4 / ported to PR#7]**

### API routes
- [x] `POST /api/upload` — auth + deal-ownership check, MIME/size validation, Supabase Storage upload, `deal_files` insert **[PR#6]**
- [x] `GET /api/usage` — plan, `is_owner`, monthly counters, `within_limits` **[PR#6]**
- [x] `POST /api/ingest-link` — auth + ownership check, validates URL, classifies source, enqueues to `SupabaseJobsQueue` **[PR#7]**
- [x] `POST /api/jobs/worker` — claims one job, `queued→running→done/failed`, processes `generic_webpage` (fetch + Storage upload) **[PR#7]**
- [x] `GET /api/health` — pings Supabase (SELECT profiles) + Anthropic (1-token ping); 200/503 **[PR#7]**

### LLM routing (MVI)
- [x] `lib/llm.ts` — `ModelRouter` interface, `CostEntry`/`CostLedger` types, `resolveTier()`, `estimateUsd()`, tier catalogue **[PR#4 / updated PR#7]**
- [x] `lib/llm.anthropic.ts` — **REAL** `AnthropicModelRouter`; reads `response.usage` tokens; computes USD via `estimateUsd()`; appends to in-memory `CostLedger` **[PR#7]**
- [x] `lib/llm.mock.ts` — `MockModelRouter` (dev only, throws in prod) **[PR#4 / ported PR#7]**

**Model defaults:**
| Agent | Task type | Tier | Model |
|---|---|---|---|
| Researcher | `research` | cheap | `claude-haiku-4-5` |
| Analyst classify | `classify` | cheap | `claude-haiku-4-5` |
| Analyst main | `analyze` | mid | `claude-sonnet-4-20250514` |
| Risk | `analyze` | mid | `claude-sonnet-4-20250514` |
| Writer | `write` | mid | `claude-sonnet-4-20250514` |
| Critic | `critique` | mid | `claude-sonnet-4-20250514` |

### Agent swarm
- [x] `lib/swarm/orchestrator.ts` — `SwarmOrchestrator` (plan → dispatch → gather → compose → critique → finalize) **[PR#4 / ported PR#7]**
- [x] `lib/swarm/agents/researcher.ts` — market summary, competitors, macro signals **[PR#4 / ported PR#7]**
- [x] `lib/swarm/agents/analyst.ts` — unit economics, Rule of 40 (deterministic), TAM/SAM/SOM **[PR#4 / ported PR#7]**
- [x] `lib/swarm/agents/risk.ts` — risk register, red flags **[PR#4 / ported PR#7]**
- [x] `lib/swarm/agents/writer.ts` — 14 chapters in parallel batches of 3 **[PR#4 / ported PR#7]**
- [x] `lib/swarm/agents/critic.ts` — 14-point QA rubric, 6 blocking items, `approved` flag **[PR#4 / ported PR#7]**

### Jobs queue
- [x] `lib/jobs.ts` — `IngestQueue` interface, `Job`/`JobKind`/`JobStatus` types **[PR#7]**
- [x] `lib/jobs.supabase.ts` — **REAL** `SupabaseJobsQueue` (enqueue, getJob, listJobsForDeal, claimNext, markDone, markFailed) **[PR#7]**
- [x] `api/ingest-queue.mock.ts` — `MockIngestQueue` (dev only, throws in prod) **[PR#4 / ported PR#7]**

### Connector stubs (throw clearly until credentials set)
- [x] `lib/connectors/google-drive.ts` — throws `[deallenz] Google Drive connector is not configured` **[PR#7]**
- [x] `lib/connectors/dropbox.ts` — throws `[deallenz] Dropbox connector is not configured` **[PR#7]**
- [x] `lib/stripe.ts` — throws `[deallenz] Stripe is not configured` **[PR#7]**

### Documentation
- [x] `ARCHITECTURE.md` — service matrix, tier map, schema, API routes **[PR#7]**
- [x] `ENV.md` — all env vars, `NEXT_PUBLIC_` mapping, Vercel setup **[PR#6]**
- [x] `SETUP.md` — clone → install → migrate → run → deploy **[PR#6]**
- [x] `docs/DECISIONS.md` — D-001 through D-033 **[PR#6]**
- [x] `docs/PR7_STATUS.md` — real vs mocked breakdown **[PR#7]**
- [x] `docs/MERGE_READINESS.md` — per-PR status, conflict graph, gap analysis **[PR#7]**

---

## In progress

| Item | Branch | PR | Status |
|---|---|---|---|
| Real Supabase + real Anthropic (PR7) | `pr7/real-wire` | [#7](https://github.com/Regantih/deallenz/pull/7) | 🟢 **Vercel build green** — `next@15.3.9` + `vercel.json` framework pin applied; awaiting merge |
| Build status docs (this PR) | `docs/build-status` | [#8](https://github.com/Regantih/deallenz/pull/8) | ✅ Merged into main |

---

## Pending / not started (prioritised)

1. **Merge PR #7** — Vercel build now green; no conflicts after this merge commit.
2. **POST /api/runs** — end-to-end swarm trigger route: create `deal_runs` row → call `SwarmOrchestrator.run()` → persist `CostLedger` to `cost_ledger` table → update `deal_runs` status.
3. **`persistCostLedger(runId, ledger)`** — helper that writes `CostLedger.entries[]` to `cost_ledger` table via admin client after each run.
4. **Cost transparency UI** — `deal.html` reads `cost_ledger` rows from DB (not static JSON); shows real per-agent token/USD breakdown.
5. **Free-trial enforcement UI** — block deal submission when `within_limits: false`; show upgrade CTA; link to upgrade screen.
6. **Upgrade screen** — `/upgrade` page with plan comparison; calls Stripe Checkout once `STRIPE_SECRET_KEY` is set.
7. **Stripe billing** — wire `lib/stripe.ts` once `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `STRIPE_PRICE_ID` are provided; handle webhook to update `profiles.plan`.
8. **Google Drive connector** — implement `GoogleDriveConnector.listFolder()` + `downloadFile()` once `GOOGLE_OAUTH_CLIENT_ID/SECRET` are set; wire into jobs worker.
9. **Dropbox connector** — implement `DropboxConnector.listSharedFolder()` + `downloadFile()` once `DROPBOX_APP_KEY/SECRET` are set.
10. **Vercel Cron for jobs worker** — add cron entry to `vercel.json`: `{ "crons": [{"path": "/api/jobs/worker", "schedule": "*/1 * * * *"}] }`.
11. **Merge PR #4 (rendering)** — re-target `pr5/rendering-and-cost-transparency` to `main` after PR #7 merges; delivers design tokens, TOC, cost panel, settings stub.
12. **Close PRs #4 (path-b mocks) and #6 (auth)** — superseded by PR #7; close with reference.
13. **OpenAI adapter** — future PR once `OPENAI_API_KEY` is provided.
14. **Perplexity / web-search adapter** — future PR once `PERPLEXITY_API_KEY` is provided.
15. **Email-forward ingestion** — long-term; requires inbound email parsing service.

---

## Known gaps / mocked

> "Mocked" means the code path exists but returns stub data. In production, every mock listed below throws rather than silently returning fake data.

| Gap | File | Missing credential / action |
|---|---|---|
| LLM calls in dev mode | `lib/llm.mock.ts` → `MockModelRouter` | Set `ANTHROPIC_API_KEY` + switch to `AnthropicModelRouter` |
| Storage in dev mode | `lib/storage.mock.ts` → `MockStorageClient` | Set `SUPABASE_SECRET_KEY` + switch to `SupabaseStorageClient` |
| Jobs queue in dev mode | `api/ingest-queue.mock.ts` → `MockIngestQueue` | Set `SUPABASE_SECRET_KEY` + use `SupabaseJobsQueue` |
| Google Drive Path B | `lib/connectors/google-drive.ts` (stub — throws) | Provide `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` |
| Dropbox Path B | `lib/connectors/dropbox.ts` (stub — throws) | Provide `DROPBOX_APP_KEY` + `DROPBOX_APP_SECRET` |
| Stripe billing | `lib/stripe.ts` (stub — throws) | Provide `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` |
| OpenAI adapter | not implemented | Provide `OPENAI_API_KEY` |
| Perplexity adapter | not implemented | Provide `PERPLEXITY_API_KEY` |
| Cost ledger DB persistence | `CostLedger` stays in memory; never written to `cost_ledger` table | Build `persistCostLedger()` + `POST /api/runs` |
| Swarm run trigger | `SwarmOrchestrator.run()` not reachable from any API route | Build `POST /api/runs` |
| Free-trial UI block | `GET /api/usage` returns correct `within_limits`; no UI enforces it | Build upgrade screen + enforcement UI |
| Cost transparency UI | `deal.html` cost panel reads static JSON, not DB | Build DB read path after `persistCostLedger()` |

---

## Package versions (exact pins)

| Package | Pinned version | Notes |
|---|---|---|
| `@anthropic-ai/sdk` | `0.95.1` | `^0.39.0` had no matching releases on npm |
| `@supabase/supabase-js` | `2.49.4` | `^2.49.4` resolves to `2.105.4` which ships `@supabase/postgrest-js@2.105.4`; that version's stricter `GenericTable` type (requires `Relationships: GenericRelationship[]`) breaks `.from().select()` type inference in strict mode without regenerated types |
| `next` | `15.3.9` | bumped from `15.3.2` to clear Vercel CVE-2025-66478 block |

---

## Environment variables — complete reference

| Variable | Required? | Where used | Status |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Required | Browser + server Supabase clients | **SET in Vercel** |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ Required | Browser Supabase client | **SET in Vercel** |
| `SUPABASE_URL` | ✅ Required | Server Supabase clients (fallback to NEXT_PUBLIC_) | **SET in Vercel** |
| `SUPABASE_SECRET_KEY` | ✅ Required | Admin client, Storage, jobs queue | **SET in Vercel** |
| `ANTHROPIC_API_KEY` | ✅ Required | `AnthropicModelRouter`, health check | **SET in Vercel** |
| `WORKER_SECRET` | ✅ Required | `POST /api/jobs/worker` auth | Set in Vercel |
| `GOOGLE_OAUTH_CLIENT_ID` | ⏳ Pending | `GoogleDriveConnector` | NOT set |
| `GOOGLE_OAUTH_CLIENT_SECRET` | ⏳ Pending | `GoogleDriveConnector` | NOT set |
| `DROPBOX_APP_KEY` | ⏳ Pending | `DropboxConnector` | NOT set |
| `DROPBOX_APP_SECRET` | ⏳ Pending | `DropboxConnector` | NOT set |
| `STRIPE_SECRET_KEY` | ⏳ Pending | `stripeClient` | NOT set |
| `STRIPE_WEBHOOK_SECRET` | ⏳ Pending | Stripe webhook handler | NOT set |
| `STRIPE_PRICE_ID` | ⏳ Pending | Checkout session | NOT set |
| `OPENAI_API_KEY` | ⏳ Future | OpenAI adapter (not yet built) | NOT set |
| `PERPLEXITY_API_KEY` | ⏳ Future | Perplexity adapter (not yet built) | NOT set |
| `USE_MOCKS` | Dev/staging only | Allows mock classes in non-prod envs | Do not set in Vercel prod |
| `MOCK_STORAGE_ROOT` | Optional dev | `MockStorageClient` base dir | Not needed in prod |
