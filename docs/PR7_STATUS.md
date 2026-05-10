# PR7_STATUS

> Memory store key: `PR7_STATUS`
> Updated: 2026-05-10 (PR7 — real-wire)

---

## What is REAL (wired in production)

| Service | Implementation | Credential |
|---|---|---|
| Supabase DB + Auth | `lib/supabase/server.ts` + `lib/supabase/browser.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` |
| Supabase Storage | `lib/storage.supabase.ts` → `SupabaseStorageClient` | `SUPABASE_SECRET_KEY` |
| Anthropic LLM | `lib/llm.anthropic.ts` → `AnthropicModelRouter` | `ANTHROPIC_API_KEY` |
| Jobs queue | `lib/jobs.supabase.ts` → `SupabaseJobsQueue` | `SUPABASE_SECRET_KEY` |
| Jobs worker | `app/api/jobs/worker/route.ts` | `WORKER_SECRET` |
| Health check | `app/api/health/route.ts` | — |
| File upload (Path A) | `app/api/upload/route.ts` | inherited |
| Ingest link (Path B queue) | `app/api/ingest-link/route.ts` | inherited |

## What is MOCKED (dev/staging only; throws in production)

| Service | Mock file | Guard |
|---|---|---|
| LLM | `lib/llm.mock.ts` → `MockModelRouter` | `NODE_ENV=production && !USE_MOCKS` → throws |
| Storage | `lib/storage.mock.ts` → `MockStorageClient` | `NODE_ENV=production && !USE_MOCKS` → throws |
| Jobs queue | `api/ingest-queue.mock.ts` → `MockIngestQueue` | `NODE_ENV=production && !USE_MOCKS` → throws |

## What is STUBBED (throws clear error until credentials are set)

| Service | Stub file | Missing var |
|---|---|---|
| Google Drive | `lib/connectors/google-drive.ts` | `GOOGLE_OAUTH_CLIENT_ID/SECRET` |
| Dropbox | `lib/connectors/dropbox.ts` | `DROPBOX_APP_KEY/SECRET` |
| Stripe | `lib/stripe.ts` | `STRIPE_SECRET_KEY/WEBHOOK_SECRET/PRICE_ID` |
| OpenAI | not implemented | `OPENAI_API_KEY` |
| Perplexity | not implemented | `PERPLEXITY_API_KEY` |

## What is NOT BUILT YET

- Stripe billing / paywall UI
- Google Drive connector implementation
- Dropbox connector implementation
- OpenAI / Perplexity adapters
- Email-forward ingestion
- Swarm run trigger from UI
- Deal memo rendering from swarm output
- Cost ledger UI integration with real DB rows

## DB schema status (4 migrations applied)

1. `20260510000001_init.sql` — profiles, deals, deal_files, deal_runs, cost_ledger, usage_counters
2. `20260510000002_rls.sql` — RLS policies + auth trigger
3. `20260510000003_storage.sql` — deal-uploads bucket
4. `20260510000004_jobs.sql` — jobs table + claim_next_job() RPC  *(PR7 new)*

## Model defaults (PR7)

- `claude-haiku-4-5` — researcher (research task), analyst classify step
- `claude-sonnet-4-20250514` — analyst (analyze), risk, writer, critic
- `claude-opus-4-5` — deep tier (manual override only; not default for any task)

## PR chain status

| PR | Branch | Status | Notes |
|---|---|---|---|
| PR1 (cleanup) | `pr/cleanup-foundation` | ✅ merged | |
| PR2 (scaffold) | `pr3/deal-intake` | ✅ merged | |
| PR3 (path-b + swarm mocks) | `pr6/path-b-and-swarm` | open | Not merged; ported into PR7 |
| PR4 (rendering) | `pr5/rendering-and-cost-transparency` | open | Not merged; independent of PR7 |
| PR5 (chat + memo) | `pr4/chat-and-rich-memo` | open (base) | base branch for all work |
| PR6 (auth + upload + DB) | `pr7/auth-upload-db` | open | PR7 branched from here |
| **PR7 (real-wire)** | `pr7/real-wire` | **open** | **This PR** |

## Next PRs recommended

1. **Merge queue:** merge PR3 → PR4 → PR5 → PR6 → PR7 into main in dependency order
2. **PR8:** Wire Google Drive connector (needs GOOGLE_OAUTH_CLIENT_ID/SECRET)
3. **PR9:** Wire Dropbox connector (needs DROPBOX_APP_KEY/SECRET)
4. **PR10:** Wire Stripe billing + paywall UI
5. **PR11:** Swarm run trigger from dashboard UI; cost ledger display
