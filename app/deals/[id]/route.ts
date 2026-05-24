/**
 * app/deals/[id].json/route.ts
 *
 * GET /deals/[id].json
 *
 * Dynamically serves a single deal's details, including its latest successful
 * swarm run output and cost ledger details.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cleanId = id.replace(/\.json$/, ''); // strip any .json extension if supplied

  // 1. Authenticate
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }

  // 2. Fetch deal (enforces user read access via RLS)
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('*')
    .eq('id', cleanId)
    .single();

  if (dealError || !deal) {
    console.error(`[deals/${id}] Deal not found or access denied:`, dealError);
    return NextResponse.json(
      { error: 'DEAL_NOT_FOUND', detail: 'Deal not found or access denied.' },
      { status: 404 }
    );
  }

  // 3. Fetch latest run (using admin client to bypass RLS if needed, or normal client)
  const adminClient = getSupabaseAdminClient();
  const { data: runs, error: runError } = await adminClient
    .from('deal_runs')
    .select('*')
    .eq('deal_id', cleanId)
    .order('started_at', { ascending: false });

  const latestRun = runs && runs.length > 0 ? runs[0] : null;
  const runObj = latestRun as any;

  // 4. Fetch cost ledger if run exists
  let costLedgerEntries: any[] = [];
  if (latestRun) {
    const { data: ledger } = await adminClient
      .from('cost_ledger')
      .select('*')
      .eq('run_id', latestRun.id);
    costLedgerEntries = ledger || [];
  }

  // 5. Fetch deal files
  const { data: files } = await adminClient
    .from('deal_files')
    .select('*')
    .eq('deal_id', cleanId);

  // 6. Combine all fields into a rich payload for the frontend
  const dealObj = deal as any;
  const responsePayload = {
    id: deal.id,
    owner_id: deal.owner_id,
    name: deal.name,
    stage: deal.stage,
    status: deal.status,
    created_at: deal.created_at,
    updated_at: deal.updated_at,
    
    // Ingested fields extracted from the deal
    thesis: dealObj.thesis || null,
    ask: dealObj.ask || null,
    premoney: dealObj.premoney || null,
    lead: dealObj.lead || null,
    icp: dealObj.icp || null,
    jtbd: dealObj.jtbd || null,
    wtp: dealObj.wtp || null,
    founders: dealObj.founders || [],
    arr: dealObj.arr || null,
    mom: dealObj.mom || null,
    logos: dealObj.logos || null,
    nrr: dealObj.nrr || null,

    // Run / swarm status
    run: latestRun ? {
      id: latestRun.id,
      status: latestRun.status,
      started_at: latestRun.started_at,
      finished_at: latestRun.finished_at,
      total_usd: latestRun.total_usd,
      total_tokens_in: latestRun.total_tokens_in,
      total_tokens_out: latestRun.total_tokens_out,
      swarm_output: runObj.swarm_output || null,
    } : null,

    files: files || [],
    cost_ledger: costLedgerEntries,
  };

  return NextResponse.json(responsePayload);

}
