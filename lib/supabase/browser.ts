/**
 * lib/supabase/browser.ts
 *
 * Returns a singleton Supabase client for use in Client Components and
 * any browser-side code.  Uses @supabase/ssr createBrowserClient so the
 * session is stored in cookies and stays in sync with server-rendered pages.
 *
 * Required env vars (browser-safe — set with NEXT_PUBLIC_ prefix in Vercel):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * These correspond to SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY from the
 * build spec.  The NEXT_PUBLIC_ prefix is required for Next.js to bundle
 * them into the browser build.
 *
 * See ENV.md for full setup instructions.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

type SupabaseBrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let _client: SupabaseBrowserClient | null = null;

/**
 * Returns a singleton Supabase browser client.
 * Safe to call from any Client Component or browser-side hook.
 *
 * Throws at runtime if the required env vars are absent — surfaces the
 * misconfiguration immediately rather than letting the app silently misbehave.
 */
export function getSupabaseBrowserClient(): SupabaseBrowserClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      '[deallenz] Supabase browser client is not configured.\n' +
        'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.\n' +
        'See ENV.md for setup instructions.'
    );
  }

  _client = createBrowserClient<Database>(url, key);
  return _client;
}
