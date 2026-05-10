/**
 * app/auth/callback/route.ts
 *
 * Handles the OAuth and magic-link callback from Supabase Auth.
 *
 * Supabase redirects to this URL after the user:
 *   a) Clicks a magic link in their email, OR
 *   b) Authorises the GitHub OAuth app.
 *
 * This route exchanges the one-time code for a session, writes the session
 * cookies, and redirects the user to the page they came from (or the
 * pipeline page).
 *
 * Error cases are redirected back to /login with an explanatory message so
 * the user sees a real error rather than a blank page.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/deals.html';
  const oauthError = searchParams.get('error');
  const oauthErrorDesc = searchParams.get('error_description');

  // Supabase passes error / error_description on OAuth failures
  if (oauthError) {
    console.error('[auth/callback] OAuth provider error:', oauthError, oauthErrorDesc);
    const redirectUrl = new URL('/login', origin);
    redirectUrl.searchParams.set(
      'error',
      oauthErrorDesc ?? oauthError
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    const redirectUrl = new URL('/login', origin);
    redirectUrl.searchParams.set('error', 'Missing auth code in callback URL.');
    return NextResponse.redirect(redirectUrl);
  }

  const cookieStore = await cookies();

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.error('[auth/callback] Supabase env vars not configured.');
    const redirectUrl = new URL('/login', origin);
    redirectUrl.searchParams.set(
      'error',
      'Auth service is not configured. Contact the site administrator.'
    );
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error('[auth/callback] Code exchange failed:', exchangeError.message);
    const redirectUrl = new URL('/login', origin);
    redirectUrl.searchParams.set('error', exchangeError.message);
    return NextResponse.redirect(redirectUrl);
  }

  // Ensure the profile row exists (the DB trigger handles this, but belt-and-
  // suspenders for cases where the trigger fired before the session was written).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? '',
        plan: 'free',
        is_owner: false,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
  }

  // Redirect to the intended destination (or pipeline default)
  return NextResponse.redirect(new URL(next, origin));
}
