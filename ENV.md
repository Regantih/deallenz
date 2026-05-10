# DealLens — Environment Variables

All environment variables for DealLens and where to set them.

---

## Quick start

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in the values from your Supabase project dashboard.
3. **Never commit `.env.local`** — it is in `.gitignore`.

---

## Supabase variables

These are the most important variables.  Get them from the
[Supabase Dashboard](https://supabase.com/dashboard) → your project →
**Settings → API**.

| Variable | Scope | Source | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server | Project URL | Your Supabase project URL, e.g. `https://kipyuhjbtkyhfapinwgj.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + Server | `anon` key | Public / publishable key.  Safe to expose to the browser.  Enforces RLS. |
| `SUPABASE_URL` | Server only | Same as above | Set to the same value as `NEXT_PUBLIC_SUPABASE_URL`.  Used by server-only code that must not import `NEXT_PUBLIC_` vars. |
| `SUPABASE_SECRET_KEY` | **Server only** | `service_role` key | **NEVER expose to the browser or commit to git.**  Bypasses RLS.  Used only for trusted server operations (file upload, cost ledger writes). |

### Mapping to build-spec names

The build spec uses `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and
`SUPABASE_SECRET_KEY` as canonical names.  In Next.js, browser-accessible
variables must be prefixed with `NEXT_PUBLIC_`.  The mapping is:

| Build-spec name | Next.js env var name | Browser-safe? |
|---|---|---|
| `SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` (browser) / `SUPABASE_URL` (server) | Yes (URL only) |
| `SUPABASE_PUBLISHABLE_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes |
| `SUPABASE_SECRET_KEY` | `SUPABASE_SECRET_KEY` | **No** |

---

## Setting variables in Vercel

1. Open your Vercel project → **Settings → Environment Variables**.
2. Add each variable with its value.  For `NEXT_PUBLIC_*` variables, set
   the **Environment** to **Production**, **Preview**, and **Development**.
3. For `SUPABASE_SECRET_KEY`, set **Environment** to Production + Preview only,
   and ensure it is **NOT** prefixed with `NEXT_PUBLIC_`.
4. Redeploy after adding variables.

> **Tip:** Vercel allows you to set the same key name with different values per
> environment (Production vs Preview vs Development).  Use this to point
> Preview deployments at a separate Supabase project or branch if needed.

---

## OAuth provider variables

Configure OAuth in the Supabase Dashboard, not in these env files.
GitHub OAuth only needs client ID + secret set in
**Supabase Dashboard → Auth → Providers → GitHub**.

If you need them locally for the Supabase CLI:

| Variable | Description |
|---|---|
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret |

---

## LLM provider variables (PR\#5)

Not needed for auth, upload, or DB operations.  Used from PR\#5 onward.

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude calls |
| `OPENAI_API_KEY` | OpenAI API key (fallback) |

---

## Mock / dev variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Set to `production` in Vercel automatically |
| `USE_MOCKS` | `true` | Allow mock classes (MockStorageClient, MockModelRouter).  Set `false` in production. |
| `MOCK_STORAGE_ROOT` | `/tmp/deallenz-mock-storage` | Override local mock storage path |

---

## Data connector variables (PR\#5)

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth App Client ID (Drive ingest) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth App Client Secret |
| `DROPBOX_APP_KEY` | Dropbox App Key |
| `DROPBOX_APP_SECRET` | Dropbox App Secret |
| `NOTION_INTEGRATION_TOKEN` | Notion integration token |
| `FIRECRAWL_API_KEY` | Firecrawl API key |
| `TAVILY_API_KEY` | Tavily search API key |
