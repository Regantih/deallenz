/**
 * lib/jobs.supabase.ts
 *
 * SupabaseJobsQueue — REAL implementation of IngestQueue.
 *
 * Backed by the public.jobs table (see supabase/migrations/20260510000004_jobs.sql).
 * claimNext() uses the claim_next_job() RPC function (SELECT FOR UPDATE SKIP LOCKED)
 * to safely handle concurrent workers.
 *
 * Server-only. Uses SUPABASE_SECRET_KEY (service-role, bypasses RLS).
 */

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { IngestQueue, Job, JobKind } from './jobs';

// ---------------------------------------------------------------------------
// SupabaseJobsQueue
// ---------------------------------------------------------------------------

export class SupabaseJobsQueue implements IngestQueue {
  private readonly client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;

    if (!url || !key) {
      throw new Error(
        '[deallenz] SupabaseJobsQueue: NEXT_PUBLIC_SUPABASE_URL and ' +
          'SUPABASE_SECRET_KEY must be set. See ENV.md for setup instructions.'
      );
    }

    this.client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  // -------------------------------------------------------------------------
  // enqueue
  // -------------------------------------------------------------------------

  async enqueue(params: {
    deal_id: string;
    kind: JobKind;
    payload: Record<string, unknown>;
  }): Promise<Job> {
    const { data, error } = await this.client
      .from('jobs')
      .insert({
        deal_id: params.deal_id,
        kind: params.kind,
        status: 'queued',
        payload: params.payload,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(
        `[deallenz] SupabaseJobsQueue.enqueue failed: ${
          error?.message ?? 'no row returned'
        }`
      );
    }

    return rowToJob(data);
  }

  // -------------------------------------------------------------------------
  // getJob
  // -------------------------------------------------------------------------

  async getJob(id: string): Promise<Job | null> {
    const { data, error } = await this.client
      .from('jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(
        `[deallenz] SupabaseJobsQueue.getJob(${id}) failed: ${error.message}`
      );
    }

    return data ? rowToJob(data) : null;
  }

  // -------------------------------------------------------------------------
  // listJobsForDeal
  // -------------------------------------------------------------------------

  async listJobsForDeal(deal_id: string): Promise<Job[]> {
    const { data, error } = await this.client
      .from('jobs')
      .select('*')
      .eq('deal_id', deal_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(
        `[deallenz] SupabaseJobsQueue.listJobsForDeal(${deal_id}) failed: ${error.message}`
      );
    }

    return (data ?? []).map(rowToJob);
  }

  // -------------------------------------------------------------------------
  // claimNext — uses DB RPC for race-safe SELECT FOR UPDATE SKIP LOCKED
  // -------------------------------------------------------------------------

  async claimNext(): Promise<Job | null> {
    const { data, error } = await this.client.rpc('claim_next_job');

    if (error) {
      throw new Error(
        `[deallenz] SupabaseJobsQueue.claimNext() failed: ${error.message}`
      );
    }

    if (!data || (Array.isArray(data) && data.length === 0)) return null;

    const row = Array.isArray(data) ? data[0] : data;
    return rowToJob(row);
  }

  // -------------------------------------------------------------------------
  // markDone
  // -------------------------------------------------------------------------

  async markDone(id: string): Promise<void> {
    const { error } = await this.client
      .from('jobs')
      .update({
        status: 'done',
        finished_at: new Date().toISOString(),
        error: null,
      })
      .eq('id', id)
      .eq('status', 'running'); // safety check: only transition from running

    if (error) {
      throw new Error(
        `[deallenz] SupabaseJobsQueue.markDone(${id}) failed: ${error.message}`
      );
    }
  }

  // -------------------------------------------------------------------------
  // markFailed
  // -------------------------------------------------------------------------

  async markFailed(id: string, errorMessage: string): Promise<void> {
    const { error } = await this.client
      .from('jobs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error: errorMessage,
      })
      .eq('id', id);

    if (error) {
      throw new Error(
        `[deallenz] SupabaseJobsQueue.markFailed(${id}) failed: ${error.message}`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    deal_id: row.deal_id as string,
    kind: row.kind as Job['kind'],
    status: row.status as Job['status'],
    payload: (row.payload as Record<string, unknown>) ?? {},
    error: (row.error as string | null) ?? null,
    started_at: (row.started_at as string | null) ?? null,
    finished_at: (row.finished_at as string | null) ?? null,
    created_at: row.created_at as string,
  };
}
