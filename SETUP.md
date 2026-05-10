# DealLens — Setup Guide

Step-by-step instructions to get DealLens running locally and deployed.

---

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10 (or pnpm / yarn)
- [Supabase CLI](https://supabase.com/docs/guides/cli): `npm install -g supabase`
- A Supabase project (already provisioned; project ref: `kipyuhjbtkyhfapinwgj`)

---

## 1. Clone and install

```bash
git clone https://github.com/Regantih/deallenz.git
cd deallenz
npm install
```

---

## 2. Configure environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Open `.env.local` and set:

```
NEXT_PUBLIC_SUPABASE_URL=https://kipyuhjbtkyhfapinwgj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
SUPABASE_URL=https://kipyuhjbtkyhfapinwgj.supabase.co
SUPABASE_SECRET_KEY=<your-service-role-key>
```

Get the keys from:
**Supabase Dashboard → kipyuhjbtkyhfapinwgj → Settings → API**

See [ENV.md](./ENV.md) for the full variable reference.

---

## 3. Apply database migrations

### Option A — Supabase CLI (recommended)

Link the CLI to the remote project:

```bash
npx supabase link --project-ref kipyuhjbtkyhfapinwgj
```

You will be prompted for your Supabase database password.  Then push
all migrations:

```bash
npx supabase db push
```

This applies the three migration files in order:

| File | What it creates |
|---|---|
| `supabase/migrations/20260510000001_init.sql` | Extensions, all core tables, `updated_at` trigger |
| `supabase/migrations/20260510000002_rls.sql` | RLS enabled on all tables, all policies, auth trigger |
| `supabase/migrations/20260510000003_storage.sql` | `deal-uploads` bucket, Storage RLS policies |

### Option B — Supabase Dashboard SQL editor

1. Open the [Supabase SQL editor](https://supabase.com/dashboard/project/kipyuhjbtkyhfapinwgj/sql).
2. Paste and run each migration file in order (01 → 02 → 03).

---

## 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- `/login` — sign in with email magic link or GitHub OAuth
- `/signup` — create an account (free tier: 3 deals / month)
- The existing `.html` pages (app.html, deal.html, etc.) continue to work
  as static files served by your browser directly, or from the GitHub
  Pages URL.

---

## 5. Deploy to Vercel

### One-time setup

1. Push this branch to GitHub and open a PR against `pr4/chat-and-rich-memo`.
2. Import the repo in [Vercel](https://vercel.com/new).
3. Set the **Framework Preset** to **Next.js**.
4. Add all environment variables from `.env.local` in
   **Vercel → Project → Settings → Environment Variables**.
   - Mark `SUPABASE_SECRET_KEY` as **server-only** (do NOT prefix with `NEXT_PUBLIC_`).
5. Set the **Root Directory** to `.` (the repo root).
6. Deploy.

### Supabase Auth redirect URLs

After deploying, add your Vercel domain to Supabase's allowed redirect URLs:

**Supabase Dashboard → Authentication → URL Configuration:**

- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/auth/callback`

---

## 6. Enable GitHub OAuth (optional)

1. Create a GitHub OAuth App at https://github.com/settings/developers.
   - Homepage URL: `https://your-app.vercel.app`
   - Callback URL: `https://kipyuhjbtkyhfapinwgj.supabase.co/auth/v1/callback`
2. Copy the Client ID and Client Secret.
3. In **Supabase Dashboard → Auth → Providers → GitHub**:
   - Enable the GitHub provider.
   - Paste the Client ID and Client Secret.
4. Done — the "Continue with GitHub" button on the login page will work.

---

## 7. Set the owner flag

The `profiles.is_owner = true` flag bypasses usage counters.  Set it for
Marketlogic Investors LLC operators via the Supabase SQL editor:

```sql
-- Replace with the user's actual UUID from auth.users
update public.profiles
set is_owner = true
where email = 'operator@marketlogicinvestors.com';
```

This must be done with the service-role key or directly in the dashboard;
normal authenticated users cannot set their own `is_owner` flag.

---

## 8. Type-check

```bash
# Next.js app (app/, lib/, middleware)
npm run type-check

# Standalone lib/ + api/ (when PR#3 is merged)
npm run type-check:lib
```

---

## 9. Generate DB types (after schema stabilises)

```bash
npx supabase gen types typescript \\
  --project-id kipyuhjbtkyhfapinwgj \\
  --schema public \\
  > lib/supabase/types.ts
```

This replaces the hand-authored placeholder in `lib/supabase/types.ts`.
