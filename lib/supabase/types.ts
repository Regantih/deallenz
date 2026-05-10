/**
 * lib/supabase/types.ts
 *
 * Hand-authored Database type definitions for DealLens.
 * Matches the schema in supabase/migrations/.
 *
 * IMPORTANT: Every table must include `Relationships: []` (even if no
 * FK relationships are tracked here). @supabase/postgrest-js requires
 * GenericTable = { Row, Insert, Update, Relationships: GenericRelationship[] }
 * and without this field `Database['public']` does not extend GenericSchema,
 * causing SupabaseClient<Database>.from().insert() to resolve to `never[]`.
 *
 * Replace with generated types once the schema stabilises:
 *   npx supabase gen types typescript --project-id <ref> --schema public \\
 *     > lib/supabase/types.ts
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
          id: string;
          email: string;
          plan: 'free' | 'pro' | 'team';
          is_owner: boolean;
          created_at: string;
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
        Relationships: [];
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
        Relationships: [];
      };

      // ------------------------------------------------------------------
      // deal_files
      // ------------------------------------------------------------------
      deal_files: {
        Row: {
          id: string;
          deal_id: string;
          storage_path: string;
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
        Relationships: [];
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
        Relationships: [];
      };

      // ------------------------------------------------------------------
      // cost_ledger
      // ------------------------------------------------------------------
      cost_ledger: {
        Row: {
          id: number;
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
        Relationships: [];
      };

      // ------------------------------------------------------------------
      // usage_counters
      // ------------------------------------------------------------------
      usage_counters: {
        Row: {
          profile_id: string;
          month: string;
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
        Relationships: [];
      };

      // ------------------------------------------------------------------
      // jobs  (PR7 — ingest job queue)
      // ------------------------------------------------------------------
      jobs: {
        Row: {
          id: string;
          deal_id: string;
          kind: string;
          status: string;
          payload: Json;
          error: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id: string;
          kind: string;
          status?: string;
          payload?: Json;
          error?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          kind?: string;
          status?: string;
          payload?: Json;
          error?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_next_job: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['jobs']['Row'][];
      };
    };
    Enums: Record<string, never>;
  };
}
