/**
 * lib/supabase/server.ts
 *
 * Provides two server-side Supabase clients:
 *
 *   getSupabaseServerClient()
 *     - Uses the publishable (anon) key + user session from cookies.
 *     - Respects Row Level Security.
 *     - Use in Server Components, Server Actions, and route handlers for
 *       any user-scoped operations.
 *
 *   getSupabaseAdminClient()
 *     - Uses the service-role secret key.
 *     - BYPASSES Row Level Security.
 *     - Use only for trusted server operations:
 *         * uploading files to Storage on behalf of a verified user
 *         * inserting cost_ledger rows after a run
 *         * creating profile rows on first sign-in
 *
 * IMPORTANT: This file is server-only. The 'server-only' package causes a
 * build-time error if it is accidentally imported into a Client Component.
 *
 * Required env vars (server-side only — never add NEXT_PUBLIC_ prefix):
 *   SUPABASE_URL
 *   SUPABASE_SECRET_KEY  ← service_role key; never expose to the browser
 *
 * Required env vars (browser-safe, but also readable server-side):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * See ENV.md for full setup instructions.
 */

import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './types';

// ---------------------------------------------------------------------------
// User-scoped client (respects RLS)
// ---------------------------------------------------------------------------

/**
 * Returns a Supabase server client that reads/writes the current user session
 * from the Next.js cookie store.
 *
 * Respects Row Level Security — users see only their own data.
 * Use this for all user-initiated data reads and writes.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      '[deallenz] Supabase server client is not configured.\n' +
        'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.\n' +
        'See ENV.md for setup instructions.'
    );
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Components cannot set cookies; the middleware refreshes the
          // session before the page renders, so this is safe to ignore here.
        }
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Admin / service-role client (bypasses RLS)
// ---------------------------------------------------------------------------

/**
 * Returns a stateless Supabase client using the service-role secret key.
 *
 * Bypasses RLS — use ONLY for trusted server operations.
 * Never call this from Client Components or expose the result to the browser.
 *
 * The client is not a singleton because service-role tokens don’t expire and
 * the client is lightweight to construct.
 */
export function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      '[deallenz] Supabase admin client is not configured.\n' +
        'Set SUPABASE_URL and SUPABASE_SECRET_KEY (server-side only).\n' +
        'See ENV.md for setup instructions.'
    );
  }

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
