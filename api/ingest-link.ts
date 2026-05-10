/**
 * POST /api/ingest-link  —  Path B: data-room link ingest
 *
 * Framework-agnostic handler. Accepts { url, deal_id }, validates the
 * request, classifies the source type, and enqueues a job via the
 * IngestQueue dependency (injected by the Next.js route handler).
 *
 * The IngestQueue is dependency-injected so this file stays testable
 * and framework-agnostic. The Next.js adapter at
 * app/api/ingest-link/route.ts passes SupabaseJobsQueue in production.
 *
 * Supported sources:
 *   - Google Drive folder / file (connector: future PR — needs GOOGLE_OAUTH_CLIENT_ID)
 *   - Dropbox folder            (connector: future PR — needs DROPBOX_APP_KEY)
 *   - Notion page               (connector: future PR)
 *   - Generic HTTPS page        (single-page fetch, no credentials needed)
 */

import type { IngestQueue } from '../lib/jobs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IngestLinkRequest {
  url: string;
  deal_id: string;
}

export type SourceType =
  | 'google_drive_folder'
  | 'google_drive_file'
  | 'dropbox_folder'
  | 'notion_page'
  | 'generic_webpage';

export interface IngestLinkResponse {
  ok: boolean;
  job_id?: string;
  source_type?: SourceType;
  error?: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Source classification
// ---------------------------------------------------------------------------

const SOURCE_PATTERNS: Array<{ pattern: RegExp; type: SourceType }> = [
  { pattern: /drive\.google\.com\/drive\/folders\//i,  type: 'google_drive_folder' },
  { pattern: /drive\.google\.com\/file\/d\//i,         type: 'google_drive_file'   },
  { pattern: /dropbox\.com\/(sh|scl\/fo)\//i,          type: 'dropbox_folder'       },
  { pattern: /notion\.so\//i,                          type: 'notion_page'          },
];

export function classifySource(url: string): SourceType {
  for (const { pattern, type } of SOURCE_PATTERNS) {
    if (pattern.test(url)) return type;
  }
  return 'generic_webpage';
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  error?: string;
  detail?: string;
}

export function validateIngestRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'INVALID_BODY', detail: 'Request body must be a JSON object.' };
  }

  const { url, deal_id } = body as Record<string, unknown>;

  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'MISSING_URL', detail: '"url" is required and must be a string.' };
  }

  if (!deal_id || typeof deal_id !== 'string') {
    return { valid: false, error: 'MISSING_DEAL_ID', detail: '"deal_id" is required and must be a string.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: 'INVALID_URL', detail: `"${url}" is not a valid absolute URL.` };
  }

  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: 'INSECURE_URL',
      detail: 'Only HTTPS URLs are accepted. Data-room links must use a secure connection.',
    };
  }

  if (deal_id.length < 3 || deal_id.length > 64 || !/^[a-z0-9-]+$/.test(deal_id)) {
    return {
      valid: false,
      error: 'INVALID_DEAL_ID',
      detail:
        '"deal_id" must be 3–64 lowercase letters, numbers, or hyphens (e.g. "pqc-bank").',
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Core handler logic. Call from your framework adapter:
 *
 *   // Next.js (app/api/ingest-link/route.ts)
 *   import { SupabaseJobsQueue } from '@/lib/jobs.supabase';
 *   const queue = new SupabaseJobsQueue();
 *   export async function POST(req) {
 *     const result = await handleIngestLink(await req.json(), queue);
 *     return NextResponse.json(result, { status: result.ok ? 200 : 400 });
 *   }
 */
export async function handleIngestLink(
  body: unknown,
  queue: IngestQueue
): Promise<IngestLinkResponse> {
  const validation = validateIngestRequest(body);
  if (!validation.valid) {
    return { ok: false, error: validation.error, detail: validation.detail };
  }

  const { url, deal_id } = body as IngestLinkRequest;
  const source_type = classifySource(url);

  const job = await queue.enqueue({
    deal_id,
    kind: 'ingest_link',
    payload: { url, source_type },
  });

  return { ok: true, job_id: job.id, source_type };
}
