/**
 * app/api/ingest-link/route.ts
 *
 * POST /api/ingest-link
 *
 * Next.js App Router adapter for the framework-agnostic handleIngestLink
 * handler (api/ingest-link.ts).
 *
 * Uses SupabaseJobsQueue (real) in production.
 * The caller is authenticated — must be signed in to submit a link.
 *
 * Request body (JSON):
 *   { url: string, deal_id: string }
 *
 * Success response:
 *   { ok: true, job_id: string, source_type: SourceType }
 *
 * Error response:
 *   { ok: false, error: string, detail: string }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { SupabaseJobsQueue } from '@/lib/jobs.supabase';
import { handleIngestLink } from '@/api/ingest-link';

export async function POST(request: NextRequest) {
  // ------------------------------------------------------------------
  // 1. Authenticate
  // ------------------------------------------------------------------
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        ok: false,
        error: 'UNAUTHENTICATED',
        detail: 'You must be signed in to submit a data-room link. Sign in at /login.',
      },
      { status: 401 }
    );
  }

  // ------------------------------------------------------------------
  // 2. Parse body
  // ------------------------------------------------------------------
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'INVALID_BODY',
        detail: 'Request body must be valid JSON: { url: string, deal_id: string }.',
      },
      { status: 400 }
    );
  }

  // ------------------------------------------------------------------
  // 3. Verify deal ownership before enqueuing
  // ------------------------------------------------------------------
  const maybeBody = body as Record<string, unknown>;
  const dealId = typeof maybeBody.deal_id === 'string' ? maybeBody.deal_id : null;

  if (dealId) {
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, owner_id')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { ok: false, error: 'DEAL_NOT_FOUND', detail: 'Deal not found or you do not have access.' },
        { status: 404 }
      );
    }

    if (deal.owner_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN', detail: 'You are not the owner of this deal.' },
        { status: 403 }
      );
    }
  }

  // ------------------------------------------------------------------
  // 4. Enqueue with real SupabaseJobsQueue
  // ------------------------------------------------------------------
  const queue = new SupabaseJobsQueue();
  const result = await handleIngestLink(body, queue);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
