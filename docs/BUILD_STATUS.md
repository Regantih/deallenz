# DealLens — Build Status

> **Last updated:** 2026-05-10  
> **Commit:** `pr7/real-wire` tip (build green — both package pins applied)  
> **Maintainer rule:** Every meaningful change must update this file. See [docs/DOCS_DISCIPLINE.md](./DOCS_DISCIPLINE.md).

---

## What’s on `main` right now

`main` contains only the two earliest merged PRs. All substantive work is in open branches.

| Merged PR | Content |
|---|---|
| PR #1 (pr2/scaffold-v2) | README, 14-chapter scrollytelling `index.html`, `docs/EXPECTATIONS.md`, `docs/DECISIONS.md` D-001–D-020 |
| PR #2 (pr3/deal-intake) | `submit.html` intake form, `deals.html` kanban, `deal.html` memo viewer, `deals/pqc-bank.json`, `agents/README.md` |
| PR #3 (pr/cleanup-foundation) | `localExtract()` expanded to 10 fields, honest empty states, fake data removed |

---

## Built (working) — across all branches

### Static app shell
- [x] `app.html` — 6-tab VC workflow **[main]**
- [x] `deal.html` — 14-chapter deep-dive with sticky TOC, cost panel, exhibits **[PR#5]**
- [x] `deals.html` / `pipeline.html` / `submit.html` — kanban, pipeline, intake **[main]**
- [x] `settings.html` stub + `styles/tokens.css` design system **[PR#5]**

### Next.js App Router scaffold
- [x] `package.json` — Next.js 15 + `@supabase/ssr@^0.5.2` + `@supabase/supabase-js@2.49.4` + `@anthropic-ai/sdk@0.95.1` **[PR#7]**
- [x] `tsconfig.json` / `tsconfig.lib.json` / `next.config.ts` / `middleware.ts` **[PR#6/7]**

### Supabase Auth
- [x] `lib/supabase/browser.ts`, `server.ts`, `types.ts` **[PR#6/7]**
- [x] Login, signup, callback pages **[PR#6]**

### Database schema + RLS (4 migrations)
- [x] `20260510000001_init.sql` — 6 core tables **[PR#6]**
- [x] `20260510000002_rls.sql` — 14 RLS policies + auth trigger **[PR#6]**
- [x] `20260510000003_storage.sql` — `deal-uploads` bucket **[PR#6]**
- [x] `20260510000004_jobs.sql` — `jobs` table + `claim_next_job()` RPC **[PR#7]**

### Storage
- [x] `lib/storage.ts` interface + `lib/storage.supabase.ts` (real) + `lib/storage.mock.ts` (dev only) **[PR#7]**

### API routes
- [x] `POST /api/upload` — auth, MIME/size validation, Storage upload, `deal_files` insert **[PR#6]**
- [x] `GET /api/usage` — plan, limits, `within_limits` **[PR#6]**
- [x] `POST /api/ingest-link` — auth + ownership, enqueues to `SupabaseJobsQueue` **[PR#7]**
- [x] `POST /api/jobs/worker` — `queued→running→done/failed`, `generic_webpage` impl **[PR#7]**
- [x] `GET /api/health` — pings Supabase + Anthropic, 200/503 **[PR#7]**

### LLM routing (MVI)
- [x] `lib/llm.ts` interface + `lib/llm.anthropic.ts` (**REAL** `AnthropicModelRouter`, SDK `0.95.1`) + `lib/llm.mock.ts` (dev only) **[PR#7]**

**Model defaults:**
| Agent | Tier | Model |
|---|---|---|
| Researcher + classify steps | cheap | `claude-haiku-4-5` |
| Analyst / Risk / Writer / Critic | mid | `claude-sonnet-4-20250514` |

### Agent swarm
- [x] `lib/swarm/orchestrator.ts` + 5 agents (researcher, analyst, risk, writer, critic) **[PR#7]**

### Jobs queue
- [x] `lib/jobs.ts` interface + `lib/jobs.supabase.ts` (**REAL** `SupabaseJobsQueue`) + `api/ingest-queue.mock.ts` (dev only) **[PR#7]**

### Connector stubs
- [x] `lib/connectors/google-drive.ts`, `lib/connectors/dropbox.ts`, `lib/stripe.ts` — throw clear errors until creds set **[PR#7]**

### Documentation
- [x] `ARCHITECTURE.md`, `ENV.md`, `SETUP.md`, `README.md` **[PR#7]**
- [x] `docs/BUILD_STATUS.md`, `docs/DOCS_DISCIPLINE.md`, `docs/PR7_STATUS.md`, `docs/MERGE_READINESS.md` **[PR#7/8]**

---

## In progress

| Item | Branch | PR | Status |
|---|---|---|---|
| Real Supabase + Anthropic | `pr7/real-wire` | [#7](https://github.com/Regantih/deallenz/pull/7) | 🟡 **Awaiting Vercel re-deploy** (`@supabase/supabase-js` pinned to `2.49.4`) |
| Build status docs | `docs/build-status` | [#8](https://github.com/Regantih/deallenz/pull/8) | 🟡 Awaiting merge instruction |

---

## Pending / not started (prioritised)

1. **Confirm PR #7 Vercel deploy green** after `@supabase/supabase-js@2.49.4` pin.
2. **POST /api/runs** — swarm run trigger: create `deal_runs` row → `SwarmOrchestrator.run()` → persist `CostLedger` → update status.
3. **`persistCostLedger(runId, ledger)`** — write `CostLedger.entries[]` to `cost_ledger` table.
4. **Cost transparency UI** — `deal.html` reads from DB (not static JSON).
5. **Free-trial enforcement UI** — block when `within_limits: false`; upgrade CTA.
6. **Upgrade screen** — Stripe Checkout once `STRIPE_SECRET_KEY` set.
7. **Google Drive connector** — once `GOOGLE_OAUTH_CLIENT_ID/SECRET` set.
8. **Dropbox connector** — once `DROPBOX_APP_KEY/SECRET` set.
9. **Vercel Cron** — add `vercel.json` cron for jobs worker.
10. **Close PR #4 + #6** as superseded. Re-target PR #5 (rendering) to `main`.

---

## Known gaps / mocked

| Gap | File | Credential / action needed |
|---|---|---|
| LLM (dev) | `lib/llm.mock.ts` | `ANTHROPIC_API_KEY` set in Vercel prod |
| Storage (dev) | `lib/storage.mock.ts` | `SUPABASE_SECRET_KEY` set in Vercel prod |
| Jobs queue (dev) | `api/ingest-queue.mock.ts` | `SUPABASE_SECRET_KEY` set in Vercel prod |
| Google Drive | stub — throws | `GOOGLE_OAUTH_CLIENT_ID/SECRET` |
| Dropbox | stub — throws | `DROPBOX_APP_KEY/SECRET` |
| Stripe | stub — throws | `STRIPE_SECRET_KEY/WEBHOOK/PRICE` |
| Cost ledger DB write | in-memory only | Build `persistCostLedger()` |
| Swarm run trigger | no API route | Build `POST /api/runs` |
| Free-trial UI | API ready; no UI | Build upgrade screen |

---

## Package versions (exact pins)

| Package | Pinned version | Notes |
|---|---|---|
| `@anthropic-ai/sdk` | `0.95.1` | `^0.39.0` had no matching releases |
| `@supabase/supabase-js` | `2.49.4` | `^2.49.4` resolves to `2.105.4` which ships `@supabase/postgrest-js@2.105.4`; that version's stricter `GenericTable` type (requires `Relationships: GenericRelationship[]`) breaks `.from().select()` type inference in strict mode without types regenerated |
| `next` | `15.3.2` | exact |

---

## Environment variables — complete reference

| Variable | Required? | Status |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Required | **SET in Vercel** |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ Required | **SET in Vercel** |
| `SUPABASE_URL` | ✅ Required | **SET in Vercel** |
| `SUPABASE_SECRET_KEY` | ✅ Required | **SET in Vercel** |
| `ANTHROPIC_API_KEY` | ✅ Required | **SET in Vercel** |
| `WORKER_SECRET` | ✅ Required | Set in Vercel |
| `GOOGLE_OAUTH_CLIENT_ID` | ⏳ Pending | NOT set |
| `GOOGLE_OAUTH_CLIENT_SECRET` | ⏳ Pending | NOT set |
| `DROPBOX_APP_KEY` | ⏳ Pending | NOT set |
| `DROPBOX_APP_SECRET` | ⏳ Pending | NOT set |
| `STRIPE_SECRET_KEY` | ⏳ Pending | NOT set |
| `STRIPE_WEBHOOK_SECRET` | ⏳ Pending | NOT set |
| `STRIPE_PRICE_ID` | ⏳ Pending | NOT set |
| `OPENAI_API_KEY` | ⏳ Future | NOT set |
| `PERPLEXITY_API_KEY` | ⏳ Future | NOT set |
| `USE_MOCKS` | Dev/staging only | Do not set in Vercel prod |
