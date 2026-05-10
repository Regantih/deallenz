# DealLens — Architecture Reference

**Version:** PR7 (May 2026)

---

## Service connectivity matrix

| Service | Credential | Status | Implementation |
|---|---|---|---|
| Supabase DB + Auth | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SECRET_KEY` | **REAL** (PR7) | `lib/supabase/server.ts`, `lib/supabase/browser.ts` |
| Supabase Storage | `SUPABASE_SECRET_KEY` | **REAL** (PR7) | `lib/storage.supabase.ts`, bucket: `deal-uploads` |
| Anthropic LLM | `ANTHROPIC_API_KEY` | **REAL** (PR7) | `lib/llm.anthropic.ts` |
| Jobs queue | `SUPABASE_SECRET_KEY` | **REAL** (PR7) | `lib/jobs.supabase.ts`, table: `jobs` |
| Google Drive | `GOOGLE_OAUTH_CLIENT_ID/SECRET` | **Stub** (future PR) | `lib/connectors/google-drive.ts` |
| Dropbox | `DROPBOX_APP_KEY/SECRET` | **Stub** (future PR) | `lib/connectors/dropbox.ts` |
| Stripe | `STRIPE_SECRET_KEY/WEBHOOK/PRICE` | **Stub** (future PR) | `lib/stripe.ts` |
| OpenAI | `OPENAI_API_KEY` | **Not implemented** | — |
| Perplexity | `PERPLEXITY_API_KEY` | **Not implemented** | — |

---

## Storage layer

Interface: `lib/storage.ts` → `StorageClient`

| Method | Description |
|---|---|
| `putFile(dealId, data, name, mimeType)` | Upload to `deal-uploads` bucket at `deals/{dealId}/{uuid}-{name}` |
| `getSignedUrl(key, expires?)` | Generate a time-limited signed URL (default 3600 s) |
| `listDealFiles(dealId)` | List files newest-first |

Real implementation: `SupabaseStorageClient` (server-only, uses `SUPABASE_SECRET_KEY`).
Mock (dev only): `MockStorageClient` — writes to `/tmp`; throws in production.

---

## LLM routing (MVI)

Interface: `lib/llm.ts` → `ModelRouter`

### Tier mapping

| Tier | Anthropic model | Default tasks |
|---|---|---|
| `cheap` | `claude-haiku-4-5` | extract, classify, research |
| `mid` | `claude-sonnet-4-20250514` | analyze, write, critique |
| `deep` | `claude-opus-4-5` | manual override only |

### Cost computation

`estimateUsd(tier, tokensIn, tokensOut)` — Anthropic May 2025 pricing:
- Haiku:  $0.80/$4.00 per M tokens
- Sonnet: $3.00/$15.00 per M tokens
- Opus:   $15.00/$75.00 per M tokens

Real adapter: `AnthropicModelRouter` reads `response.usage.input_tokens` /
`output_tokens` and computes actual USD per call. Appends to `CostLedger`.

Mock (dev/staging): `MockModelRouter` — deterministic stubs; throws in production.

---

## Agent swarm

All five agents implement the `AgentResult<T>` pattern and accept a `ModelRouter` +
`SwarmContext` so they can be driven by either the real Anthropic router or the mock.

| Agent | Task type | Model tier | Output |
|---|---|---|---|
| `ResearcherAgent` | `research` | cheap (haiku) | `ResearcherOutput` — market summary, competitors, macro signals |
| `AnalystAgent` | `classify` + `analyze` | cheap + mid | `AnalystOutput` — unit economics, Rule of 40, TAM/SAM/SOM |
| `RiskAgent` | `analyze` | mid | `RiskOutput` — risk register, red flags |
| `WriterAgent` | `write` | mid | `WriterOutput` — 14 chapters in parallel batches of 3 |
| `CriticAgent` | `critique` | mid | `CriticOutput` — 14-point rubric, blocking failures, approved flag |

`SwarmOrchestrator` runs the pipeline:
1. `plan` — list agents
2. `dispatch` — researcher + analyst + risk in parallel
3. `compose` — writer uses parallel results
4. `critique` — critic evaluates full draft
5. `finalize` — aggregate CostLedger, emit summary

---

## Jobs queue

Interface: `lib/jobs.ts` → `IngestQueue`

| Method | Description |
|---|---|
| `enqueue({ deal_id, kind, payload })` | Insert a new `queued` job row |
| `getJob(id)` | Fetch one job by ID |
| `listJobsForDeal(deal_id)` | List all jobs for a deal, newest-first |
| `claimNext()` | Atomically claim one queued job (SELECT FOR UPDATE SKIP LOCKED) |
| `markDone(id)` | Transition running → done |
| `markFailed(id, error)` | Transition running → failed |

Real implementation: `SupabaseJobsQueue` — backed by `public.jobs` table.
Worker: `POST /api/jobs/worker` (authenticated by `WORKER_SECRET`).

### Status transitions
```
queued → running → done
                  → failed
```

---

## Database schema

```
profiles  (id → auth.users, email, plan, is_owner)
  └─ deals  (id, owner_id, name, stage, status)
       ├─ deal_files  (id, deal_id, storage_path, mime, size_bytes, source)
       ├─ deal_runs   (id, deal_id, status, started_at, finished_at, total_usd, tokens)
       │    └─ cost_ledger  (id, run_id, agent, model, tokens_in, tokens_out, usd_cost)
       └─ jobs  (id, deal_id, kind, status, payload, error, started_at, finished_at)
usage_counters  (profile_id, month, deals_processed, usd_spent)
```

RLS: every table locked to `auth.uid() = owner_id` for user reads.
Service-role (`SUPABASE_SECRET_KEY`) bypasses RLS for server-only operations.

### Migrations (apply in order)

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

| File | Contents |
|---|---|
| `20260510000001_init.sql` | profiles, deals, deal_files, deal_runs, cost_ledger, usage_counters |
| `20260510000002_rls.sql` | RLS policies (14 policies) + auth trigger |
| `20260510000003_storage.sql` | deal-uploads bucket + Storage RLS |
| `20260510000004_jobs.sql` | jobs table + claim_next_job() RPC + RLS |

---

## API routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/upload` | POST | Required | Direct file upload (Path A) |
| `/api/usage` | GET | Required | Monthly usage + limits |
| `/api/ingest-link` | POST | Required | Enqueue a data-room URL (Path B) |
| `/api/jobs/worker` | POST | WORKER_SECRET | Process one queued job |
| `/api/health` | GET | None | Ping Supabase + Anthropic |

---

## Health check

```bash
curl https://your-app.vercel.app/api/health
# Expected:
# { "supabase": "ok", "anthropic": "ok", "version": "0.5.0", "commit": "<sha>" }
```

---

## Mock guard policy

All mock classes include a top-level production guard:
```typescript
if (NODE_ENV === 'production' && USE_MOCKS !== 'true') {
  throw new Error('[deallenz] MockXxx must NOT be used in production...');
}
```

**Supabase and Anthropic paths have NO mock fallback.** Credentials must be set
before those paths are invoked. Connector stubs (Google Drive, Dropbox, Stripe)
throw a clear error message pointing to the required env var.
