/**
 * lib/storage.supabase.ts
 *
 * SupabaseStorageClient — REAL implementation of StorageClient.
 *
 * Stores deal files in the 'deal-uploads' Supabase Storage bucket.
 * Path pattern:  deals/{deal_id}/{uuid}-{sanitised-filename}
 *
 * This file is server-only. Do not import from Client Components.
 *
 * Required env vars (server-side):
 *   NEXT_PUBLIC_SUPABASE_URL  — Supabase project URL (also readable as SUPABASE_URL)
 *   SUPABASE_SECRET_KEY       — Service-role key (bypasses RLS for trusted uploads)
 */

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import type { StorageClient, UploadedFile } from './storage';

const BUCKET = 'deal-uploads';

// ---------------------------------------------------------------------------
// SupabaseStorageClient
// ---------------------------------------------------------------------------

export class SupabaseStorageClient implements StorageClient {
  private readonly client: ReturnType<typeof createClient>;

  constructor() {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;

    if (!url || !key) {
      throw new Error(
        '[deallenz] SupabaseStorageClient: NEXT_PUBLIC_SUPABASE_URL and ' +
          'SUPABASE_SECRET_KEY must be set. See ENV.md for setup instructions.'
      );
    }

    this.client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async putFile(
    dealId: string,
    data: Buffer | Uint8Array,
    name: string,
    mimeType: string
  ): Promise<UploadedFile> {
    const uuid = crypto.randomUUID();
    const safeName = name.replace(/[^a-z0-9._-]/gi, '_');
    const storagePath = `deals/${dealId}/${uuid}-${safeName}`;

    const { error } = await this.client.storage
      .from(BUCKET)
      .upload(storagePath, data, { contentType: mimeType, upsert: false });

    if (error) {
      throw new Error(
        `[deallenz] Storage upload failed (deal=${dealId}, file=${name}): ${error.message}`
      );
    }

    return {
      key: storagePath,
      name,
      size: data.length,
      mime_type: mimeType,
      uploaded_at: new Date().toISOString(),
    };
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .createSignedUrl(key, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(
        `[deallenz] Failed to generate signed URL for "${key}": ${
          error?.message ?? 'no URL returned by Supabase'
        }`
      );
    }

    return data.signedUrl;
  }

  async listDealFiles(dealId: string): Promise<UploadedFile[]> {
    const prefix = `deals/${dealId}/`;
    const { data, error } = await this.client.storage.from(BUCKET).list(prefix, {
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
      throw new Error(
        `[deallenz] Failed to list files for deal "${dealId}": ${error.message}`
      );
    }

    if (!data || data.length === 0) return [];

    return data.map(item => ({
      key: `${prefix}${item.name}`,
      name: item.name.replace(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/,
        ''
      ),
      size: (item.metadata as { size?: number } | null)?.size ?? 0,
      mime_type:
        (item.metadata as { mimetype?: string } | null)?.mimetype ??
        'application/octet-stream',
      uploaded_at: item.created_at ?? new Date().toISOString(),
    }));
  }
}

// ---------------------------------------------------------------------------
// Factory — no mock fallback; Supabase is always real
// ---------------------------------------------------------------------------

export function createStorageClient(): StorageClient {
  return new SupabaseStorageClient();
}
