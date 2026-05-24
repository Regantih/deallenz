/**
 * app/deals/index.json/route.ts
 *
 * GET /deals/index.json
 *
 * Dynamically serves the list of deals for the authenticated user
 * in the format expected by deals.html.
 */

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
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

  const { data: deals, error: dbError } = await supabase
    .from('deals')
    .select('id, name, stage, status')
    .eq('owner_id', user.id);

  if (dbError) {
    console.error('[deals/index.json] Database error:', dbError);
    return NextResponse.json([]);
  }

  return NextResponse.json(deals || []);
}
