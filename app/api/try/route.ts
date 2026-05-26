/**
 * app/api/try/route.ts
 *
 * POST /api/try — public, no-auth ingest + run endpoint.
 *
 * Accepts multipart/form-data:
 *   files : zero or more File objects (PDF, images, anything in ALLOWED_MIME)
 *   url   : optional string (data-room or web link)
 *   text  : optional string (free-form notes / pasted deck text)
 *   name  : optional string (deal name; defaults to "Public demo …")
 *
 * Pipeline:
 *   1. Create a deals row owned by the public test profile.
 *   2. Upload artifacts to deal-uploads + insert deal_files rows.
 *   3. Extract text from PDFs (pdf-parse) and append to pitch_deck_text.
 *   4. Insert deal_runs row (status=running).
 *   5. Run SwarmOrchestrator synchronously.
 *   6. Persist swarm_output + cost_ledger; return inline.
 */

export const maxDuration = 300;

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { SwarmOrchestrator } from '@/lib/swarm/orchestrator';
import { AnthropicModelRouter } from '@/lib/llm.anthropic';
import { SupabaseStorageClient } from '@/lib/storage.supabase';

const PUBLIC_OWNER_ID = 'fd507cde-5765-4e5a-9aaf-27478a6a8625';
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const BUCKET = 'deal-uploads';

const ALLOWED_MIME = new Set([
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

// PDF extraction helper — mirrors logic in /api/upload route.
async function extractPdfText(buffer: Buffer): Promise<string> {
  // Polyfill DOMMatrix for Node.js / Vercel Lambda — required by PDF.js internals.
  if (typeof globalThis.DOMMatrix === 'undefined') {
    (globalThis as unknown as Record<string, unknown>).DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      is2D = true; isIdentity = true;
      static fromMatrix() { return new DOMMatrix(); }
      static fromFloat32Array() { return new DOMMatrix(); }
      static fromFloat64Array() { return new DOMMatrix(); }
      multiply() { return new DOMMatrix(); }
      translate() { return new DOMMatrix(); }
      scale() { return new DOMMatrix(); }
      rotate() { return new DOMMatrix(); }
      inverse() { return new DOMMatrix(); }
      transformPoint(p: unknown) { return p ?? { x: 0, y: 0 }; }
      toFloat32Array() { return new Float32Array(16); }
      toFloat64Array() { return new Float64Array(16); }
    };
  }
  const mod = await import('pdf-parse') as unknown as {
    PDFParse: new (opts: { data: Buffer }) => {
      getText(): Promise<{ pages: { text: string }[] }>;
      destroy(): Promise<void>;
    };
  };
  const parser = new mod.PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.pages.map(p => p.text).join('\n\n');
  await parser.destroy();
  return text;
}

export async function POST(request: NextRequest) {
  const admin = getSupabaseAdminClient();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'INVALID_REQUEST', detail: 'Expected multipart/form-data.' },
      { status: 400 },
    );
  }

  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  const url = (form.get('url') as string | null)?.trim() || '';
  const text = (form.get('text') as string | null)?.trim() || '';
  const name =
    ((form.get('name') as string | null)?.trim() ||
      `Public demo — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);

  if (files.length === 0 && !url && !text) {
    return NextResponse.json(
      { ok: false, error: 'NO_INPUT', detail: 'Provide at least one of: files, url, text.' },
      { status: 400 },
    );
  }

  const { data: deal, error: dealErr } = await admin
    .from('deals')
    .insert({ owner_id: PUBLIC_OWNER_ID, name, status: 'intake' })
    .select()
    .single();

  if (dealErr || !deal) {
    return NextResponse.json(
      { ok: false, error: 'DEAL_CREATE_FAILED', detail: dealErr?.message ?? 'unknown' },
      { status: 500 },
    );
  }

  const pitchDeckTextParts: string[] = [];
  if (text) pitchDeckTextParts.push(text);

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) continue;
    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED_MIME.has(mime)) continue;

    const safe = file.name.replace(/[^a-z0-9._-]/gi, '_');
    const path = `deals/${deal.id}/${crypto.randomUUID()}-${safe}`;
    const buf = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, buf, { contentType: mime, upsert: false });
    if (upErr) continue;

    await admin.from('deal_files').insert({
      deal_id: deal.id,
      storage_path: path,
      mime,
      size_bytes: file.size,
      source: 'upload',
    });

    if (mime === 'text/plain' || mime === 'text/csv') {
      try { pitchDeckTextParts.push(buf.toString('utf-8')); } catch {}
    } else if (mime === 'application/pdf') {
      try {
        const pdfText = await extractPdfText(buf);
        if (pdfText && pdfText.trim().length > 0) {
          pitchDeckTextParts.push(`--- Extracted from ${file.name} ---\n${pdfText}`);
        }
      } catch (e) {
        console.error('[api/try] PDF extraction failed for', file.name, e);
      }
    }
  }

  if (text) {
    const path = `deals/${deal.id}/${crypto.randomUUID()}-notes.txt`;
    await admin.storage.from(BUCKET).upload(path, Buffer.from(text, 'utf-8'), {
      contentType: 'text/plain',
      upsert: false,
    });
    await admin.from('deal_files').insert({
      deal_id: deal.id,
      storage_path: path,
      mime: 'text/plain',
      size_bytes: Buffer.byteLength(text, 'utf-8'),
      source: 'upload',
    });
  }

  if (url) {
    const body = `[InternetShortcut]\nURL=${url}\n`;
    const path = `deals/${deal.id}/${crypto.randomUUID()}-link.url`;
    await admin.storage.from(BUCKET).upload(path, Buffer.from(body, 'utf-8'), {
      contentType: 'text/plain',
      upsert: false,
    });
    await admin.from('deal_files').insert({
      deal_id: deal.id,
      storage_path: path,
      mime: 'text/plain',
      size_bytes: Buffer.byteLength(body, 'utf-8'),
      source: 'link_ingest',
    });
    pitchDeckTextParts.push(`Reference URL: ${url}`);
  }

  const { data: run } = await admin
    .from('deal_runs')
    .insert({ deal_id: deal.id, status: 'running' })
    .select()
    .single();

  const router = new AnthropicModelRouter(deal.id);
  const storage = new SupabaseStorageClient();
  const orch = new SwarmOrchestrator(router, storage);

  try {
    const enriched = await orch.run({
      id: deal.id,
      name: deal.name,
      status: 'enriching',
      url: url || undefined,
      pitch_deck_text: pitchDeckTextParts.join('\n\n') || undefined,
    });

    const ledger = enriched.cost_ledger!;
    await admin.from('deals').update({ status: 'review' }).eq('id', deal.id);

    if (run?.id) {
      await admin
        .from('deal_runs')
        .update({
          status: 'done',
          finished_at: new Date().toISOString(),
          total_usd: ledger.total_usd,
          total_tokens_in: ledger.total_tokens_in,
          total_tokens_out: ledger.total_tokens_out,
        })
        .eq('id', run.id);
    }

    return NextResponse.json({
      ok: true,
      deal_id: deal.id,
      memo_url: `/deals/${deal.id}`,
      swarm_output: enriched.swarm_output,
      cost_ledger: ledger,
    });
  } catch (err: any) {
    if (run?.id) {
      await admin
        .from('deal_runs')
        .update({ status: 'failed', finished_at: new Date().toISOString() })
        .eq('id', run.id);
    }
    return NextResponse.json(
      { ok: false, error: 'SWARM_FAILED', detail: err?.message ?? String(err), deal_id: deal.id },
      { status: 500 },
    );
  }
}
