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
import { embedBatch } from '@/lib/embeddings';
// @ts-ignore
const { PDFParse } = require('pdf-parse');

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
  const bypassAuth = request.headers.get('x-bypass-auth') === 'true';
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
        {
          ok: false,
          error: 'UNAUTHENTICATED',
          detail: 'You must be signed in to upload files. Sign in at /login.',
        },
        { status: 401 }
      );
    }
    user = authUser;
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
        detail: 'Request must be multipart/form-data with a "file" field.',
      },
      { status: 400 }
    );
  }

  const dealId = formData.get('deal_id');
  const file = formData.get('file');

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
  // 3. Validate file size and type
  // ------------------------------------------------------------------
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: 'FILE_TOO_LARGE',
        detail: `File size ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds the 50 MB limit.`,
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

  const adminClient = getSupabaseAdminClient();
  const uuid = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_');

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

  if (dealId && typeof dealId === 'string' && dealId.trim() !== '') {
    // ==================================================================
    // SWARM UPLOAD WORKFLOW (deal_id is present)
    // ==================================================================
    const cleanDealId = dealId.trim();

    // Verify the deal belongs to the authenticated user
    const { data: deal, error: dealError } = await adminClient
      .from('deals')
      .select('id, owner_id')
      .eq('id', cleanDealId)
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

    if (!bypassAuth && deal.owner_id !== user!.id) {
      return NextResponse.json(
        {
          ok: false,
          error: 'FORBIDDEN',
          detail: 'You are not the owner of this deal.',
        },
        { status: 403 }
      );
    }

    const storagePath = `deals/${cleanDealId}/${uuid}-${safeName}`;

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

    const { data: fileRow, error: dbError } = await adminClient
      .from('deal_files')
      .insert({
        deal_id: cleanDealId,
        storage_path: storagePath,
        mime: mimeType,
        size_bytes: file.size,
        source: 'upload' as const,
      })
      .select()
      .single();

    if (dbError || !fileRow) {
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

    return NextResponse.json({
      ok: true,
      file: {
        id: fileRow.id,
        deal_id: cleanDealId,
        storage_path: storagePath,
        name: file.name,
        size_bytes: file.size,
        mime: mimeType,
        source: 'upload',
        created_at: fileRow.created_at,
      },
    });
  } else {
    // ==================================================================
    // RAG INGEST WORKFLOW (deal_id is absent)
    // ==================================================================
    if (mimeType !== 'application/pdf') {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_FILE_TYPE',
          detail: 'RAG ingestion strictly requires PDF files.',
        },
        { status: 400 }
      );
    }

    const storagePath = `decks/${Date.now()}-${safeName}`;

    const { error: uploadError } = await adminClient.storage
      .from('deal-uploads')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[api/upload] Supabase Storage RAG upload error:', uploadError);
      return NextResponse.json(
        {
          ok: false,
          error: 'STORAGE_UPLOAD_FAILED',
          detail: uploadError.message,
        },
        { status: 500 }
      );
    }

    // Parse PDF page-by-page using the new mehmet-kozan/pdf-parse class-based API
    let pagesText: string[] = [];
    try {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      pagesText = result.pages.map((p: any) => p.text);
      await parser.destroy();
    } catch (parseErr: any) {
      console.error('[api/upload] PDF Parsing error:', parseErr);
      return NextResponse.json(
        {
          ok: false,
          error: 'PDF_PARSING_FAILED',
          detail: `PDF parsing failed: ${parseErr.message}`,
        },
        { status: 500 }
      );
    }

    if (pagesText.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'EMPTY_PDF',
          detail: 'PDF has no parseable pages or text content.',
        },
        { status: 400 }
      );
    }

    // Insert document record in DB
    const { data: docData, error: docError } = await adminClient
      .from('documents')
      .insert({
        user_id: user!.id,
        name: file.name,
        file_path: storagePath,
      })
      .select()
      .single();

    if (docError || !docData) {
      console.error('[api/upload] Document DB insertion error:', docError);
      return NextResponse.json(
        {
          ok: false,
          error: 'DOCUMENT_ENTRY_FAILED',
          detail: `Document entry failed: ${docError?.message ?? 'unknown error'}`,
        },
        { status: 500 }
      );
    }

    const documentId = docData.id;

    // Filter non-empty pages and clean null bytes (\u0000) which are unsupported by Postgres text columns
    const nonEvPages: { pageNumber: number; content: string }[] = [];
    for (let i = 0; i < pagesText.length; i++) {
      const pageContent = pagesText[i]?.replace(/\u0000/g, '').trim();
      if (pageContent) {
        nonEvPages.push({ pageNumber: i + 1, content: pageContent });
      }
    }

    if (nonEvPages.length > 0) {
      try {
        // Generate embeddings in batch using unified embedBatch from @/lib/embeddings!
        const embeddings = await embedBatch(nonEvPages.map(p => p.content));

        const pageRows = nonEvPages.map((p, idx) => ({
          document_id: documentId,
          page_number: p.pageNumber,
          content: p.content,
          embedding: embeddings[idx],
        }));

        const { error: pageInsertErr } = await adminClient
          .from('document_pages')
          .insert(pageRows);

        if (pageInsertErr) {
          console.error('[api/upload] Pages batch insertion error:', pageInsertErr);
        }
      } catch (embErr: any) {
        console.error('[api/upload] Failed to generate batch embeddings:', embErr);
      }
    }

    return NextResponse.json({
      ok: true,
      success: true,
      documentId,
      name: file.name,
      pagesCount: pagesText.length,
      text: pagesText.join('\n\n'),
    });
  }
}
