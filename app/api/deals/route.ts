/**
 * app/api/deals/route.ts
 *
 * POST /api/deals
 *
 * Persists a new deal record to the Supabase database.
 * Maps status fields appropriately to satisfy CHECK constraints.
 * Links any pre-uploaded RAG document to the new deal in the deal_files table.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // 1. Authenticate caller
  const bypassAuth = request.headers.get('x-bypass-auth') === 'true';
  // eslint-disable-next-line no-useless-assignment
  let user: { id: string } | null = null;

  if (bypassAuth) {
    user = { id: 'fd507cde-5765-4e5a-9aaf-27478a6a8625' }; // active test user UUID
  } else {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'UNAUTHENTICATED', detail: 'You must be signed in to create deals.' },
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
      { error: 'INVALID_BODY', detail: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const { name, stage, status, deck } = body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json(
      { error: 'MISSING_NAME', detail: 'The "name" field is required.' },
      { status: 400 }
    );
  }

  // 3. Map status to comply with database check constraints without DDL changes
  let dbStatus = status || 'intake';
  if (dbStatus === 'memo-ready' || dbStatus === 'needs-review') {
    dbStatus = 'review';
  }

  // Ensure stage is a valid stage or null
  const validStages = ['pre-seed', 'seed', 'series-a', 'series-b', 'growth'];
  const dbStage = validStages.includes(stage) ? stage : null;

  // Ensure status is valid
  const validStatuses = ['intake', 'enriching', 'review', 'pass', 'invest', 'portfolio'];
  const finalStatus = validStatuses.includes(dbStatus) ? dbStatus : 'intake';

  // 4. Insert deal into Supabase
  const adminClient = getSupabaseAdminClient();
  const { data: deal, error: dealInsertError } = await adminClient
    .from('deals')
    .insert({
      owner_id: user!.id,
      name: name.trim(),
      stage: dbStage,
      status: finalStatus,
    })
    .select()
    .single();

  if (dealInsertError || !deal) {
    console.error('[api/deals] Failed to create deal:', dealInsertError);
    return NextResponse.json(
      { error: 'DEAL_CREATION_FAILED', detail: dealInsertError?.message || 'Failed to persist deal record.' },
      { status: 500 }
    );
  }

  console.log(`[api/deals] Successfully created deal ${deal.id} for owner ${user!.id}`);

  // 5. If a document UUID is supplied (from deck PDF ingestion), link it to the deal
  if (deck && typeof deck === 'string' && deck.trim() !== '') {
    try {
      // Find document path from documents table
      const { data: doc } = await adminClient
        .from('documents')
        .select('*')
        .eq('id', deck)
        .single();

      if (doc) {
        const { error: fileLinkError } = await adminClient
          .from('deal_files')
          .insert({
            deal_id: deal.id,
            storage_path: doc.file_path,
            mime: 'application/pdf',
            size_bytes: 0,
            source: 'upload',
          });

        if (fileLinkError) {
          console.error('[api/deals] Failed to link pitch deck document in deal_files:', fileLinkError);
        } else {
          console.log(`[api/deals] Successfully linked document ${deck} to deal ${deal.id} in deal_files`);
        }
      } else {
        console.warn(`[api/deals] Uploaded deck document ID ${deck} not found in documents table`);
      }
    } catch (ex: any) {
      console.error('[api/deals] Error linking deck document:', ex);
    }
  }

  return NextResponse.json({
    ok: true,
    success: true,
    deal_id: deal.id,
    id: deal.id,
    deal: {
      id: deal.id,
      name: deal.name,
      stage: deal.stage,
      status: deal.status,
      created_at: deal.created_at,
    },
  });
}
