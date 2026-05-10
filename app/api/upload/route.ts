/**
 * app/api/upload/route.ts
 *
 * POST /api/upload
 *
 * Accepts a multipart/form-data request with:
 *   - file     : the File object (PDF, Excel, PPT, Word, CSV, image)
 *   - deal_id  : UUID of the deal this file belongs to
 *
 * Steps:
 *   1. Authenticate the caller via the Supabase session cookie.
 *   2. Verify the deal exists and is owned by the authenticated user.
 *   3. Validate file size (≤ 50 MB) and MIME type.
 *   4. Upload to Supabase Storage ('deal-uploads' bucket) via service-role
 *      client (bypasses Storage RLS for server-trusted uploads).
 *   5. Insert a deal_files row to track the upload in the database.
 *   6. Return the created file metadata as JSON.
 *
 * Error responses always include { ok: false, error: CODE, detail: string }.
 * Storage is never faked; every error surfaces the real cause.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_TYPES = new Set([
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
  'image/webp',
]);

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // ------------------------------------------------------------------
  // 1. Authenticate
  // ------------------------------------------------------------------
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        ok: false,
        error: 'UNAUTHENTICATED',
        detail: 'You must be signed in to upload files. Sign in at /login.',
      },
      { status: 401 }
    );
  }

  // ------------------------------------------------------------------
  // 2. Parse multipart form
  // ------------------------------------------------------------------
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'INVALID_REQUEST',
        detail: 'Request must be multipart/form-data with a "file" field and a "deal_id" field.',
      },
      { status: 400 }
    );
  }

  const dealId = formData.get('deal_id');
  const file = formData.get('file');

  if (!dealId || typeof dealId !== 'string' || dealId.trim() === '') {
    return NextResponse.json(
      {
        ok: false,
        error: 'MISSING_DEAL_ID',
        detail: 'The "deal_id" field is required and must be a valid deal UUID.',
      },
      { status: 400 }
    );
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'MISSING_FILE',
        detail: 'The "file" field is required and must be a File object.',
      },
      { status: 400 }
    );
  }

  // ------------------------------------------------------------------
  // 3. Verify the deal belongs to the authenticated user
  //    (RLS on the deals table enforces this, but we check explicitly
  //     to return a clear 404 rather than a generic 500.)
  // ------------------------------------------------------------------
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('id, owner_id')
    .eq('id', dealId.trim())
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

  // Explicit ownership check (redundant with RLS but surfaces the issue clearly)
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

  // ------------------------------------------------------------------
  // 4. Validate file
  // ------------------------------------------------------------------
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: 'FILE_TOO_LARGE',
        detail: `File size ${
          (file.size / 1024 / 1024).toFixed(1)
        } MB exceeds the 50 MB limit.`,
      },
      { status: 413 }
    );
  }

  const mimeType = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'UNSUPPORTED_FILE_TYPE',
        detail: `MIME type "${mimeType}" is not allowed. Supported: PDF, Excel, PowerPoint, Word, CSV, plain text, JPEG, PNG, GIF, WebP.`,
      },
      { status: 415 }
    );
  }

  // ------------------------------------------------------------------
  // 5. Upload to Supabase Storage (service-role client bypasses RLS)
  // ------------------------------------------------------------------
  const adminClient = getSupabaseAdminClient();
  const uuid = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_');
  const storagePath = `deals/${dealId.trim()}/${uuid}-${safeName}`;

  let buffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'FILE_READ_ERROR',
        detail: 'Failed to read file data from the request.',
      },
      { status: 400 }
    );
  }

  const { error: uploadError } = await adminClient.storage
    .from('deal-uploads')
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error('[api/upload] Supabase Storage error:', uploadError);
    return NextResponse.json(
      {
        ok: false,
        error: 'STORAGE_UPLOAD_FAILED',
        detail: uploadError.message,
      },
      { status: 500 }
    );
  }

  // ------------------------------------------------------------------
  // 6. Insert deal_files row
  // ------------------------------------------------------------------
  const { data: fileRow, error: dbError } = await adminClient
    .from('deal_files')
    .insert({
      deal_id: dealId.trim(),
      storage_path: storagePath,
      mime: mimeType,
      size_bytes: file.size,
      source: 'upload' as const,
    })
    .select()
    .single();

  if (dbError || !fileRow) {
    // Storage upload succeeded but DB record failed.
    // Log for manual reconciliation; return a 500 with the storage path so
    // the file can be manually linked if needed.
    console.error('[api/upload] DB insert failed after successful storage upload:', dbError);
    return NextResponse.json(
      {
        ok: false,
        error: 'DB_INSERT_FAILED',
        detail: `File was uploaded to storage but the database record failed: ${
          dbError?.message ?? 'unknown error'
        }. Storage path: ${storagePath}`,
        storage_path: storagePath,
      },
      { status: 500 }
    );
  }

  // ------------------------------------------------------------------
  // 7. Return success
  // ------------------------------------------------------------------
  return NextResponse.json({
    ok: true,
    file: {
      id: fileRow.id,
      deal_id: dealId.trim(),
      storage_path: storagePath,
      name: file.name,
      size_bytes: file.size,
      mime: mimeType,
      source: 'upload',
      created_at: fileRow.created_at,
    },
  });
}
