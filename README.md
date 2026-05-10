# DealLens

**by Marketlogic Investors LLC**

VC deal-analysis platform. Upload a pitch deck or paste a data-room link and get a McKinsey-grade 14-chapter investment memo, a risk register, and a cost ledger showing every dollar spent on LLM inference.

---

## Current state (PR7)

| Layer | Status |
|---|---|
| Auth (magic link + GitHub OAuth) | ✅ Real (Supabase) |
| File upload (Path A) | ✅ Real (Supabase Storage) |
| Database + RLS | ✅ Real (Supabase) |
| LLM routing (MVI) | ✅ Real (Anthropic — claude-sonnet-4-20250514 / haiku-4-5) |
| Jobs queue | ✅ Real (Supabase `jobs` table + worker) |
| Agent swarm (5 agents) | ✅ Wired to real LLM |
| Health endpoint | ✅ `/api/health` |
| Data-room links (Path B) | 🟡 Enqueue real (Drive/Dropbox connectors need creds) |
| Stripe billing | ⏳ Stub (credentials not yet set) |
| Google Drive connector | ⏳ Stub (needs GOOGLE_OAUTH_CLIENT_ID) |
| Dropbox connector | ⏳ Stub (needs DROPBOX_APP_KEY) |

---

## Quick start

```bash
git clone https://github.com/Regantih/deallenz
cd deallenz
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
# SUPABASE_URL, SUPABASE_SECRET_KEY, ANTHROPIC_API_KEY
```

### Apply migrations

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

This applies all four migration files in timestamp order.

### Run locally

```bash
npm run dev
# Visit http://localhost:3000/login
```

### Verify the deploy

```bash
curl https://your-app.vercel.app/api/health
# { "supabase": "ok", "anthropic": "ok", "version": "0.5.0", "commit": "..." }
```

### Trigger the jobs worker manually

```bash
curl -X POST https://your-app.vercel.app/api/jobs/worker \
  -H "Authorization: Bearer $WORKER_SECRET"
# { "ok": true, "processed": 0, "detail": "No queued jobs." }
```

---

## Deploy to Vercel

1. Import repo in Vercel → Framework: Next.js, Root: `.`
2. Add env vars in **Vercel → Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` (all environments)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (all environments)
   - `SUPABASE_URL` (Production + Preview)
   - `SUPABASE_SECRET_KEY` (**server only** — never `NEXT_PUBLIC_`)
   - `ANTHROPIC_API_KEY` (**server only**)
   - `WORKER_SECRET` (server only)
3. Set Supabase Auth redirect URLs:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URL: `https://your-app.vercel.app/auth/callback`
4. Deploy.

### Set owner flag (one-time, in Supabase SQL Editor)

```sql
UPDATE public.profiles
SET is_owner = true
WHERE email = 'operator@marketlogicinvestors.com';
```

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full architecture reference.

---

## Project structure

```
app/
  (auth)/         — login + signup pages
  api/
    health/       — GET /api/health
    ingest-link/  — POST /api/ingest-link (Path B)
    jobs/worker/  — POST /api/jobs/worker
    upload/       — POST /api/upload (Path A)
    usage/        — GET /api/usage
api/
  ingest-link.ts  — framework-agnostic handler
  ingest-queue.mock.ts
lib/
  llm.ts                 — ModelRouter interface + tier helpers
  llm.anthropic.ts       — REAL AnthropicModelRouter
  llm.mock.ts            — dev-only MockModelRouter
  storage.ts             — StorageClient interface
  storage.supabase.ts    — REAL SupabaseStorageClient
  storage.mock.ts        — dev-only MockStorageClient
  jobs.ts                — IngestQueue interface
  jobs.supabase.ts       — REAL SupabaseJobsQueue
  stripe.ts              — Stub (throws without creds)
  connectors/
    google-drive.ts      — Stub (throws without creds)
    dropbox.ts           — Stub (throws without creds)
  supabase/
    browser.ts           — browser client
    server.ts            — server + admin clients
    types.ts             — DB types
  swarm/
    orchestrator.ts
    agents/
      researcher.ts      — cheap tier (haiku)
      analyst.ts         — mid tier (sonnet)
      risk.ts            — mid tier (sonnet)
      writer.ts          — mid tier (sonnet)
      critic.ts          — mid tier (sonnet)
supabase/
  migrations/
    20260510000001_init.sql
    20260510000002_rls.sql
    20260510000003_storage.sql
    20260510000004_jobs.sql  ← new (PR7)
```

---

## Free trial + paywall

- **Free plan:** 3 deals/month, $5 LLM cap
- **Owner** (`is_owner = true`): no caps
- Stripe billing stub in `lib/stripe.ts` — wired in a future PR
- Usage tracked in `usage_counters` table; read via `GET /api/usage`

---

© 2026 Marketlogic Investors LLC
