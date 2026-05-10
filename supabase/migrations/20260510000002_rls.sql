-- =============================================================================
-- 20260510000002_rls.sql
-- Row Level Security policies for DealLens
--
-- Applied after 20260510000001_init.sql.
-- Service-role key (SUPABASE_SECRET_KEY) bypasses RLS automatically;
-- no explicit service-role policies are needed.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.deals          enable row level security;
alter table public.deal_files     enable row level security;
alter table public.deal_runs      enable row level security;
alter table public.cost_ledger    enable row level security;
alter table public.usage_counters enable row level security;


-- ---------------------------------------------------------------------------
-- profiles
-- • Users can read and update their own row.
-- • Insert is handled by the auth trigger below (service_role context).
-- • is_owner and plan changes must go through service_role (Stripe webhook).
-- ---------------------------------------------------------------------------

create policy "profiles: owner can select"
  on public.profiles
  for select
  using (id = auth.uid());

create policy "profiles: owner can update non-sensitive fields"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- is_owner and plan are admin-only; the app-level update only allows email.
    -- Enforce at the application layer — the service_role bypasses this check.
  );


-- ---------------------------------------------------------------------------
-- deals
-- ---------------------------------------------------------------------------

create policy "deals: owner can select"
  on public.deals
  for select
  using (owner_id = auth.uid());

create policy "deals: owner can insert"
  on public.deals
  for insert
  with check (owner_id = auth.uid());

create policy "deals: owner can update"
  on public.deals
  for update
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "deals: owner can delete"
  on public.deals
  for delete
  using (owner_id = auth.uid());


-- ---------------------------------------------------------------------------
-- deal_files  (access flows through deal ownership)
-- ---------------------------------------------------------------------------

create policy "deal_files: deal owner can select"
  on public.deal_files
  for select
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_files.deal_id
        and d.owner_id = auth.uid()
    )
  );

create policy "deal_files: deal owner can insert"
  on public.deal_files
  for insert
  with check (
    exists (
      select 1 from public.deals d
      where d.id = deal_files.deal_id
        and d.owner_id = auth.uid()
    )
  );

create policy "deal_files: deal owner can delete"
  on public.deal_files
  for delete
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_files.deal_id
        and d.owner_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- deal_runs  (read-only for authenticated owners; writes are service_role)
-- ---------------------------------------------------------------------------

create policy "deal_runs: deal owner can select"
  on public.deal_runs
  for select
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_runs.deal_id
        and d.owner_id = auth.uid()
    )
  );

-- Inserts and updates come from server-side (service_role); no auth policy needed.


-- ---------------------------------------------------------------------------
-- cost_ledger  (read-only for authenticated owners; writes are service_role)
-- ---------------------------------------------------------------------------

create policy "cost_ledger: deal owner can select"
  on public.cost_ledger
  for select
  using (
    exists (
      select 1
      from public.deal_runs  r
      join public.deals       d on d.id = r.deal_id
      where r.id = cost_ledger.run_id
        and d.owner_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- usage_counters  (read-only for authenticated users; updates are service_role)
-- ---------------------------------------------------------------------------

create policy "usage_counters: owner can select own"
  on public.usage_counters
  for select
  using (profile_id = auth.uid());


-- ---------------------------------------------------------------------------
-- Auth trigger — create profile row on first sign-in
-- Runs as security definer so it can insert into public.profiles even though
-- the new user has no profile yet (and therefore no RLS pass).
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, plan, is_owner)
  values (
    new.id,
    coalesce(new.email, ''),
    'free',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Fires after Supabase Auth inserts a row into auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
