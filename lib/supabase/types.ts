/**
 * lib/supabase/types.ts
 *
 * Hand-authored Database type definitions for DealLens.
 * Matches the schema defined in supabase/migrations/20260510000001_init.sql.
 *
 * Replace with generated types once the schema stabilises:
 *
 *   npx supabase gen types typescript \\
 *     --project-id <your-project-ref> \\
 *     --schema public \\
 *     > lib/supabase/types.ts
 *
 * Or add to package.json scripts:
 *   "gen:types": "supabase gen types typescript --project-id <ref> --schema public > lib/supabase/types.ts"
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // ------------------------------------------------------------------
      // profiles
      // ------------------------------------------------------------------
      profiles: {
        Row: {
          id: string;           // uuid, PK, refs auth.users
          email: string;
          plan: 'free' | 'pro' | 'team';
          is_owner: boolean;    // true → bypasses usage guardrails
          created_at: string;   // ISO-8601
        };
        Insert: {
          id: string;
          email: string;
          plan?: 'free' | 'pro' | 'team';
          is_owner?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          plan?: 'free' | 'pro' | 'team';
          is_owner?: boolean;
          created_at?: string;
        };
      };

      // ------------------------------------------------------------------
      // deals
      // ------------------------------------------------------------------
      deals: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          stage: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'growth' | null;
          status: 'intake' | 'enriching' | 'review' | 'pass' | 'invest' | 'portfolio';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          stage?: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'growth' | null;
          status?: 'intake' | 'enriching' | 'review' | 'pass' | 'invest' | 'portfolio';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          stage?: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'growth' | null;
          status?: 'intake' | 'enriching' | 'review' | 'pass' | 'invest' | 'portfolio';
          created_at?: string;
          updated_at?: string;
        };
      };

      // ------------------------------------------------------------------
      // deal_files
      // ------------------------------------------------------------------
      deal_files: {
        Row: {
          id: string;
          deal_id: string;
          storage_path: string;  // e.g. "deals/{deal_id}/{uuid}-{name}"
          mime: string | null;
          size_bytes: number;
          source: 'upload' | 'link_ingest';
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id: string;
          storage_path: string;
          mime?: string | null;
          size_bytes: number;
          source: 'upload' | 'link_ingest';
          created_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          storage_path?: string;
          mime?: string | null;
          size_bytes?: number;
          source?: 'upload' | 'link_ingest';
          created_at?: string;
        };
      };

      // ------------------------------------------------------------------
      // deal_runs
      // ------------------------------------------------------------------
      deal_runs: {
        Row: {
          id: string;
          deal_id: string;
          status: 'pending' | 'running' | 'done' | 'failed';
          started_at: string;
          finished_at: string | null;
          total_usd: number | null;
          total_tokens_in: number | null;
          total_tokens_out: number | null;
        };
        Insert: {
          id?: string;
          deal_id: string;
          status?: 'pending' | 'running' | 'done' | 'failed';
          started_at?: string;
          finished_at?: string | null;
          total_usd?: number | null;
          total_tokens_in?: number | null;
          total_tokens_out?: number | null;
        };
        Update: {
          id?: string;
          deal_id?: string;
          status?: 'pending' | 'running' | 'done' | 'failed';
          started_at?: string;
          finished_at?: string | null;
          total_usd?: number | null;
          total_tokens_in?: number | null;
          total_tokens_out?: number | null;
        };
      };

      // ------------------------------------------------------------------
      // cost_ledger
      // ------------------------------------------------------------------
      cost_ledger: {
        Row: {
          id: number;        // bigserial
          run_id: string;
          agent: string;
          model: string;
          tokens_in: number;
          tokens_out: number;
          usd_cost: number;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          run_id: string;
          agent: string;
          model: string;
          tokens_in: number;
          tokens_out: number;
          usd_cost: number;
          duration_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          run_id?: string;
          agent?: string;
          model?: string;
          tokens_in?: number;
          tokens_out?: number;
          usd_cost?: number;
          duration_ms?: number | null;
          created_at?: string;
        };
      };

      // ------------------------------------------------------------------
      // usage_counters
      // ------------------------------------------------------------------
      usage_counters: {
        Row: {
          profile_id: string;
          month: string;           // date, first day of month: 'YYYY-MM-DD'
          deals_processed: number;
          usd_spent: number;
        };
        Insert: {
          profile_id: string;
          month: string;
          deals_processed?: number;
          usd_spent?: number;
        };
        Update: {
          profile_id?: string;
          month?: string;
          deals_processed?: number;
          usd_spent?: number;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
