/**
 * app/api/health/route.ts
 *
 * GET /api/health  — PUBLIC, no authentication required.
 *
 * Returns a lightweight JSON 200 confirming the deployment is alive.
 * Excluded from auth-gating via middleware.ts PUBLIC_PATH_PREFIXES.
 *
 * Response shape:
 * {
 *   status: "ok",
 *   commit: string,   // first 7 chars of VERCEL_GIT_COMMIT_SHA, or "local"
 *   time:   string,   // ISO 8601 timestamp of this response
 * }
 *
 * Always HTTP 200.  Deep service pings (Supabase, Anthropic) belong on a
 * separate authenticated endpoint (/api/health/deep) — not here — because
 * this endpoint is hammered by uptime monitors and Vercel deploy checks.
 *
 * Verify:
 *   curl -i https://your-app.vercel.app/api/health
 *   # HTTP/2 200
 *   # {"status":"ok","commit":"a1b2c3d","time":"2026-05-10T12:00:00.000Z"}
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      time: new Date().toISOString(),
    },
    { status: 200 },
  );
}
