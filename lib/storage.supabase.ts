/**
 * lib/storage.supabase.ts
 *
 * SupabaseStorageClient — real implementation of the StorageClient interface.
 *
 * Stores deal files in the 'deal-uploads' Supabase Storage bucket.
 * Path pattern:  deals/{deal_id}/{uuid}-{sanitised-filename}
 *
 * This file is server-only. Do not import from Client Components.
 *
 * Required env vars (server-side):
 *   SUPABASE_URL         — Supabase project URL
 *   SUPABASE_SECRET_KEY  — Service-role key (bypasses RLS for trusted uploads)
 *
 * Interface note:
 *   The StorageClient interface and UploadedFile type are defined in
 *   lib/storage.ts (PR#3 / pr6/path-b-and-swarm).  Until that branch is
 *   merged, the types are redeclared inline below.  After merge, replace
 *   the inline declarations with:
 *
 *     import type { StorageClient, UploadedFile } from './storage';
 *
 *   and remove the inline declarations.
 */

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types (inline until PR#3 is merged — see note above)
// ---------------------------------------------------------------------------

export interface UploadedFile {
  /** Storage key, e.g. "deals/{deal_id}/{uuid}-{name}" */
  key: string;
  /** Original file name supplied by the caller */
  name: string;
  size: number;
  mime_type: string;
  uploaded_at: string; // ISO-8601
}

export interface StorageClient {
  putFile(
    dealId: string,
    data: Buffer | Uint8Array,
    name: string,
    mimeType: string
  ): Promise<UploadedFile>;

  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  listDealFiles(dealId: string): Promise<UploadedFile[]>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
        '[deallenz] SupabaseStorageClient: SUPABASE_URL and SUPABASE_SECRET_KEY must be set.\n' +
          'See ENV.md for setup instructions.'
      );
    }

    this.client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // -------------------------------------------------------------------------
  // putFile
  // -------------------------------------------------------------------------

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
      .upload(storagePath, data, {
        contentType: mimeType,
        upsert: false,
      });

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

  // -------------------------------------------------------------------------
  // getSignedUrl
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // listDealFiles
  // -------------------------------------------------------------------------

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

    return data.map((item) => ({
      key: `${prefix}${item.name}`,
      // Strip the uuid- prefix to surface the original filename.
      name: item.name.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/, ''),
      size: (item.metadata as { size?: number } | null)?.size ?? 0,
      mime_type:
        (item.metadata as { mimetype?: string } | null)?.mimetype ??
        'application/octet-stream',
      uploaded_at: item.created_at ?? new Date().toISOString(),
    }));
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * createStorageClient()
 *
 * Returns the appropriate StorageClient for the current environment.
 *
 * - When USE_MOCKS=true (or NODE_ENV=development without USE_MOCKS set to
 *   'false'), you can swap this for a MockStorageClient from PR#3.
 * - In production (or when SUPABASE_SECRET_KEY is set), returns a real
 *   SupabaseStorageClient.
 *
 * Extend this function with the mock branch after PR#3 is merged.
 */
export function createStorageClient(): StorageClient {
  return new SupabaseStorageClient();
}
