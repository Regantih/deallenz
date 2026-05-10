-- =============================================================================
-- 20260510000003_storage.sql
-- Supabase Storage bucket and object-level RLS policies for DealLens
--
-- Applied after 20260510000002_rls.sql.
--
-- Bucket 'deal-uploads':
--   • Private (public=false) — all reads require a signed URL.
--   • 50 MB per-file limit.
--   • Allowed MIME types: PDF, Excel, PowerPoint, Word, CSV, plain text,
--     and common image formats.
--
-- Object path convention:  deals/{deal_id}/{uuid}-{filename}
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Create the deal-uploads bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deal-uploads',
  'deal-uploads',
  false,       -- private: signed URLs required
  52428800,    -- 50 MB per file
  array[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- Storage RLS policies
--
-- Path structure: deals/{deal_id}/{filename}
--   • (storage.foldername(name))[1]  → 'deals'
--   • (storage.foldername(name))[2]  → deal_id (uuid)
--
-- Only the authenticated owner of the deal may upload to / read from their
-- deal folder.  Reads in the application are done via service-role signed
-- URLs — the select policy below supports direct client reads when needed.
-- ---------------------------------------------------------------------------

-- Upload: authenticated owner of the deal may insert objects
create policy "deal-uploads: owner may upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'deal-uploads'
    and (storage.foldername(name))[1] = 'deals'
    and exists (
      select 1 from public.deals d
      where d.id::text = (storage.foldername(name))[2]
        and d.owner_id = auth.uid()
    )
  );

-- Select: authenticated owner may list and download their deal files
create policy "deal-uploads: owner may select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'deal-uploads'
    and (storage.foldername(name))[1] = 'deals'
    and exists (
      select 1 from public.deals d
      where d.id::text = (storage.foldername(name))[2]
        and d.owner_id = auth.uid()
    )
  );

-- Delete: authenticated owner may remove their own deal files
create policy "deal-uploads: owner may delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'deal-uploads'
    and (storage.foldername(name))[1] = 'deals'
    and exists (
      select 1 from public.deals d
      where d.id::text = (storage.foldername(name))[2]
        and d.owner_id = auth.uid()
    )
  );
