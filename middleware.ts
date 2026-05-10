/**
 * middleware.ts
 *
 * Next.js Edge Middleware for DealLens.
 *
 * Responsibilities:
 *   1. Refresh the Supabase session on every request (required by @supabase/ssr).
 *   2. Redirect unauthenticated users away from protected routes to /login.
 *
 * Public routes (no auth required):
 *   /login  /signup  /auth/callback
 *   All static assets: *.html, *.css, *.js, *.ico, *.png, *.jpg, *.svg, *.json
 *   Next.js internals: /_next/
 *
 * If Supabase env vars are not set (e.g. local dev without credentials),
 * the middleware passes all requests through rather than hard-failing.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Routes that are accessible without authentication */
const PUBLIC_PATH_PREFIXES = ['/login', '/signup', '/auth/callback'];

/** File extensions that are always public (static assets) */
const STATIC_EXT_RE = /\.(html|css|js|map|ico|png|jpg|jpeg|gif|webp|svg|json|woff2?|ttf)$/i;

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (pathname.startsWith('/_next')) return true;
  if (STATIC_EXT_RE.test(pathname)) return true;
  if (pathname === '/') return true; // landing page
  return false;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // If Supabase is not configured, pass through (local dev without credentials).
  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Write cookies to the outbound request
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        // Recreate the response so the new cookies are sent to the browser
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session — MUST be called before any redirect logic.
  // getUser() is preferred over getSession() because it validates the JWT
  // against the Supabase Auth server on each request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  /*
   * Match all request paths EXCEPT:
   *   - _next/static  (Next.js static bundle)
   *   - _next/image   (Next.js image optimisation)
   *   - favicon.ico
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon\.ico).*)',
  ],
};
