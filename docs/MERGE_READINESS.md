# MERGE_READINESS

> Generated: 2026-05-10  
> Scope: all open PRs against Regantih/deallenz  
> Authority: deallenz-builder agent  
> **Action taken: none — read-only assessment**

---

## 1. Per-PR status

| GitHub PR | Title (internal name) | Branch | Base | Merged? | `mergeable_state` | Vercel build |
|---|---|---|---|---|---|---|
| #4 | PR3: Path B + agent swarm + MVI router (mocks) | `pr6/path-b-and-swarm` | `pr4/chat-and-rich-memo` | ❌ open | n/a — base not on main | n/a |
| #5 | PR4: rendering, exhibits, cost transparency | `pr5/rendering-and-cost-transparency` | `pr4/chat-and-rich-memo` | ❌ open | n/a — base not on main | n/a |
| #6 | PR2: auth + real upload + DB schema + RLS | `pr7/auth-upload-db` | `pr4/chat-and-rich-memo` | ❌ open | n/a — base not on main | n/a |
| **#7** | **PR7: Real Supabase + real Anthropic; harden mocks** | `pr7/real-wire` | **`main`** | ❌ open | **`unstable`** | **❌ FAILED** |

### Notes on `mergeable_state: unstable`

GitHub returns `unstable` (not `dirty`) for PR #7. This means:
- **No git merge conflicts** against `main` — the branch applies cleanly.
- The `unstable` flag is caused exclusively by the Vercel preview-deployment status check returning `failure`.
- A `dirty` state (which would indicate real conflicts) is **not present**.

---

## 2. Dependency graph

```
main  (SHA: 965e1309)
  │
  └── pr4/chat-and-rich-memo  ← base for PRs #4, #5, #6
        │                        (not on main; no GitHub PR open for it)
        ├── pr6/path-b-and-swarm          (GitHub PR #4)  mocks + swarm scaffold
        ├── pr5/rendering-and-cost-transparency (GitHub PR #5)  frontend-only
        └── pr7/auth-upload-db            (GitHub PR #6)  auth + DB + real storage
              │
              └── pr7/real-wire  ← PR #7  (base = main)
                    Contains ALL predecessor changes PLUS:
                    real Anthropic router, real jobs queue, health endpoint, worker
```

### Key implication

- PRs #4, #5, #6 **cannot be merged to `main` individually** without first merging
  their shared base branch `pr4/chat-and-rich-memo` into `main`. There is no open
  GitHub PR for that base branch itself.
- PR #7 **can be merged directly to `main`** once the Vercel build failure is resolved,
  because it was opened against `main` and carries forward all predecessor changes.
- Merging PR #7 alone delivers the full state: auth + DB + RLS + storage + LLM + jobs.

---

## 3. Vercel build failure — root cause analysis

**Status URL:** `https://vercel.com/hemanths-projects-ac08a6f4/deallenz/8zumMjZTVHqqRTqDJGLKY5DL4eFF`  
**Vercel CLI diagnostic:** `npx vercel inspect dpl_8zumMjZTVHqqRTqDJGLKY5DL4eFF --logs`

Likely causes (in priority order):

1. **`@anthropic-ai/sdk@^0.39.0` version range may not resolve.**  
   The package was at `^0.26.x` at the time of writing; `0.39.0` may not yet exist on
   npm, causing `npm install` to fail with `ETARGET`. Fix: pin to `latest` or the
   highest available release (e.g. `^0.26.0`).

2. **TypeScript type mismatch in `lib/llm.anthropic.ts`.**  
   The `Anthropic.MessageCreateParamsNonStreaming` type signature may differ between
   SDK versions; `response.content` block typing (`Anthropic.TextBlock`) could cause
   a TS error under strict mode.

3. **`import '@/api/ingest-link'` in Next.js route handler.**  
   `app/api/ingest-link/route.ts` imports from `@/api/ingest-link`. That file lives in
   the repo-root `api/` directory (not a Next.js route directory). Under Next.js bundler
   module resolution this should work, but Vercel's tree-shaking may fail to trace
   the transitive `IngestQueue` type import from `../lib/jobs`.

**Action required before merge:** Pull the Vercel build logs, fix the failing step,
push a fixup commit to `pr7/real-wire`.

---

## 4. Recommended merge order

Once PR #7's Vercel build is green:

