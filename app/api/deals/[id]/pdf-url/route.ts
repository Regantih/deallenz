/**
 * GET /api/deals/[id]/pdf-url
 *
 * Returns a short-lived signed URL for the deal's uploaded PDF from Supabase Storage.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  // Find the deal file
  const adminClient = getSupabaseAdminClient();
  const { data: files, error: filesError } = await adminClient
    .from('deal_files')
    .select('*, documents(storage_path)')
    .eq('deal_id', id)
    .limit(1);

  if (filesError || !files || files.length === 0) {
    return NextResponse.json({ error: 'NO_FILE', detail: 'No file found for this deal' }, { status: 404 });
  }

  const fileRecord = files[0] as any;
  const storagePath: string | null =
    fileRecord.storage_path ||
    fileRecord.documents?.storage_path ||
    null;

  if (!storagePath) {
    return NextResponse.json({ error: 'NO_STORAGE_PATH' }, { status: 404 });
  }

  // Generate signed URL (valid for 1 hour)
  const { data: signed, error: signError } = await adminClient.storage
    .from('deal-uploads')
    .createSignedUrl(storagePath, 3600);

  if (signError || !signed?.signedUrl) {
    console.error('[pdf-url] Sign error:', signError);
    return NextResponse.json({ error: 'SIGN_FAILED', detail: signError?.message }, { status: 500 });
  }

  return NextResponse.json({
    url: signed.signedUrl,
    document_id: fileRecord.document_id || null,
  });
}
