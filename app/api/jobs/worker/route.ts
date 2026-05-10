/**
 * app/api/jobs/worker/route.ts
 *
 * POST /api/jobs/worker
 *
 * Serverless worker: claims one queued job, processes it, then marks it
 * done or failed. Designed to be called by Vercel Cron (every minute) or
 * manually via curl.
 *
 * Security: requires Authorization: Bearer <WORKER_SECRET> header.
 * Set WORKER_SECRET in Vercel env vars.
 *
 * Status transitions:
 *   queued → running → done
 *                   → failed (with error message)
 *
 * Job kinds:
 *   ingest_link — fetches a URL and stores content.
 *     Payload: { url: string, source_type: SourceType }
 *     - google_drive_folder / google_drive_file: throws until GOOGLE_OAUTH creds set
 *     - dropbox_folder:  throws until DROPBOX_APP_KEY set
 *     - notion_page:     throws (Notion connector not yet implemented)
 *     - generic_webpage: fetches page HTML and records a deal_files row
 *
 * Add to vercel.json to run automatically:
 *   { "crons": [{ "path": "/api/jobs/worker", "schedule": "*\/1 * * * *" }] }
 *
 * Curl test:
 *   curl -X POST https://your-app.vercel.app/api/jobs/worker \\
 *     -H "Authorization: Bearer $WORKER_SECRET"
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SupabaseJobsQueue } from '@/lib/jobs.supabase';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  // ------------------------------------------------------------------
  // 1. Authenticate worker caller
  // ------------------------------------------------------------------
  const workerSecret =
    process.env.WORKER_SECRET ?? process.env.SUPABASE_SECRET_KEY;

  if (!workerSecret) {
    return NextResponse.json(
      { ok: false, error: 'WORKER_NOT_CONFIGURED', detail: 'Set WORKER_SECRET in Vercel env vars.' },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token !== workerSecret) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHORIZED', detail: 'Invalid or missing Authorization: Bearer <WORKER_SECRET> header.' },
      { status: 401 }
    );
  }

  // ------------------------------------------------------------------
  // 2. Claim one queued job
  // ------------------------------------------------------------------
  const queue = new SupabaseJobsQueue();
  const job = await queue.claimNext();

  if (!job) {
    return NextResponse.json({ ok: true, processed: 0, detail: 'No queued jobs.' });
  }

  // ------------------------------------------------------------------
  // 3. Process the job
  // ------------------------------------------------------------------
  try {
    if (job.kind === 'ingest_link') {
      await processIngestLinkJob(job.id, job.payload, job.deal_id);
    } else {
      throw new Error(`Unknown job kind: ${job.kind}`);
    }

    await queue.markDone(job.id);
    return NextResponse.json({ ok: true, processed: 1, job_id: job.id, kind: job.kind, status: 'done' });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await queue.markFailed(job.id, errorMsg);
    return NextResponse.json(
      { ok: false, processed: 1, job_id: job.id, kind: job.kind, status: 'failed', error: errorMsg },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Job processors
// ---------------------------------------------------------------------------

async function processIngestLinkJob(
  jobId: string,
  payload: Record<string, unknown>,
  dealId: string
): Promise<void> {
  const url = payload.url as string;
  const sourceType = payload.source_type as string;

  if (!url || !sourceType) {
    throw new Error(`ingest_link job ${jobId} is missing url or source_type in payload.`);
  }

  switch (sourceType) {
    case 'google_drive_folder':
    case 'google_drive_file':
      throw new Error(
        'Google Drive connector is not configured. ' +
          'Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in Vercel env vars.'
      );

    case 'dropbox_folder':
      throw new Error(
        'Dropbox connector is not configured. ' +
          'Set DROPBOX_APP_KEY and DROPBOX_APP_SECRET in Vercel env vars.'
      );

    case 'notion_page':
      throw new Error(
        'Notion connector is not yet implemented. ' +
          'Notion integration is planned for a future PR.'
      );

    case 'generic_webpage':
      await processGenericWebpage(jobId, url, dealId);
      return;

    default:
      throw new Error(`Unknown source type: ${sourceType}`);
  }
}

async function processGenericWebpage(
  jobId: string,
  url: string,
  dealId: string
): Promise<void> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'DealLens/0.5 (+https://marketlogicinvestors.com)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: HTTP ${response.status} ${response.statusText}`
    );
  }

  const contentType = response.headers.get('content-type') ?? 'text/html';
  const rawBody = await response.arrayBuffer();
  const sizeBytes = rawBody.byteLength;

  const admin = getSupabaseAdminClient();
  const storagePath = `deals/${dealId}/webpage-${jobId}.html`;

  const { error: uploadErr } = await admin.storage
    .from('deal-uploads')
    .upload(storagePath, Buffer.from(rawBody), { contentType, upsert: true });

  if (uploadErr) {
    throw new Error(`Storage upload failed for ${url}: ${uploadErr.message}`);
  }

  const { error: dbErr } = await admin
    .from('deal_files')
    .insert({
      deal_id: dealId,
      storage_path: storagePath,
      mime: contentType.split(';')[0].trim(),
      size_bytes: sizeBytes,
      source: 'link_ingest' as const,
    });

  if (dbErr) {
    throw new Error(`deal_files insert failed for job ${jobId}: ${dbErr.message}`);
  }
}
