-- =============================================================================
-- 20260510000001_init.sql
-- DealLens core schema
--
-- Apply via: npx supabase db push
-- Or via Supabase Dashboard → SQL Editor (paste and run).
--
-- Tables created:
--   public.profiles        — one row per authenticated user
--   public.deals           — deal records owned by a profile
--   public.deal_files      — uploaded / ingested files per deal
--   public.deal_runs       — agent-swarm execution records
--   public.cost_ledger     — granular LLM call costs per run
--   public.usage_counters  — monthly usage per user (guardrails)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";


-- ---------------------------------------------------------------------------
-- profiles
-- One row per Supabase Auth user.  Created automatically via trigger in
-- 20260510000002_rls.sql after auth.users insert.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  email       text        not null default '',
  plan        text        not null default 'free'
                          check (plan in ('free', 'pro', 'team')),
  is_owner    boolean     not null default false,
  created_at  timestamptz not null default now()
);

comment on table  public.profiles             is 'One row per authenticated user.  is_owner=true bypasses usage guardrails.';
comment on column public.profiles.plan        is 'free | pro | team — determines feature-access tier.';
comment on column public.profiles.is_owner    is 'true for Marketlogic Investors LLC operators; bypasses usage_counters limits.';


-- ---------------------------------------------------------------------------
-- deals
-- ---------------------------------------------------------------------------

create table if not exists public.deals (
  id          uuid        primary key default gen_random_uuid(),
  owner_id    uuid        not null references public.profiles (id) on delete cascade,
  name        text        not null,
  stage       text        check (stage in ('pre-seed', 'seed', 'series-a', 'series-b', 'growth')),
  status      text        not null default 'intake'
                          check (status in ('intake', 'enriching', 'review', 'pass', 'invest', 'portfolio')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.deals          is 'One row per deal record, owned by a profile.';
comment on column public.deals.stage    is 'pre-seed | seed | series-a | series-b | growth';
comment on column public.deals.status   is 'intake | enriching | review | pass | invest | portfolio';

-- Auto-update updated_at on every row change
create or replace function public.set_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger deals_set_updated_at
  before update on public.deals
  for each row
  execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- deal_files
-- ---------------------------------------------------------------------------

create table if not exists public.deal_files (
  id            uuid        primary key default gen_random_uuid(),
  deal_id       uuid        not null references public.deals (id) on delete cascade,
  storage_path  text        not null,
  mime          text,
  size_bytes    bigint      not null default 0,
  source        text        not null check (source in ('upload', 'link_ingest')),
  created_at    timestamptz not null default now()
);

comment on table  public.deal_files              is 'Uploaded or link-ingested files associated with a deal.';
comment on column public.deal_files.storage_path is 'Supabase Storage object key, e.g. deals/{deal_id}/{uuid}-{name}.';
comment on column public.deal_files.source       is 'upload = Path A (direct upload);  link_ingest = Path B (data-room URL).';


-- ---------------------------------------------------------------------------
-- deal_runs
-- ---------------------------------------------------------------------------

create table if not exists public.deal_runs (
  id                uuid        primary key default gen_random_uuid(),
  deal_id           uuid        not null references public.deals (id) on delete cascade,
  status            text        not null default 'pending'
                                check (status in ('pending', 'running', 'done', 'failed')),
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  total_usd         numeric(10, 6),
  total_tokens_in   integer,
  total_tokens_out  integer
);

comment on table  public.deal_runs            is 'One row per agent-swarm execution.  Cost fields are populated on finalization.';
comment on column public.deal_runs.total_usd  is 'Aggregated USD cost across all cost_ledger entries for this run.';


-- ---------------------------------------------------------------------------
-- cost_ledger
-- ---------------------------------------------------------------------------

create table if not exists public.cost_ledger (
  id           bigint      generated always as identity primary key,
  run_id       uuid        not null references public.deal_runs (id) on delete cascade,
  agent        text        not null,
  model        text        not null,
  tokens_in    integer     not null default 0,
  tokens_out   integer     not null default 0,
  usd_cost     numeric(10, 6) not null default 0,
  duration_ms  integer,
  created_at   timestamptz not null default now()
);

comment on table  public.cost_ledger         is 'Granular LLM call cost log.  One row per agent call within a run.';
comment on column public.cost_ledger.agent   is 'Agent name, e.g. researcher | analyst | risk | writer | critic';
comment on column public.cost_ledger.model   is 'Model identifier, e.g. claude-sonnet-4-5 | gpt-4o';


-- ---------------------------------------------------------------------------
-- usage_counters
-- ---------------------------------------------------------------------------

create table if not exists public.usage_counters (
  profile_id       uuid          not null references public.profiles (id) on delete cascade,
  month            date          not null,   -- first day of month: '2026-05-01'
  deals_processed  integer       not null default 0,
  usd_spent        numeric(10, 4) not null default 0,
  primary key (profile_id, month)
);

comment on table  public.usage_counters        is 'Monthly usage per user.  profiles.is_owner=true users are exempt from limits.';
comment on column public.usage_counters.month  is 'Truncated to first day of month, e.g. 2026-05-01.';
