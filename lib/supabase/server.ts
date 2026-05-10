/**
 * lib/supabase/server.ts
 *
 * Provides two server-side Supabase clients:
 *
 *   getSupabaseServerClient()
 *     - Uses the publishable (anon) key + user session from cookies.
 *     - Respects Row Level Security.
 *
 *   getSupabaseAdminClient(): SupabaseClient<Database>
 *     - Uses the service-role secret key.
 *     - BYPASSES Row Level Security.
 *     - Explicit return type annotation required: without it,
 *       @supabase/supabase-js@^2.49 (resolved: 2.105.4) cannot infer
 *       the Database generic through the Omit<Database,'__InternalSupabase'>
 *       chain in SupabaseClient, causing .from().insert() to resolve to
 *       'never[]' in strict TypeScript. Explicit SupabaseClient<Database>
 *       anchors the type correctly.
 *
 * IMPORTANT: This file is server-only. The 'server-only' package causes a
 * build-time error if it is accidentally imported into a Client Component.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_URL (optional; falls back to NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SECRET_KEY  ← service_role key; never expose to browser
 */

import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './types';

// ---------------------------------------------------------------------------
// User-scoped client (respects RLS)
// ---------------------------------------------------------------------------

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
 * Returns a typed SupabaseClient<Database> using the service-role secret key.
 *
 * The explicit return type SupabaseClient<Database> is intentional and load-
 * bearing: without it the TypeScript compiler cannot propagate the Database
 * generic through SupabaseClient's complex conditional type chain
 * (introduced in @supabase/supabase-js@2.49+), which causes
 * .from('table').insert({...}) to incorrectly resolve the insert type to
 * 'never[]' under strict mode.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> {
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
