-- =============================================================================
-- 20260510000005_bug8_rls_swarm.sql
-- Bug 8 fix: GRANT privileges to service_role and add swarm_output column
-- =============================================================================

-- Grant full privileges on all existing and future tables to required roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role, anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role, anon, authenticated;

-- Add swarm_output column if it doesn't already exist
ALTER TABLE public.deal_runs ADD COLUMN IF NOT EXISTS swarm_output JSONB;
