# DealLens — Build Status

> **Last updated:** 2026-05-10  
> **Commit:** `pr7/real-wire` tip (Vercel build fix — pinned `@anthropic-ai/sdk` to `0.95.1`)  
> **Maintainer rule:** Every meaningful change must update this file. See [docs/DOCS_DISCIPLINE.md](./DOCS_DISCIPLINE.md).

---

## What’s on `main` right now

`main` contains only the two earliest merged PRs. All substantive work is in open branches.

| Merged PR | Content |
|---|---|
| PR #1 (pr2/scaffold-v2) | README, 14-chapter scrollytelling `index.html`, `docs/EXPECTATIONS.md`, `docs/DECISIONS.md` D-001–D-020 |
| PR #2 (pr3/deal-intake) | `submit.html` intake form, `deals.html` kanban, `deal.html` memo viewer, `deals/pqc-bank.json`, `agents/README.md` |
| PR #3 (pr/cleanup-foundation) | `localExtract()` expanded to 10 fields, honest empty states, fake data removed, `acme-finance` removed |

---

## Built (working) — across all branches

> Items marked **[main]** are on `main`. Items marked **[PR#N]** are on that open PR branch.

### Static app shell
- [x] `app.html` — 6-tab VC workflow (intake, dossier, pipeline, call prep, IC memo, logs) **[main]**
- [x] `deal.html` — 14-chapter deal deep-dive with sticky TOC sidebar, cost panel, exhibits panel **[PR#5]**
- [x] `deals.html` — 5-stage pipeline kanban **[main]**
- [x] `pipeline.html` — real completeness %, no fake data **[main]**
- [x] `submit.html` — conversational intake + `localExtract()` (10 fields) **[main]**
- [x] `submit.html` — Path B data-room link input + job-status cards **[PR#4]**
- [x] `settings.html` — stub page **[PR#5]**
- [x] `styles/tokens.css` — full design token system **[PR#5]**
- [x] Global header/footer shell on all pages **[PR#5]**
- [x] Print stylesheet on `deal.html` **[PR#5]**
- [x] Accessibility: skip-to-content, ARIA, WCAG AA contrast **[PR#5]**

### Next.js App Router scaffold
- [x] `package.json` — Next.js 15 + Supabase + `@anthropic-ai/sdk@0.95.1` **[PR#7]**
- [x] `tsconfig.json` / `tsconfig.lib.json` **[PR#6/7]**
- [x] `next.config.ts` **[PR#6]**
- [x] `middleware.ts` — session refresh + unauth redirect **[PR#6]**

### Supabase Auth
- [x] `lib/supabase/browser.ts`, `server.ts`, `types.ts` **[PR#6/7]**
- [x] Auth pages (login, signup, callback) **[PR#6]**

### Database schema + RLS (4 migrations)
- [x] `20260510000001_init.sql` — 6 core tables **[PR#6]**
- [x] `20260510000002_rls.sql` — 14 RLS policies + auth trigger **[PR#6]**
- [x] `20260510000003_storage.sql` — `deal-uploads` bucket **[PR#6]**
- [x] `20260510000004_jobs.sql` — `jobs` table + `claim_next_job()` RPC **[PR#7]**

### Storage
- [x] `lib/storage.ts` interface **[PR#7]**
- [x] `lib/storage.supabase.ts` — `SupabaseStorageClient` (real) **[PR#6/7]**
- [x] `lib/storage.mock.ts` — dev-only **[PR#7]**

### API routes
- [x] `POST /api/upload` — auth, MIME/size validation, Storage upload, `deal_files` insert **[PR#6]**
- [x] `GET /api/usage` — plan, limits, `within_limits` **[PR#6]**
- [x] `POST /api/ingest-link` — auth + ownership, enqueues to `SupabaseJobsQueue` **[PR#7]**
- [x] `POST /api/jobs/worker` — `queued→running→done/failed`, `generic_webpage` impl **[PR#7]**
- [x] `GET /api/health` — pings Supabase + Anthropic, 200/503 **[PR#7]**

### LLM routing (MVI)
- [x] `lib/llm.ts` — `ModelRouter` interface, tier helpers **[PR#7]**
- [x] `lib/llm.anthropic.ts` — **REAL** `AnthropicModelRouter` (SDK `0.95.1`) **[PR#7]**
- [x] `lib/llm.mock.ts` — dev-only `MockModelRouter` **[PR#7]**

**Model defaults:**
| Agent | Task type | Tier | Model |
|---|---|---|---|
| Researcher | `research` | cheap | `claude-haiku-4-5` |
| Analyst classify | `classify` | cheap | `claude-haiku-4-5` |
| Analyst / Risk / Writer / Critic | `analyze`/`write`/`critique` | mid | `claude-sonnet-4-20250514` |

### Agent swarm
- [x] `lib/swarm/orchestrator.ts` + 5 agents (researcher, analyst, risk, writer, critic) **[PR#7]**

### Jobs queue
- [x] `lib/jobs.ts` interface **[PR#7]**
- [x] `lib/jobs.supabase.ts` — **REAL** `SupabaseJobsQueue` (SELECT FOR UPDATE SKIP LOCKED) **[PR#7]**
- [x] `api/ingest-queue.mock.ts` — dev-only **[PR#7]**

### Connector stubs (throw clearly until credentials set)
- [x] `lib/connectors/google-drive.ts` — throws until `GOOGLE_OAUTH_CLIENT_ID` set **[PR#7]**
- [x] `lib/connectors/dropbox.ts` — throws until `DROPBOX_APP_KEY` set **[PR#7]**
- [x] `lib/stripe.ts` — throws until `STRIPE_SECRET_KEY` set **[PR#7]**

### Documentation
- [x] `ARCHITECTURE.md`, `ENV.md`, `SETUP.md`, `README.md` **[PR#7]**
- [x] `docs/DECISIONS.md` D-001–D-033 **[PR#6]**
- [x] `docs/PR7_STATUS.md`, `docs/MERGE_READINESS.md` **[PR#7]**
- [x] `docs/BUILD_STATUS.md` (this file), `docs/DOCS_DISCIPLINE.md` **[PR#8]**

---

## In progress

| Item | Branch | PR | Status |
|---|---|---|---|
| Real Supabase + real Anthropic (PR7) | `pr7/real-wire` | [#7](https://github.com/Regantih/deallenz/pull/7) | 🟡 **Awaiting Vercel re-deploy** (package.json fix pushed — `@anthropic-ai/sdk` pinned to `0.95.1`) |
| Build status docs | `docs/build-status` | [#8](https://github.com/Regantih/deallenz/pull/8) | 🟡 Awaiting merge instruction |

---

## Pending / not started (prioritised)

1. **Monitor PR #7 Vercel re-deploy** — confirm build goes green after `0.95.1` pin.
2. **POST /api/runs** — end-to-end swarm trigger: create `deal_runs` row → `SwarmOrchestrator.run()` → persist `CostLedger` → update status.
3. **`persistCostLedger(runId, ledger)`** — write `CostLedger.entries[]` to `cost_ledger` table.
4. **Cost transparency UI** — `deal.html` reads `cost_ledger` rows from DB.
5. **Free-trial enforcement UI** — block when `within_limits: false`; upgrade CTA.
6. **Upgrade screen** — `/upgrade` page with plan comparison + Stripe Checkout.
7. **Stripe billing** — wire `lib/stripe.ts` once credentials set; webhook → `profiles.plan`.
8. **Google Drive connector** — implement once `GOOGLE_OAUTH_CLIENT_ID/SECRET` provided.
9. **Dropbox connector** — implement once `DROPBOX_APP_KEY/SECRET` provided.
10. **Vercel Cron for jobs worker** — add `vercel.json` with 1-minute cron.
11. **Re-target PR #5 (rendering)** to `main` after PR #7 merges.
12. **Close PR #4 + PR #6** as superseded by PR #7.
13. **OpenAI / Perplexity adapters** — future PRs once credentials provided.
14. **Email-forward ingestion** — long-term.

---

## Known gaps / mocked

| Gap | File | Credential / action needed |
|---|---|---|
| LLM calls in dev mode | `lib/llm.mock.ts` → `MockModelRouter` | `ANTHROPIC_API_KEY` (already set in Vercel prod) |
| Storage in dev mode | `lib/storage.mock.ts` → `MockStorageClient` | `SUPABASE_SECRET_KEY` (already set in Vercel prod) |
| Jobs queue in dev mode | `api/ingest-queue.mock.ts` | `SUPABASE_SECRET_KEY` (already set in Vercel prod) |
| Google Drive Path B | stub — throws | `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` |
| Dropbox Path B | stub — throws | `DROPBOX_APP_KEY` + `DROPBOX_APP_SECRET` |
| Stripe billing | stub — throws | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` |
| OpenAI adapter | not implemented | `OPENAI_API_KEY` |
| Perplexity adapter | not implemented | `PERPLEXITY_API_KEY` |
| Cost ledger → DB | in-memory only | Build `persistCostLedger()` + `POST /api/runs` |
| Swarm run trigger | no API route | Build `POST /api/runs` |
| Free-trial UI block | API works; UI does not enforce | Build upgrade screen |

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
| `MOCK_STORAGE_ROOT` | Optional dev | Not needed in prod |