```
Step 1:  Merge PR #7 (pr7/real-wire → main)
         Delivers: everything — auth, DB, storage, LLM, jobs, swarm, health check.
         All predecessor content is already included.

Step 2:  Update PRs #4, #5 base to main (or close them as superseded)
         PR #4 (path-b mocks): all meaningful content is ported and upgraded in PR #7.
                                Consider closing as superseded.
         PR #5 (rendering): frontend-only (design tokens, TOC, cost panel, settings
                            stub). Still valuable — re-target to main after PR #7 merges.

Step 3:  Re-target or close PR #6 (auth-upload-db)
         Its content is fully included in PR #7. Close as superseded once PR #7 merges.
```

---

## 5. Remaining real-wire gaps

### ✅ Wired (real, no mocks in production path)

| Feature | Evidence |
|---|---|
| Supabase Auth (magic link + GitHub OAuth) | `app/(auth)/`, `middleware.ts`, `app/auth/callback/route.ts` |
| Row Level Security (RLS) | `supabase/migrations/20260510000002_rls.sql` — 14 policies |
| Real file upload (Path A) | `app/api/upload/route.ts` → `SupabaseStorageClient` |
| Supabase Storage bucket | `supabase/migrations/20260510000003_storage.sql` |
| Anthropic LLM routing (MVI) | `lib/llm.anthropic.ts` → `AnthropicModelRouter` |
| Real token / cost accounting | `response.usage.input_tokens/output_tokens` → `estimateUsd()` → `CostLedger` |
| Agent swarm (5 agents) | `lib/swarm/agents/*` accept real `ModelRouter` |
| Jobs queue (DB-backed) | `lib/jobs.supabase.ts` + `supabase/migrations/20260510000004_jobs.sql` |
| Path B ingest (queue side) | `app/api/ingest-link/route.ts` enqueues to real `SupabaseJobsQueue` |
| Jobs worker (generic_webpage) | `app/api/jobs/worker/route.ts` fetches + uploads HTML to Storage |
| Health endpoint | `GET /api/health` pings Supabase + Anthropic |

### ⚠️ Partial — infrastructure real, connector not yet wired

| Feature | Gap | Blocker |
|---|---|---|
| Path B — Google Drive | `GoogleDriveConnector` stub throws; worker marks job `failed` | Need `GOOGLE_OAUTH_CLIENT_ID/SECRET` in Vercel |
| Path B — Dropbox | `DropboxConnector` stub throws; worker marks job `failed` | Need `DROPBOX_APP_KEY/SECRET` in Vercel |
| Cost ledger → DB | `CostLedger` object built in memory; **not persisted to `cost_ledger` table** | Need a `persistCostLedger(runId, ledger)` helper called after swarm completes |
| Swarm run trigger | `SwarmOrchestrator.run()` exists but no API route invokes it end-to-end | Need `POST /api/runs` → create `deal_runs` row → run orchestrator → persist |
| Cost transparency UI | `deal.html` reads static JSON; does not read from `cost_ledger` table | Blocked on swarm run trigger + DB persistence |

### ❌ Not yet started

| Feature | Stub | Next action |
|---|---|---|
| Stripe billing / paywall | `lib/stripe.ts` throws without creds | Future PR once `STRIPE_SECRET_KEY` provided |
| Upgrade screen / paywall UI | No UI | Future PR |
| OpenAI adapter | Not implemented | Future PR if `OPENAI_API_KEY` provided |
| Perplexity adapter | Not implemented | Future PR if `PERPLEXITY_API_KEY` provided |
| Email-forward ingestion | Not started | Future PR |
| Free-trial enforcement UI | `GET /api/usage` returns limits; no UI block yet | Future PR |

---

## 6. File location notes

- **`BUILD_PLAN.md`** does not exist in the repo. The equivalent document is `PLAN.md`
  (Phase 0–4 roadmap) at the repo root.
- **`PR7_SUMMARY.md`** does not exist. The equivalent is `docs/PR7_STATUS.md`
  (created during PR7 work) with the full real-vs-mocked breakdown.
- **`ARCHITECTURE.md`** was created in PR7 and contains the live service matrix.

---

## 7. What to do next (awaiting human instruction)

1. Pull Vercel build logs for `dpl_8zumMjZTVHqqRTqDJGLKY5DL4eFF` and identify
   exact failure line.
2. Fix build (most likely: pin `@anthropic-ai/sdk` to the correct available version).
3. Push fixup commit to `pr7/real-wire` and wait for Vercel re-deploy.
4. Once build is green, approve merge of PR #7.
5. After merge: decide whether to close PRs #4 and #6 as superseded or re-target them.
