/**
 * MockIngestQueue
 * In-memory queue for data-room ingest jobs.
 * Jobs are processed with realistic artificial delay so the UI can show
 * live status transitions: queued → processing → done | failed.
 *
 * ONLY usable when USE_MOCKS=true or NODE_ENV !== 'production'.
 * Real queue (Supabase pgmq or Cloudflare Queues) lands in PR#5.
 */

import type { SourceType } from './ingest-link';

if (
  typeof process !== 'undefined' &&
  process.env?.NODE_ENV === 'production' &&
  process.env?.USE_MOCKS !== 'true'
) {
  throw new Error(
    '[deallenz] MockIngestQueue must not be used in production. ' +
    'Set USE_MOCKS=true to override (only for staging).'
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobStatus = 'queued' | 'processing' | 'done' | 'failed';

export interface IngestJob {
  id: string;
  deal_id: string;
  url: string;
  source_type: SourceType;
  status: JobStatus;
  queued_at: string;       // ISO-8601
  started_at?: string;
  completed_at?: string;
  error?: string;
  attempts: number;
  result?: IngestJobResult;
}

export interface IngestJobResult {
  files_found: number;
  files_ingested: number;
  pages_scraped: number;
  /**
   * Fields extracted from the ingested documents.
   * In mock mode this always contains { _mock: true } to make the
   * mock nature unmistakable.
   */
  extracted_fields: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// MockIngestQueue
// ---------------------------------------------------------------------------

export class MockIngestQueue {
  private jobs: Map<string, IngestJob> = new Map();
  private listeners: Map<string, Array<(job: IngestJob) => void>> = new Map();

  /** Add a job to the queue and begin async processing. */
  async enqueue(job: IngestJob): Promise<void> {
    this.jobs.set(job.id, { ...job });
    void this.processAfterDelay(job.id);
  }

  /** Retrieve a job by id. */
  async getJob(id: string): Promise<IngestJob | undefined> {
    return this.jobs.get(id);
  }

  /** List all jobs for a given deal, newest first. */
  async listJobsForDeal(deal_id: string): Promise<IngestJob[]> {
    return Array.from(this.jobs.values())
      .filter(j => j.deal_id === deal_id)
      .sort((a, b) => b.queued_at.localeCompare(a.queued_at));
  }

  /**
   * Register a listener that fires whenever a specific job's status changes.
   * Useful for streaming status to the browser via SSE or WebSocket.
   */
  onJobUpdate(job_id: string, fn: (job: IngestJob) => void): void {
    const existing = this.listeners.get(job_id) ?? [];
    existing.push(fn);
    this.listeners.set(job_id, existing);
  }

  // -------------------------------------------------------------------------
  // Internal processing
  // -------------------------------------------------------------------------

  private processAfterDelay(id: string): Promise<void> {
    // Simulate 2–4 second queue wait
    const delay = 2_000 + Math.random() * 2_000;
    return new Promise(resolve =>
      setTimeout(() => this.processJob(id).then(resolve), delay)
    );
  }

  private async processJob(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;

    // Transition: queued → processing
    const processing: IngestJob = {
      ...job,
      status: 'processing',
      started_at: new Date().toISOString(),
      attempts: job.attempts + 1,
    };
    this.jobs.set(id, processing);
    this.notify(processing);

    // Simulate processing time (1–2 seconds per source type)
    const processingTime: Record<string, number> = {
      google_drive_folder: 2_000,
      google_drive_file:   1_000,
      dropbox_folder:      1_800,
      notion_page:         1_200,
      generic_webpage:       800,
    };
    await new Promise(r =>
      setTimeout(r, processingTime[job.source_type] ?? 1_500)
    );

    // Mock success result — clearly labeled
    const result: IngestJobResult = {
      files_found: 3,
      files_ingested: 3,
      pages_scraped: 12,
      extracted_fields: {
        _mock: true,
        note:
          'Mock ingest result. Real connector not yet implemented (PR#5). ' +
          'No actual files were fetched.',
        source_type: job.source_type,
        url: job.url,
      },
    };

    // Transition: processing → done
    const done: IngestJob = {
      ...processing,
      status: 'done',
      completed_at: new Date().toISOString(),
      result,
    };
    this.jobs.set(id, done);
    this.notify(done);
  }

  private notify(job: IngestJob): void {
    const fns = this.listeners.get(job.id) ?? [];
    for (const fn of fns) fn(job);
  }
}
