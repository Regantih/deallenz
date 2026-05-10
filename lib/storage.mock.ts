/**
 * MockStorageClient
 * Writes to /tmp/deallenz-mock-storage/{deal_id}/ and returns local file:// paths.
 *
 * ONLY usable when USE_MOCKS=true or NODE_ENV !== 'production'.
 * Import guard enforced at module load time.
 *
 * Real Supabase implementation: lib/storage.supabase.ts (PR#2)
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
    '[deallenz] MockStorageClient must not be used in production. ' +
    'Set USE_MOCKS=true to override (only for staging).'
  );
}

const STORAGE_ROOT =
  process.env.MOCK_STORAGE_ROOT ?? '/tmp/deallenz-mock-storage';

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export class MockStorageClient implements StorageClient {
  /** In-memory index of uploads (keyed by deal_id). Survives only for process lifetime. */
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
    // Strip the "deals/" prefix to reconstruct the local path
    const relativePath = key.replace(/^deals\//, '');
    const fullPath = path.join(STORAGE_ROOT, relativePath);
    return `file://${fullPath}`;
  }

  async listDealFiles(dealId: string): Promise<UploadedFile[]> {
    return this.index.get(dealId) ?? [];
  }
}
