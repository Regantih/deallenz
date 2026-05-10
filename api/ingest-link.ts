/**
 * POST /api/ingest-link  —  Path B: data-room link ingest
 *
 * Accepts { url, deal_id }, validates the request, classifies the source
 * type, and enqueues an ingest job.
 *
 * Supported sources (this stub):
 *   • Google Drive folder   drive.google.com/drive/folders/...
 *   • Google Drive file     drive.google.com/file/d/...
 *   • Dropbox folder        dropbox.com/sh/... or dropbox.com/scl/fo/...
 *   • Notion page           notion.so/...
 *   • Generic HTTPS page    any other https:// URL (single-page fetch)
 *
 * Real connectors (Google Drive API, Dropbox SDK, Notion API, Firecrawl)
 * land in PR#5.  This stub validates, classifies, and hands off to
 * MockIngestQueue.
 *
 * Framework-agnostic: wrap with /api/adapters/vercel.ts or
 * /api/adapters/cloudflare-worker.ts for deployment.
 */

import { MockIngestQueue } from './ingest-queue.mock';
import type { IngestJob } from './ingest-queue.mock';

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
  {
    pattern: /drive\.google\.com\/drive\/folders\//i,
    type: 'google_drive_folder',
  },
  {
    pattern: /drive\.google\.com\/file\/d\//i,
    type: 'google_drive_file',
  },
  {
    // Covers both legacy /sh/ and newer /scl/fo/ sharing URLs
    pattern: /dropbox\.com\/(sh|scl\/fo)\//i,
    type: 'dropbox_folder',
  },
  {
    pattern: /notion\.so\//i,
    type: 'notion_page',
  },
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
    return {
      valid: false,
      error: 'INVALID_BODY',
      detail: 'Request body must be a JSON object.',
    };
  }

  const { url, deal_id } = body as Record<string, unknown>;

  if (!url || typeof url !== 'string') {
    return {
      valid: false,
      error: 'MISSING_URL',
      detail: '"url" is required and must be a string.',
    };
  }

  if (!deal_id || typeof deal_id !== 'string') {
    return {
      valid: false,
      error: 'MISSING_DEAL_ID',
      detail: '"deal_id" is required and must be a string.',
    };
  }

  // URL must parse
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      valid: false,
      error: 'INVALID_URL',
      detail: `"${url}" is not a valid absolute URL.`,
    };
  }

  // Must be HTTPS
  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: 'INSECURE_URL',
      detail: 'Only HTTPS URLs are accepted. Data-room links must use a secure connection.',
    };
  }

  // deal_id format: 3–64 lowercase alphanumeric + hyphens
  if (
    deal_id.length < 3 ||
    deal_id.length > 64 ||
    !/^[a-z0-9-]+$/.test(deal_id)
  ) {
    return {
      valid: false,
      error: 'INVALID_DEAL_ID',
      detail:
        '"deal_id" must be 3–64 lowercase letters, numbers, or hyphens ' +
        '(e.g. "acme-finance" or "pqc-bank").',
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Singleton queue (replaced by a real queue client in PR#5)
// ---------------------------------------------------------------------------

/**
 * Module-level singleton so the queue survives across handler invocations
 * within the same process (useful for local dev + tests).
 * In production this will be replaced by a real queue client.
 */
export const queue = new MockIngestQueue();

// ---------------------------------------------------------------------------
// Handler (framework-agnostic)
// ---------------------------------------------------------------------------

/**
 * Core handler logic. Call this from your framework adapter:
 *
 *   // Vercel
 *   export default async (req, res) => {
 *     const result = await handleIngestLink(req.body);
 *     res.status(result.ok ? 200 : 400).json(result);
 *   };
 */
export async function handleIngestLink(
  body: unknown
): Promise<IngestLinkResponse> {
  // 1. Validate
  const validation = validateIngestRequest(body);
  if (!validation.valid) {
    return {
      ok: false,
      error: validation.error,
      detail: validation.detail,
    };
  }

  const { url, deal_id } = body as IngestLinkRequest;

  // 2. Classify source
  const source_type = classifySource(url);

  // 3. Build job
  const job: IngestJob = {
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    deal_id,
    url,
    source_type,
    status: 'queued',
    queued_at: new Date().toISOString(),
    attempts: 0,
  };

  // 4. Enqueue (real queue in PR#5)
  await queue.enqueue(job);

  return { ok: true, job_id: job.id, source_type };
}
