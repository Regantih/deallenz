-- =============================================================================
-- 20260510000004_jobs.sql
-- DealLens — Ingest Jobs Queue
--
-- Apply via: npx supabase db push
-- Or paste into Supabase Dashboard → SQL Editor.
--
-- Creates:
--   public.jobs              — one row per queued ingest job
--   claim_next_job()         — RPC: atomically claims one queued job
--   RLS policies             — owner-only read; service-role for writes
-- =============================================================================

-- ---------------------------------------------------------------------------
-- jobs table
-- ---------------------------------------------------------------------------

create table if not exists public.jobs (
  id           uuid         primary key default gen_random_uuid(),
  deal_id      uuid         not null references public.deals (id) on delete cascade,
  kind         text         not null check (kind in ('ingest_link')),
  status       text         not null default 'queued'
                            check (status in ('queued', 'running', 'done', 'failed')),
  payload      jsonb        not null default '{}',
  error        text,
  started_at   timestamptz,
  finished_at  timestamptz,
  created_at   timestamptz  not null default now()
);

comment on table  public.jobs           is 'Asynchronous ingest jobs queue. One row per enqueued task.';
comment on column public.jobs.kind      is 'Job type: ingest_link (Path B data-room fetch).';
comment on column public.jobs.status    is 'queued → running → done | failed. Enforced by DB constraints and worker logic.';
comment on column public.jobs.payload   is 'JSON input for the worker (e.g. { url, source_type }).';
comment on column public.jobs.error     is 'Error message when status=failed. null when done or pending.';

create index if not exists jobs_deal_id_idx   on public.jobs (deal_id);
create index if not exists jobs_status_idx    on public.jobs (status) where status = 'queued';
create index if not exists jobs_created_at_idx on public.jobs (created_at);


-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.jobs enable row level security;

-- Owners of the parent deal can read their jobs
create policy "jobs: owner can select"
  on public.jobs for select
  using (
    exists (
      select 1 from public.deals d
      where d.id = jobs.deal_id
        and d.owner_id = auth.uid()
    )
  );

-- Service-role (bypasses RLS) handles all inserts + updates from the worker
-- No direct user insert/update/delete policies — all mutations go via server APIs


-- ---------------------------------------------------------------------------
-- claim_next_job() — race-safe job claiming via FOR UPDATE SKIP LOCKED
-- ---------------------------------------------------------------------------

create or replace function public.claim_next_job()
returns setof public.jobs
language plpgsql
security definer
as $$
declare
  claimed_row public.jobs;
begin
  -- Atomically claim the oldest queued job; skip any locked by another worker
  update public.jobs
  set
    status     = 'running',
    started_at = now()
  where id = (
    select id
    from public.jobs
    where status = 'queued'
    order by created_at asc
    limit 1
    for update skip locked
  )
  returning * into claimed_row;

  if found then
    return next claimed_row;
  end if;

  return;
end;
$$;

comment on function public.claim_next_job is
  'Atomically claims the oldest queued job (status queued → running). ' ||
  'Uses SELECT FOR UPDATE SKIP LOCKED to prevent double-processing. ' ||
  'Called by the /api/jobs/worker endpoint.';
