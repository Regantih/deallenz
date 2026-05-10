/**
 * app/api/health/route.ts
 *
 * GET /api/health
 *
 * Pings both wired services (Supabase + Anthropic) and returns their status.
 * Used by Vercel deploy checks and manual curl verification.
 *
 * Response shape:
 * {
 *   supabase:  'ok' | 'error: <message>',
 *   anthropic: 'ok' | 'error: <message>',
 *   version:   string,   // package.json version or '0.5.0'
 *   commit:    string,   // 7-char git SHA or 'local'
 * }
 *
 * HTTP status: 200 when both ok, 503 when either fails.
 *
 * How to verify:
 *   curl https://your-app.vercel.app/api/health
 *   # Expected: { "supabase": "ok", "anthropic": "ok", "version": "0.5.0", "commit": "<sha>" }
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

interface HealthResult {
  supabase: string;
  anthropic: string;
  version: string;
  commit: string;
}

export async function GET() {
  const result: HealthResult = {
    supabase: 'unknown',
    anthropic: 'unknown',
    version: process.env.npm_package_version ?? '0.5.0',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
  };

  // ------------------------------------------------------------------
  // 1. Ping Supabase — SELECT 1 row from profiles (cheap, auth-aware)
  // ------------------------------------------------------------------
  try {
    const admin = getSupabaseAdminClient();
    const { error } = await admin
      .from('profiles')
      .select('id')
      .limit(1);
    result.supabase = error ? `error: ${error.message}` : 'ok';
  } catch (err) {
    result.supabase = `error: ${(err as Error).message}`;
  }

  // ------------------------------------------------------------------
  // 2. Ping Anthropic — tiny 1-token message to verify the key works
  // ------------------------------------------------------------------
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    result.anthropic =
      'error: ANTHROPIC_API_KEY missing - configure in Vercel env vars before deploying';
  } else {
    try {
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
      result.anthropic = 'ok';
    } catch (err) {
      result.anthropic = `error: ${(err as Error).message}`;
    }
  }

  const allOk = result.supabase === 'ok' && result.anthropic === 'ok';
  return NextResponse.json(result, { status: allOk ? 200 : 503 });
}
