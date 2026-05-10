# MERGE_PLAN

> Memory store key: `MERGE_PLAN`  
> Updated: 2026-05-10  
> **Selected path: PATH A — single-merge via PR #7**

---

## Decision: Path A

Merge PR #7 (`pr7/real-wire`) directly into `main` as a single ship. PR #7:
- Branches from `pr7/auth-upload-db` (PR #6 head), which branches from `pr4/chat-and-rich-memo`
- Contains all content from PR #4 (path-b + swarm), PR #5 (chat memo), PR #6 (auth + DB) — all ported and upgraded
- Adds: real Anthropic LLM, real Supabase jobs queue, health endpoint, jobs worker
- Targets `main` directly — no intermediate merges required

---

## Merge order

```
Step 1: Merge PR #8 (docs/build-status) → main
        Branch: docs/build-status
        Content: docs/BUILD_STATUS.md + docs/DOCS_DISCIPLINE.md
        Reason: No code, no conflicts, establishes doc baseline
        Blockers: none (mergeable_state: clean)

Step 2: Merge PR #7 (pr7/real-wire) → main
        Branch: pr7/real-wire
        Content: EVERYTHING — auth, DB, storage, LLM, jobs, swarm, routes, docs
        Blockers: Vercel build failure (diagnose via: npx vercel inspect dpl_J2WJd4QgXa1M1wJf3W3e2XgQWWxG --logs)
        NOTE: Local build verified clean with Node 22 + TypeScript strict mode, 0 errors

Step 3: Close PR #4 (pr6/path-b-and-swarm) — superseded by PR #7
        Action: Close with comment (already posted)

Step 4: Close PR #6 (pr7/auth-upload-db) — superseded by PR #7
        Action: Close with comment (already posted)

Step 5: Re-target PR #5 (pr5/rendering-and-cost-transparency) to main
        Content: Design tokens, sticky TOC, cost panel, settings stub
        NOTE: Not superseded — frontend work that lands after PR #7
```

---

## What PR #7 delivers (confirmed locally)

| Layer | Status |
|---|---|
| Supabase Auth (magic link + GitHub OAuth) | ✅ Real |
| RLS (14 policies + auth trigger) | ✅ Real (4 migrations) |
| File upload (Path A) | ✅ Real (Supabase Storage) |
| Anthropic LLM routing (MVI) | ✅ Real (`claude-sonnet-4-20250514` / `claude-haiku-4-5`) |
| Agent swarm (5 agents) | ✅ Wired to real Anthropic |
| Jobs queue (DB-backed, race-safe) | ✅ Real (`SupabaseJobsQueue`) |
| Path B ingest (queue side) | ✅ Real queue; Drive/Dropbox connectors pending creds |
| Health endpoint | ✅ Real (`/api/health`) |
| Free-trial limits | ✅ DB-tracked (`/api/usage`) |

---

## Blockers before merge

1. **Vercel build failure**: Code is verified locally. User must run:
   ```
   npx vercel inspect dpl_J2WJd4QgXa1M1wJf3W3e2XgQWWxG --logs
   ```
   to see the actual error. Likely a Vercel project settings issue or cached build state.

2. **No other code blockers**: TypeScript strict mode, 0 errors, all 10 routes + middleware compile.

---

## Post-merge backlog (in priority order)

1. Diagnose + fix Vercel build if still failing after merge
2. `POST /api/runs` — swarm run trigger + cost ledger DB persistence
3. Cost transparency UI reading from `cost_ledger` table
4. Free-trial enforcement UI + upgrade screen
5. Stripe billing (needs `STRIPE_SECRET_KEY`)
6. Google Drive connector (needs `GOOGLE_OAUTH_CLIENT_ID/SECRET`)
7. Dropbox connector (needs `DROPBOX_APP_KEY/SECRET`)
8. Vercel Cron config (`vercel.json`) for jobs worker
9. Re-target and merge PR #5 (rendering)
10. OpenAI / Perplexity adapters (future)
