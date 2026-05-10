/**
 * MockIngestQueue
 * In-memory queue for data-room ingest jobs.
 * Jobs run with artificial delay so the UI shows live status transitions:
 *   queued → running → done | failed
 *
 * ONLY usable when NODE_ENV !== 'production', OR USE_MOCKS=true (staging).
 * In production without USE_MOCKS, the import throws immediately.
 *
 * Real implementation: lib/jobs.supabase.ts (WIRED — PR7)
 */

import type { IngestQueue, Job, JobKind, JobStatus } from '../lib/jobs';

if (
  typeof process !== 'undefined' &&
  process.env?.NODE_ENV === 'production' &&
  process.env?.USE_MOCKS !== 'true'
) {
  throw new Error(
    '[deallenz] MockIngestQueue must NOT be used in production. ' +
      'Real jobs require SupabaseJobsQueue with SUPABASE_SECRET_KEY set (see ENV.md). ' +
      'Set USE_MOCKS=true only on staging environments.'
  );
}

type InMemoryJob = Job & { _listeners: Array<(j: Job) => void> };

export class MockIngestQueue implements IngestQueue {
  private jobs: Map<string, InMemoryJob> = new Map();
  private counter = 0;

  async enqueue(params: {
    deal_id: string;
    kind: JobKind;
    payload: Record<string, unknown>;
  }): Promise<Job> {
    const id = `mock-job-${++this.counter}-${Date.now()}`;
    const job: InMemoryJob = {
      id,
      deal_id: params.deal_id,
      kind: params.kind,
      status: 'queued',
      payload: params.payload,
      error: null,
      started_at: null,
      finished_at: null,
      created_at: new Date().toISOString(),
      _listeners: [],
    };
    this.jobs.set(id, job);
    void this.simulateProcessing(id);
    return this.toPublic(job);
  }

  async getJob(id: string): Promise<Job | null> {
    const job = this.jobs.get(id);
    return job ? this.toPublic(job) : null;
  }

  async listJobsForDeal(deal_id: string): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter(j => j.deal_id === deal_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(j => this.toPublic(j));
  }

  async claimNext(): Promise<Job | null> {
    const queued = Array.from(this.jobs.values()).find(
      j => j.status === 'queued'
    );
    if (!queued) return null;
    this.update(queued.id, { status: 'running', started_at: new Date().toISOString() });
    return this.toPublic(this.jobs.get(queued.id)!);
  }

  async markDone(id: string): Promise<void> {
    this.update(id, { status: 'done', finished_at: new Date().toISOString() });
  }

  async markFailed(id: string, error: string): Promise<void> {
    this.update(id, { status: 'failed', finished_at: new Date().toISOString(), error });
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private update(id: string, changes: Partial<Job>): void {
    const job = this.jobs.get(id);
    if (!job) return;
    Object.assign(job, changes);
    for (const fn of job._listeners) fn(this.toPublic(job));
  }

  private toPublic(job: InMemoryJob): Job {
    const { _listeners: _l, ...pub } = job;
    void _l; // suppress unused warning
    return pub as Job;
  }

  private async simulateProcessing(id: string): Promise<void> {
    // 2–4 second queue wait
    await new Promise(r => setTimeout(r, 2_000 + Math.random() * 2_000));
    const job = this.jobs.get(id);
    if (!job || job.status !== 'queued') return;

    this.update(id, { status: 'running', started_at: new Date().toISOString() });

    const processingTime: Record<string, number> = {
      google_drive_folder: 2_000,
      google_drive_file:   1_000,
      dropbox_folder:      1_800,
      notion_page:         1_200,
      generic_webpage:       800,
    };
    const sourceType = (job.payload?.source_type as string) ?? 'generic_webpage';
    await new Promise(r => setTimeout(r, processingTime[sourceType] ?? 1_500));

    // In mock mode, job completes but payload signals mock nature
    this.update(id, {
      status: 'done',
      finished_at: new Date().toISOString(),
    });
  }
}

/** Singleton for use in legacy api/ingest-link.ts (non-DI callers) */
export const mockIngestQueue = new MockIngestQueue();
