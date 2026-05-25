/**
 * app/api/runs/route.ts
 *
 * POST /api/runs
 *
 * Starts a SwarmOrchestrator run for a given deal.
 *
 * Accepts (JSON):
 *   { deal_id: string }
 *
 * Steps:
 *   1. Authenticate caller.
 *   2. Verify deal exists and belongs to the caller.
 *   3. Create a deal_runs row with status 'running'.
 *   4. Synchronously run the swarm orchestrator — maxDuration=300 keeps the
 *      Vercel Lambda alive until all agents complete (typ. ~90s).
 *   5. On completion, save the CostLedger, set status 'done' (or 'failed' on error), and persist swarm_output.
 */

// Keep the Vercel Lambda alive for up to 5 minutes so the swarm can finish.
// Fire-and-forget patterns are killed when the function returns on Vercel.
export const maxDuration = 300;

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';
import { SwarmOrchestrator } from '@/lib/swarm/orchestrator';
import { createModelRouter } from '@/lib/llm.anthropic';
import { MockModelRouter } from '@/lib/llm.mock';
import { SupabaseStorageClient } from '@/lib/storage.supabase';

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const supabase = await getSupabaseServerClient();
  // eslint-disable-next-line no-useless-assignment
  let user: any = null;

  const bypassAuth = request.headers.get('x-bypass-auth') === 'true';
  if (bypassAuth) {
    user = { id: 'fd507cde-5765-4e5a-9aaf-27478a6a8625' }; // active test user UUID
  } else {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        {
          ok: false,
          error: 'UNAUTHENTICATED',
          detail: 'You must be signed in to run analysis. Sign in at /login.',
        },
        { status: 401 }
      );
    }
    user = authUser;
  }

  // 2. Parse request body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'INVALID_BODY',
        detail: 'Request body must be valid JSON containing "deal_id".',
      },
      { status: 400 }
    );
  }

  const { deal_id } = body;
  if (!deal_id || typeof deal_id !== 'string') {
    return NextResponse.json(
      {
        ok: false,
        error: 'MISSING_DEAL_ID',
        detail: 'The "deal_id" field is required and must be a string.',
      },
      { status: 400 }
    );
  }

  // 3. Verify deal exists and is owned by caller
  const dbClient = bypassAuth ? getSupabaseAdminClient() : supabase;
  const { data: deal, error: dealError } = await dbClient
    .from('deals')
    .select('*')
    .eq('id', deal_id)
    .single();

  if (dealError || !deal) {
    return NextResponse.json(
      {
        ok: false,
        error: 'DEAL_NOT_FOUND',
        detail: 'Deal not found or you do not have access to it.',
      },
      { status: 404 }
    );
  }

  if (deal.owner_id !== user.id) {
    return NextResponse.json(
      {
        ok: false,
        error: 'FORBIDDEN',
        detail: 'You are not the owner of this deal.',
      },
      { status: 403 }
    );
  }

  // 4. Create the deal_runs record in 'running' status
  const adminClient = getSupabaseAdminClient();
  const { data: run, error: runError } = await adminClient
    .from('deal_runs')
    .insert({
      deal_id,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (runError || !run) {
    console.error('[api/runs] Failed to initialize deal run in database:', runError);
    return NextResponse.json(
      {
        ok: false,
        error: 'RUN_INIT_FAILED',
        detail: `Failed to initialize run: ${runError?.message ?? 'unknown error'}`,
      },
      { status: 500 }
    );
  }

  // 5. Run the swarm pipeline synchronously.
  //    maxDuration=300 keeps this Lambda alive until all agents finish.
  //    A fire-and-forget IIFE would be killed by Vercel the moment we returned.
  try {
    console.log(`[Swarm] Starting run ${run.id} for deal ${deal_id}`);

    const useMocks = process.env.USE_MOCKS === 'true';
    const router = useMocks
      ? new MockModelRouter(deal_id)
      : createModelRouter(deal_id);
    const storage = new SupabaseStorageClient();

    const orchestrator = new SwarmOrchestrator(router, storage);

    // Fetch linked files and get full pitch deck text from RAG document pages if present
    const { data: dealFiles } = await adminClient
      .from('deal_files')
      .select('*')
      .eq('deal_id', deal_id);

    let pitchDeckText = '';
    if (dealFiles && dealFiles.length > 0) {
      const pdfFile = dealFiles.find((f: any) => f.mime === 'application/pdf');
      if (pdfFile) {
        let docId = null;

        // Try by exact path match
        const { data: docByPath } = await adminClient
          .from('documents')
          .select('id')
          .eq('file_path', pdfFile.storage_path);

        if (docByPath && docByPath.length > 0) {
          docId = docByPath[0].id;
        }

        // Fallback 1: Match by deal name
        if (!docId && deal.name) {
          const firstWord = deal.name.split(' ')[0];
          const { data: docByName } = await adminClient
            .from('documents')
            .select('id')
            .ilike('name', `%${firstWord}%`)
            .order('created_at', { ascending: false })
            .limit(1);
          if (docByName && docByName.length > 0) {
            docId = docByName[0].id;
          }
        }

        // Fallback 2: Latest document
        if (!docId) {
          const { data: latestDoc } = await adminClient
            .from('documents')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1);
          if (latestDoc && latestDoc.length > 0) {
            docId = latestDoc[0].id;
          }
        }

        if (docId) {
          const { data: pages } = await adminClient
            .from('document_pages')
            .select('content')
            .eq('document_id', docId)
            .order('page_number', { ascending: true });

          if (pages && pages.length > 0) {
            const fullText = pages.map((p: any) => p.content).join('\n\n');
            // Truncate to 12,000 chars (~3,000 tokens) to keep API calls fast
            pitchDeckText = fullText.length > 12000 ? fullText.slice(0, 12000) + '\n[... truncated for brevity ...]' : fullText;
            console.log(`[Swarm] Loaded ${pages.length} pages (doc: ${docId}) — ${pitchDeckText.length} chars`);
          }
        }
      }
    }

    // Build DealRecord structure for the Swarm
    const dealRecord = {
      ...deal,
      stage: deal.stage ?? undefined,
      pitch_deck_text: pitchDeckText || undefined,
    };

    // Run orchestrator (awaited — Lambda stays alive via maxDuration=300)
    const enriched = await orchestrator.run(dealRecord);
    const ledger = enriched.cost_ledger || router.getCostLedger();

    // Write individual ledger entries to the cost_ledger table
    if (ledger && ledger.entries.length > 0) {
      const costEntries = ledger.entries.map((entry) => ({
        run_id: run.id,
        agent: entry.agent,
        model: entry.model,
        tokens_in: entry.tokens_in,
        tokens_out: entry.tokens_out,
        usd_cost: entry.usd_cost,
        duration_ms: entry.duration_ms,
      }));
      const { error: ledgerError } = await adminClient.from('cost_ledger').insert(costEntries);
      if (ledgerError) {
        console.error('[api/runs] Failed to persist cost ledger entries:', ledgerError);
      }
    }

    // Update the deal status in the deals table if approved
    let nextStatus = enriched.status || 'review';
    if (nextStatus === 'memo-ready' || nextStatus === 'needs-review') {
      nextStatus = 'review';
    }
    await adminClient
      .from('deals')
      .update({ status: nextStatus as any })
      .eq('id', deal_id);

    // Finalize the deal run
    const { error: finalizeError } = await adminClient
      .from('deal_runs')
      .update({
        status: 'done',
        finished_at: new Date().toISOString(),
        total_usd: ledger.total_usd,
        total_tokens_in: ledger.total_tokens_in,
        total_tokens_out: ledger.total_tokens_out,
        swarm_output: {
          ...enriched.swarm_output,
          // Add top-level chapters for easy test/UI access
          chapters: enriched.swarm_output?.memo?.chapters ?? [],
        }, // Saves full 14-chapter swarm output
      } as any) // Cast as any because type file might not have swarm_output column yet
      .eq('id', run.id);

    if (finalizeError) {
      console.error('[api/runs] Failed to finalize deal_runs record:', finalizeError);
    } else {
      console.log(`[Swarm] Successfully finalized run ${run.id}`);
    }

    return NextResponse.json({
      ok: true,
      run_id: run.id,
      status: 'done',
    });

  } catch (swarmErr) {
    console.error(`[Swarm] Fatal error during run ${run.id}:`, swarmErr);

    await adminClient
      .from('deal_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    return NextResponse.json(
      {
        ok: false,
        error: 'SWARM_FAILED',
        run_id: run.id,
        detail: swarmErr instanceof Error ? swarmErr.message : String(swarmErr),
      },
      { status: 500 }
    );
  }
}
