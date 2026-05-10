/**
 * MockStorageClient
 * Writes to /tmp/deallenz-mock-storage/{deal_id}/ and returns local file:// paths.
 *
 * ONLY usable when NODE_ENV !== 'production', OR USE_MOCKS=true (staging).
 * In production without USE_MOCKS, the import throws immediately — no
 * mock file paths ever reach a production user.
 *
 * Real implementation: lib/storage.supabase.ts (WIRED — PR7)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { StorageClient, UploadedFile } from './storage';

if (
  typeof process !== 'undefined' &&
  process.env?.NODE_ENV === 'production' &&
  process.env?.USE_MOCKS !== 'true'
) {
  throw new Error(
    '[deallenz] MockStorageClient must NOT be used in production. ' +
      'Real storage requires SupabaseStorageClient with SUPABASE_SECRET_KEY set (see ENV.md). ' +
      'Set USE_MOCKS=true only on staging environments.'
  );
}

const STORAGE_ROOT =
  process.env.MOCK_STORAGE_ROOT ?? '/tmp/deallenz-mock-storage';

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export class MockStorageClient implements StorageClient {
  private index: Map<string, UploadedFile[]> = new Map();

  async putFile(
    dealId: string,
    data: Buffer | Uint8Array,
    name: string,
    mimeType: string
  ): Promise<UploadedFile> {
    const dir = path.join(STORAGE_ROOT, dealId);
    ensureDir(dir);

    const uuid = crypto.randomUUID();
    const safeName = name.replace(/[^a-z0-9._-]/gi, '_');
    const filename = `${uuid}-${safeName}`;
    const fullPath = path.join(dir, filename);

    fs.writeFileSync(fullPath, data);

    const meta: UploadedFile = {
      key: `deals/${dealId}/${filename}`,
      name,
      size: data.length,
      mime_type: mimeType,
      uploaded_at: new Date().toISOString(),
    };

    const existing = this.index.get(dealId) ?? [];
    existing.unshift(meta);
    this.index.set(dealId, existing);

    return meta;
  }

  async getSignedUrl(key: string, _expiresInSeconds = 3600): Promise<string> {
    const relativePath = key.replace(/^deals\//, '');
    const fullPath = path.join(STORAGE_ROOT, relativePath);
    return `file://${fullPath}`;
  }

  async listDealFiles(dealId: string): Promise<UploadedFile[]> {
    return this.index.get(dealId) ?? [];
  }
}
