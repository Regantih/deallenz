/**
 * lib/jobs.ts
 *
 * IngestQueue — abstract interface for the deal-ingest jobs queue.
 *
 * Real implementation: lib/jobs.supabase.ts  (WIRED — SUPABASE_SECRET_KEY required)
 * Mock:               api/ingest-queue.mock.ts (dev/staging only; throws in prod)
 *
 * Jobs table columns:
 *   id          uuid PK
 *   deal_id     uuid FK → deals
 *   kind        text  ('ingest_link' | …)
 *   status      text  ('queued' | 'running' | 'done' | 'failed')
 *   payload     jsonb  (source-type-specific input data)
 *   error       text nullable  (populated on failure)
 *   started_at  timestamptz nullable
 *   finished_at timestamptz nullable
 *   created_at  timestamptz
 *
 * Status transitions (server-enforced):
 *   queued → running  (via claimNext())
 *   running → done    (via markDone())
 *   running → failed  (via markFailed())
 */

export type JobKind = 'ingest_link';

export type JobStatus = 'queued' | 'running' | 'done' | 'failed';

export interface Job {
  id: string;
  deal_id: string;
  kind: JobKind;
  status: JobStatus;
  payload: Record<string, unknown>;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface IngestQueue {
  /**
   * Add a new job to the queue in 'queued' status.
   * Returns the created Job row.
   */
  enqueue(params: {
    deal_id: string;
    kind: JobKind;
    payload: Record<string, unknown>;
  }): Promise<Job>;

  /** Retrieve a specific job by its ID. Returns null if not found. */
  getJob(id: string): Promise<Job | null>;

  /** List all jobs for a given deal, newest-first. */
  listJobsForDeal(deal_id: string): Promise<Job[]>;

  /**
   * Atomically claim the oldest queued job:
   *   status: 'queued' → 'running', started_at = NOW()
   * Returns null if no queued jobs are available.
   * Uses SELECT FOR UPDATE SKIP LOCKED (safe for concurrent workers).
   */
  claimNext(): Promise<Job | null>;

  /** Transition a running job to 'done'. */
  markDone(id: string): Promise<void>;

  /** Transition a running job to 'failed' with an error message. */
  markFailed(id: string, error: string): Promise<void>;
}
